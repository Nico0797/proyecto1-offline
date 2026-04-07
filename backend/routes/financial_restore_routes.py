from __future__ import annotations

from datetime import date, datetime, timedelta

from flask import g, jsonify, request
from sqlalchemy import func
from sqlalchemy.orm import joinedload

from backend.database import db
from backend.models import (
    Business,
    Expense,
    Invoice,
    InvoicePayment,
    Payment,
    Sale,
    SupplierPayable,
    SupplierPayment,
    TreasuryAccount,
    TreasuryTransfer,
)
from backend.services.reports.report_service import ReportExportService


TREASURY_ACCOUNT_TYPES = {"cash", "bank", "checking", "savings", "card", "wallet", "other"}


def _parse_date(value, *, default=None):
    if value in (None, ""):
        return default
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    try:
        return datetime.strptime(str(value)[:10], "%Y-%m-%d").date()
    except Exception:
        return default


def _normalize_scope(scope_value):
    normalized = str(scope_value or "").strip().lower()
    return "financial" if normalized == "financiero" else "operational"


def _safe_round(value, digits=2):
    return round(float(value or 0), digits)


def _ensure_default_account(business_id: int, preferred_id: int | None = None):
    active_accounts = (
        TreasuryAccount.query
        .filter(
            TreasuryAccount.business_id == business_id,
            TreasuryAccount.is_active.is_(True),
        )
        .order_by(TreasuryAccount.is_default.desc(), TreasuryAccount.id.asc())
        .all()
    )
    if not active_accounts:
        return

    default_account = next((account for account in active_accounts if account.is_default), None)
    if preferred_id is not None:
        preferred = next((account for account in active_accounts if account.id == preferred_id), None)
        if preferred:
            default_account = preferred

    if default_account is None:
        default_account = active_accounts[0]

    for account in TreasuryAccount.query.filter(TreasuryAccount.business_id == business_id).all():
        should_be_default = account.id == default_account.id and account.is_active
        if bool(account.is_default) != bool(should_be_default):
            account.is_default = bool(should_be_default)


def _sum_sale_initial_cash_for_account(business_id: int, account_id: int):
    sales = (
        Sale.query
        .filter(
            Sale.business_id == business_id,
            Sale.treasury_account_id == account_id,
            Sale.collected_amount > 0,
        )
        .all()
    )
    total = 0.0
    for sale in sales:
        has_linked_payment = Payment.query.filter(
            Payment.business_id == business_id,
            Payment.sale_id == sale.id,
        ).first()
        if has_linked_payment:
            continue
        total += float(sale.collected_amount or 0)
    return _safe_round(total)


def _build_account_payload(account: TreasuryAccount):
    business_id = int(account.business_id)
    account_id = int(account.id)

    payment_inflows = _safe_round(
        db.session.query(func.coalesce(func.sum(Payment.amount), 0))
        .filter(
            Payment.business_id == business_id,
            Payment.treasury_account_id == account_id,
        )
        .scalar()
    )
    sale_initial_inflows = _sum_sale_initial_cash_for_account(business_id, account_id)
    invoice_payment_inflows = _safe_round(
        db.session.query(func.coalesce(func.sum(InvoicePayment.amount), 0))
        .join(Invoice, Invoice.id == InvoicePayment.invoice_id)
        .filter(
            Invoice.business_id == business_id,
            InvoicePayment.treasury_account_id == account_id,
            InvoicePayment.event_type == "payment",
        )
        .scalar()
    )
    invoice_outflows = _safe_round(
        db.session.query(func.coalesce(func.sum(InvoicePayment.amount), 0))
        .join(Invoice, Invoice.id == InvoicePayment.invoice_id)
        .filter(
            Invoice.business_id == business_id,
            InvoicePayment.treasury_account_id == account_id,
            InvoicePayment.event_type.in_(["refund", "reversal"]),
        )
        .scalar()
    )
    expense_outflows = _safe_round(
        db.session.query(func.coalesce(func.sum(Expense.amount), 0))
        .filter(
            Expense.business_id == business_id,
            Expense.treasury_account_id == account_id,
        )
        .scalar()
    )
    transfers_in_total = _safe_round(
        db.session.query(func.coalesce(func.sum(TreasuryTransfer.amount), 0))
        .filter(
            TreasuryTransfer.business_id == business_id,
            TreasuryTransfer.destination_account_id == account_id,
        )
        .scalar()
    )
    transfers_out_total = _safe_round(
        db.session.query(func.coalesce(func.sum(TreasuryTransfer.amount), 0))
        .filter(
            TreasuryTransfer.business_id == business_id,
            TreasuryTransfer.origin_account_id == account_id,
        )
        .scalar()
    )

    inflows_total = _safe_round(payment_inflows + sale_initial_inflows + invoice_payment_inflows)
    outflows_total = _safe_round(expense_outflows + invoice_outflows)

    sales_count = Sale.query.filter(
        Sale.business_id == business_id,
        Sale.treasury_account_id == account_id,
    ).count()
    payments_count = Payment.query.filter(
        Payment.business_id == business_id,
        Payment.treasury_account_id == account_id,
    ).count()
    expenses_count = Expense.query.filter(
        Expense.business_id == business_id,
        Expense.treasury_account_id == account_id,
    ).count()
    supplier_payments_count = SupplierPayment.query.filter(
        SupplierPayment.business_id == business_id,
        SupplierPayment.treasury_account_id == account_id,
    ).count()
    invoice_payments_count = (
        db.session.query(InvoicePayment.id)
        .join(Invoice, Invoice.id == InvoicePayment.invoice_id)
        .filter(
            Invoice.business_id == business_id,
            InvoicePayment.treasury_account_id == account_id,
            InvoicePayment.event_type == "payment",
        )
        .count()
    )
    debt_payments_count = Expense.query.filter(
        Expense.business_id == business_id,
        Expense.treasury_account_id == account_id,
        Expense.source_type == "debt_payment",
    ).count()
    transfers_out_count = TreasuryTransfer.query.filter(
        TreasuryTransfer.business_id == business_id,
        TreasuryTransfer.origin_account_id == account_id,
    ).count()
    transfers_in_count = TreasuryTransfer.query.filter(
        TreasuryTransfer.business_id == business_id,
        TreasuryTransfer.destination_account_id == account_id,
    ).count()

    payload = account.to_dict()
    history_total = (
        sales_count
        + payments_count
        + expenses_count
        + supplier_payments_count
        + invoice_payments_count
        + debt_payments_count
        + transfers_out_count
        + transfers_in_count
    )
    payload.update({
        "inflows_total": inflows_total,
        "outflows_total": outflows_total,
        "transfers_in_total": transfers_in_total,
        "transfers_out_total": transfers_out_total,
        "current_balance": _safe_round(
            float(account.opening_balance or 0)
            + inflows_total
            + transfers_in_total
            - outflows_total
            - transfers_out_total
        ),
        "has_history": history_total > 0,
        "history_usage": {
            "sales": sales_count,
            "payments": payments_count,
            "expenses": expenses_count,
            "supplier_payments": supplier_payments_count,
            "invoice_payments": invoice_payments_count,
            "debt_payments": debt_payments_count,
            "transfers_out": transfers_out_count,
            "transfers_in": transfers_in_count,
            "total": history_total,
        },
    })
    return payload


def _build_supplier_payables_snapshot(business_id: int, reference_date: date):
    payables = (
        SupplierPayable.query
        .filter(
            SupplierPayable.business_id == business_id,
            SupplierPayable.balance_due > 0,
            SupplierPayable.status.in_(["pending", "partial"]),
        )
        .all()
    )
    overdue = 0.0
    due_today = 0.0
    due_soon = 0.0
    customer_like = set()
    total = 0.0
    for payable in payables:
        balance_due = float(payable.balance_due or 0)
        total += balance_due
        if payable.supplier_id:
            customer_like.add(payable.supplier_id)
        if payable.due_date:
            if payable.due_date < reference_date:
                overdue += balance_due
            elif payable.due_date == reference_date:
                due_today += balance_due
            elif (payable.due_date - reference_date).days <= 7:
                due_soon += balance_due
    return {
        "total": _safe_round(total),
        "active_count": len(payables),
        "overdue_total": _safe_round(overdue),
        "due_today_total": _safe_round(due_today),
        "due_soon_total": _safe_round(due_soon),
        "supplier_count": len(customer_like),
    }


def _build_invoice_snapshot(business_id: int, start_date: date, end_date: date, reference_date: date):
    invoices = (
        Invoice.query
        .options(joinedload(Invoice.payments), joinedload(Invoice.customer))
        .filter(
            Invoice.business_id == business_id,
            Invoice.issue_date <= reference_date,
            Invoice.status != "cancelled",
        )
        .all()
    )
    payments = (
        InvoicePayment.query
        .options(joinedload(InvoicePayment.treasury_account), joinedload(InvoicePayment.invoice))
        .join(Invoice, Invoice.id == InvoicePayment.invoice_id)
        .filter(
            Invoice.business_id == business_id,
            InvoicePayment.payment_date >= start_date,
            InvoicePayment.payment_date <= end_date,
        )
        .all()
    )

    receivable_total = 0.0
    overdue_total = 0.0
    due_today_total = 0.0
    due_soon_total = 0.0
    open_count = 0
    overdue_count = 0
    customer_ids = set()
    overdue_customer_ids = set()
    invoiced_total = 0.0
    collection_days = []

    for invoice in invoices:
        invoice_payload = invoice.to_dict(include_items=False, include_payments=False)
        outstanding_balance = float(invoice_payload.get("outstanding_balance") or 0)
        if start_date <= invoice.issue_date <= end_date:
            invoiced_total += float(invoice.total or 0)
        if outstanding_balance > 0.01:
            receivable_total += outstanding_balance
            open_count += 1
            if invoice.customer_id:
                customer_ids.add(invoice.customer_id)
            if invoice.due_date:
                if invoice.due_date < reference_date:
                    overdue_total += outstanding_balance
                    overdue_count += 1
                    if invoice.customer_id:
                        overdue_customer_ids.add(invoice.customer_id)
                elif invoice.due_date == reference_date:
                    due_today_total += outstanding_balance
                elif (invoice.due_date - reference_date).days <= 7:
                    due_soon_total += outstanding_balance
        for payment in invoice.payments or []:
            if payment.event_type == "payment" and start_date <= payment.payment_date <= end_date:
                collection_days.append(max((payment.payment_date - invoice.issue_date).days, 0))

    gross_collections = _safe_round(sum(float(item.amount or 0) for item in payments if item.event_type == "payment"))
    refunds_total = _safe_round(sum(float(item.amount or 0) for item in payments if item.event_type == "refund"))
    reversals_total = _safe_round(sum(float(item.amount or 0) for item in payments if item.event_type == "reversal"))
    net_collections = _safe_round(gross_collections - refunds_total - reversals_total)

    movement_rows = []
    for payment in payments:
        event_type = str(payment.event_type or "payment").strip().lower() or "payment"
        if event_type == "payment":
            movement_rows.append({
                "id": f"invoice-payment-{payment.id}",
                "date": payment.payment_date.isoformat() if payment.payment_date else None,
                "description": payment.note or f"Cobro factura {payment.invoice.invoice_number if payment.invoice else payment.invoice_id}",
                "amount": _safe_round(payment.amount),
                "type": "income",
                "category": payment.payment_method or "invoice_payment",
                "source_type": "invoice_payment",
                "source_label": "Cobro de factura",
                "flow_group": "cash_in",
                "scope": "operational",
            })
        else:
            movement_rows.append({
                "id": f"invoice-{event_type}-{payment.id}",
                "date": payment.payment_date.isoformat() if payment.payment_date else None,
                "description": payment.note or f"{event_type.title()} factura {payment.invoice.invoice_number if payment.invoice else payment.invoice_id}",
                "amount": _safe_round(payment.amount),
                "type": "expense",
                "category": event_type,
                "source_type": f"invoice_{event_type}",
                "source_label": "Ajuste de factura",
                "flow_group": "operational_expense",
                "scope": "operational",
            })

    average_days = round(sum(collection_days) / len(collection_days), 2) if collection_days else None
    collection_rate = round((net_collections / invoiced_total) * 100, 2) if invoiced_total > 0 else 0

    return {
        "receivable_total": _safe_round(receivable_total),
        "overdue_total": _safe_round(overdue_total),
        "due_today_total": _safe_round(due_today_total),
        "due_soon_total": _safe_round(due_soon_total),
        "open_count": int(open_count),
        "overdue_count": int(overdue_count),
        "customer_count": int(len(customer_ids)),
        "overdue_customer_count": int(len(overdue_customer_ids)),
        "invoiced_total": _safe_round(invoiced_total),
        "gross_collections_total": gross_collections,
        "refunds_total": refunds_total,
        "reversals_total": reversals_total,
        "net_collections_total": net_collections,
        "collection_rate": collection_rate,
        "average_days_to_collect": average_days,
        "movements": movement_rows,
    }


def _normalize_cash_movements(dataset):
    movements = []
    for index, item in enumerate(dataset.get("movements", []), start=1):
        movement_type = str(item.get("movement_type") or "expense").strip().lower()
        source_label = str(item.get("source_label") or "").strip()
        source_type = str(item.get("source_type") or "").strip().lower()
        if not source_type:
            if source_label == "Cobro ejecutado":
                source_type = "customer_payment"
            elif source_label == "Venta pagada":
                source_type = "sale_payment"
            elif source_label == "Abono inicial de venta":
                source_type = "sale_initial_payment"
            elif source_label == "Pago a proveedor":
                source_type = "supplier_payment"
            elif source_label == "Pago de obligación operativa":
                source_type = "debt_payment"
            elif source_label == "Pago de deuda financiera":
                source_type = "debt_payment"
            elif source_label == "Compra pagada":
                source_type = "purchase_payment"
            elif source_label == "Gasto recurrente ejecutado":
                source_type = "recurring"
            else:
                source_type = "manual"

        flow_group = "operational_expense"
        if movement_type == "income":
            flow_group = "cash_in"
        elif source_type == "supplier_payment":
            flow_group = "supplier_payment"
        elif source_type == "debt_payment":
            scope = _normalize_scope(item.get("scope"))
            flow_group = "financial_debt_payment" if scope == "financial" else "operational_obligation_payment"

        movements.append({
            "id": index,
            "date": item.get("date").isoformat() if hasattr(item.get("date"), "isoformat") else item.get("date"),
            "description": item.get("description") or "Movimiento",
            "amount": _safe_round(item.get("amount")),
            "type": "income" if movement_type == "income" else "expense",
            "category": item.get("category"),
            "source_type": source_type,
            "source_label": source_label or None,
            "flow_group": flow_group,
            "scope": _normalize_scope(item.get("scope")),
        })
    return movements


def register_financial_restore_routes(application, *, token_required, permission_required, has_permission):
    @application.route("/api/businesses/<int:business_id>/treasury/accounts", methods=["GET"])
    @token_required
    @permission_required("treasury.read")
    def list_treasury_accounts(business_id):
        business = Business.query.get(business_id)
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        include_inactive = str(request.args.get("include_inactive", "")).strip().lower() in {"1", "true", "yes"}
        account_type = str(request.args.get("account_type") or "").strip().lower()

        query = TreasuryAccount.query.filter(TreasuryAccount.business_id == business_id)
        if not include_inactive:
            query = query.filter(TreasuryAccount.is_active.is_(True))
        if account_type:
            query = query.filter(TreasuryAccount.account_type == account_type)

        accounts = query.order_by(TreasuryAccount.is_default.desc(), TreasuryAccount.name.asc()).all()
        account_payloads = [_build_account_payload(account) for account in accounts]
        summary = {
            "accounts_count": len(account_payloads),
            "active_accounts_count": len([account for account in account_payloads if account.get("is_active")]),
            "inactive_accounts_count": len([account for account in account_payloads if not account.get("is_active")]),
            "total_balance": _safe_round(sum(float(account.get("current_balance") or 0) for account in account_payloads)),
            "by_type": [],
        }
        grouped = {}
        for account in account_payloads:
            key = account.get("account_type") or "other"
            bucket = grouped.setdefault(key, {"account_type": key, "accounts_count": 0, "total_balance": 0.0})
            bucket["accounts_count"] += 1
            bucket["total_balance"] = _safe_round(bucket["total_balance"] + float(account.get("current_balance") or 0))
        summary["by_type"] = list(grouped.values())
        return jsonify({"accounts": account_payloads, "summary": summary})

    @application.route("/api/businesses/<int:business_id>/treasury/accounts", methods=["POST"])
    @token_required
    @permission_required("treasury.create")
    def create_treasury_account(business_id):
        business = Business.query.get(business_id)
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        data = request.get_json() or {}
        name = str(data.get("name") or "").strip()
        account_type = str(data.get("account_type") or "cash").strip().lower() or "cash"
        if not name:
            return jsonify({"error": "El nombre es obligatorio"}), 400
        if account_type not in TREASURY_ACCOUNT_TYPES:
            return jsonify({"error": "Tipo de cuenta inválido"}), 400

        duplicate = TreasuryAccount.query.filter(
            TreasuryAccount.business_id == business_id,
            func.lower(TreasuryAccount.name) == name.lower(),
        ).first()
        if duplicate:
            return jsonify({"error": "Ya existe una cuenta con ese nombre"}), 400

        account = TreasuryAccount(
            business_id=business_id,
            name=name,
            account_type=account_type,
            currency=str(data.get("currency") or business.currency or "COP").strip() or "COP",
            opening_balance=float(data.get("opening_balance") or 0),
            notes=(str(data.get("notes") or "").strip() or None),
            is_active=bool(data.get("is_active", True)),
            is_default=bool(data.get("is_default", False)),
        )
        db.session.add(account)
        db.session.flush()
        if account.is_default and not account.is_active:
            db.session.rollback()
            return jsonify({"error": "Una cuenta inactiva no puede ser predeterminada"}), 400
        _ensure_default_account(business_id, preferred_id=account.id if account.is_default else None)
        db.session.commit()
        return jsonify({"account": _build_account_payload(account)}), 201

    @application.route("/api/businesses/<int:business_id>/treasury/accounts/<int:account_id>", methods=["PUT"])
    @token_required
    @permission_required("treasury.update")
    def update_treasury_account(business_id, account_id):
        account = TreasuryAccount.query.filter_by(id=account_id, business_id=business_id).first()
        if not account:
            return jsonify({"error": "Cuenta no encontrada"}), 404

        data = request.get_json() or {}
        name = str(data.get("name") or account.name).strip()
        account_type = str(data.get("account_type") or account.account_type).strip().lower() or account.account_type
        if not name:
            return jsonify({"error": "El nombre es obligatorio"}), 400
        if account_type not in TREASURY_ACCOUNT_TYPES:
            return jsonify({"error": "Tipo de cuenta inválido"}), 400

        duplicate = TreasuryAccount.query.filter(
            TreasuryAccount.business_id == business_id,
            TreasuryAccount.id != account_id,
            func.lower(TreasuryAccount.name) == name.lower(),
        ).first()
        if duplicate:
            return jsonify({"error": "Ya existe una cuenta con ese nombre"}), 400

        is_active = bool(data.get("is_active", account.is_active))
        is_default = bool(data.get("is_default", account.is_default))
        if is_default and not is_active:
            return jsonify({"error": "Una cuenta inactiva no puede ser predeterminada"}), 400

        account.name = name
        account.account_type = account_type
        account.currency = str(data.get("currency") or account.currency or "COP").strip() or "COP"
        account.opening_balance = float(data.get("opening_balance") if data.get("opening_balance") is not None else account.opening_balance or 0)
        account.notes = (str(data.get("notes") or "").strip() or None) if "notes" in data else account.notes
        account.is_active = is_active
        account.is_default = is_default

        _ensure_default_account(business_id, preferred_id=account.id if account.is_default and account.is_active else None)
        db.session.commit()
        return jsonify({"account": _build_account_payload(account)})

    @application.route("/api/businesses/<int:business_id>/treasury/movements", methods=["GET"])
    @token_required
    @permission_required("treasury.read")
    def list_treasury_movements(business_id):
        business = Business.query.get(business_id)
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        account_id = request.args.get("account_id", type=int)
        account_type = str(request.args.get("account_type") or "").strip().lower()
        origin_filter = str(request.args.get("origin") or "").strip().lower()
        start_date = _parse_date(request.args.get("start_date"))
        end_date = _parse_date(request.args.get("end_date"))
        search = str(request.args.get("search") or "").strip().lower()

        movements = []

        payment_rows = Payment.query.options(joinedload(Payment.customer), joinedload(Payment.treasury_account)).filter(Payment.business_id == business_id)
        if start_date:
            payment_rows = payment_rows.filter(Payment.payment_date >= start_date)
        if end_date:
            payment_rows = payment_rows.filter(Payment.payment_date <= end_date)
        if account_id:
            payment_rows = payment_rows.filter(Payment.treasury_account_id == account_id)
        if account_type:
            payment_rows = payment_rows.join(TreasuryAccount, TreasuryAccount.id == Payment.treasury_account_id).filter(TreasuryAccount.account_type == account_type)
        for payment in payment_rows.all():
            movements.append({
                "id": f"payment-{payment.id}",
                "date": payment.payment_date.isoformat() if payment.payment_date else None,
                "description": payment.note or f"Cobro cliente {payment.customer.name if payment.customer else payment.customer_id}",
                "amount": _safe_round(payment.amount),
                "type": "income",
                "direction": "in",
                "category": payment.method or "payment",
                "source_type": "customer_payment",
                "source_label": "Cobro ejecutado",
                "flow_group": "cash_in",
                "scope": "operational",
                "treasury_account_id": payment.treasury_account_id,
                "treasury_account_name": payment.treasury_account.name if payment.treasury_account else None,
                "treasury_account_type": payment.treasury_account.account_type if payment.treasury_account else None,
                "customer_id": payment.customer_id,
                "customer_name": payment.customer.name if payment.customer else None,
                "payment_method": payment.method,
                "document_type": "payment",
                "document_id": payment.id,
                "document_label": f"Cobro #{payment.id}",
            })

        sale_rows = Sale.query.options(joinedload(Sale.customer), joinedload(Sale.treasury_account)).filter(
            Sale.business_id == business_id,
            Sale.treasury_account_id.isnot(None),
            Sale.collected_amount > 0,
        )
        if start_date:
            sale_rows = sale_rows.filter(Sale.sale_date >= start_date)
        if end_date:
            sale_rows = sale_rows.filter(Sale.sale_date <= end_date)
        if account_id:
            sale_rows = sale_rows.filter(Sale.treasury_account_id == account_id)
        if account_type:
            sale_rows = sale_rows.join(TreasuryAccount, TreasuryAccount.id == Sale.treasury_account_id).filter(TreasuryAccount.account_type == account_type)
        for sale in sale_rows.all():
            has_linked_payment = Payment.query.filter(Payment.business_id == business_id, Payment.sale_id == sale.id).first()
            if has_linked_payment:
                continue
            movements.append({
                "id": f"sale-initial-{sale.id}",
                "date": sale.sale_date.isoformat() if sale.sale_date else None,
                "description": sale.note or f"Venta #{sale.id}",
                "amount": _safe_round(sale.collected_amount),
                "type": "income",
                "direction": "in",
                "category": sale.payment_method or "sale",
                "source_type": "sale_initial_payment",
                "source_label": "Venta pagada",
                "flow_group": "cash_in",
                "scope": "operational",
                "treasury_account_id": sale.treasury_account_id,
                "treasury_account_name": sale.treasury_account.name if sale.treasury_account else None,
                "treasury_account_type": sale.treasury_account.account_type if sale.treasury_account else None,
                "customer_id": sale.customer_id,
                "customer_name": sale.customer.name if sale.customer else None,
                "payment_method": sale.payment_method,
                "document_type": "sale",
                "document_id": sale.id,
                "document_label": f"Venta #{sale.id}",
            })

        expense_rows = Expense.query.options(joinedload(Expense.treasury_account)).filter(
            Expense.business_id == business_id,
            Expense.treasury_account_id.isnot(None),
        )
        if start_date:
            expense_rows = expense_rows.filter(Expense.expense_date >= start_date)
        if end_date:
            expense_rows = expense_rows.filter(Expense.expense_date <= end_date)
        if account_id:
            expense_rows = expense_rows.filter(Expense.treasury_account_id == account_id)
        if account_type:
            expense_rows = expense_rows.join(TreasuryAccount, TreasuryAccount.id == Expense.treasury_account_id).filter(TreasuryAccount.account_type == account_type)
        for expense in expense_rows.all():
            movements.append({
                "id": f"expense-{expense.id}",
                "date": expense.expense_date.isoformat() if expense.expense_date else None,
                "description": expense.description or expense.category,
                "amount": _safe_round(expense.amount),
                "type": "expense",
                "direction": "out",
                "category": expense.category,
                "source_type": expense.source_type or "manual",
                "source_label": "Salida de tesorería",
                "flow_group": "financial_debt_payment" if expense.source_type == "debt_payment" else ("supplier_payment" if expense.source_type == "supplier_payment" else "operational_expense"),
                "scope": "financial" if expense.source_type == "debt_payment" and expense.category and str(expense.category).strip().lower() in {"tarjetas", "prestamos", "financiaciones", "creditos", "leasing"} else "operational",
                "treasury_account_id": expense.treasury_account_id,
                "treasury_account_name": expense.treasury_account.name if expense.treasury_account else None,
                "treasury_account_type": expense.treasury_account.account_type if expense.treasury_account else None,
                "payment_method": expense.payment_method,
                "document_type": "expense",
                "document_id": expense.id,
                "document_label": f"Gasto #{expense.id}",
            })

        invoice_payment_rows = (
            InvoicePayment.query
            .options(joinedload(InvoicePayment.treasury_account), joinedload(InvoicePayment.invoice))
            .join(Invoice, Invoice.id == InvoicePayment.invoice_id)
            .filter(
                Invoice.business_id == business_id,
                InvoicePayment.treasury_account_id.isnot(None),
            )
        )
        if start_date:
            invoice_payment_rows = invoice_payment_rows.filter(InvoicePayment.payment_date >= start_date)
        if end_date:
            invoice_payment_rows = invoice_payment_rows.filter(InvoicePayment.payment_date <= end_date)
        if account_id:
            invoice_payment_rows = invoice_payment_rows.filter(InvoicePayment.treasury_account_id == account_id)
        if account_type:
            invoice_payment_rows = invoice_payment_rows.join(TreasuryAccount, TreasuryAccount.id == InvoicePayment.treasury_account_id).filter(TreasuryAccount.account_type == account_type)
        for payment in invoice_payment_rows.all():
            normalized_event_type = str(payment.event_type or "payment").strip().lower() or "payment"
            movements.append({
                "id": f"invoice-payment-{payment.id}",
                "date": payment.payment_date.isoformat() if payment.payment_date else None,
                "description": payment.note or f"Factura {payment.invoice.invoice_number if payment.invoice else payment.invoice_id}",
                "amount": _safe_round(payment.amount),
                "type": "income" if normalized_event_type == "payment" else "expense",
                "direction": "in" if normalized_event_type == "payment" else "out",
                "category": payment.payment_method or normalized_event_type,
                "source_type": "invoice_payment" if normalized_event_type == "payment" else f"invoice_{normalized_event_type}",
                "source_label": "Cobro de factura" if normalized_event_type == "payment" else "Ajuste de factura",
                "flow_group": "cash_in" if normalized_event_type == "payment" else "operational_expense",
                "scope": "operational",
                "treasury_account_id": payment.treasury_account_id,
                "treasury_account_name": payment.treasury_account.name if payment.treasury_account else None,
                "treasury_account_type": payment.treasury_account.account_type if payment.treasury_account else None,
                "payment_method": payment.payment_method,
                "document_type": "invoice_payment",
                "document_id": payment.id,
                "document_label": f"Movimiento factura #{payment.id}",
            })

        transfer_rows = TreasuryTransfer.query.options(joinedload(TreasuryTransfer.origin_account), joinedload(TreasuryTransfer.destination_account)).filter(TreasuryTransfer.business_id == business_id)
        if start_date:
            transfer_rows = transfer_rows.filter(TreasuryTransfer.transfer_date >= start_date)
        if end_date:
            transfer_rows = transfer_rows.filter(TreasuryTransfer.transfer_date <= end_date)
        for transfer in transfer_rows.all():
            include_out = account_id is None or transfer.origin_account_id == account_id
            include_in = account_id is None or transfer.destination_account_id == account_id
            if account_type and transfer.origin_account and transfer.origin_account.account_type != account_type:
                include_out = False
            if account_type and transfer.destination_account and transfer.destination_account.account_type != account_type:
                include_in = False
            if include_out:
                movements.append({
                    "id": f"transfer-out-{transfer.id}",
                    "date": transfer.transfer_date.isoformat() if transfer.transfer_date else None,
                    "description": transfer.note or f"Transferencia a {transfer.destination_account.name if transfer.destination_account else transfer.destination_account_id}",
                    "amount": _safe_round(transfer.amount),
                    "type": "expense",
                    "direction": "out",
                    "category": "transfer",
                    "source_type": "treasury_transfer",
                    "source_label": "Transferencia interna",
                    "flow_group": "operational_expense",
                    "scope": "operational",
                    "treasury_account_id": transfer.origin_account_id,
                    "treasury_account_name": transfer.origin_account.name if transfer.origin_account else None,
                    "treasury_account_type": transfer.origin_account.account_type if transfer.origin_account else None,
                    "counterparty_account_id": transfer.destination_account_id,
                    "counterparty_account_name": transfer.destination_account.name if transfer.destination_account else None,
                    "counterparty_account_type": transfer.destination_account.account_type if transfer.destination_account else None,
                    "document_type": "treasury_transfer",
                    "document_id": transfer.id,
                    "document_label": f"Transferencia #{transfer.id}",
                })
            if include_in:
                movements.append({
                    "id": f"transfer-in-{transfer.id}",
                    "date": transfer.transfer_date.isoformat() if transfer.transfer_date else None,
                    "description": transfer.note or f"Transferencia desde {transfer.origin_account.name if transfer.origin_account else transfer.origin_account_id}",
                    "amount": _safe_round(transfer.amount),
                    "type": "income",
                    "direction": "in",
                    "category": "transfer",
                    "source_type": "treasury_transfer",
                    "source_label": "Transferencia interna",
                    "flow_group": "cash_in",
                    "scope": "operational",
                    "treasury_account_id": transfer.destination_account_id,
                    "treasury_account_name": transfer.destination_account.name if transfer.destination_account else None,
                    "treasury_account_type": transfer.destination_account.account_type if transfer.destination_account else None,
                    "counterparty_account_id": transfer.origin_account_id,
                    "counterparty_account_name": transfer.origin_account.name if transfer.origin_account else None,
                    "counterparty_account_type": transfer.origin_account.account_type if transfer.origin_account else None,
                    "document_type": "treasury_transfer",
                    "document_id": transfer.id,
                    "document_label": f"Transferencia #{transfer.id}",
                })

        if origin_filter:
            movements = [movement for movement in movements if origin_filter in str(movement.get("source_type") or "").lower()]
        if search:
            movements = [
                movement for movement in movements
                if search in str(movement.get("description") or "").lower()
                or search in str(movement.get("document_label") or "").lower()
                or search in str(movement.get("treasury_account_name") or "").lower()
                or search in str(movement.get("customer_name") or "").lower()
            ]
        movements.sort(key=lambda item: (item.get("date") or "", str(item.get("id") or "")), reverse=True)
        return jsonify({"movements": movements})

    @application.route("/api/businesses/<int:business_id>/reports/financial-dashboard", methods=["GET"])
    @application.route("/api/businesses/<int:business_id>/financial-dashboard", methods=["GET"])
    @token_required
    def get_financial_dashboard(business_id):
        business = Business.query.get(business_id)
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404
        current_user = getattr(g, "current_user", None)
        can_view_financial = bool(current_user) and (
            int(getattr(business, "user_id", 0) or 0) == int(getattr(current_user, "id", 0) or 0)
            or int(getattr(business, "owner_id", 0) or 0) == int(getattr(current_user, "id", 0) or 0)
            or
            has_permission(current_user, "summary.financial", business_id)
            or has_permission(current_user, "summary.dashboard", business_id)
            or has_permission(current_user, "*", business_id)
        )
        if not can_view_financial:
            return jsonify({"error": "Not found"}), 404

        start_date = _parse_date(request.args.get("start_date"))
        end_date = _parse_date(request.args.get("end_date"), default=date.today())
        if start_date is None:
            start_date = date(end_date.year, end_date.month, 1)
        if start_date > end_date:
            return jsonify({"error": "Rango de fechas inválido"}), 400

        previous_end = start_date - timedelta(days=1)
        previous_start = previous_end - timedelta(days=(end_date - start_date).days)

        service = ReportExportService(business_id)
        current_cash = service.build_cash_dataset(start_date, end_date)
        previous_cash = service.build_cash_dataset(previous_start, previous_end)
        current_sales = service.get_sales_dataset(start_date, end_date)
        previous_sales = service.get_sales_dataset(previous_start, previous_end)
        current_invoice = _build_invoice_snapshot(business_id, start_date, end_date, end_date)
        previous_invoice = _build_invoice_snapshot(business_id, previous_start, previous_end, previous_end)
        supplier_payables = _build_supplier_payables_snapshot(business_id, end_date)
        previous_supplier_payables = _build_supplier_payables_snapshot(business_id, previous_end)

        current_cash_summary = current_cash.get("summary", {})
        previous_cash_summary = previous_cash.get("summary", {})
        current_operational_summary = current_cash.get("operational_summary", {})
        current_financial_summary = current_cash.get("financial_summary", {})
        previous_operational_summary = previous_cash.get("operational_summary", {})
        previous_financial_summary = previous_cash.get("financial_summary", {})
        current_receivables_summary = current_cash.get("receivables", {}).get("summary", {})

        current_cash_in = _safe_round(float(current_cash_summary.get("cash_in") or 0) + float(current_invoice.get("gross_collections_total") or 0))
        current_cash_out = _safe_round(float(current_cash_summary.get("cash_out") or 0) + float(current_invoice.get("refunds_total") or 0) + float(current_invoice.get("reversals_total") or 0))
        previous_cash_in = _safe_round(float(previous_cash_summary.get("cash_in") or 0) + float(previous_invoice.get("gross_collections_total") or 0))
        previous_cash_out = _safe_round(float(previous_cash_summary.get("cash_out") or 0) + float(previous_invoice.get("refunds_total") or 0) + float(previous_invoice.get("reversals_total") or 0))

        current_sales_total = _safe_round(current_sales.get("summary", {}).get("sales_total"))
        previous_sales_total = _safe_round(previous_sales.get("summary", {}).get("sales_total"))
        current_sales_cost_total = _safe_round(current_sales.get("summary", {}).get("total_cost"))
        previous_sales_cost_total = _safe_round(previous_sales.get("summary", {}).get("total_cost"))
        current_costed_sales_total = _safe_round(current_sales.get("summary", {}).get("costed_sales_total"))
        previous_costed_sales_total = _safe_round(previous_sales.get("summary", {}).get("costed_sales_total"))
        current_uncosted_sales_total = _safe_round(current_sales.get("summary", {}).get("uncosted_sales_total"))
        previous_uncosted_sales_total = _safe_round(previous_sales.get("summary", {}).get("uncosted_sales_total"))
        current_missing_cost_sales_count = int(current_sales.get("summary", {}).get("missing_cost_sales_count") or 0)
        previous_missing_cost_sales_count = int(previous_sales.get("summary", {}).get("missing_cost_sales_count") or 0)
        current_expenses_total = _safe_round(float(current_cash.get("expenses", {}).get("summary", {}).get("expenses_total") or 0) + float(current_invoice.get("refunds_total") or 0) + float(current_invoice.get("reversals_total") or 0))
        previous_expenses_total = _safe_round(float(previous_cash.get("expenses", {}).get("summary", {}).get("expenses_total") or 0) + float(previous_invoice.get("refunds_total") or 0) + float(previous_invoice.get("reversals_total") or 0))
        current_gross_profit = _safe_round(current_costed_sales_total - current_sales_cost_total)
        previous_gross_profit = _safe_round(previous_costed_sales_total - previous_sales_cost_total)
        current_net_profit = _safe_round(current_gross_profit - current_expenses_total)
        previous_net_profit = _safe_round(previous_gross_profit - previous_expenses_total)
        margin_percent = round((current_net_profit / current_costed_sales_total) * 100, 2) if current_costed_sales_total > 0 else 0

        expense_categories = [
            {
                "key": str(key),
                "category": str(key),
                "total": _safe_round(bucket.get("total")),
            }
            for key, bucket in sorted(
                (current_cash.get("expenses", {}).get("categories") or {}).items(),
                key=lambda item: float(item[1].get("total") or 0),
                reverse=True,
            )
        ]
        cash_out_breakdown = [
            {"key": "operational_expense", "label": "Gasto operativo", "total": _safe_round(current_cash_summary.get("operational_expense_total"))},
            {"key": "supplier_payment", "label": "Pagos a proveedores", "total": _safe_round(current_cash_summary.get("supplier_payments_total"))},
            {"key": "operational_obligation_payment", "label": "Obligaciones operativas", "total": _safe_round(current_cash_summary.get("operational_obligation_payments_total"))},
            {"key": "financial_debt_payment", "label": "Deuda financiera", "total": _safe_round(current_cash_summary.get("financial_debt_payments_total"))},
            {"key": "invoice_adjustments", "label": "Ajustes de factura", "total": _safe_round(float(current_invoice.get("refunds_total") or 0) + float(current_invoice.get("reversals_total") or 0))},
        ]
        cash_out_breakdown = [item for item in cash_out_breakdown if float(item.get("total") or 0) > 0.0001]

        movements = _normalize_cash_movements(current_cash)
        movements.extend(current_invoice.get("movements", []))
        movements.sort(key=lambda item: (item.get("date") or "", str(item.get("id") or "")), reverse=True)

        summary = {
            "sales_total": current_sales_total,
            "sales_cogs_total": current_sales_cost_total,
            "costed_sales_total": current_costed_sales_total,
            "uncosted_sales_total": current_uncosted_sales_total,
            "missing_cost_sales_count": current_missing_cost_sales_count,
            "cash_sales_total": _safe_round(current_cash_summary.get("cash_sales_total")),
            "payments_total": _safe_round(current_cash_summary.get("payments_total")),
            "expenses_total": current_expenses_total,
            "net_profit": current_net_profit,
            "gross_profit": current_gross_profit,
            "margin_percent": margin_percent,
            "cash_in": current_cash_in,
            "cash_out": current_cash_out,
            "cash_net": _safe_round(current_cash_in - current_cash_out),
            "accounts_receivable": _safe_round(float(current_cash_summary.get("accounts_receivable") or 0) + float(current_invoice.get("receivable_total") or 0)),
            "sales_accounts_receivable": _safe_round(current_cash_summary.get("accounts_receivable")),
            "invoice_accounts_receivable": _safe_round(current_invoice.get("receivable_total")),
            "invoice_payments_total": _safe_round(current_invoice.get("net_collections_total")),
            "invoice_gross_collections_total": _safe_round(current_invoice.get("gross_collections_total")),
            "invoice_refunds_total": _safe_round(current_invoice.get("refunds_total")),
            "invoice_reversals_total": _safe_round(current_invoice.get("reversals_total")),
            "invoice_net_collections_total": _safe_round(current_invoice.get("net_collections_total")),
            "customer_collections_total": _safe_round(float(current_cash_summary.get("cash_in") or 0) + float(current_invoice.get("gross_collections_total") or 0)),
            "invoice_collections_total": _safe_round(current_invoice.get("gross_collections_total")),
            "invoice_invoiced_total": _safe_round(current_invoice.get("invoiced_total")),
            "invoice_collection_rate": current_invoice.get("collection_rate") or 0,
            "invoice_average_days_to_collect": current_invoice.get("average_days_to_collect"),
            "invoice_receivable_open_count": int(current_invoice.get("open_count") or 0),
            "invoice_receivable_overdue_count": int(current_invoice.get("overdue_count") or 0),
            "invoice_receivable_customer_count": int(current_invoice.get("customer_count") or 0),
            "accounts_payable": _safe_round(float(current_cash_summary.get("accounts_payable") or 0) + float(supplier_payables.get("total") or 0)),
            "receivables_overdue_total": _safe_round(float(current_cash_summary.get("receivables_overdue_total") or 0) + float(current_invoice.get("overdue_total") or 0)),
            "receivables_due_today_total": _safe_round(float(current_receivables_summary.get("due_today_total") or 0) + float(current_invoice.get("due_today_total") or 0)),
            "receivables_due_soon_total": _safe_round(float(current_cash_summary.get("receivables_due_soon_total") or 0) + float(current_invoice.get("due_soon_total") or 0)),
            "payables_overdue_total": _safe_round(float(current_operational_summary.get("overdue_total") or 0) + float(current_financial_summary.get("overdue_total") or 0) + float(supplier_payables.get("overdue_total") or 0)),
            "payables_due_today_total": _safe_round(float(current_operational_summary.get("due_today_total") or 0) + float(current_financial_summary.get("due_today_total") or 0) + float(supplier_payables.get("due_today_total") or 0)),
            "payables_due_soon_total": _safe_round(float(current_operational_summary.get("due_soon_total") or 0) + float(current_financial_summary.get("due_soon_total") or 0) + float(supplier_payables.get("due_soon_total") or 0)),
            "payables_active_count": int(float(current_operational_summary.get("active_count") or 0) + float(current_financial_summary.get("active_count") or 0) + float(supplier_payables.get("active_count") or 0)),
            "receivable_customers_count": int(float(current_cash.get("receivables", {}).get("summary", {}).get("customers_with_balance") or 0) + float(current_invoice.get("customer_count") or 0)),
            "receivable_overdue_customers_count": int(float(current_cash.get("receivables", {}).get("summary", {}).get("overdue_customers_count") or 0) + float(current_invoice.get("overdue_customer_count") or 0)),
            "operational_expenses_executed_total": _safe_round(current_cash_summary.get("operational_expense_total")),
            "supplier_payments_total": _safe_round(current_cash_summary.get("supplier_payments_total")),
            "operational_obligation_payments_total": _safe_round(current_cash_summary.get("operational_obligation_payments_total")),
            "financial_debt_payments_total": _safe_round(current_cash_summary.get("financial_debt_payments_total")),
            "operational_payables_total": _safe_round(float(current_cash_summary.get("operational_payables_total") or 0) + float(supplier_payables.get("total") or 0)),
            "operational_payables_overdue_total": _safe_round(float(current_operational_summary.get("overdue_total") or 0) + float(supplier_payables.get("overdue_total") or 0)),
            "operational_payables_due_today_total": _safe_round(float(current_operational_summary.get("due_today_total") or 0) + float(supplier_payables.get("due_today_total") or 0)),
            "operational_payables_due_soon_total": _safe_round(float(current_operational_summary.get("due_soon_total") or 0) + float(supplier_payables.get("due_soon_total") or 0)),
            "operational_payables_active_count": int(float(current_operational_summary.get("active_count") or 0) + float(supplier_payables.get("active_count") or 0)),
            "financial_debt_total": _safe_round(current_cash_summary.get("financial_debt_total")),
        }
        previous_period = {
            "sales_total": previous_sales_total,
            "sales_cogs_total": previous_sales_cost_total,
            "costed_sales_total": previous_costed_sales_total,
            "uncosted_sales_total": previous_uncosted_sales_total,
            "missing_cost_sales_count": previous_missing_cost_sales_count,
            "cash_sales_total": _safe_round(previous_cash_summary.get("cash_sales_total")),
            "payments_total": _safe_round(previous_cash_summary.get("payments_total")),
            "expenses_total": previous_expenses_total,
            "net_profit": previous_net_profit,
            "gross_profit": previous_gross_profit,
            "cash_in": previous_cash_in,
            "cash_out": previous_cash_out,
            "cash_net": _safe_round(previous_cash_in - previous_cash_out),
            "accounts_receivable": _safe_round(float(previous_cash_summary.get("accounts_receivable") or 0) + float(previous_invoice.get("receivable_total") or 0)),
            "operational_expenses_executed_total": _safe_round(previous_cash_summary.get("operational_expense_total")),
            "supplier_payments_total": _safe_round(previous_cash_summary.get("supplier_payments_total")),
            "operational_obligation_payments_total": _safe_round(previous_cash_summary.get("operational_obligation_payments_total")),
            "financial_debt_payments_total": _safe_round(previous_cash_summary.get("financial_debt_payments_total")),
            "operational_payables_total": _safe_round(float(previous_cash_summary.get("operational_payables_total") or 0) + float(previous_supplier_payables.get("total") or 0)),
            "financial_debt_total": _safe_round(previous_cash_summary.get("financial_debt_total")),
            "invoice_payments_total": _safe_round(previous_invoice.get("net_collections_total")),
        }
        return jsonify({
            "period": {"start": start_date.isoformat(), "end": end_date.isoformat()},
            "summary": summary,
            "previous_period": previous_period,
            "expense_categories": expense_categories,
            "cash_out_breakdown": cash_out_breakdown,
            "movements": movements,
        })
