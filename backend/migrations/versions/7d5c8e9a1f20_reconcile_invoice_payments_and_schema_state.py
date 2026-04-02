"""Reconcile invoice_payments and schema state

Revision ID: 7d5c8e9a1f20
Revises: f3b1c9d4e2a7
Create Date: 2026-03-24 15:36:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = '7d5c8e9a1f20'
down_revision = 'f3b1c9d4e2a7'
branch_labels = None
depends_on = None


INVOICE_PAYMENT_INDEXES = {
    'ix_invoice_payments_source_payment_id': 'CREATE INDEX IF NOT EXISTS ix_invoice_payments_source_payment_id ON invoice_payments (source_payment_id)',
    'ix_invoice_payments_treasury_account_id': 'CREATE INDEX IF NOT EXISTS ix_invoice_payments_treasury_account_id ON invoice_payments (treasury_account_id)',
}


INVOICE_PAYMENT_FKS = [
    ('fk_invoice_payments_source_payment_id_invoice_payments', 'invoice_payments', ['source_payment_id'], ['id']),
    ('fk_invoice_payments_treasury_account_id_treasury_accounts', 'treasury_accounts', ['treasury_account_id'], ['id']),
]


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)

    treasury_columns = {column['name']: column for column in inspector.get_columns('treasury_accounts')}
    treasury_indexes = {index['name'] for index in inspector.get_indexes('treasury_accounts')}
    if 'is_default' in treasury_columns and treasury_columns['is_default'].get('nullable', True):
        op.execute("UPDATE treasury_accounts SET is_default = FALSE WHERE is_default IS NULL")
        with op.batch_alter_table('treasury_accounts', schema=None) as batch_op:
            batch_op.alter_column('is_default', existing_type=sa.Boolean(), nullable=False, server_default=sa.false())
    if 'ix_treasury_accounts_is_default' not in treasury_indexes:
        op.execute('CREATE INDEX IF NOT EXISTS ix_treasury_accounts_is_default ON treasury_accounts (is_default)')

    invoice_payment_columns = {column['name']: column for column in inspector.get_columns('invoice_payments')}
    invoice_payment_indexes = {index['name'] for index in inspector.get_indexes('invoice_payments')}
    invoice_payment_fk_names = {fk['name'] for fk in inspector.get_foreign_keys('invoice_payments')}

    if 'event_type' in invoice_payment_columns and invoice_payment_columns['event_type'].get('nullable', True):
        op.execute("UPDATE invoice_payments SET event_type = 'payment' WHERE event_type IS NULL")
        with op.batch_alter_table('invoice_payments', schema=None) as batch_op:
            batch_op.alter_column('event_type', existing_type=sa.String(length=20), nullable=False)

    for index_name, sql in INVOICE_PAYMENT_INDEXES.items():
        if index_name not in invoice_payment_indexes:
            op.execute(sql)

    for fk_name, referred_table, local_cols, remote_cols in INVOICE_PAYMENT_FKS:
        if fk_name not in invoice_payment_fk_names:
            with op.batch_alter_table('invoice_payments', schema=None) as batch_op:
                batch_op.create_foreign_key(fk_name, referred_table, local_cols, remote_cols)


def downgrade():
    with op.batch_alter_table('invoice_payments', schema=None) as batch_op:
        batch_op.drop_constraint('fk_invoice_payments_treasury_account_id_treasury_accounts', type_='foreignkey')
        batch_op.drop_constraint('fk_invoice_payments_source_payment_id_invoice_payments', type_='foreignkey')
    op.execute('DROP INDEX IF EXISTS ix_invoice_payments_treasury_account_id')
    op.execute('DROP INDEX IF EXISTS ix_invoice_payments_source_payment_id')
