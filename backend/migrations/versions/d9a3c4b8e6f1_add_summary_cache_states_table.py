"""Add summary cache states table

Revision ID: d9a3c4b8e6f1
Revises: c1a9e7d52b31
Create Date: 2026-03-26 11:40:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = 'd9a3c4b8e6f1'
down_revision = 'c1a9e7d52b31'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    tables = set(inspector.get_table_names())

    if 'summary_cache_states' not in tables:
        op.create_table(
            'summary_cache_states',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('business_id', sa.Integer(), nullable=False),
            sa.Column('namespace', sa.String(length=32), nullable=False),
            sa.Column('dirty', sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column('dirty_since', sa.DateTime(), nullable=True),
            sa.Column('last_dirty_at', sa.DateTime(), nullable=True),
            sa.Column('dirty_start_date', sa.Date(), nullable=True),
            sa.Column('dirty_end_date', sa.Date(), nullable=True),
            sa.Column('last_rebuilt_at', sa.DateTime(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.ForeignKeyConstraint(['business_id'], ['businesses.id']),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('business_id', 'namespace', name='uq_summary_cache_states_business_namespace'),
        )

    indexes = {index['name'] for index in inspector.get_indexes('summary_cache_states')} if 'summary_cache_states' in set(inspector.get_table_names()) else set()
    if 'ix_summary_cache_states_business_namespace' not in indexes:
        op.create_index(
            'ix_summary_cache_states_business_namespace',
            'summary_cache_states',
            ['business_id', 'namespace'],
            unique=False,
        )


def downgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    tables = set(inspector.get_table_names())
    if 'summary_cache_states' in tables:
        indexes = {index['name'] for index in inspector.get_indexes('summary_cache_states')}
        if 'ix_summary_cache_states_business_namespace' in indexes:
            op.drop_index('ix_summary_cache_states_business_namespace', table_name='summary_cache_states')
        op.drop_table('summary_cache_states')
