from datetime import datetime
from sqlalchemy.orm import joinedload
from backend.database import db
from backend.models import User, Business, TeamMember, Role, UserRole

def ensure_membership_active(user):
    if not user:
        return
    # Check if user has a paid plan (pro or business)
    if user.plan in ["pro", "business"] and getattr(user, "membership_end", None):
        if user.membership_end < datetime.utcnow():
            user.plan = "free"
            db.session.commit()

def get_user_accessible_businesses(user):
    """
    Obtiene todos los negocios a los que el usuario tiene acceso:
    1. Negocios propios (Owner)
    2. Negocios donde es miembro del equipo (TeamMember)
    3. Negocios donde tiene cuenta legacy de equipo (User con account_type='team_member')
    """
    if not user:
        return []

    accessible = []
    seen_business_ids = set()

    # 1. Negocios propios (Owner)
    # Si el usuario es 'personal', buscamos sus negocios
    if user.account_type == 'personal':
        owned_businesses = Business.query.options(joinedload(Business.user)).filter_by(user_id=user.id).all()
        for b in owned_businesses:
            if b.id not in seen_business_ids:
                accessible.append({
                    "business_id": b.id,
                    "business_name": b.name,
                    "role": "Propietario",
                    "role_id": None, # Owner doesn't strictly need a role ID, or use 'admin'
                    "context_type": "owned",
                    "plan": user.plan, # Owner determines plan
                    "status": "active"
                })
                seen_business_ids.add(b.id)

    # 2. Miembro de equipo (New Model via TeamMember table)
    # Buscamos en la tabla TeamMember donde este user_id es miembro
    memberships = TeamMember.query.options(
        joinedload(TeamMember.role),
        joinedload(TeamMember.business).joinedload(Business.user),
    ).filter_by(user_id=user.id, status='active').all()
    for m in memberships:
        if m.business_id not in seen_business_ids:
            b = m.business
            if b:
                accessible.append({
                    "business_id": b.id,
                    "business_name": b.name,
                    "role": m.role.name if m.role else "Miembro",
                    "role_id": m.role_id,
                    "context_type": "member",
                    "plan": b.user.plan if b.user else "free", # Plan comes from owner
                    "status": m.status
                })
                seen_business_ids.add(b.id)

    # 3. Cuentas Legacy (User con account_type='team_member' y mismo email)
    # Solo si el usuario actual es personal, buscamos sus "alter egos"
    # Si el usuario actual YA es un legacy team member, solo tiene acceso a SU negocio vinculado
    
    if user.account_type == 'personal':
        legacy_accounts = User.query.options(
            joinedload(User.roles).joinedload(UserRole.role),
            joinedload(User.linked_business).joinedload(Business.user),
        ).filter(
            User.email == user.email, 
            User.account_type == 'team_member'
        ).all()
        
        for leg in legacy_accounts:
            if leg.linked_business_id and leg.linked_business_id not in seen_business_ids:
                b = leg.linked_business
                if b:
                    # Determinar rol del legacy account (usualmente tienen un rol asignado en UserRole o se asume)
                    role_name = "Miembro"
                    role_id = None
                    # Legacy accounts might use UserRole directly
                    if leg.roles and len(leg.roles) > 0 and leg.roles[0].role:
                        role_name = leg.roles[0].role.name
                        role_id = leg.roles[0].role.id
                    
                    accessible.append({
                        "business_id": b.id,
                        "business_name": b.name,
                        "role": role_name,
                        "role_id": role_id,
                        "context_type": "legacy_team",
                        "legacy_user_id": leg.id, # Necesario para switch de contexto si se usa legacy
                        "plan": b.user.plan if b.user else "free",
                        "status": "active" if leg.is_active else "inactive"
                    })
                    seen_business_ids.add(b.id)
    elif user.account_type == 'team_member' and user.linked_business_id:
        # Si me logueé directamente como team member legacy, tengo acceso a ese negocio
        if user.linked_business_id not in seen_business_ids:
            b = User.query.options(
                joinedload(User.roles).joinedload(UserRole.role),
                joinedload(User.linked_business).joinedload(Business.user),
            ).filter_by(id=user.id).first()
            b = b.linked_business if b else None
            if b:
                role_name = "Miembro"
                role_id = None
                if user.roles and len(user.roles) > 0 and user.roles[0].role:
                    role_name = user.roles[0].role.name
                    role_id = user.roles[0].role.id
                    
                accessible.append({
                    "business_id": b.id,
                    "business_name": b.name,
                    "role": role_name,
                    "role_id": role_id,
                    "context_type": "legacy_team",
                    "legacy_user_id": user.id,
                    "plan": b.user.plan if b.user else "free",
                    "status": "active" if user.is_active else "inactive"
                })
                seen_business_ids.add(b.id)

    return accessible

def resolve_active_context(user, business_id, accessible_contexts=None):
    """
    Resuelve el contexto activo para un usuario dado un business_id.
    Retorna: (active_context_dict, target_user_obj)
    
    target_user_obj será diferente de user si es un contexto legacy_team.
    """
    if not user or not business_id:
        return None, None
        
    accessible = accessible_contexts if accessible_contexts is not None else get_user_accessible_businesses(user)
    
    # Buscar el contexto solicitado
    selected = next((ctx for ctx in accessible if ctx["business_id"] == int(business_id)), None)
    
    if not selected:
        return None, None
        
    # Determinar el usuario objetivo (Identity Switch si es legacy)
    target_user = user
    if selected["context_type"] == "legacy_team" and selected.get("legacy_user_id"):
        # Switch identity to the legacy user
        target_user = User.query.get(selected["legacy_user_id"])
        
    # Enriquecer con permisos efectivos
    # Importar aquí para evitar ciclo si auth importa membership
    from flask import g
    from backend.auth import get_user_effective_permissions
    previous_hint = getattr(g, "_auth_context_permission_hint", None)
    g._auth_context_permission_hint = {
        "context_type": selected.get("context_type"),
        "role_id": selected.get("role_id"),
    }
    try:
        permissions = get_user_effective_permissions(target_user, business_id)
    finally:
        if previous_hint is None:
            g.pop("_auth_context_permission_hint", None)
        else:
            g._auth_context_permission_hint = previous_hint
    
    active_context = {
        "business_id": selected["business_id"],
        "name": selected["business_name"],
        "role": selected["role"],
        "type": selected["context_type"],
        "permissions": permissions
    }
    
    return active_context, target_user
