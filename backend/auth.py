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
import requests
from flask import request, jsonify, g, current_app
from backend.models import User, Permission, Role, AuditLog, UserRole


def create_token(user_id, token_type="access"):
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
        # 1. Obtener token
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return jsonify({"error": "Token requerido"}), 401

        try:
            # Formato: "Bearer <token>"
            parts = auth_header.split()
            if len(parts) != 2 or parts[0] != "Bearer":
                return jsonify({"error": "Formato de token inválido"}), 401
            
            token = parts[1]
            payload = decode_token(token)
            
            if not payload:
                # Mensaje personalizado para el frontend
                return jsonify({"error": "Inicio de sesión expirado", "code": "TOKEN_EXPIRED"}), 401
                
            user_id = payload.get("user_id")
            user = User.query.get(user_id)
            
            if not user:
                return jsonify({"error": "Usuario no encontrado"}), 401
                
            # Asignar usuario al contexto global de Flask
            g.current_user = user
            
        except Exception as e:
            return jsonify({"error": "Error de autenticación", "details": str(e)}), 401

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
        base_url = os.getenv("PUBLIC_BASE_URL") or os.getenv("APP_BASE_URL") or "https://encajapp.site"
        logo_url = f"{base_url.rstrip('/')}/public/assets/logo.png"
        theme = (os.getenv("EMAIL_THEME") or "light").lower()
        is_dark = theme == "dark"
        body_bg = "#0b1220" if is_dark else "#f8fafc"
        card_bg = "#0f172a" if is_dark else "#ffffff"
        border_color = "#1f2937" if is_dark else "#e5e7eb"
        text_color = "#e5e7eb" if is_dark else "#334155"
        footer_bg = "#0b0f1a" if is_dark else "#fafafa"
        footer_text = "#94a3b8"
        code_bg = "#1f2937" if is_dark else "#fff1f2"
        code_border = "#374151" if is_dark else "#fecdd3"
        code_label = "#fda4af" if is_dark else "#ef4444"
        code_value = "#fca5a5" if is_dark else "#dc2626"
        import re
        code_match = re.search(r"\b(\d{6})\b", text or "")
        code = code_match.group(1) if code_match else ""
        paragraphs = "".join(
            f"<p style=\"margin:0 0 12px;color:{text_color};font-size:14px;line-height:1.6\">{line}</p>"
            for line in (text or "").split("\n") if line.strip()
        )
        code_block = f"""
            <div style="margin:16px 0;padding:16px;border-radius:12px;background:{code_bg};border:1px solid {code_border};text-align:center">
                <div style="font-size:12px;color:{code_label};margin-bottom:8px">Tu código</div>
                <div style="font-size:28px;font-weight:700;color:{code_value};letter-spacing:6px">{code}</div>
            </div>
        """ if code else ""
        support_block = f"""
            <div style="margin-top:12px;padding:12px;border-radius:12px;background:{footer_bg};color:{footer_text}">
                <div style="font-weight:600;margin-bottom:6px;color:{text_color}">¿Necesitas ayuda?</div>
                <div>WhatsApp: +57 319 242 6874</div>
                <div>Email: encajapp@gmail.com</div>
                <div>Web: encajapp.site</div>
            </div>
        """
        return f"""
        <html>
        <body style="margin:0;padding:0;background:{body_bg}">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:{body_bg}">
                <tr>
                    <td align="center" style="padding:24px">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:{card_bg};border-radius:16px;overflow:hidden;border:1px solid {border_color}">
                            <tr>
                                <td style="padding:24px;background:linear-gradient(135deg,#ef4444,#f87171);color:#ffffff">
                                    <div style="display:flex;align-items:center;gap:12px">
                                        <img src="{logo_url}" alt="EnCaja" width="36" height="36" style="border-radius:8px;display:block" />
                                        <div style="font-size:20px;font-weight:800">EnCaja</div>
                                    </div>
                                    <div style="font-size:14px;opacity:.9;margin-top:4px">{subject}</div>
                                    <div style="font-size:12px;opacity:.9;margin-top:6px">orden para soñar en grande.</div>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:24px">
                                    {paragraphs}
                                    {code_block}
                                    <p style="margin:0 0 12px;color:{text_color};font-size:13px;line-height:1.6">
                                        Ingresa el código en la aplicación para continuar. Si no solicitaste este correo, puedes ignorarlo.
                                    </p>
                                    <div style="margin-top:12px">
                                        <a href="{base_url}" style="display:inline-block;padding:10px 16px;border-radius:10px;background:#ef4444;color:#ffffff;text-decoration:none;font-weight:600">
                                            Abrir EnCaja
                                        </a>
                                    </div>
                                    {support_block}
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:16px 24px;background:{footer_bg};color:{footer_text};font-size:12px">
                                    Este código expira en 10 minutos.
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
    def _send_brevo_email(to_email, subject, text, html=None):
        api_key = os.getenv("BREVO_API_KEY")
        sender = os.getenv("BREVO_SENDER") or os.getenv("MAILJET_SENDER") or os.getenv("SMTP_FROM")
        if not api_key or not sender:
            print(
                f"[BREVO SKIP] missing config "
                f"api_key={bool(api_key)} sender={bool(sender)}"
            )
            return False
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
                return True
            print(f"[BREVO ERROR] {response.status_code} {response.text[:200]}")
            return False
        except Exception as e:
            print(f"[BREVO EXCEPTION] {e}")
            return False

    @staticmethod
    def send_password_reset_email(email, name, code):
        """Enviar email de recuperación de contraseña o log si SMTP no está configurado"""
        plain = f"Hola {name},\n\nTu código para restablecer contraseña es: {code}\n\nEste código expira en 10 minutos."
        html = AuthManager._build_html_email("Restablecer contraseña", plain)
        provider = (os.getenv("EMAIL_PROVIDER") or "").lower()
        sent = False
        if provider == "brevo":
            sent = AuthManager._send_brevo_email(email, "Tu código para restablecer contraseña", plain, html)
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
            sent = AuthManager._send_brevo_email(email, "Tu código de verificación", plain, html)
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

        if not host or not port or not user or not password:
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
            sent = AuthManager._send_brevo_email(to_email, subject, text, None)
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
