"""Add is_default to treasury accounts

Revision ID: 9c2d7f4a1b11
Revises: 4f7c2a1b9d10
Create Date: 2026-03-23 10:15:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = '9c2d7f4a1b11'
down_revision = '4f7c2a1b9d10'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    column_names = {column['name'] for column in inspector.get_columns('treasury_accounts')}
    index_names = {index['name'] for index in inspector.get_indexes('treasury_accounts')}

    if 'is_default' not in column_names:
        with op.batch_alter_table('treasury_accounts', schema=None) as batch_op:
            batch_op.add_column(sa.Column('is_default', sa.Boolean(), nullable=False, server_default=sa.false()))
    else:
        op.execute("UPDATE treasury_accounts SET is_default = FALSE WHERE is_default IS NULL")
        with op.batch_alter_table('treasury_accounts', schema=None) as batch_op:
            batch_op.alter_column('is_default', existing_type=sa.Boolean(), nullable=False, server_default=sa.false())

    if 'ix_treasury_accounts_is_default' not in index_names:
        op.execute('CREATE INDEX IF NOT EXISTS ix_treasury_accounts_is_default ON treasury_accounts (is_default)')

    op.execute("""
        UPDATE treasury_accounts AS target
        SET is_default = TRUE
        WHERE target.id IN (
            SELECT ranked.id
            FROM (
                SELECT
                    id,
                    business_id,
                    ROW_NUMBER() OVER (
                        PARTITION BY business_id
                        ORDER BY
                            CASE WHEN is_active THEN 0 ELSE 1 END,
                            created_at,
                            id
                    ) AS row_num
                FROM treasury_accounts
            ) AS ranked
            WHERE ranked.row_num = 1
        )
    """)


def downgrade():
    with op.batch_alter_table('treasury_accounts', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_treasury_accounts_is_default'))
        batch_op.drop_column('is_default')
