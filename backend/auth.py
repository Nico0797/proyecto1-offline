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
from backend.models import User, Permission, Role, AuditLog


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
    
    # Obtener todos los permisos del usuario a través de sus roles
    user_permissions = set()
    for role in user.roles:
        for perm in role.permissions:
            user_permissions.add(perm.name)
    
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
    def send_password_reset_email(email, name, code):
        """Enviar email de recuperación de contraseña o log si SMTP no está configurado"""
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
        msg.set_content(
            f"Hola {name},\n\nTu código para restablecer contraseña es: {code}\n\n"
            "Este código expira en 10 minutos."
        )

        with smtplib.SMTP(host, int(port)) as server:
            server.starttls()
            server.login(user, password)
            server.send_message(msg)

    @staticmethod
    def send_verification_email(email, name, code):
        """Enviar email de verificación o log si SMTP no está configurado"""
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
        msg.set_content(
            f"Hola {name},\n\nTu código de verificación es: {code}\n\n"
            "Este código expira en 10 minutos."
        )

        with smtplib.SMTP(host, int(port)) as server:
            server.starttls()
            server.login(user, password)
            server.send_message(msg)

    @staticmethod
    def register(email, password, name):
        """Registrar nuevo usuario"""
        # Verificar si email ya existe
        existing = User.query.filter_by(email=email.lower()).first()
        if existing:
            return None, "El email ya está registrado"

        # Crear usuario
        verification_code = AuthManager.generate_email_otp()
        user = User(
            email=email.lower(),
            name=name,
            plan="free",  # Plan inicial gratuito
            email_verified=False,
            email_verification_code=verification_code,
            email_verification_expires=datetime.utcnow() + timedelta(minutes=10),
        )
        user.set_password(password)

        from backend.database import db
        db.session.add(user)
        db.session.commit()

        AuthManager.send_verification_email(user.email, user.name, verification_code)

        return user, None

    @staticmethod
    def login(email, password):
        """Iniciar sesión"""
        user = User.query.filter_by(email=email.lower()).first()
        
        if not user or not user.check_password(password):
            return None, None, None, "Email o password incorrecto"

        if not user.email_verified:
            return None, None, None, "Email no verificado. Revisa tu correo para el código OTP"

        # Generar tokens
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
