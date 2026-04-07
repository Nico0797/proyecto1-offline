import json
import os
import sys

from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import inspect

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.main import create_app
from backend.database import db


def build_report():
    app = create_app()
    with app.app_context():
        cfg = Config(os.path.join(PROJECT_ROOT, 'backend', 'migrations', 'alembic.ini'))
        cfg.set_main_option('script_location', os.path.join(PROJECT_ROOT, 'backend', 'migrations'))
        script = ScriptDirectory.from_config(cfg)
        inspector = inspect(db.engine)

        revision_rows = db.session.execute(db.text('select version_num from alembic_version')).fetchall()
        current_versions = [row[0] for row in revision_rows]

        ordered_revisions = []
        for revision in script.walk_revisions():
            ordered_revisions.append({
                'revision': revision.revision,
                'down_revision': revision.down_revision,
                'doc': revision.doc,
                'path': os.path.relpath(revision.path, PROJECT_ROOT),
            })

        return {
            'database_url': app.config.get('SQLALCHEMY_DATABASE_URI'),
            'alembic_version_table': current_versions,
            'script_heads': list(script.get_heads()),
            'script_bases': list(script.get_bases()),
            'has_business_profile': inspector.has_table('business_profile'),
            'has_alembic_version': inspector.has_table('alembic_version'),
            'versions': ordered_revisions,
        }


if __name__ == '__main__':
    print(json.dumps(build_report(), indent=2, ensure_ascii=False))
