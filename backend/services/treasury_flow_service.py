from __future__ import annotations

from backend.database import db
from backend.models import Expense, TreasuryAccount


def _normalize_payment_method(value):
    normalized = str(value or "").strip().lower()
    return normalized or None


def resolve_treasury_context(
    business_id,
    *,
    payment_method=None,
    treasury_account_id=None,
    allow_account_autoselect=True,
    require_account=False,
    missing_account_message=None,
    default_payment_method="cash",
):
    normalized_method = _normalize_payment_method(payment_method)
    account = None
    resolved_id = treasury_account_id

    if resolved_id not in (None, ""):
        try:
            resolved_id = int(resolved_id)
        except (TypeError, ValueError):
            raise ValueError("Cuenta de caja invalida")
        account = TreasuryAccount.query.filter_by(
            id=resolved_id,
            business_id=business_id,
            is_active=True,
        ).first()
        if not account:
            raise ValueError("La cuenta de caja seleccionada no existe")
    elif allow_account_autoselect:
        if normalized_method:
            account = (
                TreasuryAccount.query.filter_by(
                    business_id=business_id,
                    payment_method_key=normalized_method,
                    is_active=True,
                )
                .order_by(TreasuryAccount.is_default.desc(), TreasuryAccount.id.asc())
                .first()
            )
        if account is None:
            account = (
                TreasuryAccount.query.filter_by(
                    business_id=business_id,
                    is_active=True,
                    is_default=True,
                )
                .order_by(TreasuryAccount.id.asc())
                .first()
            )
        if account is None:
            account = (
                TreasuryAccount.query.filter_by(
                    business_id=business_id,
                    is_active=True,
                )
                .order_by(TreasuryAccount.id.asc())
                .first()
            )

    if require_account and account is None:
        raise ValueError(missing_account_message or "Debes seleccionar o configurar una cuenta de caja")

    resolved_method = normalized_method or (account.payment_method_key if account else None) or default_payment_method
    return {
        "treasury_account": account,
        "treasury_account_id": account.id if account else None,
        "payment_method": resolved_method,
    }


def create_expense_record(
    *,
    business_id,
    expense_date,
    category,
    amount,
    description=None,
    source_type="manual",
    payment_method=None,
    treasury_account_id=None,
    recurring_expense_id=None,
    debt_id=None,
    debt_payment_id=None,
    raw_purchase_id=None,
    supplier_payable_id=None,
    supplier_payment_id=None,
    actor_user=None,
    role_snapshot=None,
):
    expense = Expense(
        business_id=business_id,
        expense_date=expense_date,
        category=category,
        amount=round(float(amount or 0), 2),
        description=(str(description).strip() or None) if description not in (None, "") else None,
        source_type=source_type,
        payment_method=_normalize_payment_method(payment_method),
        treasury_account_id=treasury_account_id,
        recurring_expense_id=recurring_expense_id,
        debt_id=debt_id,
        debt_payment_id=debt_payment_id,
        raw_purchase_id=raw_purchase_id,
        supplier_payable_id=supplier_payable_id,
        supplier_payment_id=supplier_payment_id,
        created_by_user_id=getattr(actor_user, "id", None),
        created_by_name=getattr(actor_user, "name", None),
        created_by_role=role_snapshot,
        updated_by_user_id=getattr(actor_user, "id", None),
    )
    db.session.add(expense)
    db.session.flush()
    return expense
