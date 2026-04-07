"""Extend audit logs for business history

Revision ID: 4f7c2a1b9d10
Revises: eeddf3b6e575
Create Date: 2026-03-18 11:45:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = '4f7c2a1b9d10'
down_revision = 'eeddf3b6e575'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    column_names = {column['name'] for column in inspector.get_columns('audit_logs')}
    index_names = {index['name'] for index in inspector.get_indexes('audit_logs')}
    fk_names = {fk['name'] for fk in inspector.get_foreign_keys('audit_logs')}

    column_definitions = {
        'business_id': sa.Column('business_id', sa.Integer(), nullable=True),
        'actor_user_id': sa.Column('actor_user_id', sa.Integer(), nullable=True),
        'actor_member_id': sa.Column('actor_member_id', sa.Integer(), nullable=True),
        'actor_name': sa.Column('actor_name', sa.String(length=100), nullable=True),
        'actor_role': sa.Column('actor_role', sa.String(length=100), nullable=True),
        'module': sa.Column('module', sa.String(length=50), nullable=True),
        'entity_type': sa.Column('entity_type', sa.String(length=50), nullable=True),
        'summary': sa.Column('summary', sa.Text(), nullable=True),
        'metadata_json': sa.Column('metadata_json', sa.JSON(), nullable=True),
        'before_json': sa.Column('before_json', sa.JSON(), nullable=True),
        'after_json': sa.Column('after_json', sa.JSON(), nullable=True),
    }

    for column_name, column in column_definitions.items():
        if column_name not in column_names:
            with op.batch_alter_table('audit_logs', schema=None) as batch_op:
                batch_op.add_column(column)

    for index_name, index_sql in {
        'ix_audit_logs_business_id': 'CREATE INDEX IF NOT EXISTS ix_audit_logs_business_id ON audit_logs (business_id)',
        'ix_audit_logs_actor_user_id': 'CREATE INDEX IF NOT EXISTS ix_audit_logs_actor_user_id ON audit_logs (actor_user_id)',
        'ix_audit_logs_actor_member_id': 'CREATE INDEX IF NOT EXISTS ix_audit_logs_actor_member_id ON audit_logs (actor_member_id)',
        'ix_audit_logs_module': 'CREATE INDEX IF NOT EXISTS ix_audit_logs_module ON audit_logs (module)',
        'ix_audit_logs_entity_type': 'CREATE INDEX IF NOT EXISTS ix_audit_logs_entity_type ON audit_logs (entity_type)',
    }.items():
        if index_name not in index_names:
            op.execute(index_sql)

    fk_specs = [
        ('fk_audit_logs_business_id_businesses', 'businesses', ['business_id'], ['id']),
        ('fk_audit_logs_actor_user_id_users', 'users', ['actor_user_id'], ['id']),
        ('fk_audit_logs_actor_member_id_team_members', 'team_members', ['actor_member_id'], ['id']),
    ]
    for fk_name, referred_table, local_cols, remote_cols in fk_specs:
        if fk_name not in fk_names:
            with op.batch_alter_table('audit_logs', schema=None) as batch_op:
                batch_op.create_foreign_key(fk_name, referred_table, local_cols, remote_cols)

    if 'actor_user_id' in column_names or 'actor_user_id' in column_definitions:
        op.execute("UPDATE audit_logs SET actor_user_id = user_id WHERE actor_user_id IS NULL AND user_id IS NOT NULL")
    if 'entity_type' in column_names or 'entity_type' in column_definitions:
        op.execute("UPDATE audit_logs SET entity_type = entity WHERE entity_type IS NULL AND entity IS NOT NULL")
    if 'before_json' in column_names or 'before_json' in column_definitions:
        op.execute("UPDATE audit_logs SET before_json = old_value WHERE before_json IS NULL AND old_value IS NOT NULL")
    if 'after_json' in column_names or 'after_json' in column_definitions:
        op.execute("UPDATE audit_logs SET after_json = new_value WHERE after_json IS NULL AND new_value IS NOT NULL")


def downgrade():
    with op.batch_alter_table('audit_logs', schema=None) as batch_op:
        batch_op.drop_constraint(None, type_='foreignkey')
        batch_op.drop_constraint(None, type_='foreignkey')
        batch_op.drop_constraint(None, type_='foreignkey')
        batch_op.drop_index(batch_op.f('ix_audit_logs_entity_type'))
        batch_op.drop_index(batch_op.f('ix_audit_logs_module'))
        batch_op.drop_index(batch_op.f('ix_audit_logs_actor_member_id'))
        batch_op.drop_index(batch_op.f('ix_audit_logs_actor_user_id'))
        batch_op.drop_index(batch_op.f('ix_audit_logs_business_id'))
        batch_op.drop_column('after_json')
        batch_op.drop_column('before_json')
        batch_op.drop_column('metadata_json')
        batch_op.drop_column('summary')
        batch_op.drop_column('entity_type')
        batch_op.drop_column('module')
        batch_op.drop_column('actor_role')
        batch_op.drop_column('actor_name')
        batch_op.drop_column('actor_member_id')
        batch_op.drop_column('actor_user_id')
        batch_op.drop_column('business_id')
