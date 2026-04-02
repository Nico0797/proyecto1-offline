import json
import os
import sys

from sqlalchemy import inspect

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.main import create_app
from backend.database import db
from backend.models import AuditLog, InvoicePayment, Payment, TreasuryAccount


def _column_snapshot(inspector, table_name):
    return {
        column['name']: {
            'type': str(column['type']),
            'nullable': bool(column['nullable']),
        }
        for column in inspector.get_columns(table_name)
    }


def build_report():
    app = create_app()
    with app.app_context():
        inspector = inspect(db.engine)
        report = {
            'database_url': app.config.get('SQLALCHEMY_DATABASE_URI'),
            'tables': {},
            'checks': {},
        }

        target_tables = {
            'audit_logs': AuditLog.__table__,
            'invoice_payments': InvoicePayment.__table__,
            'payments': Payment.__table__,
            'treasury_accounts': TreasuryAccount.__table__,
        }

        for table_name, model_table in target_tables.items():
            db_columns = _column_snapshot(inspector, table_name) if inspector.has_table(table_name) else {}
            model_columns = {
                column.name: {
                    'type': str(column.type),
                    'nullable': bool(column.nullable),
                }
                for column in model_table.columns
            }
            missing_in_db = sorted([name for name in model_columns if name not in db_columns])
            extra_in_db = sorted([name for name in db_columns if name not in model_columns])
            nullable_mismatches = []
            for name in sorted(set(model_columns) & set(db_columns)):
                if model_columns[name]['nullable'] != db_columns[name]['nullable']:
                    nullable_mismatches.append({
                        'column': name,
                        'model_nullable': model_columns[name]['nullable'],
                        'db_nullable': db_columns[name]['nullable'],
                    })
            report['tables'][table_name] = {
                'model_columns': model_columns,
                'db_columns': db_columns,
                'missing_in_db': missing_in_db,
                'extra_in_db': extra_in_db,
                'nullable_mismatches': nullable_mismatches,
                'indexes': inspector.get_indexes(table_name),
                'foreign_keys': inspector.get_foreign_keys(table_name),
            }

        report['checks'] = {
            'business_profile_exists': inspector.has_table('business_profile'),
            'treasury_accounts_has_is_default': 'is_default' in report['tables']['treasury_accounts']['db_columns'],
            'treasury_accounts_is_default_nullable_db': report['tables']['treasury_accounts']['db_columns'].get('is_default', {}).get('nullable'),
            'payments_has_updated_at': 'updated_at' in report['tables']['payments']['db_columns'],
            'audit_logs_has_extended_columns': not report['tables']['audit_logs']['missing_in_db'],
            'invoice_payments_missing_columns': report['tables']['invoice_payments']['missing_in_db'],
        }
        return report


if __name__ == '__main__':
    print(json.dumps(build_report(), indent=2, ensure_ascii=False))
