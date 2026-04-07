import argparse
import json
import os
import sys
from typing import Any

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from sqlalchemy import text

from backend.main import create_app
from backend.database import db

INDEX_SPECS = [
    {
        "table": "sales",
        "name": "ix_sales_business_id_sale_date",
        "columns": ["business_id", "sale_date"],
        "create_sql": "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_sales_business_id_sale_date ON sales (business_id, sale_date)",
        "drop_sql": "DROP INDEX CONCURRENTLY IF EXISTS ix_sales_business_id_sale_date",
        "reason": "Dashboard summary, dashboard, profitability and reports filter sales by business_id + sale_date.",
    },
    {
        "table": "payments",
        "name": "ix_payments_business_id_payment_date",
        "columns": ["business_id", "payment_date"],
        "create_sql": "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_payments_business_id_payment_date ON payments (business_id, payment_date)",
        "drop_sql": "DROP INDEX CONCURRENTLY IF EXISTS ix_payments_business_id_payment_date",
        "reason": "Financial dashboard and payment datasets filter payments by business_id + payment_date.",
    },
    {
        "table": "expenses",
        "name": "ix_expenses_business_id_expense_date",
        "columns": ["business_id", "expense_date"],
        "create_sql": "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_expenses_business_id_expense_date ON expenses (business_id, expense_date)",
        "drop_sql": "DROP INDEX CONCURRENTLY IF EXISTS ix_expenses_business_id_expense_date",
        "reason": "Dashboard and cash-flow queries filter expenses by business_id + expense_date.",
    },
    {
        "table": "ledger_entries",
        "name": "ix_ledger_entries_business_id_entry_type_entry_date",
        "columns": ["business_id", "entry_type", "entry_date"],
        "create_sql": "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_ledger_entries_business_id_entry_type_entry_date ON ledger_entries (business_id, entry_type, entry_date)",
        "drop_sql": "DROP INDEX CONCURRENTLY IF EXISTS ix_ledger_entries_business_id_entry_type_entry_date",
        "reason": "Dashboard summary aggregates ledger entries by business_id + entry_type, and today's cash widget also filters by entry_date.",
    },
    {
        "table": "invoices",
        "name": "ix_invoices_business_id_issue_date",
        "columns": ["business_id", "issue_date"],
        "create_sql": "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_invoices_business_id_issue_date ON invoices (business_id, issue_date)",
        "drop_sql": "DROP INDEX CONCURRENTLY IF EXISTS ix_invoices_business_id_issue_date",
        "reason": "Invoice receivables and financial dashboard filter invoices by business_id + issue_date range.",
    },
    {
        "table": "invoice_payments",
        "name": "ix_invoice_payments_invoice_id_payment_date",
        "columns": ["invoice_id", "payment_date"],
        "create_sql": "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_invoice_payments_invoice_id_payment_date ON invoice_payments (invoice_id, payment_date)",
        "drop_sql": "DROP INDEX CONCURRENTLY IF EXISTS ix_invoice_payments_invoice_id_payment_date",
        "reason": "Invoice accounting joins invoice_payments to invoices and filters payment rows by invoice_id + payment_date range.",
    },
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--verify", action="store_true")
    parser.add_argument("--drop", action="store_true")
    parser.add_argument("--format", choices=["text", "json"], default="text")
    return parser.parse_args()


def fetch_existing_indexes() -> dict[str, dict[str, Any]]:
    sql = text(
        """
        SELECT tablename, indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = ANY(:names)
        ORDER BY tablename, indexname
        """
    )
    rows = db.session.execute(sql, {"names": [spec["name"] for spec in INDEX_SPECS]}).fetchall()
    return {
        row.indexname: {
            "table": row.tablename,
            "indexdef": row.indexdef,
        }
        for row in rows
    }


def run_statements(statements: list[str]) -> None:
    with db.engine.connect().execution_options(isolation_level="AUTOCOMMIT") as connection:
        for statement in statements:
            connection.execute(text(statement))


def build_report(existing_indexes: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    report = []
    for spec in INDEX_SPECS:
        existing = existing_indexes.get(spec["name"])
        report.append(
            {
                "table": spec["table"],
                "index": spec["name"],
                "columns": spec["columns"],
                "exists": existing is not None,
                "indexdef": existing.get("indexdef") if existing else None,
                "reason": spec["reason"],
            }
        )
    return report


def print_report(report: list[dict[str, Any]], output_format: str) -> None:
    if output_format == "json":
        print(json.dumps(report, indent=2, ensure_ascii=False))
        return

    print("=== Dashboard Composite Indexes ===")
    for item in report:
        print(f"{item['table']} | {item['index']} | exists={item['exists']}")
        print(f"  columns={', '.join(item['columns'])}")
        print(f"  reason={item['reason']}")
        if item.get("indexdef"):
            print(f"  indexdef={item['indexdef']}")



def main() -> int:
    args = parse_args()
    app = create_app()

    with app.app_context():
        if args.drop:
            run_statements([spec["drop_sql"] for spec in INDEX_SPECS])

        if args.apply:
            run_statements([spec["create_sql"] for spec in INDEX_SPECS])

        report = build_report(fetch_existing_indexes())
        print_report(report, args.format)

        if args.verify:
            missing = [item for item in report if not item["exists"]]
            return 1 if missing else 0
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
