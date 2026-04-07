import argparse
import json
import os
import sys
from typing import Any

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from sqlalchemy import text

from backend.database import db
from backend.main import create_app

INDEX_SPECS = [
    {
        "table": "team_members",
        "name": "ix_team_members_user_status_business",
        "columns": ["user_id", "status", "business_id"],
        "create_sql_postgres": "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_team_members_user_status_business ON team_members (user_id, status, business_id)",
        "create_sql_default": "CREATE INDEX IF NOT EXISTS ix_team_members_user_status_business ON team_members (user_id, status, business_id)",
        "drop_sql_postgres": "DROP INDEX CONCURRENTLY IF EXISTS ix_team_members_user_status_business",
        "drop_sql_default": "DROP INDEX IF EXISTS ix_team_members_user_status_business",
        "reason": "auth.login, membership lookup y select-context filtran team_members por user_id + status y luego por business_id.",
    },
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--verify", action="store_true")
    parser.add_argument("--drop", action="store_true")
    parser.add_argument("--format", choices=["text", "json"], default="text")
    return parser.parse_args()


def _dialect_name() -> str:
    return db.engine.dialect.name


def _fetch_existing_indexes() -> dict[str, dict[str, Any]]:
    dialect = _dialect_name()
    if dialect == "postgresql":
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

    inspector_sql = text(
        """
        SELECT name
        FROM sqlite_master
        WHERE type = 'index'
          AND name = :name
        """
    )
    existing = {}
    for spec in INDEX_SPECS:
        row = db.session.execute(inspector_sql, {"name": spec["name"]}).fetchone()
        if row:
            existing[spec["name"]] = {
                "table": spec["table"],
                "indexdef": spec["name"],
            }
    return existing


def _statement_for(spec: dict[str, Any], action: str) -> str:
    dialect = _dialect_name()
    if action == "create":
        return spec["create_sql_postgres"] if dialect == "postgresql" else spec["create_sql_default"]
    return spec["drop_sql_postgres"] if dialect == "postgresql" else spec["drop_sql_default"]


def run_statements(statements: list[str]) -> None:
    dialect = _dialect_name()
    if dialect == "postgresql":
        with db.engine.connect().execution_options(isolation_level="AUTOCOMMIT") as connection:
            for statement in statements:
                connection.execute(text(statement))
        return

    with db.engine.begin() as connection:
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

    print("=== Auth Path Indexes ===")
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
            run_statements([_statement_for(spec, "drop") for spec in INDEX_SPECS])

        if args.apply:
            run_statements([_statement_for(spec, "create") for spec in INDEX_SPECS])

        report = build_report(_fetch_existing_indexes())
        print_report(report, args.format)

        if args.verify:
            missing = [item for item in report if not item["exists"]]
            return 1 if missing else 0
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
