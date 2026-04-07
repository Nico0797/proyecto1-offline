import argparse
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from backend.main import app, COMMERCIAL_SECTION_DEFAULTS, normalize_business_settings
from backend.database import db
from backend.models import Business


def backfill(apply_changes: bool = False):
    with app.app_context():
        businesses = Business.query.order_by(Business.id.asc()).all()
        updated = 0
        inspected = 0

        for business in businesses:
            inspected += 1
            original_settings = business.settings if isinstance(business.settings, dict) else {}
            personalization = original_settings.get('personalization') if isinstance(original_settings, dict) else None
            original_sections = personalization.get('commercial_sections') if isinstance(personalization, dict) else None

            normalized_settings = normalize_business_settings(original_settings)
            normalized_sections = (
                (normalized_settings.get('personalization') or {}).get('commercial_sections')
                if isinstance(normalized_settings, dict)
                else None
            ) or {}

            has_changes = False
            if not isinstance(original_sections, dict):
                has_changes = True
            else:
                for key in COMMERCIAL_SECTION_DEFAULTS.keys():
                    if key not in original_sections:
                        has_changes = True
                        break

            if not has_changes:
                continue

            updated += 1
            print(
                f"Business {business.id} - {business.name}: "
                f"{original_sections if isinstance(original_sections, dict) else 'missing'} -> {normalized_sections}"
            )

            if apply_changes:
                business.settings = normalized_settings

        if apply_changes and updated > 0:
            db.session.commit()
            print(f"\n✅ Backfill aplicado en {updated} negocio(s) de {inspected} inspeccionado(s).")
        elif apply_changes:
            print(f"\n✅ No hubo cambios por aplicar. Negocios inspeccionados: {inspected}.")
        else:
            print(f"\nℹ️ Simulación completada. Cambios detectados en {updated} negocio(s) de {inspected} inspeccionado(s).")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Backfill commercial sections defaults for existing businesses.')
    parser.add_argument('--apply', action='store_true', help='Persist changes to the database.')
    args = parser.parse_args()
    backfill(apply_changes=args.apply)
