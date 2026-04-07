from __future__ import annotations

from datetime import date
from typing import Any

from sqlalchemy.orm import joinedload

from backend.database import db
from backend.models import LedgerAllocation, LedgerEntry, Payment, Sale


EPSILON = 0.01


def _round_amount(value: Any, digits: int = 2) -> float:
    return round(float(value or 0), digits)


def _get_sale_charge_entry(sale_id: int):
    return LedgerEntry.query.filter_by(ref_type="sale", ref_id=sale_id, entry_type="charge").first()


def _ordered_pending_sales(*, business_id: int, customer_id: int, exclude_sale_id: int | None = None):
    query = Sale.query.filter(
        Sale.business_id == business_id,
        Sale.customer_id == customer_id,
        Sale.balance > EPSILON,
    )
    if exclude_sale_id is not None:
        query = query.filter(Sale.id != int(exclude_sale_id))
    return query.order_by(Sale.sale_date.asc(), Sale.id.asc()).all()


def reverse_payment_allocations(*, payment: Payment, payment_entry: LedgerEntry | None = None, delete_allocations: bool = False) -> dict[str, Any]:
    ledger_entry = payment_entry or LedgerEntry.query.filter_by(ref_type="payment", ref_id=payment.id).first()
    if ledger_entry is None:
        return {"payment_entry": None, "affected_sales": [], "affected_dates": []}

    allocations = LedgerAllocation.query.filter_by(payment_id=ledger_entry.id).order_by(LedgerAllocation.id.asc()).all()
    affected_sales: list[int] = []
    affected_dates: set[date] = set()
    for allocation in allocations:
        charge = LedgerEntry.query.get(allocation.charge_id)
        if not charge or charge.ref_type != "sale":
            continue
        sale = Sale.query.get(charge.ref_id)
        if sale is None:
            continue
        sale.balance = _round_amount(float(sale.balance or 0) + float(allocation.amount or 0))
        sale.collected_amount = _round_amount(max(0.0, float(sale.collected_amount or 0) - float(allocation.amount or 0)))
        sale.paid = sale.balance <= EPSILON
        affected_sales.append(sale.id)
        if sale.sale_date:
            affected_dates.add(sale.sale_date)
        if delete_allocations:
            db.session.delete(allocation)

    return {
        "payment_entry": ledger_entry,
        "affected_sales": affected_sales,
        "affected_dates": sorted(affected_dates),
    }


def allocate_payment_amount(
    *,
    business_id: int,
    customer_id: int,
    amount: float,
    payment_entry: LedgerEntry | None = None,
    preferred_sale_id: int | None = None,
    strict_preferred_sale: bool = False,
    exclude_sale_id: int | None = None,
    allow_unallocated: bool = False,
) -> dict[str, Any]:
    normalized_amount = _round_amount(amount)
    if normalized_amount <= EPSILON:
        return {
            "remaining_amount": 0.0,
            "applied_amount": 0.0,
            "allocations": [],
            "affected_dates": [],
            "realized_cost_total": 0.0,
        }

    preferred_sale = None
    sales: list[Sale] = []
    if preferred_sale_id is not None:
        preferred_sale = Sale.query.filter(
            Sale.id == int(preferred_sale_id),
            Sale.business_id == business_id,
            Sale.customer_id == customer_id,
        ).first()
        if preferred_sale is None:
            raise ValueError("La venta asociada al pago no existe o no corresponde al cliente")
        if exclude_sale_id is not None and preferred_sale.id == int(exclude_sale_id):
            preferred_sale = None
        elif float(preferred_sale.balance or 0) > EPSILON:
            sales.append(preferred_sale)
        if strict_preferred_sale:
            if preferred_sale is None:
                raise ValueError("La venta asociada al pago ya no está disponible para asignación")
            available = _round_amount(preferred_sale.balance)
            if available <= EPSILON:
                raise ValueError("La venta seleccionada no tiene saldo pendiente")
            if normalized_amount - available > EPSILON:
                raise ValueError("El pago supera el saldo pendiente de la venta seleccionada")
    if not strict_preferred_sale:
        for sale in _ordered_pending_sales(business_id=business_id, customer_id=customer_id, exclude_sale_id=exclude_sale_id):
            if preferred_sale is not None and sale.id == preferred_sale.id:
                continue
            sales.append(sale)

    total_pending = _round_amount(sum(float(sale.balance or 0) for sale in sales))
    if not allow_unallocated and normalized_amount - total_pending > EPSILON:
        raise ValueError("El pago supera el saldo pendiente del cliente")

    remaining_amount = normalized_amount
    allocations_payload: list[dict[str, Any]] = []
    affected_dates: set[date] = set()
    realized_cost_total = 0.0

    for sale in sales:
        if remaining_amount <= EPSILON:
            break
        sale_balance = _round_amount(sale.balance)
        if sale_balance <= EPSILON:
            continue
        amount_to_apply = _round_amount(min(sale_balance, remaining_amount))
        if amount_to_apply <= EPSILON:
            continue
        sale.balance = _round_amount(float(sale.balance or 0) - amount_to_apply)
        sale.collected_amount = _round_amount(float(sale.collected_amount or 0) + amount_to_apply)
        sale.paid = sale.balance <= EPSILON
        if sale.sale_date:
            affected_dates.add(sale.sale_date)

        sale_total = float(sale.total or 0)
        sale_cost = float(sale.total_cost or 0)
        if sale_total > 0 and sale_cost > 0:
            realized_cost_total += amount_to_apply * (sale_cost / sale_total)

        charge_entry = _get_sale_charge_entry(sale.id)
        if payment_entry is not None and charge_entry is not None:
            db.session.add(
                LedgerAllocation(
                    payment_id=payment_entry.id,
                    charge_id=charge_entry.id,
                    amount=amount_to_apply,
                )
            )

        allocations_payload.append({"sale_id": sale.id, "amount": amount_to_apply})
        remaining_amount = _round_amount(remaining_amount - amount_to_apply)

    return {
        "remaining_amount": _round_amount(remaining_amount),
        "applied_amount": _round_amount(normalized_amount - remaining_amount),
        "allocations": allocations_payload,
        "affected_dates": sorted(affected_dates),
        "realized_cost_total": _round_amount(realized_cost_total),
    }


def delete_sale_financial_effects(*, sale: Sale) -> dict[str, Any]:
    affected_dates: set[date] = set()
    if sale.sale_date:
        affected_dates.add(sale.sale_date)

    sale_charge_entry = _get_sale_charge_entry(sale.id)
    payment_ids_to_reallocate: set[int] = set()
    if sale_charge_entry is not None:
        allocations = LedgerAllocation.query.filter_by(charge_id=sale_charge_entry.id).all()
        for allocation in allocations:
            payment_entry = LedgerEntry.query.get(allocation.payment_id)
            if not payment_entry or payment_entry.ref_type != "payment" or payment_entry.ref_id is None:
                continue
            payment = Payment.query.get(int(payment_entry.ref_id))
            if payment is None:
                continue
            if int(payment.sale_id or 0) != int(sale.id):
                payment_ids_to_reallocate.add(payment.id)

    linked_payments = Payment.query.options(joinedload(Payment.sale)).filter_by(sale_id=sale.id).all()
    linked_payment_ids = {payment.id for payment in linked_payments}

    for payment in linked_payments:
        entry = LedgerEntry.query.filter_by(ref_type="payment", ref_id=payment.id).first()
        if entry is not None:
            reverse_result = reverse_payment_allocations(payment=payment, payment_entry=entry, delete_allocations=True)
            affected_dates.update(reverse_result["affected_dates"])
            db.session.delete(entry)
        if payment.payment_date:
            affected_dates.add(payment.payment_date)
        db.session.delete(payment)

    for payment_id in sorted(payment_ids_to_reallocate - linked_payment_ids):
        payment = Payment.query.get(payment_id)
        if payment is None:
            continue
        entry = LedgerEntry.query.filter_by(ref_type="payment", ref_id=payment.id).first()
        if entry is None:
            continue
        reverse_result = reverse_payment_allocations(payment=payment, payment_entry=entry, delete_allocations=True)
        affected_dates.update(reverse_result["affected_dates"])
        reallocation = allocate_payment_amount(
            business_id=sale.business_id,
            customer_id=payment.customer_id,
            amount=payment.amount,
            payment_entry=entry,
            preferred_sale_id=payment.sale_id,
            strict_preferred_sale=bool(payment.sale_id),
            exclude_sale_id=sale.id,
            allow_unallocated=True,
        )
        affected_dates.update(reallocation["affected_dates"])
        if payment.payment_date:
            affected_dates.add(payment.payment_date)

    for entry in LedgerEntry.query.filter_by(ref_type="sale", ref_id=sale.id).all():
        db.session.delete(entry)

    return {"affected_dates": sorted(affected_dates)}


def create_sale_financial_entries(
    *,
    sale: Sale,
    payment: Payment | None = None,
    payment_note: str | None = None,
) -> dict[str, Any]:
    if sale.customer_id is None:
        return {"charge_entry": None, "payment_entry": None, "allocations": []}

    charge_entry = LedgerEntry(
        business_id=sale.business_id,
        customer_id=sale.customer_id,
        entry_type="charge",
        amount=_round_amount(sale.total),
        entry_date=sale.sale_date,
        note=f"Venta #{sale.id}",
        ref_type="sale",
        ref_id=sale.id,
    )
    db.session.add(charge_entry)
    db.session.flush()

    payment_entry = None
    allocations: list[dict[str, Any]] = []
    if payment is not None and float(payment.amount or 0) > EPSILON:
        payment_entry = LedgerEntry(
            business_id=sale.business_id,
            customer_id=sale.customer_id,
            entry_type="payment",
            amount=_round_amount(payment.amount),
            entry_date=payment.payment_date,
            note=payment_note or payment.note or f"Pago #{payment.id}",
            ref_type="payment",
            ref_id=payment.id,
        )
        db.session.add(payment_entry)
        db.session.flush()
        applied_amount = min(_round_amount(payment.amount), _round_amount(sale.total))
        if applied_amount > EPSILON:
            db.session.add(
                LedgerAllocation(
                    payment_id=payment_entry.id,
                    charge_id=charge_entry.id,
                    amount=applied_amount,
                )
            )
            allocations.append({"sale_id": sale.id, "amount": applied_amount})

    return {
        "charge_entry": charge_entry,
        "payment_entry": payment_entry,
        "allocations": allocations,
    }


def resolve_sale_initial_cash_amount(*, sale: Sale, linked_payments: list[Payment], linked_ledger_payments: list[LedgerEntry]) -> float:
    sale_date = getattr(sale, "sale_date", None)
    if not sale_date:
        return 0.0
    has_payment_on_sale_date = any(
        payment.payment_date == sale_date and float(payment.amount or 0) > 0
        for payment in linked_payments
    )
    if has_payment_on_sale_date:
        return 0.0
    ledger_initial_total = _round_amount(sum(
        float(entry.amount or 0)
        for entry in linked_ledger_payments
        if entry.entry_date == sale_date and float(entry.amount or 0) > 0
    ))
    if ledger_initial_total > 0:
        return ledger_initial_total
    collected_amount = _round_amount(sale.collected_amount)
    if collected_amount <= EPSILON:
        return 0.0
    if not linked_payments and not linked_ledger_payments:
        return collected_amount
    if not sale.customer_id:
        return collected_amount
    if _round_amount(sale.balance) <= EPSILON:
        return collected_amount
    return 0.0


def list_sale_initial_cash_events(*, business_id: int, start_date: date, end_date: date) -> list[dict[str, Any]]:
    sale_rows = (
        Sale.query.options(joinedload(Sale.customer), joinedload(Sale.treasury_account))
        .filter(
            Sale.business_id == business_id,
            Sale.sale_date >= start_date,
            Sale.sale_date <= end_date,
            Sale.collected_amount > 0,
        )
        .order_by(Sale.sale_date.desc(), Sale.id.desc())
        .all()
    )
    sale_ids = [sale.id for sale in sale_rows]
    payments_by_sale_id: dict[int, list[Payment]] = {}
    ledger_by_sale_id: dict[int, list[LedgerEntry]] = {}
    if sale_ids:
        linked_payments = Payment.query.filter(Payment.business_id == business_id, Payment.sale_id.in_(sale_ids)).all()
        for payment in linked_payments:
            payments_by_sale_id.setdefault(payment.sale_id, []).append(payment)
        linked_ledger_entries = LedgerEntry.query.filter(
            LedgerEntry.business_id == business_id,
            LedgerEntry.ref_type == "sale",
            LedgerEntry.entry_type == "payment",
            LedgerEntry.ref_id.in_(sale_ids),
        ).all()
        for entry in linked_ledger_entries:
            ledger_by_sale_id.setdefault(entry.ref_id, []).append(entry)

    events: list[dict[str, Any]] = []
    for sale in sale_rows:
        linked_payments = payments_by_sale_id.get(sale.id, [])
        same_day_payments = [
            payment
            for payment in linked_payments
            if payment.payment_date == sale.sale_date and float(payment.amount or 0) > EPSILON
        ]
        if same_day_payments:
            amount = _round_amount(sum(float(payment.amount or 0) for payment in same_day_payments))
        else:
            amount = resolve_sale_initial_cash_amount(
                sale=sale,
                linked_payments=linked_payments,
                linked_ledger_payments=ledger_by_sale_id.get(sale.id, []),
            )
        if amount <= EPSILON:
            continue
        sale_total = float(sale.total or 0)
        sale_cost = float(sale.total_cost or 0)
        realized_cost = 0.0
        if sale_total > 0 and sale_cost > 0:
            realized_cost = _round_amount(float(amount or 0) * (sale_cost / sale_total))
        source_label = "Venta pagada" if _round_amount(sale.balance) <= EPSILON else "Abono inicial de venta"
        events.append(
            {
                "sale_id": sale.id,
                "date": sale.sale_date,
                "amount": _round_amount(amount),
                "payment_ids": [payment.id for payment in same_day_payments],
                "realized_cost": realized_cost,
                "description": sale.note or f"Venta #{sale.id}",
                "category": sale.payment_method or "venta",
                "source_label": source_label,
                "customer_id": sale.customer_id,
                "customer_name": sale.customer.name if getattr(sale, "customer", None) else None,
                "treasury_account_id": sale.treasury_account_id,
                "treasury_account_name": sale.treasury_account.name if getattr(sale, "treasury_account", None) else None,
                "treasury_account_type": sale.treasury_account.account_type if getattr(sale, "treasury_account", None) else None,
                "payment_method": sale.payment_method,
            }
        )
    return events
