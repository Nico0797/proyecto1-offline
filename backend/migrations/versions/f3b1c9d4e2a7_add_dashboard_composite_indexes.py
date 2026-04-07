"""Add dashboard composite indexes

Revision ID: f3b1c9d4e2a7
Revises: 4b8f2b7f6c1a
Create Date: 2026-03-24 14:30:00.000000

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = 'f3b1c9d4e2a7'
down_revision = '4b8f2b7f6c1a'
branch_labels = None
depends_on = None


INDEX_STATEMENTS = [
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_sales_business_id_sale_date ON sales (business_id, sale_date)",
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_payments_business_id_payment_date ON payments (business_id, payment_date)",
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_expenses_business_id_expense_date ON expenses (business_id, expense_date)",
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_ledger_entries_business_id_entry_type_entry_date ON ledger_entries (business_id, entry_type, entry_date)",
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_invoices_business_id_issue_date ON invoices (business_id, issue_date)",
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_invoice_payments_invoice_id_payment_date ON invoice_payments (invoice_id, payment_date)",
]

DROP_STATEMENTS = [
    "DROP INDEX CONCURRENTLY IF EXISTS ix_invoice_payments_invoice_id_payment_date",
    "DROP INDEX CONCURRENTLY IF EXISTS ix_invoices_business_id_issue_date",
    "DROP INDEX CONCURRENTLY IF EXISTS ix_ledger_entries_business_id_entry_type_entry_date",
    "DROP INDEX CONCURRENTLY IF EXISTS ix_expenses_business_id_expense_date",
    "DROP INDEX CONCURRENTLY IF EXISTS ix_payments_business_id_payment_date",
    "DROP INDEX CONCURRENTLY IF EXISTS ix_sales_business_id_sale_date",
]


def upgrade():
    context = op.get_context()
    for statement in INDEX_STATEMENTS:
        with context.autocommit_block():
            op.execute(statement)



def downgrade():
    context = op.get_context()
    for statement in DROP_STATEMENTS:
        with context.autocommit_block():
            op.execute(statement)
