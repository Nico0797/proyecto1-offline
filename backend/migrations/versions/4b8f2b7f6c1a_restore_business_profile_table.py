"""Restore business_profile table

Revision ID: 4b8f2b7f6c1a
Revises: 9c2d7f4a1b11
Create Date: 2026-03-24 10:58:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = '4b8f2b7f6c1a'
down_revision = '9c2d7f4a1b11'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    if not inspector.has_table('business_profile'):
        op.create_table(
            'business_profile',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('business_name', sa.Text(), nullable=False, server_default=sa.text("''::text")),
            sa.Column('phone', sa.Text(), nullable=True, server_default=sa.text("''::text")),
            sa.Column('tax_id', sa.Text(), nullable=True, server_default=sa.text("''::text")),
            sa.Column('address', sa.Text(), nullable=True, server_default=sa.text("''::text")),
            sa.Column('message', sa.Text(), nullable=True, server_default=sa.text("''::text")),
            sa.Column('updated_at', sa.Text(), nullable=True, server_default=sa.text("''::text")),
            sa.CheckConstraint('id = 1', name='business_profile_id_check'),
            sa.PrimaryKeyConstraint('id', name='business_profile_pkey'),
        )


def downgrade():
    op.drop_table('business_profile')
