"""Add summary daily aggregates table

Revision ID: c1a9e7d52b31
Revises: 7d5c8e9a1f20
Create Date: 2026-03-26 09:20:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = 'c1a9e7d52b31'
down_revision = '7d5c8e9a1f20'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    tables = set(inspector.get_table_names())

    if 'summary_daily_aggregates' not in tables:
        op.create_table(
            'summary_daily_aggregates',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('business_id', sa.Integer(), nullable=False),
            sa.Column('summary_date', sa.Date(), nullable=False),
            sa.Column('sales_total', sa.Float(), nullable=False, server_default='0'),
            sa.Column('sales_count', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('total_cost', sa.Float(), nullable=False, server_default='0'),
            sa.Column('expenses_total', sa.Float(), nullable=False, server_default='0'),
            sa.Column('expenses_count', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('payments_total', sa.Float(), nullable=False, server_default='0'),
            sa.Column('cash_sales_total', sa.Float(), nullable=False, server_default='0'),
            sa.Column('cash_sales_cost', sa.Float(), nullable=False, server_default='0'),
            sa.Column('payments_realized_cost', sa.Float(), nullable=False, server_default='0'),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.ForeignKeyConstraint(['business_id'], ['businesses.id']),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('business_id', 'summary_date', name='uq_summary_daily_aggregates_business_date'),
        )

    indexes = {index['name'] for index in inspector.get_indexes('summary_daily_aggregates')}
    if 'ix_summary_daily_aggregates_business_summary_date' not in indexes:
        op.create_index(
            'ix_summary_daily_aggregates_business_summary_date',
            'summary_daily_aggregates',
            ['business_id', 'summary_date'],
            unique=False,
        )


def downgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    tables = set(inspector.get_table_names())
    if 'summary_daily_aggregates' in tables:
        indexes = {index['name'] for index in inspector.get_indexes('summary_daily_aggregates')}
        if 'ix_summary_daily_aggregates_business_summary_date' in indexes:
            op.drop_index('ix_summary_daily_aggregates_business_summary_date', table_name='summary_daily_aggregates')
        op.drop_table('summary_daily_aggregates')
