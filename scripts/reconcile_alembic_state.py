import argparse
import json
import os
import sys

from alembic import command
from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import inspect

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.main import create_app
from backend.database import db


def _build_config():
    cfg = Config(os.path.join(PROJECT_ROOT, 'backend', 'migrations', 'alembic.ini'))
    cfg.set_main_option('script_location', os.path.join(PROJECT_ROOT, 'backend', 'migrations'))
    return cfg


def _snapshot():
    app = create_app()
    with app.app_context():
        inspector = inspect(db.engine)
        cfg = _build_config()
        script = ScriptDirectory.from_config(cfg)
        version_rows = db.session.execute(db.text('select version_num from alembic_version')).fetchall()
        return {
            'database_url': app.config.get('SQLALCHEMY_DATABASE_URI'),
            'alembic_version': [row[0] for row in version_rows],
            'heads': list(script.get_heads()),
            'business_profile_exists': inspector.has_table('business_profile'),
            'treasury_is_default_nullable': next((column['nullable'] for column in inspector.get_columns('treasury_accounts') if column['name'] == 'is_default'), None),
            'audit_extended_columns': sorted([
                column['name']
                for column in inspector.get_columns('audit_logs')
                if column['name'] in {'business_id', 'actor_user_id', 'actor_member_id', 'actor_name', 'actor_role', 'module', 'entity_type', 'summary', 'metadata_json', 'before_json', 'after_json'}
            ]),
            'invoice_payment_columns': sorted([column['name'] for column in inspector.get_columns('invoice_payments')]),
            'invoice_payment_indexes': sorted([index['name'] for index in inspector.get_indexes('invoice_payments')]),
        }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--target', default='head')
    args = parser.parse_args()

    before = _snapshot()
    result = {
        'before': before,
        'applied': False,
        'target': args.target,
        'after': before,
    }

    if args.apply:
        cfg = _build_config()
        app = create_app()
        with app.app_context():
            command.upgrade(cfg, args.target)
        result['applied'] = True
        result['after'] = _snapshot()

    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()
