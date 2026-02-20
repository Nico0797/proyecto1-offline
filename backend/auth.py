# Cuaderno - Autenticación JWT
# ============================================
"""
Módulo de autenticación con JWT y RBAC
"""
import os
import jwt
import random
import smtplib
from email.message import EmailMessage
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify, g, current_app
from backend.models import User, Permission, Role, AuditLog, UserRole

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False


def create_token(user_id, token_type="access"):
    """Crear token JWT"""
    if token_type == "access":
        expires = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", "900"))
    else:
        expires = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRES", "604800"))

    payload = {
        "user_id": user_id,
        "type": token_type,
        "exp": datetime.utcnow() + timedelta(seconds=expires),
        "iat": datetime.utcnow(),
    }

    secret = current_app.config["JWT_SECRET_KEY"]
    return jwt.encode(payload, secret, algorithm="HS256")


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


def get_user_from_token():
    """Obtener usuario desde el token en el header"""
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return None

    try:
        # Formato: "Bearer <token>"
        parts = auth_header.split()
        if len(parts) != 2 or parts[0] != "Bearer":
            return None

        token = parts[1]
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


def has_permission(user, permission_name):
    """
    Verificar si el usuario tiene un permiso específico.
    
    Args:
        user: Instancia del modelo User
        permission_name: Nombre del permiso (ej: 'products.read', 'admin.*')
    
    Returns:
        bool: True si tiene el permiso, False en caso contrario
    """
    if not user:
        return False
    
    # Si es admin (is_admin=True) tiene acceso total
    if user.is_admin:
        return True
    
    # Si el usuario no está activo, no tiene acceso
    if hasattr(user, 'is_active') and not user.is_active:
        return False
    
    user_permissions = set()
    for user_role in user.roles:
        role = user_role.role
        if not role:
            continue
        for role_perm in role.permissions:
            if role_perm.permission:
                user_permissions.add(role_perm.permission.name)
    
    # Verificar permiso exacto
    if permission_name in user_permissions:
        return True
    
    # Verificar permiso con wildcard (ej: admin.* incluye admin.users)
    permission_prefix = permission_name.split('.')[0]
    wildcard_permission = f"{permission_prefix}.*"
    if wildcard_permission in user_permissions:
        return True
    
    # Verificar si tiene admin.* (superuser)
    if "admin.*" in user_permissions:
        return True
    
    return False


def permission_required(permission_name):
    """
    Decorador para requerir un permiso específico.
    
    Usage:
        @permission_required('products.read')
        def my_endpoint():
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            user = g.get('current_user')
            
            if not user:
                return jsonify({"error": "Autenticación requerida"}), 401
            
            if not has_permission(user, permission_name):
                # Registrar intento de acceso no autorizado
                _log_audit(user, 'access_denied', 'permission', None, 
                          {'permission_required': permission_name}, None)
                return jsonify({"error": f"Permiso requerido: {permission_name}"}), 403
            
            return f(*args, **kwargs)
        return decorated
    return decorator


def _ensure_default_role(user):
    from backend.database import db
    try:
        if not user or not user.id:
            return
        existing = UserRole.query.filter_by(user_id=user.id).first()
        if existing:
            return
        admin_role = Role.query.filter_by(name="ADMIN").first()
        if not admin_role:
            return
        user_role = UserRole(user_id=user.id, role_id=admin_role.id)
        db.session.add(user_role)
        db.session.commit()
    except Exception as e:
        print(f"[AUTH] Error ensuring default role: {e}")


def _log_audit(user, action, entity, entity_id, old_value=None, new_value=None):
    """
    Función helper para crear logs de auditoría.
    """
    try:
        from backend.database import db
        
        # Obtener IP del request
        ip_address = request.remote_addr if request else None
        user_agent = request.headers.get('User-Agent') if request else None
        
        audit_log = AuditLog(
            user_id=user.id if user else None,
            action=action,
            entity=entity,
            entity_id=entity_id,
            old_value=old_value,
            new_value=new_value,
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.session.add(audit_log)
        db.session.commit()
    except Exception as e:
        print(f"[AUDIT] Error logging audit: {e}")


def token_required(f):
    """Decorator para requerir autenticación"""
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_user_from_token()
        
        if not user:
            return jsonify({"error": "Token inválido o expirado"}), 401
        
        # Verificar si el usuario está activo
        if hasattr(user, 'is_active') and not user.is_active:
            return jsonify({"error": "Usuario inactivo"}), 403
        
        # Actualizar last_login
        try:
            from backend.database import db
            user.last_login = datetime.utcnow()
            db.session.commit()
        except Exception as e:
            print(f"[AUTH] Error updating last_login: {e}")
        
        g.current_user = user
        return f(*args, **kwargs)

    return decorated


def optional_token(f):
    """Decorator opcional - permite acceso sin token pero lo proporciona si existe"""
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_user_from_token()
        g.current_user = user
        return f(*args, **kwargs)

    return decorated


class AuthManager:
    """Gestor de autenticación"""

    @staticmethod
    def generate_email_otp():
        """Generar código OTP de 6 dígitos"""
        return "".join(str(random.randint(0, 9)) for _ in range(6))

    @staticmethod
    def _build_html_email(subject, text):
        """Plantilla HTML básica con branding EnCaja"""
        import re
        code_match = re.search(r"\b(\d{6})\b", text or "")
        code = code_match.group(1) if code_match else ""
        paragraphs = "".join(f"<p style=\"margin:0 0 12px;color:#334155;font-size:14px;line-height:1.6\">{line}</p>" for line in (text or "").split("\n") if line.strip())
        code_block = f"""
            <div style="margin:16px 0;padding:16px;border-radius:12px;background:#fff1f2;border:1px solid #fecdd3;text-align:center">
                <div style="font-size:12px;color:#ef4444;margin-bottom:8px">Tu código</div>
                <div style="font-size:28px;font-weight:700;color:#dc2626;letter-spacing:6px">{code}</div>
            </div>
        """ if code else ""
        return f"""
        <html>
        <body style="margin:0;padding:0;background:#f8fafc">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc">
                <tr>
                    <td align="center" style="padding:24px">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">
                            <tr>
                                <td style="padding:24px;background:linear-gradient(135deg,#ef4444,#f87171);color:#ffffff">
                                    <div style="font-size:20px;font-weight:800">EnCaja</div>
                                    <div style="font-size:14px;opacity:.9">{subject}</div>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:24px">{paragraphs}{code_block}</td>
                            </tr>
                            <tr>
                                <td style="padding:16px 24px;background:#fafafa;color:#64748b;font-size:12px">
                                    Si no solicitaste este correo, ignóralo. Este código expira en 10 minutos.
                                </td>
                            </tr>
                        </table>
                        <div style="margin-top:12px;color:#94a3b8;font-size:12px">© {datetime.utcnow().year} EnCaja</div>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """

    @staticmethod
    def send_password_reset_email(email, name, code):
        """Enviar email de recuperación de contraseña o log si SMTP no está configurado"""
        if os.getenv("EMAIL_PROVIDER", "").lower() == "mailjet":
            if AuthManager._send_with_mailjet(
                email=email,
                name=name,
                subject="Tu código para restablecer contraseña",
                text=f"Hola {name},\n\nTu código para restablecer contraseña es: {code}\n\nEste código expira en 10 minutos.",
            ):
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
        plain = f"Hola {name},\n\nTu código para restablecer contraseña es: {code}\n\nEste código expira en 10 minutos."
        msg.set_content(plain)
        msg.add_alternative(AuthManager._build_html_email("Restablecer contraseña", plain), subtype="html")

        with smtplib.SMTP(host, int(port)) as server:
            server.starttls()
            server.login(user, password)
            server.send_message(msg)

    @staticmethod
    def send_verification_email(email, name, code):
        """Enviar email de verificación o log si SMTP no está configurado"""
        if os.getenv("EMAIL_PROVIDER", "").lower() == "mailjet":
            if AuthManager._send_with_mailjet(
                email=email,
                name=name,
                subject="Tu código de verificación",
                text=f"Hola {name},\n\nTu código de verificación es: {code}\n\nEste código expira en 10 minutos.",
            ):
                return

        host = os.getenv("SMTP_HOST")
        port = os.getenv("SMTP_PORT")
        user = os.getenv("SMTP_USER")
        password = os.getenv("SMTP_PASS")
        sender = os.getenv("SMTP_FROM", user or "no-reply@localhost")

        print(f"[SMTP DEBUG] host={host!r} port={port!r} user={user!r} password_set={bool(password)}")

        if not host or not port or not user or not password:
            print(f"[EMAIL OTP] To: {email} | Code: {code}")
            return

        msg = EmailMessage()
        msg["Subject"] = "Tu código de verificación"
        msg["From"] = sender
        msg["To"] = email
        plain = f"Hola {name},\n\nTu código de verificación es: {code}\n\nEste código expira en 10 minutos."
        msg.set_content(plain)
        msg.add_alternative(AuthManager._build_html_email("Verificación de correo", plain), subtype="html")

        try:
            with smtplib.SMTP(host, int(port), timeout=10) as server:
                server.starttls()
                server.login(user, password)
                server.send_message(msg)
        except Exception as e:
            print(f"[SMTP ERROR] {e}")
            print(f"[EMAIL OTP] To: {email} | Code: {code}")

    @staticmethod
    def _send_with_mailjet(email, name, subject, text):
        """Enviar email usando Mailjet. Devuelve True si se envió correctamente."""
        if not HAS_REQUESTS:
            print("[MAILJET] 'requests' no está instalado, usando fallback.")
            print(f"[MAILJET FALLBACK] To: {email} | Subject: {subject} | Body: {text}")
            return False

        api_key = os.getenv("MAILJET_API_KEY")
        api_secret = os.getenv("MAILJET_API_SECRET")
        sender = os.getenv("MAILJET_SENDER") or os.getenv("SMTP_FROM") or "no-reply@localhost"

        if not api_key or not api_secret or not sender:
            print("[MAILJET] Configuración incompleta, usando fallback.")
            print(f"[MAILJET FALLBACK] To: {email} | Subject: {subject} | Body: {text}")
            return False

        url = "https://api.mailjet.com/v3.1/send"
        html = AuthManager._build_html_email(subject, text or "")
        payload = {
            "Messages": [
                {
                    "From": {
                        "Email": sender,
                        "Name": "EnCaja"
                    },
                    "To": [
                        {
                            "Email": email,
                            "Name": name or ""
                        }
                    ],
                    "Subject": subject,
                    "TextPart": text,
                    "HTMLPart": html,
                }
            ]
        }

        try:
            response = requests.post(url, json=payload, auth=(api_key, api_secret), timeout=10)
            if response.status_code >= 200 and response.status_code < 300:
                print(f"[MAILJET] Email enviado a {email}")
                return True
            print(f"[MAILJET] Error {response.status_code}: {response.text}")
        except Exception as e:
            print(f"[MAILJET] Excepción al enviar: {e}")

        print(f"[MAILJET FALLBACK] To: {email} | Subject: {subject} | Body: {text}")
        return False

    @staticmethod
    def register(email, password, name):
        """Registrar nuevo usuario"""
        from backend.database import db
        email_lower = email.lower()
        existing = User.query.filter_by(email=email_lower).first()
        if existing:
            if not existing.email_verified:
                verification_code = AuthManager.generate_email_otp()
                existing.name = name
                existing.set_password(password)
                existing.email_verification_code = verification_code
                existing.email_verification_expires = datetime.utcnow() + timedelta(minutes=10)
                existing.is_active = True
                db.session.commit()
                AuthManager.send_verification_email(existing.email, existing.name, verification_code)
                _ensure_default_role(existing)
                return existing, None
            return None, "El email ya está registrado"

        verification_code = AuthManager.generate_email_otp()
        user = User(
            email=email_lower,
            name=name,
            plan="free",
            email_verified=False,
            email_verification_code=verification_code,
            email_verification_expires=datetime.utcnow() + timedelta(minutes=10),
        )
        user.set_password(password)

        db.session.add(user)
        db.session.commit()

        AuthManager.send_verification_email(user.email, user.name, verification_code)

        _ensure_default_role(user)

        return user, None

    @staticmethod
    def login(email, password):
        """Iniciar sesión"""
        user = User.query.filter_by(email=email.lower()).first()
        
        if not user or not user.check_password(password):
            return None, None, None, "Email o password incorrecto"

        if not user.email_verified:
            return None, None, None, "Email no verificado. Revisa tu correo para el código OTP"

        _ensure_default_role(user)

        access_token = create_token(user.id, "access")
        refresh_token = create_token(user.id, "refresh")

        return user, access_token, refresh_token, None

    @staticmethod
    def refresh(refresh_token):
        """Refrescar access token"""
        payload = decode_token(refresh_token)
        
        if not payload or payload.get("type") != "refresh":
            return None, "Token inválido"

        user_id = payload.get("user_id")
        user = User.query.get(user_id)

        if not user:
            return None, "Usuario no encontrado"

        new_access_token = create_token(user.id, "access")
        return new_access_token, None
