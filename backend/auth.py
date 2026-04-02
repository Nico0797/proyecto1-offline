# Cuaderno - Autenticación JWT
# ============================================
"""
Módulo de autenticación con JWT y RBAC
"""
import os
import jwt
import random
import smtplib
import time
from email.message import EmailMessage
from datetime import datetime, timedelta
from functools import wraps
import requests
from flask import request, jsonify, g, current_app
from backend.database import db
from backend.models import User, Permission, Role, RolePermission, AuditLog, UserRole, TeamMember, Business, BusinessModule, BUSINESS_MODULE_DEFAULTS, AppSettings
from backend.account_access import resolve_account_access
from backend.services.audit_service import record_audit_event
from backend.services.rbac import expand_permission_aliases, extract_commercial_sections, extract_operational_profile, resolve_effective_permissions


def _read_boolean_env(value, default=True):
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    normalized = str(value).strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    return default


def is_account_code_activation_required() -> bool:
    try:
        configured = current_app.config.get("ACCOUNT_CODE_ACTIVATION_REQUIRED")
    except Exception:
        configured = None
    if configured is None:
        configured = os.getenv("ACCOUNT_CODE_ACTIVATION_REQUIRED")
    return _read_boolean_env(configured, default=True)


def should_expose_verification_code_in_dev() -> bool:
    try:
        if current_app.config.get("DEBUG"):
            return True
    except Exception:
        pass

    try:
        host = (request.host or "").strip().lower()
    except Exception:
        host = ""
    if host.startswith("localhost") or host.startswith("127.0.0.1"):
        return True

    app_env = str(os.getenv("APP_ENV") or "").strip().lower()
    flask_env = str(os.getenv("FLASK_ENV") or "").strip().lower()
    return app_env == "dev" or flask_env in {"development", "dev"}


def emit_verification_code_debug(email: str, code: str) -> None:
    message = f"[DEV EMAIL OTP] {email} -> {code}"
    try:
        current_app.logger.warning(message)
    except Exception:
        pass
    print(message, flush=True)


def _get_request_query_count() -> int:
    try:
        return int(getattr(g, "_sql_query_count", 0) or 0)
    except Exception:
        return 0


def _get_request_query_time_ms() -> float:
    try:
        return float(getattr(g, "_sql_query_time_ms", 0.0) or 0.0)
    except Exception:
        return 0.0


def _record_profile_stage(profile: dict | None, stage_name: str, started_at: float, *, extra: dict | None = None) -> None:
    if profile is None:
        return
    stages = profile.setdefault("stages", {})
    stage = stages.setdefault(
        stage_name,
        {
            "count": 0,
            "wall_ms": 0.0,
            "queries": 0,
            "sql_time_ms": 0.0,
        },
    )
    stage["count"] = int(stage.get("count") or 0) + 1
    stage["wall_ms"] = round(float(stage.get("wall_ms") or 0.0) + ((time.perf_counter() - started_at) * 1000.0), 3)
    stage["queries"] = int(stage.get("queries") or 0)
    stage["sql_time_ms"] = round(float(stage.get("sql_time_ms") or 0.0), 3)
    if extra:
        for key, value in extra.items():
            stage[key] = value


def _profile_sql_stage(profile: dict | None, stage_name: str, func):
    started_at = time.perf_counter()
    queries_before = _get_request_query_count()
    sql_before = _get_request_query_time_ms()
    result = func()
    if profile is not None:
        stages = profile.setdefault("stages", {})
        stage = stages.setdefault(
            stage_name,
            {
                "count": 0,
                "wall_ms": 0.0,
                "queries": 0,
                "sql_time_ms": 0.0,
            },
        )
        stage["count"] = int(stage.get("count") or 0) + 1
        stage["wall_ms"] = round(float(stage.get("wall_ms") or 0.0) + ((time.perf_counter() - started_at) * 1000.0), 3)
        stage["queries"] = int(stage.get("queries") or 0) + max(_get_request_query_count() - queries_before, 0)
        stage["sql_time_ms"] = round(float(stage.get("sql_time_ms") or 0.0) + max(_get_request_query_time_ms() - sql_before, 0.0), 3)
    return result


def _get_user_role_ids(user_id):
    if not user_id:
        return []
    rows = db.session.query(UserRole.role_id).filter(UserRole.user_id == user_id).all()
    return sorted({int(role_id) for (role_id,) in rows if role_id is not None})


def _get_permission_names_for_role_ids(role_ids, *, include_business_scoped):
    normalized_role_ids = sorted({int(role_id) for role_id in role_ids if role_id is not None})
    if not normalized_role_ids:
        return set()

    query = (
        db.session.query(Permission.name)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .filter(RolePermission.role_id.in_(normalized_role_ids))
    )
    if not include_business_scoped:
        query = query.filter(Permission.scope == 'system')

    return {name for (name,) in query.distinct().all() if name}


def _get_global_permissions(user, business_id=None):
    permissions = set()
    if not user or not getattr(user, 'id', None):
        return permissions

    business_id_int = None
    if business_id is not None:
        try:
            business_id_int = int(business_id)
        except (TypeError, ValueError):
            business_id_int = None

    allow_business_scoped = (
        getattr(user, 'account_type', None) == 'team_member'
        and business_id_int is not None
        and getattr(user, 'linked_business_id', None) == business_id_int
    )

    permissions.update(
        _get_permission_names_for_role_ids(
            _get_user_role_ids(user.id),
            include_business_scoped=allow_business_scoped,
        )
    )

    return permissions


def _normalize_business_id(business_id):
    if business_id is None:
        return None
    try:
        return int(business_id)
    except (TypeError, ValueError):
        return None


def _get_active_modules_for_business(business_id):
    business_id_int = _normalize_business_id(business_id)
    if business_id_int is None:
        return set()
    rows = BusinessModule.query.filter_by(business_id=business_id_int).all()
    module_map = {row.module_key: row for row in rows}
    active_modules = set()
    for module_key, default_enabled in BUSINESS_MODULE_DEFAULTS.items():
        row = module_map.get(module_key)
        enabled = bool(row.enabled) if row else bool(default_enabled)
        if enabled:
            active_modules.add(module_key)
    return active_modules


def _get_business_rbac_context(user, business):
    settings = business.settings if isinstance(getattr(business, 'settings', None), dict) else {}
    access = resolve_account_access(user)
    return {
        'plan': access.get('plan') or 'basic',
        'operational_profile': extract_operational_profile(settings),
        'commercial_sections': extract_commercial_sections(settings),
        'active_modules': _get_active_modules_for_business(getattr(business, 'id', None)),
    }


AUTH_SESSION_VERSION_PREFIX = "auth_session_version:"


def _auth_session_setting_key(user_id):
    return f"{AUTH_SESSION_VERSION_PREFIX}{int(user_id)}"


def get_user_session_version(user_id):
    if not user_id:
        return 0

    setting = AppSettings.query.filter_by(key=_auth_session_setting_key(user_id)).first()
    if not setting or setting.value in (None, ""):
        return 0

    try:
        return int(setting.value)
    except (TypeError, ValueError):
        return 0


def bump_user_session_version(user_id, *, commit=True):
    if not user_id:
        return 0

    key = _auth_session_setting_key(user_id)
    setting = AppSettings.query.filter_by(key=key).first()
    next_version = get_user_session_version(user_id) + 1

    if setting:
        setting.value = str(next_version)
    else:
        db.session.add(AppSettings(key=key, value=str(next_version)))

    if commit:
        db.session.commit()

    return next_version


def _is_session_token_valid(user, payload):
    if not user:
        return False, "Usuario no encontrado", "USER_NOT_FOUND"

    if hasattr(user, "is_active") and not user.is_active:
        return False, "La cuenta está deshabilitada", "ACCOUNT_DISABLED"

    token_session_version = payload.get("sv")
    current_session_version = get_user_session_version(user.id)

    if token_session_version is None:
        return current_session_version == 0, "La sesión fue invalidada", "SESSION_INVALIDATED"

    try:
        token_session_version = int(token_session_version)
    except (TypeError, ValueError):
        return False, "La sesión es inválida", "SESSION_INVALIDATED"

    if token_session_version != current_session_version:
        return False, "La sesión fue invalidada", "SESSION_INVALIDATED"

    return True, None, None


def create_token(user_id, token_type="access", session_version=None):
    """Crear token JWT"""
    if token_type == "access":
        # Usar la configuración de la app en lugar de leer directamente de env para respetar los cambios en config.py
        expires = current_app.config.get("JWT_ACCESS_TOKEN_EXPIRES", 86400)
    else:
        expires = current_app.config.get("JWT_REFRESH_TOKEN_EXPIRES", 2592000)

    # Convertir a datetime directamente para el payload
    expiration_time = datetime.utcnow() + timedelta(seconds=expires)
    
    payload = {
        "user_id": user_id,
        "type": token_type,
        "sv": int(session_version if session_version is not None else get_user_session_version(user_id)),
        "exp": expiration_time,
        "iat": datetime.utcnow(),
    }

    secret = current_app.config["JWT_SECRET_KEY"]
    # jwt.encode devuelve bytes en versiones viejas y str en nuevas, nos aseguramos compatibilidad
    token = jwt.encode(payload, secret, algorithm="HS256")
    if isinstance(token, bytes):
        token = token.decode('utf-8')
    return token


def decode_token(token):
    """Decodificar y validar token JWT"""
    secret = current_app.config["JWT_SECRET_KEY"]
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def get_bearer_token_from_request():
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return None, "Token requerido"

    parts = auth_header.split()
    if len(parts) != 2 or parts[0] != "Bearer":
        return None, "Formato de token inválido"

    return parts[1], None


def authenticate_request_user():
    token, token_error = get_bearer_token_from_request()
    if token_error:
        return None, None, token_error, "TOKEN_MISSING"

    payload = decode_token(token)
    if not payload:
        return None, None, "Inicio de sesión expirado", "TOKEN_EXPIRED"

    user_id = payload.get("user_id")
    user = User.query.get(user_id)
    is_valid_session, session_error, session_code = _is_session_token_valid(user, payload)
    if not is_valid_session:
        return None, None, session_error, session_code

    return user, payload, None, None


def get_user_from_token():
    """Obtener usuario desde el token en el header o query param"""
    token = None
    
    # Check Authorization header
    auth_header = request.headers.get("Authorization")
    if auth_header:
        parts = auth_header.split()
        if len(parts) == 2 and parts[0] == "Bearer":
            token = parts[1]

    # Check query parameter as fallback (useful for direct downloads/links)
    if not token:
        token = request.args.get("token")

    if not token:
        return None

    try:
        payload = decode_token(token)

        if not payload:
            return None

        user_id = payload.get("user_id")
        if not user_id:
            return None

        user = User.query.get(user_id)
        return user

    except Exception:
        return None


def has_permission(user, permission_name, business_id=None):
    """
    Verificar si el usuario tiene un permiso específico.
    
    Args:
        user: Instancia del modelo User
        permission_name: Nombre del permiso (ej: 'products.read', 'admin.*')
        business_id: ID del negocio (opcional)
    
    Returns:
        bool: True si tiene el permiso, False en caso contrario
    """
    if not user:
        return False
    if getattr(user, 'is_admin', False):
        return True
    if hasattr(user, 'is_active') and not user.is_active:
        return False

    effective_permissions = set(get_user_effective_permissions(user, business_id))
    if permission_name in effective_permissions:
        return True
    if '*' in effective_permissions:
        return True
    if permission_name.endswith('.*'):
        prefix = permission_name[:-2]
        return any(name.startswith(f'{prefix}.') for name in effective_permissions)
    permission_prefix = permission_name.split('.')[0]
    wildcard_permission = f"{permission_prefix}.*"
    if wildcard_permission in effective_permissions:
        return True
    if 'admin.*' in effective_permissions:
        return True
    return False


def get_user_effective_permissions(user, business_id=None):
    """
    Obtiene la lista completa de permisos efectivos de un usuario
    para un contexto de negocio específico o global.
    """
    if not user:
        return []
    if getattr(user, 'is_admin', False):
        return ['*']
    if hasattr(user, 'is_active') and not user.is_active:
        return []

    business_id_int = _normalize_business_id(business_id)
    context_type = None
    role_id = None
    context_hint = getattr(g, '_auth_context_permission_hint', None)
    if isinstance(context_hint, dict):
        context_type = context_hint.get('context_type')
        role_id = context_hint.get('role_id')

    if context_type == 'owned':
        return ['*']

    global_permissions = _get_global_permissions(user, business_id_int)
    if business_id_int is None:
        return expand_permission_aliases(sorted(global_permissions), include_compatibility=True)

    business = Business.query.get(business_id_int)
    if business and business.user_id == user.id:
        return ['*']

    role_name = None
    role_permissions = set(global_permissions)
    if role_id is not None:
        role = Role.query.get(role_id)
        if role:
            role_name = role.name
            role_permissions.update(
                _get_permission_names_for_role_ids(
                    [role.id],
                    include_business_scoped=True,
                )
            )
    else:
        member = TeamMember.query.filter_by(user_id=user.id, business_id=business_id_int, status='active').first()
        if member and member.role:
            role_name = member.role.name
            role_permissions.update(
                role_perm.permission.name
                for role_perm in member.role.permissions
                if role_perm.permission and role_perm.permission.name
            )

    if business is None:
        return expand_permission_aliases(sorted(role_permissions), include_compatibility=True)

    rbac_context = _get_business_rbac_context(user, business)
    resolved = resolve_effective_permissions(
        plan=rbac_context['plan'],
        operational_profile=rbac_context['operational_profile'],
        active_modules=rbac_context['active_modules'],
        role_name=role_name,
        base_permissions=sorted(role_permissions),
        commercial_sections=rbac_context['commercial_sections'],
        is_owner=False,
        is_admin=False,
    )
    return resolved['effective_permissions']


def permission_required(permission_name):
    """
    Decorador para requerir un permiso específico.
    Intenta deducir business_id de los argumentos.
    
    Usage:
        @permission_required('products.read')
        def my_endpoint(business_id):
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            user = g.get('current_user')
            
            if not user:
                return jsonify({"error": "Autenticación requerida"}), 401
            
            # Intentar obtener business_id
            business_id = kwargs.get('business_id') or request.args.get('business_id')
            if not business_id and request.is_json:
                data = request.get_json(silent=True)
                if data and isinstance(data, dict):
                    business_id = data.get('business_id')
            
            if not has_permission(user, permission_name, business_id):
                # Registrar intento de acceso no autorizado
                _log_audit(user, 'access_denied', 'permission', None, 
                          {'permission_required': permission_name, 'business_id': business_id}, None)
                return jsonify({"error": f"Permiso requerido: {permission_name}"}), 403
            
            return f(*args, **kwargs)
        return decorated
    return decorator


def _ensure_default_role(user):
    try:
        if not user or not user.id:
            return
        existing = db.session.query(UserRole.user_id).filter(UserRole.user_id == user.id).first()
        if existing:
            return
        owns_business = db.session.query(Business.id).filter(Business.user_id == user.id).first() is not None
        if not owns_business:
            return
        role_rows = (
            db.session.query(Role.id, Role.name)
            .filter(Role.name.in_(["PROPIETARIO", "ADMIN"]))
            .all()
        )
        role_id = next((role_id for role_id, role_name in role_rows if role_name == "PROPIETARIO"), None)
        if role_id is None:
            role_id = next((role_id for role_id, role_name in role_rows if role_name == "ADMIN"), None)

        if role_id is not None:
            user_role = UserRole(user_id=user.id, role_id=role_id)
            db.session.add(user_role)
            db.session.commit()
    except Exception as e:
        print(f"[AUTH] Error ensuring default role: {e}")


def _log_audit(user, action, entity, entity_id, old_value=None, new_value=None):
    """
    Función helper para crear logs de auditoría.
    """
    try:
        actor_user = user
        if isinstance(user, int):
            actor_user = User.query.get(user)

        business_id = None
        if isinstance(old_value, dict) and old_value.get('business_id'):
            business_id = old_value.get('business_id')
        elif isinstance(new_value, dict) and new_value.get('business_id'):
            business_id = new_value.get('business_id')
        elif getattr(actor_user, 'linked_business_id', None):
            business_id = actor_user.linked_business_id

        module = None
        if entity in {'role', 'team_member', 'team_invitation'} and business_id:
            module = 'team'
        elif entity in {'role', 'permission', 'user'}:
            module = 'admin'

        record_audit_event(
            business_id=business_id,
            actor_user=actor_user,
            module=module,
            entity_type=entity,
            entity_id=entity_id,
            action=action,
            before=old_value,
            after=new_value,
            allow_without_plan=True,
            commit=True,
        )
    except Exception as e:
        print(f"[AUDIT] Error logging audit: {e}")


def token_required(f):
    """Decorator para requerir autenticación"""
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            user, _, error_message, error_code = authenticate_request_user()
            if error_message:
                return jsonify({"error": error_message, "code": error_code}), 401

            g.authenticated_user = user
            g.current_user = user
            g.preview_session = None

            try:
                from backend.demo_preview import resolve_effective_user

                effective_user, preview_session = resolve_effective_user(user)
                g.current_user = effective_user or user
                g.preview_session = preview_session
            except Exception:
                g.current_user = user
                g.preview_session = None
        except Exception as e:
            return jsonify({"error": "Error de autenticación", "details": str(e)}), 401

        return f(*args, **kwargs)
    
    return decorated


def optional_token(f):
    """Decorator opcional - permite acceso sin token pero lo proporciona si existe"""
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_user_from_token()
        g.authenticated_user = user
        g.current_user = user
        g.preview_session = None
        return f(*args, **kwargs)

    return decorated


class AuthManager:
    """Gestor de autenticación"""

    @staticmethod
    def generate_email_otp():
        """Generar código OTP de 6 dígitos"""
        return "".join(str(random.randint(0, 9)) for _ in range(6))

    @staticmethod
    def _get_email_template(subject, content_html):
        """Plantilla HTML base para emails"""
        base_url = os.getenv("PUBLIC_BASE_URL") or os.getenv("APP_BASE_URL") or "https://app.encaja.co"
        logo_url = f"{base_url.rstrip('/')}/assets/logo.png"
        
        body_bg = "#020617"
        card_bg = "#1e293b"
        border_color = "#334155"
        text_muted = "#94a3b8"
        
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0;padding:0;background-color:{body_bg};font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:{body_bg};min-height:100vh;">
                <tr>
                    <td align="center" style="padding:40px 20px;">
                        <div style="margin-bottom:30px;text-align:center;">
                            <img src="{logo_url}" alt="EnCaja Logo" width="120" style="display:block;margin:0 auto;max-width:100%;height:auto;" />
                        </div>
                        
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:{card_bg};border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.4);border:1px solid {border_color}">
                            <tr>
                                <td style="height:6px;background:linear-gradient(90deg, #22c55e, #3b82f6);"></td>
                            </tr>
                            <tr>
                                <td style="padding:40px 30px;">
                                    <h1 style="margin:0 0 20px;color:#ffffff;font-size:24px;font-weight:700;text-align:center;">{subject}</h1>
                                    {content_html}
                                </td>
                            </tr>
                        </table>
                        
                        <div style="margin-top:24px;color:{text_muted};font-size:12px;text-align:center;">
                            <p style="margin:0"> 2023 EnCaja. Todos los derechos reservados.</p>
                            <p style="margin:5px 0 0">Orden para soñar en grande.</p>
                        </div>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """

    @staticmethod
    def _build_html_email(subject, text):
        """Construye el HTML del correo usando la plantilla base"""
        text_color = "#f8fafc"
        code_bg = "#0f172a"
        code_border = "#334155"
        code_label = "#60a5fa"
        code_value = "#ffffff"
        text_muted = "#94a3b8"
        accent_color = "#3b82f6"
        border_color = "#334155"

        import re
        code_match = re.search(r"\b(\d{6})\b", text or "")
        code = code_match.group(1) if code_match else ""
        
        paragraphs = "".join(
            f"<p style=\"margin:0 0 16px;color:{text_color};font-size:16px;line-height:1.6\">{line}</p>"
            for line in (text or "").split("\n") if line.strip()
        )
        
        code_block = f"""
            <div style="margin:24px 0;padding:20px;border-radius:12px;background:{code_bg};border:1px solid {code_border};text-align:center">
                <div style="font-size:14px;color:{code_label};margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;font-weight:600">Tu código de seguridad</div>
                <div style="font-size:36px;font-weight:700;color:{code_value};letter-spacing:8px;font-family:monospace">{code}</div>
            </div>
        """ if code else ""
        
        support_block = f"""
            <div style="margin-top:24px;padding-top:24px;border-top:1px solid {border_color};text-align:center;color:{text_muted}">
                <div style="font-size:14px;margin-bottom:8px">¿Necesitas ayuda?</div>
                <div style="font-size:14px">
                    <a href="https://wa.me/573192426874" style="color:{accent_color};text-decoration:none;margin:0 10px">WhatsApp</a>
                    <a href="mailto:encajapp@gmail.com" style="color:{accent_color};text-decoration:none;margin:0 10px">Email</a>
                </div>
            </div>
        """
        
        # Additional text for expiration
        footer_text = f"""
            <p style="margin:20px 0 0;color:{text_muted};font-size:14px;text-align:center;">
                Este código expira en 10 minutos. Si no solicitaste este correo, puedes ignorarlo de forma segura.
            </p>
        """

        content_html = f"{paragraphs}{code_block}{footer_text}{support_block}"
        return AuthManager._get_email_template(subject, content_html)

    @staticmethod
    def _send_mailjet_email(to_email, subject, text, html=None):
        api_key = os.getenv("MAILJET_API_KEY")
        api_secret = os.getenv("MAILJET_API_SECRET")
        sender = os.getenv("MAILJET_SENDER") or os.getenv("SMTP_FROM") or "no-reply@localhost"
        if not api_key or not api_secret or not sender:
            print(
                f"[MAILJET SKIP] missing config "
                f"api_key={bool(api_key)} secret={bool(api_secret)} sender={bool(sender)}"
            )
            return False
        try:
            sender_name = os.getenv("MAILJET_SENDER_NAME", "EnCaja")
            payload = {
                "Messages": [
                    {
                        "From": {
                            "Email": sender,
                            "Name": sender_name,
                        },
                        "To": [
                            {
                                "Email": to_email,
                            }
                        ],
                        "Subject": subject,
                        "TextPart": text or "",
                    }
                ]
            }
            if html:
                payload["Messages"][0]["HTMLPart"] = html
            response = requests.post(
                "https://api.mailjet.com/v3.1/send",
                auth=(api_key, api_secret),
                json=payload,
                timeout=10,
            )
            if 200 <= response.status_code < 300:
                return True
            print(f"[MAILJET ERROR] {response.status_code} {response.text[:200]}")
            return False
        except Exception as e:
            print(f"[MAILJET EXCEPTION] {e}")
            return False

    @staticmethod
    def _is_placeholder(value):
        if not value: return True
        return "placeholder" in value or "tu_correo" in value or "your-" in value

    @staticmethod
    def _send_brevo_email(to_email, subject, text, html=None):
        api_key = os.getenv("BREVO_API_KEY")
        if AuthManager._is_placeholder(api_key):
            print(f"[BREVO SKIP] API Key is placeholder")
            return {"success": False, "error": "API Key is placeholder"}
            
        sender = os.getenv("BREVO_SENDER") or os.getenv("MAILJET_SENDER") or os.getenv("SMTP_FROM")
        if not api_key or not sender:
            print(
                f"[BREVO SKIP] missing config "
                f"api_key={bool(api_key)} sender={bool(sender)}"
            )
            return {"success": False, "error": "Missing config"}
        try:
            sender_name = os.getenv("BREVO_SENDER_NAME") or os.getenv("MAILJET_SENDER_NAME") or "EnCaja"
            payload = {
                "sender": {
                    "email": sender,
                    "name": sender_name,
                },
                "to": [
                    {
                        "email": to_email,
                    }
                ],
                "subject": subject,
                "textContent": text or "",
            }
            if html:
                payload["htmlContent"] = html
            response = requests.post(
                "https://api.brevo.com/v3/smtp/email",
                headers={
                    "api-key": api_key,
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=10,
            )
            if 200 <= response.status_code < 300:
                data = response.json()
                return {"success": True, "message_id": data.get("messageId"), "data": data}
            print(f"[BREVO ERROR] {response.status_code} {response.text[:200]}")
            return {"success": False, "error": f"Brevo Error: {response.status_code}", "details": response.text}
        except Exception as e:
            print(f"[BREVO EXCEPTION] {e}")
            return {"success": False, "error": str(e)}

    @staticmethod
    def send_password_reset_email(email, name, code):
        """Enviar email de recuperación de contraseña o log si SMTP no está configurado"""
        plain = f"Hola {name},\n\nTu código para restablecer contraseña es: {code}\n\nEste código expira en 10 minutos."
        html = AuthManager._build_html_email("Restablecer contraseña", plain)
        provider = (os.getenv("EMAIL_PROVIDER") or "").lower()
        sent = False
        if provider == "brevo":
            result = AuthManager._send_brevo_email(email, "Tu código para restablecer contraseña", plain, html)
            sent = result.get("success", False) if isinstance(result, dict) else result
        else:
            sent = AuthManager._send_mailjet_email(email, "Tu código para restablecer contraseña", plain, html)
        if sent:
            return
        if provider in ("mailjet", "brevo"):
            print(f"[PASSWORD RESET] To: {email} | Code: {code}")
            return
        host = os.getenv("SMTP_HOST")
        port = os.getenv("SMTP_PORT")
        user = os.getenv("SMTP_USER")
        password = os.getenv("SMTP_PASS")
        sender = os.getenv("SMTP_FROM", user or "no-reply@localhost")

        if not host or not port or not user or not password:
            print(f"[PASSWORD RESET] To: {email} | Code: {code}")
            return

        msg = EmailMessage()
        msg["Subject"] = "Tu código para restablecer contraseña"
        msg["From"] = sender
        msg["To"] = email
        msg.set_content(plain)
        msg.add_alternative(html, subtype="html")

        with smtplib.SMTP(host, int(port)) as server:
            server.starttls()
            server.login(user, password)
            server.send_message(msg)

    @staticmethod
    def send_verification_email(email, name, code):
        """Enviar email de verificación o log si SMTP no está configurado"""
        plain = f"Hola {name},\n\nTu código de verificación es: {code}\n\nEste código expira en 10 minutos."
        html = AuthManager._build_html_email("Verificación de correo", plain)
        provider = (os.getenv("EMAIL_PROVIDER") or "").lower()
        sent = False
        if provider == "brevo":
            result = AuthManager._send_brevo_email(email, "Tu código de verificación", plain, html)
            sent = result.get("success", False) if isinstance(result, dict) else result
        else:
            sent = AuthManager._send_mailjet_email(email, "Tu código de verificación", plain, html)
        if sent:
            return
        if provider in ("mailjet", "brevo"):
            print(f"[EMAIL OTP] To: {email} | Code: {code}")
            return
        host = os.getenv("SMTP_HOST")
        port = os.getenv("SMTP_PORT")
        user = os.getenv("SMTP_USER")
        password = os.getenv("SMTP_PASS")
        sender = os.getenv("SMTP_FROM", user or "no-reply@localhost")

        print(f"[SMTP DEBUG] host={host!r} port={port!r} user={user!r} password_set={bool(password)}")

        if not host or not port or not user or not password or \
           AuthManager._is_placeholder(user) or AuthManager._is_placeholder(host):
            print(f"[EMAIL OTP] To: {email} | Code: {code}")
            return

        msg = EmailMessage()
        msg["Subject"] = "Tu código de verificación"
        msg["From"] = sender
        msg["To"] = email
        msg.set_content(plain)
        msg.add_alternative(html, subtype="html")

        try:
            with smtplib.SMTP(host, int(port), timeout=10) as server:
                server.starttls()
                server.login(user, password)
                server.send_message(msg)
        except Exception as e:
            print(f"[SMTP ERROR] {e}")
            print(f"[EMAIL OTP] To: {email} | Code: {code}")

    @staticmethod
    def send_plain_email(to_email, subject, text):
        provider = (os.getenv("EMAIL_PROVIDER") or "").lower()
        sent = False
        if provider == "brevo":
            result = AuthManager._send_brevo_email(to_email, subject, text, None)
            sent = result.get("success", False) if isinstance(result, dict) else result
        else:
            sent = AuthManager._send_mailjet_email(to_email, subject, text, None)
        if sent:
            return True
        if provider in ("mailjet", "brevo"):
            print(f"[EMAIL PLAIN] To: {to_email} | Subject: {subject} | Body: {text}")
            return False
        host = os.getenv("SMTP_HOST")
        port = os.getenv("SMTP_PORT")
        user = os.getenv("SMTP_USER")
        password = os.getenv("SMTP_PASS")
        sender = os.getenv("SMTP_FROM", user or "no-reply@localhost")

        if not host or not port or not user or not password:
            print(f"[EMAIL PLAIN] To: {to_email} | Subject: {subject} | Body: {text}")
            return False

        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = sender
        msg["To"] = to_email
        msg.set_content(text)

        try:
            with smtplib.SMTP(host, int(port), timeout=10) as server:
                server.starttls()
                server.login(user, password)
                server.send_message(msg)
            return True
        except Exception as e:
            print(f"[SMTP ERROR PLAIN] {e}")
            print(f"[EMAIL PLAIN] To: {to_email} | Subject: {subject} | Body: {text}")
            return False

    @staticmethod
    def send_invitation_email(email, business_name, invite_url):
        """Enviar email de invitación a equipo"""
        subject = f"Invitación a unirte a {business_name} en EnCaja"
        
        plain = f"""Hola,
        
Te han invitado a unirte al equipo de {business_name} en EnCaja.

Para aceptar la invitación, haz clic aquí:
{invite_url}

Si el enlace no funciona, copia y pega la siguiente URL en tu navegador:
{invite_url}

Si no tienes cuenta, deberás registrarte primero con este correo ({email}).
Este enlace expira en 7 días.
"""

        # Custom HTML for invitation
        html_content = f"""
        <div style="text-align: center;">
            <p style="font-size: 16px; color: #f8fafc; margin-bottom: 24px;">
                Te han invitado a colaborar en el equipo de <strong>{business_name}</strong>.
            </p>
            
            <a href="{invite_url}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; margin-bottom: 24px;">
                Aceptar Invitación
            </a>
            
            <p style="font-size: 14px; color: #94a3b8;">
                O copia este enlace: <br>
                <a href="{invite_url}" style="color: #3b82f6;">{invite_url}</a>
            </p>
            
            <p style="font-size: 14px; color: #94a3b8; margin-top: 24px;">
                Nota: Debes registrarte con el correo <strong>{email}</strong> para acceder.
            </p>
        </div>
        """
        
        full_html = AuthManager._get_email_template(subject, html_content)

        provider = (os.getenv("EMAIL_PROVIDER") or "").lower()
        print(f"[DEBUG] Sending invite to {email} via {provider}")
        
        result_data = {
            "success": False, 
            "provider": provider, 
            "invite_url": invite_url,
            "email": email
        }
        
        sent = False
        if provider == "brevo":
            res = AuthManager._send_brevo_email(email, subject, plain, full_html)
            result_data.update(res)
            sent = result_data.get("success", False)
            print(f"[DEBUG] Brevo send result: {sent}")
        else:
            sent = AuthManager._send_mailjet_email(email, subject, plain, full_html)
            result_data["success"] = sent
            if not sent:
                result_data["error"] = "Mailjet/Default send failed"
            
        if sent:
            return result_data

        # Fallback to SMTP
        host = os.getenv("SMTP_HOST")
        port = os.getenv("SMTP_PORT")
        user = os.getenv("SMTP_USER")
        password = os.getenv("SMTP_PASS")
        sender = os.getenv("SMTP_FROM", user or "no-reply@localhost")

        # Check for placeholders or missing config
        if not host or not port or not user or not password or \
           AuthManager._is_placeholder(user) or AuthManager._is_placeholder(host):
            print(f"\n[INVITE LINK] (Dev Mode / No Email Config)")
            print(f"To: {email}")
            print(f"URL: {invite_url}\n")
            result_data["error"] = "No email config (Dev Mode)"
            result_data["dev_url"] = invite_url
            return result_data

        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = sender
        msg["To"] = email
        msg.set_content(plain)
        msg.add_alternative(full_html, subtype="html")

        try:
            with smtplib.SMTP(host, int(port), timeout=10) as server:
                server.starttls()
                server.login(user, password)
                server.send_message(msg)
            result_data["success"] = True
            result_data["provider"] = "smtp"
            result_data["method"] = "smtp"
            return result_data
        except Exception as e:
            print(f"[SMTP ERROR INVITE] {e}")
            print(f"\n[INVITE LINK FAILBACK] To: {email} | URL: {invite_url}\n")
            result_data["success"] = False
            result_data["error"] = f"SMTP Error: {str(e)}"
            result_data["dev_url"] = invite_url
            return result_data

    @staticmethod
    def register(email, password, name):
        """Registrar nuevo usuario"""
        from backend.database import db
        email_lower = email.lower()
        activation_required = is_account_code_activation_required()
        
        # Check only for existing PERSONAL account
        existing = User.query.filter_by(email=email_lower, account_type='personal').first()
        
        if existing:
            if not existing.email_verified:
                verification_code = AuthManager.generate_email_otp() if activation_required else None
                existing.name = name
                existing.set_password(password)
                existing.email_verification_code = verification_code
                existing.email_verification_expires = (datetime.utcnow() + timedelta(minutes=10)) if activation_required else None
                existing.is_active = True
                db.session.commit()
                if activation_required and verification_code:
                    emit_verification_code_debug(existing.email, verification_code)
                if activation_required and verification_code:
                    AuthManager.send_verification_email(existing.email, existing.name, verification_code)
                _ensure_default_role(existing)
                return existing, None
            return None, "El email ya está registrado"

        verification_code = AuthManager.generate_email_otp() if activation_required else None
        user = User(
            email=email_lower,
            name=name,
            plan="free",
            email_verified=False,
            email_verification_code=verification_code,
            email_verification_expires=(datetime.utcnow() + timedelta(minutes=10)) if activation_required else None,
            account_type='personal' # Explicitly set personal
        )
        user.set_password(password)

        db.session.add(user)
        db.session.commit()

        if activation_required and verification_code:
            emit_verification_code_debug(user.email, verification_code)

        if activation_required and verification_code:
            AuthManager.send_verification_email(user.email, user.name, verification_code)

        _ensure_default_role(user)

        return user, None

    @staticmethod
    def login(email, password, is_team_login=False, business_name=None, profile=None):
        """Iniciar sesión con soporte para aislamiento de cuentas y acceso unificado"""
        email_lower = email.lower()
        
        user = None
        password_valid = False
        
        # 1. Intentar login como cuenta PERSONAL (Prioridad para identidad única)
        # Si no se especifica is_team_login, asumimos intento de login unificado
        if not is_team_login:
            user = _profile_sql_stage(
                profile,
                "fetch_user",
                lambda: User.query.filter_by(
                    email=email_lower,
                    account_type='personal'
                ).first(),
            )
            
            # Dev convenience logic (only for personal)
            try:
                if not user and not current_app.config.get("TESTING") and (os.getenv("APP_ENV") or "").lower() == "dev":
                    # Only auto-create if we are sure it doesn't exist at all to avoid duplicates
                    # But for dev we can just proceed
                    name = (email.split("@")[0] or "Usuario").title()
                    user = User(
                        email=email_lower, 
                        name=name, 
                        email_verified=True, 
                        is_active=True,
                        account_type='personal'
                    )
                    user.set_password(password or "123456")
                    db.session.add(user)
                    db.session.commit()
            except Exception:
                pass

            if user:
                started_at = time.perf_counter()
                password_valid = bool(user.check_password(password))
                _record_profile_stage(
                    profile,
                    "password_verify",
                    started_at,
                    extra={"matched_account_type": getattr(user, "account_type", None)},
                )
            if user and password_valid:
                # Encontrado y válido como personal
                pass
            else:
                user = None # Invalid password or not found
                password_valid = False

        # 2. Si falló el personal, o es un login específico de equipo antiguo
        if not user:
            if is_team_login and business_name:
                # Login Legacy Específico
                from backend.models import Business
                business = _profile_sql_stage(
                    profile,
                    "membership_business_lookup",
                    lambda: Business.query.filter(Business.name.ilike(business_name)).first(),
                )
                if business:
                    user = _profile_sql_stage(
                        profile,
                        "fetch_user",
                        lambda: User.query.filter_by(
                            email=email_lower,
                            account_type='team_member',
                            linked_business_id=business.id
                        ).first(),
                    )
                    if user:
                        started_at = time.perf_counter()
                        password_valid = bool(user.check_password(password))
                        _record_profile_stage(
                            profile,
                            "password_verify",
                            started_at,
                            extra={"matched_account_type": getattr(user, "account_type", None)},
                        )
            else:
                # Fallback Universal: Buscar cualquier cuenta (incluyendo legacy team members)
                # que coincida con email y password.
                # Esto permite login solo con email+pass para cuentas antiguas
                candidates = _profile_sql_stage(
                    profile,
                    "fetch_user",
                    lambda: User.query.filter_by(email=email_lower).all(),
                )
                for cand in candidates:
                    started_at = time.perf_counter()
                    candidate_valid = bool(cand.check_password(password))
                    _record_profile_stage(
                        profile,
                        "password_verify",
                        started_at,
                        extra={"matched_account_type": getattr(cand, "account_type", None)},
                    )
                    if candidate_valid:
                        user = cand
                        password_valid = True
                        break
        
        if not user or not password_valid:
            return None, None, None, "Email o password incorrecto"

        if is_account_code_activation_required() and not user.email_verified:
            return None, None, None, "Email no verificado"

        user.last_login = datetime.utcnow()
        db.session.commit()

        started_at = time.perf_counter()
        session_version = get_user_session_version(user.id)
        access_token = create_token(user.id, "access", session_version=session_version)
        refresh_token = create_token(user.id, "refresh", session_version=session_version)
        _record_profile_stage(profile, "token_session_creation", started_at)

        return user, access_token, refresh_token, None

    @staticmethod
    def refresh(refresh_token):
        """Refrescar access token"""
        payload = decode_token(refresh_token)
        
        if not payload or payload.get("type") != "refresh":
            return None, "Token inválido"

        user_id = payload.get("user_id")
        user = User.query.get(user_id)

        is_valid_session, session_error, _ = _is_session_token_valid(user, payload)
        if not is_valid_session:
            return None, session_error

        new_access_token = create_token(user.id, "access")
        return new_access_token, None
