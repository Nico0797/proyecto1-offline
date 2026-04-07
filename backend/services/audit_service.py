from __future__ import annotations

from typing import Any

from flask import current_app, request
from sqlalchemy import MetaData, Table, inspect

from backend.database import db
from backend.models import AuditLog, Business, TeamMember
from backend.services.membership_catalog import is_plan_at_least


AUDIT_SUMMARY_LABELS = {
    'create': 'creó',
    'update': 'actualizó',
    'delete': 'eliminó',
    'pay': 'registró pago en',
    'approve': 'aprobó',
    'cancel': 'canceló',
    'adjust': 'ajustó',
    'archive': 'archivó',
    'invite': 'invitó',
    'assign': 'asignó',
}

EXTENDED_AUDIT_COLUMNS = {
    'business_id',
    'actor_user_id',
    'actor_member_id',
    'actor_name',
    'actor_role',
    'module',
    'entity_type',
    'summary',
    'metadata_json',
    'before_json',
    'after_json',
}

MODULE_PRESENTATION_LABELS = {
    'sales': 'Ventas',
    'accounts_receivable': 'Pagos y cobros',
    'customers': 'Clientes',
    'products': 'Productos',
    'raw_inventory': 'Inventario',
    'team': 'Equipo y permisos',
    'settings': 'Configuración',
}

ACTION_PRESENTATION_LABELS = {
    'create': 'Creación',
    'update': 'Actualización',
    'delete': 'Eliminación',
    'adjust': 'Ajuste',
    'pay': 'Pago',
    'approve': 'Aprobación',
    'cancel': 'Cancelación',
    'archive': 'Archivo',
    'invite': 'Invitación',
    'assign': 'Asignación',
}

ENTITY_PRESENTATION_LABELS = {
    'business': 'configuración del negocio',
    'business_modules': 'módulos del negocio',
    'team_member': 'miembro del equipo',
    'team_invitation': 'invitación del equipo',
    'product': 'producto',
    'customer': 'cliente',
    'sale': 'venta',
    'payment': 'pago',
}

FIELD_PRESENTATION_LABELS = {
    'name': 'Nombre del negocio',
    'currency': 'Moneda',
    'timezone': 'Zona horaria',
    'monthly_sales_goal': 'Meta mensual',
    'business_type': 'Tipo de negocio',
    'settings.logo': 'Logo',
    'logo': 'Logo',
    'logo_url': 'Logo',
    'settings.address': 'Dirección',
    'address': 'Dirección',
    'settings.phone': 'Teléfono',
    'phone': 'Teléfono',
    'settings.email': 'Correo de contacto',
    'email': 'Correo',
    'settings.invoice_prefix': 'Prefijo de facturas',
    'invoice_prefix': 'Prefijo de facturas',
    'display_currency': 'Moneda visible',
    'auto_consume_recipes_on_sale': 'Consumo automático de recetas',
    'whatsapp_templates': 'Plantillas de WhatsApp',
    'settings.whatsapp': 'WhatsApp del negocio',
    'old_role': 'Rol anterior',
    'new_role': 'Nuevo rol',
}

MODULE_KEY_PRESENTATION_LABELS = {
    'dashboard': 'Inicio',
    'sales': 'Ventas',
    'accounts_receivable': 'Pagos y cobros',
    'customers': 'Clientes',
    'products': 'Productos',
    'raw_inventory': 'Inventario',
    'team': 'Equipo',
    'settings': 'Configuración',
    'quotes': 'Cotizaciones',
    'orders': 'Pedidos',
    'invoices': 'Facturas',
    'expenses': 'Gastos',
    'analytics': 'Análisis',
    'cash': 'Caja',
}

TECHNICAL_AUDIT_FIELDS = {
    'id',
    'user_id',
    'business_id',
    'entity_id',
    'actor_user_id',
    'actor_member_id',
    'module',
    'module_key',
    'changed_fields',
    'diff',
    'before',
    'after',
    'details',
    'settings',
}


def _normalize_payload(value: Any):
    if value is None:
        return None
    if isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, dict):
        return {str(key): _normalize_payload(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_normalize_payload(item) for item in value]
    if hasattr(value, 'to_dict'):
        try:
            return _normalize_payload(value.to_dict())
        except Exception:
            return str(value)
    return str(value)


def _get_request_details():
    try:
        return request.remote_addr, request.headers.get('User-Agent')
    except RuntimeError:
        return None, None


def _get_audit_log_columns():
    cache_key = 'audit_log_columns'
    extensions = getattr(current_app, 'extensions', None)
    if isinstance(extensions, dict) and cache_key in extensions:
        return extensions[cache_key]

    try:
        columns = {
            column['name']
            for column in inspect(db.engine).get_columns('audit_logs')
        }
    except Exception:
        columns = set()

    if isinstance(extensions, dict):
        extensions[cache_key] = columns

    return columns


def _has_extended_audit_schema(columns: set[str] | None = None):
    resolved_columns = columns if columns is not None else _get_audit_log_columns()
    return EXTENDED_AUDIT_COLUMNS.issubset(resolved_columns)


def _insert_legacy_audit_event(
    *,
    business_id: int | None,
    actor_context: dict[str, Any],
    module: str | None,
    entity_type: str,
    entity_id: int | None,
    action: str,
    summary: str,
    metadata: Any,
    before: Any,
    after: Any,
    commit: bool,
    supported_columns: set[str] | None = None,
):
    ip_address, user_agent = _get_request_details()
    table_columns = supported_columns if supported_columns is not None else _get_audit_log_columns()
    audit_logs_table = Table('audit_logs', MetaData(), autoload_with=db.engine)
    legacy_after = {
        'summary': summary,
        'module': module,
        'metadata': metadata,
        'after': after,
        'business_id': business_id,
        'actor_name': actor_context.get('actor_name'),
        'actor_role': actor_context.get('actor_role'),
    }
    legacy_payload = {
        'user_id': actor_context.get('actor_user_id'),
        'action': action,
        'entity': entity_type,
        'entity_id': entity_id,
        'old_value': before,
        'new_value': legacy_after,
        'ip_address': ip_address,
        'user_agent': user_agent,
    }
    if 'timestamp' in table_columns:
        legacy_payload['timestamp'] = db.func.now()

    filtered_payload = {
        key: value
        for key, value in legacy_payload.items()
        if key in table_columns
    }
    db.session.execute(audit_logs_table.insert().values(**filtered_payload))
    if commit:
        db.session.commit()
    return True


def snapshot_model(instance: Any, keys: list[str] | None = None):
    if instance is None:
        return None
    payload = _normalize_payload(instance)
    if isinstance(payload, dict) and keys:
        return {key: payload.get(key) for key in keys}
    return payload


def compute_diff(before: Any, after: Any):
    before_payload = _normalize_payload(before) if before is not None else None
    after_payload = _normalize_payload(after) if after is not None else None

    if not isinstance(before_payload, dict) or not isinstance(after_payload, dict):
        return None

    diff = {}
    all_keys = set(before_payload.keys()) | set(after_payload.keys())
    for key in sorted(all_keys):
        if before_payload.get(key) != after_payload.get(key):
            diff[key] = {
                'before': before_payload.get(key),
                'after': after_payload.get(key),
            }

    return diff or None


def resolve_business_plan(business: Business | int | None, actor_user=None):
    resolved_business = business if isinstance(business, Business) else None
    if resolved_business is None and business is not None:
        resolved_business = Business.query.get(int(business))

    if resolved_business and resolved_business.user:
        return resolved_business.user.plan

    return getattr(actor_user, 'plan', None)


def is_business_audit_enabled(business: Business | int | None, actor_user=None):
    return is_plan_at_least(resolve_business_plan(business, actor_user), 'business')


def resolve_actor_context(actor_user=None, business_id: int | None = None):
    actor_user_id = getattr(actor_user, 'id', None)
    actor_name = getattr(actor_user, 'name', None)
    actor_role = None
    actor_member_id = None

    if business_id and actor_user_id:
        business = Business.query.get(business_id)
        if business and business.user_id == actor_user_id:
            actor_role = 'Propietario'
        else:
            member = TeamMember.query.filter_by(user_id=actor_user_id, business_id=business_id, status='active').first()
            if member:
                actor_member_id = member.id
                actor_role = member.role.name if member.role else None

    if not actor_role and getattr(actor_user, 'is_admin', False):
        actor_role = 'SuperAdmin'

    return {
        'actor_user_id': actor_user_id,
        'actor_member_id': actor_member_id,
        'actor_name': actor_name,
        'actor_role': actor_role,
    }


def build_summary(action: str, entity_type: str, entity_label: str | None = None):
    verb = AUDIT_SUMMARY_LABELS.get(action, action)
    target = entity_label or entity_type.replace('_', ' ')
    return f'{verb.capitalize()} {target}'


def _humanize_token(value: str | None):
    if not value:
        return None
    normalized = str(value).replace('.', ' ').replace('_', ' ').strip()
    if not normalized:
        return None
    return normalized[0].upper() + normalized[1:]


def _humanize_module(value: str | None):
    return MODULE_PRESENTATION_LABELS.get(value or '', _humanize_token(value) or 'General')


def _humanize_action(value: str | None):
    return ACTION_PRESENTATION_LABELS.get(value or '', _humanize_token(value) or 'Acción')


def _humanize_entity(value: str | None):
    return ENTITY_PRESENTATION_LABELS.get(value or '', (_humanize_token(value) or 'registro').lower())


def _humanize_field_name(value: str | None):
    if not value:
        return 'Campo'
    key = str(value)
    if key in FIELD_PRESENTATION_LABELS:
        return FIELD_PRESENTATION_LABELS[key]
    if key.startswith('settings.'):
        setting_key = key.split('.', 1)[1]
        return FIELD_PRESENTATION_LABELS.get(key, _humanize_token(setting_key) or 'Campo')
    return _humanize_token(key) or 'Campo'


def _humanize_module_key(value: str | None):
    if not value:
        return 'Módulo'
    return MODULE_KEY_PRESENTATION_LABELS.get(str(value), _humanize_token(value) or 'Módulo')


def _format_audit_value(value: Any):
    if value is None:
        return 'Sin valor'
    if isinstance(value, bool):
        return 'Activado' if value else 'Desactivado'
    if isinstance(value, (int, float)):
        if isinstance(value, float):
            return f'{value:,.2f}'
        return f'{value:,}'
    if isinstance(value, str):
        clean = value.strip()
        if not clean:
            return 'Vacío'
        if clean.startswith('/assets/') or clean.startswith('assets/'):
            return 'Actualizado'
        return clean
    if isinstance(value, list):
        if not value:
            return 'Sin elementos'
        if all(isinstance(item, (str, int, float, bool)) for item in value[:4]):
            preview = ', '.join(_format_audit_value(item) for item in value[:3])
            if len(value) > 3:
                preview = f'{preview} y {len(value) - 3} más'
            return preview
        return 'Actualizado'
    if isinstance(value, dict):
        return 'Actualizado'
    return str(value)


def _build_field_change_highlight(field_name: str, before: Any, after: Any):
    label = _humanize_field_name(field_name)
    if field_name in {'settings.logo', 'logo', 'logo_url'}:
        return 'Se actualizó el logo del negocio'
    if before is None and after is not None:
        return f'{label}: {_format_audit_value(after)}'
    if before is not None and after is None:
        return f'{label}: se eliminó'
    if isinstance(before, bool) or isinstance(after, bool):
        return f'{label}: {_format_audit_value(after)}'
    before_text = _format_audit_value(before)
    after_text = _format_audit_value(after)
    if before_text == after_text:
        return f'{label}: {after_text}'
    if before_text == 'Sin valor':
        return f'{label}: {after_text}'
    if after_text == 'Sin valor':
        return f'{label}: se eliminó'
    if before_text == 'Actualizado' or after_text == 'Actualizado':
        return f'{label}: actualizado'
    return f'{label}: {before_text} -> {after_text}'


def _extract_diff_items(metadata: dict[str, Any] | None):
    if not isinstance(metadata, dict):
        return []
    diff = metadata.get('diff')
    if not isinstance(diff, dict):
        return []

    items = []
    for field_name, change in diff.items():
        if field_name in TECHNICAL_AUDIT_FIELDS or not isinstance(change, dict):
            continue
        items.append((field_name, change.get('before'), change.get('after')))
    return items


def _extract_module_highlights(metadata: dict[str, Any] | None):
    if not isinstance(metadata, dict):
        return []
    changed_modules = metadata.get('changed_modules')
    if not isinstance(changed_modules, list):
        return []

    highlights = []
    for item in changed_modules:
        if not isinstance(item, dict):
            continue
        module_label = _humanize_module_key(item.get('module_key'))
        before = bool(item.get('before'))
        after = bool(item.get('after'))
        if before == after:
            continue
        highlights.append(f'Se {"activó" if after else "desactivó"} {module_label}')
    return highlights


def _extract_metadata_highlights(metadata: dict[str, Any] | None):
    if not isinstance(metadata, dict):
        return []

    highlights = []
    old_role = metadata.get('old_role')
    new_role = metadata.get('new_role')
    if old_role or new_role:
        if old_role and new_role:
            highlights.append(f'Rol: {old_role} -> {new_role}')
        elif new_role:
            highlights.append(f'Nuevo rol: {new_role}')

    email = metadata.get('email')
    if isinstance(email, str) and email.strip():
        highlights.append(f'Correo: {email.strip()}')

    invitation_status = metadata.get('invitation_status')
    if invitation_status:
        highlights.append(f'Estado de invitación: {(_humanize_token(str(invitation_status)) or str(invitation_status)).lower()}')

    return highlights


def _extract_human_highlights(payload: dict[str, Any]):
    metadata = payload.get('metadata_json') if isinstance(payload.get('metadata_json'), dict) else None
    highlights = []
    highlights.extend(_extract_module_highlights(metadata))

    diff_items = _extract_diff_items(metadata)
    if diff_items:
        for field_name, before, after in diff_items:
            highlights.append(_build_field_change_highlight(field_name, before, after))
    else:
        before_payload = payload.get('before_json')
        after_payload = payload.get('after_json')
        if isinstance(before_payload, dict) and isinstance(after_payload, dict):
            all_keys = sorted(set(before_payload.keys()) | set(after_payload.keys()))
            for field_name in all_keys:
                if field_name in TECHNICAL_AUDIT_FIELDS:
                    continue
                if before_payload.get(field_name) == after_payload.get(field_name):
                    continue
                highlights.append(
                    _build_field_change_highlight(
                        field_name,
                        before_payload.get(field_name),
                        after_payload.get(field_name),
                    )
                )

    highlights.extend(_extract_metadata_highlights(metadata))

    deduped = []
    seen = set()
    for item in highlights:
        normalized = str(item).strip()
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        deduped.append(normalized)
    return deduped


def _build_human_title(payload: dict[str, Any], highlights: list[str]):
    module = payload.get('module')
    entity_type = payload.get('entity_type') or payload.get('entity')
    action = payload.get('action')
    changed_labels = [item.split(':', 1)[0].strip() for item in highlights if ':' in item]

    if module == 'settings' and entity_type == 'business':
        if changed_labels == ['Moneda']:
            return 'Se actualizó la moneda del negocio'
        if changed_labels == ['Meta mensual']:
            return 'Se actualizó la meta mensual'
        if changed_labels == ['Tipo de negocio']:
            return 'Se actualizó el tipo de negocio'
        if changed_labels == ['Logo'] or 'Se actualizó el logo del negocio' in highlights:
            return 'Se actualizó el logo del negocio'
        return 'Se actualizó la configuración del negocio'

    if module == 'settings' and entity_type == 'business_modules':
        return 'Se actualizaron los módulos del negocio'

    if module == 'team' and entity_type == 'team_invitation' and action == 'invite':
        return 'Se envió una invitación al equipo'

    if module == 'team' and entity_type == 'team_invitation' and action == 'delete':
        return 'Se canceló una invitación del equipo'

    if module == 'team' and entity_type == 'team_member' and action == 'assign':
        return 'Se modificó el rol de un miembro del equipo'

    if module == 'team' and entity_type == 'team_member' and action == 'delete':
        return 'Se retiró a un miembro del equipo'

    action_label = _humanize_action(action).lower()
    entity_label = _humanize_entity(entity_type)
    return f'{action_label.capitalize()} de {entity_label}'


def _build_human_summary(payload: dict[str, Any], highlights: list[str]):
    detail = payload.get('detail')
    if isinstance(detail, str) and detail.strip():
        text = detail.strip()
        if 'module_key' not in text and 'changed_fields' not in text and 'diff' not in text:
            return text

    module = payload.get('module')
    entity_type = payload.get('entity_type') or payload.get('entity')
    actor_name = payload.get('actor_name') or payload.get('user_email') or 'Sistema'

    if module == 'settings' and entity_type == 'business' and highlights:
        return f'{actor_name} actualizó datos generales o preferencias del negocio.'

    if module == 'settings' and entity_type == 'business_modules' and highlights:
        return 'Se activaron y desactivaron módulos del negocio según la selección realizada.'

    if module == 'team' and entity_type == 'team_invitation':
        return 'El cambio impacta la composición del equipo y sus accesos.'

    if module == 'team' and entity_type == 'team_member':
        return 'El cambio impacta permisos o participación dentro del equipo.'

    if highlights:
        return highlights[0]

    summary = payload.get('summary')
    if isinstance(summary, str) and summary.strip():
        return summary.strip()

    return 'Se registró un cambio en la configuración del negocio.'


def present_audit_log(audit_log: AuditLog | dict[str, Any]):
    payload = audit_log.to_dict() if hasattr(audit_log, 'to_dict') else dict(audit_log or {})
    metadata = payload.get('metadata_json') if isinstance(payload.get('metadata_json'), dict) else {}
    highlights = _extract_human_highlights(payload)
    source_path = metadata.get('source_path') if isinstance(metadata, dict) else None
    actor_name = payload.get('actor_name') or payload.get('user_email') or 'Sistema'

    hidden_count = max(len(highlights) - 5, 0)

    return {
        'id': payload.get('id'),
        'module': payload.get('module'),
        'category': _humanize_module(payload.get('module')),
        'action': payload.get('action'),
        'action_label': _humanize_action(payload.get('action')),
        'title': _build_human_title(payload, highlights),
        'summary': _build_human_summary(payload, highlights),
        'highlights': highlights,
        'extra_changes_count': hidden_count,
        'actor': actor_name,
        'actor_role': payload.get('actor_role'),
        'timestamp': payload.get('timestamp') or payload.get('created_at'),
        'source_path': source_path,
        'source_label': 'Ver origen' if source_path else None,
    }


def record_audit_event(
    *,
    business_id: int | None,
    actor_user=None,
    module: str | None,
    entity_type: str,
    entity_id: int | None,
    action: str,
    summary: str | None = None,
    metadata: Any = None,
    before: Any = None,
    after: Any = None,
    allow_without_plan: bool = False,
    commit: bool = False,
):
    try:
        if not allow_without_plan and not is_business_audit_enabled(business_id, actor_user):
            return None

        audit_columns = _get_audit_log_columns()
        actor_context = resolve_actor_context(actor_user, business_id)
        normalized_before = _normalize_payload(before)
        normalized_after = _normalize_payload(after)
        normalized_metadata = _normalize_payload(metadata)

        if isinstance(normalized_metadata, dict):
            diff = compute_diff(normalized_before, normalized_after)
            if diff:
                normalized_metadata = {
                    **normalized_metadata,
                    'diff': diff,
                }
        elif normalized_metadata is None:
            diff = compute_diff(normalized_before, normalized_after)
            normalized_metadata = {'diff': diff} if diff else None

        summary_text = summary or build_summary(action, entity_type)
        if not _has_extended_audit_schema(audit_columns):
            return _insert_legacy_audit_event(
                business_id=business_id,
                actor_context=actor_context,
                module=module,
                entity_type=entity_type,
                entity_id=entity_id,
                action=action,
                summary=summary_text,
                metadata=normalized_metadata,
                before=normalized_before,
                after=normalized_after,
                commit=commit,
                supported_columns=audit_columns,
            )

        ip_address, user_agent = _get_request_details()
        audit_log = AuditLog(
            business_id=business_id,
            user_id=actor_context['actor_user_id'],
            actor_user_id=actor_context['actor_user_id'],
            actor_member_id=actor_context['actor_member_id'],
            actor_name=actor_context['actor_name'],
            actor_role=actor_context['actor_role'],
            module=module,
            action=action,
            entity=entity_type,
            entity_type=entity_type,
            entity_id=entity_id,
            summary=summary_text,
            metadata_json=normalized_metadata,
            old_value=normalized_before,
            new_value=normalized_after,
            before_json=normalized_before,
            after_json=normalized_after,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        db.session.add(audit_log)

        if commit:
            db.session.commit()

        return audit_log
    except Exception as exc:
        db.session.rollback()
        print(f'[AUDIT] Error logging audit: {exc}')
        return None
