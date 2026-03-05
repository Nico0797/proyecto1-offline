# Cuaderno - Main Application
# ============================================
"""
Punto de entrada de la aplicación Flask
"""
import os
from datetime import datetime, date, timedelta
from flask import Flask, request, jsonify, send_from_directory, g, send_file, render_template, url_for
from flask_cors import CORS
from sqlalchemy import func
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
from io import BytesIO

# xhtml2pdf for PDF generation
try:
    from xhtml2pdf import pisa
    HAS_XHTML2PDF = True
except Exception as e:
    print(f"WARNING: Could not import xhtml2pdf: {e}")
    HAS_XHTML2PDF = False

# PIL for receipt generation (optional)
try:
    from PIL import Image, ImageDraw, ImageFont
    HAS_PIL = True
except Exception:
    HAS_PIL = False
    Image = ImageDraw = ImageFont = None

import textwrap
try:
    from backend.config import get_config
    from backend.database import db, init_db
    from backend.auth import token_required, optional_token, AuthManager, create_token, permission_required
    from backend.models import User, Business, Product, Customer, Sale, Expense, Payment, LedgerEntry, LedgerAllocation, Permission, Role, UserRole, RolePermission, AuditLog, SubscriptionPayment, AppSettings, Order, RecurringExpense, QuickNote, SalesGoal, Banner, FAQ
except ImportError:
    import sys, importlib.util
    _BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    _BACK = os.path.dirname(os.path.abspath(__file__))
    def _load(mod_name, filename):
        spec = importlib.util.spec_from_file_location(mod_name, os.path.join(_BACK, filename))
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        sys.modules[mod_name] = module
        return module
    cfg_mod = _load("backend.config", "config.py")
    db_mod = _load("backend.database", "database.py")
    mdl_mod = _load("backend.models", "models.py")
    auth_mod = _load("backend.auth", "auth.py")
    get_config = cfg_mod.get_config
    db = db_mod.db
    init_db = db_mod.init_db
    token_required = auth_mod.token_required
    optional_token = auth_mod.optional_token
    AuthManager = auth_mod.AuthManager
    create_token = auth_mod.create_token
    permission_required = auth_mod.permission_required
    User = mdl_mod.User
    Business = mdl_mod.Business
    Product = mdl_mod.Product
    Customer = mdl_mod.Customer
    Sale = mdl_mod.Sale
    Expense = mdl_mod.Expense
    Payment = mdl_mod.Payment
    LedgerEntry = mdl_mod.LedgerEntry
    LedgerAllocation = mdl_mod.LedgerAllocation
    Permission = mdl_mod.Permission
    Role = mdl_mod.Role
    UserRole = mdl_mod.UserRole
    RolePermission = mdl_mod.RolePermission
    AuditLog = mdl_mod.AuditLog
    SubscriptionPayment = mdl_mod.SubscriptionPayment
    AppSettings = mdl_mod.AppSettings
    Order = mdl_mod.Order
    RecurringExpense = mdl_mod.RecurringExpense
    QuickNote = mdl_mod.QuickNote
    SalesGoal = mdl_mod.SalesGoal


def create_app(config_class=None):
    """Crear aplicación Flask"""
    app = Flask(__name__, static_folder="../frontend", static_url_path="")

    # Cargar configuración
    if config_class:
        app.config.from_object(config_class)
    else:
        app.config.from_object(get_config())

    # Inicializar extensiones
    init_db(app)
    # Compress(app) - Removed due to build errors
    
    # Implement Gzip compression manually to avoid Flask-Compress/brotli dependency
    @app.after_request
    def compress_response(response):
        # Skip compression for non-200 responses or already compressed content
        if (response.status_code < 200 or response.status_code >= 300 or 'Content-Encoding' in response.headers):
            return response
            
        # Check if client accepts gzip
        accept_encoding = request.headers.get('Accept-Encoding', '')
        if 'gzip' not in accept_encoding.lower():
            return response
            
        # Check content type
        content_type = response.content_type or ''
        if not any(t in content_type for t in ['text/', 'application/json', 'application/javascript', 'application/xml']):
            return response
            
        # Compress
        import gzip
        from io import BytesIO
        
        # If the response is streaming (e.g. file download), allow reading it
        if response.direct_passthrough:
            response.direct_passthrough = False
            
        gzip_buffer = BytesIO()
        gzip_file = gzip.GzipFile(mode='wb', fileobj=gzip_buffer)
        gzip_file.write(response.data)
        gzip_file.close()
        
        compressed_data = gzip_buffer.getvalue()
        
        # Only use compressed version if it's smaller
        if len(compressed_data) < len(response.data):
            response.data = compressed_data
            response.headers['Content-Encoding'] = 'gzip'
            response.headers['Content-Length'] = len(response.data)
            response.headers['Vary'] = 'Accept-Encoding'
            
        return response
    
    # Normalizar rutas de export y backup a absolutas
    import os as _os
    base_dir = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))
    export_dir = app.config.get("EXPORT_DIR", "exports")
    backup_dir = app.config.get("BACKUP_DIR", "backups")
    if not _os.path.isabs(export_dir):
        export_dir = _os.path.join(base_dir, export_dir)
    if not _os.path.isabs(backup_dir):
        backup_dir = _os.path.join(base_dir, backup_dir)
    app.config["EXPORT_DIR"] = export_dir
    app.config["BACKUP_DIR"] = backup_dir
    
    # CORS: incluir orígenes para la app móvil (Capacitor) para evitar "Failed to fetch"
    cors_origins_env = app.config.get("CORS_ORIGINS", [])
    
    # If wildcard is present, just use that and don't append others
    if "*" in cors_origins_env:
        cors_origins = ["*"]
    else:
        cors_origins = list(cors_origins_env)
        for origin in [
            "capacitor://localhost",
            "https://localhost",
            "http://localhost",
            "http://localhost:5000",
            "http://localhost:8000",
            "http://localhost:5500",
            "http://localhost:5501",
            "http://localhost:5502",
            "http://localhost:5503",
            "http://127.0.0.1:5000",
            "http://127.0.0.1:8000",
            "http://127.0.0.1:5500",
            "http://127.0.0.1:5501",
            "http://127.0.0.1:5502",
            "http://127.0.0.1:5503",
            "http://localhost:5173",
            "http://localhost:5174",
            "http://localhost:5175",
            "http://localhost:5176",
            "https://app.encaja.co",
            "http://app.encaja.co",
        ]:
            if origin not in cors_origins:
                cors_origins.append(origin)
                
    CORS(app, resources={r"/api/*": {"origins": cors_origins}}, supports_credentials=True)

    # ========== STATIC FILES & SPA SERVING ==========
    # Determine static folder (Production: injected via Docker/Env, Dev: fallback)
    static_folder = os.getenv("APP_STATIC_DIR")
    
    if not static_folder:
        # Fallback for local development
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        # Prefer new react build if exists, otherwise legacy
        react_dist = os.path.join(base_dir, "frontend-react", "dist")
        if os.path.exists(react_dist):
            static_folder = react_dist
        else:
            static_folder = os.path.join(base_dir, "frontend")

    app.static_folder = static_folder
    app.static_url_path = ""
    
    print(f"[*] Serving static files from: {static_folder}")

    @app.route("/")
    def serve_index():
        return send_from_directory(app.static_folder, "index.html")

    @app.route("/<path:path>")
    def serve_static(path):
        # 1. API routes should not be handled here (Flask handles them first usually, but safety check)
        if path.startswith("api/"):
            return jsonify({"error": "Not found"}), 404
            
        # 2. Try to serve existing static file
        full_path = os.path.join(app.static_folder, path)
        if os.path.exists(full_path) and os.path.isfile(full_path):
            return send_from_directory(app.static_folder, path)
            
        # 3. SPA Fallback: Serve index.html for non-API routes
        return send_from_directory(app.static_folder, "index.html")

    # Error handlers for JSON responses
    @app.errorhandler(400)
    def bad_request(e):
        if request.path.startswith("/api/") or request.accept_mimetypes.accept_json:
            return jsonify({"error": "Bad request"}), 400
        return e

    @app.errorhandler(404)
    def not_found(e):
        if request.path.startswith("/api/") or request.accept_mimetypes.accept_json:
            return jsonify({"error": "Not found"}), 404
        # For non-API routes, let the catch-all handle it or return default
        return e

    @app.errorhandler(500)
    def internal_error(e):
        import traceback
        tb = traceback.format_exc()
        print(f"INTERNAL SERVER ERROR: {e}\n{tb}")  # Log to console/stderr
        if request.path.startswith("/api/") or request.accept_mimetypes.accept_json:
            # Return detailed error for debugging (remove in production if sensitive)
            return jsonify({"error": "Internal server error", "details": str(e), "traceback": tb}), 500
        return e

    # Crear directorios necesarios
    os.makedirs(app.config.get("EXPORT_DIR"), exist_ok=True)
    os.makedirs(app.config.get("BACKUP_DIR"), exist_ok=True)

    # ========== HEALTH CHECK ==========
    @app.route("/api/health")
    def health_check():
        return jsonify({
            "status": "ok",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0"
        })

    @app.route("/api/ping")
    def ping():
        return jsonify({"pong": True})

    # ========== SETTINGS ==========
    @app.route("/api/settings", methods=["GET"])
    @optional_token
    def get_settings():
        """Obtener configuración global de la aplicación"""
        try:
            import json
            settings = AppSettings.query.all()
            settings_dict = {}
            for s in settings:
                if s.value:
                    try:
                        settings_dict[s.key] = json.loads(s.value)
                    except:
                        settings_dict[s.key] = s.value
                else:
                    settings_dict[s.key] = None
            return jsonify({"settings": settings_dict})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/api/settings", methods=["POST"])
    @token_required
    def save_settings():
        """Guardar configuración global (requiere auth)"""
        try:
            import json
            data = request.get_json() or {}
            
            # Verificar permisos de admin
            if not g.current_user.is_admin and not (g.current_user.permissions and g.current_user.permissions.get('admin')):
                return jsonify({"error": "No tienes permisos de administrador"}), 403
            
            for key, value in data.items():
                if value is not None and not isinstance(value, (str, int, float, bool)):
                    value = json.dumps(value)
                
                setting = AppSettings.query.filter_by(key=key).first()
                if setting:
                    setting.value = str(value) if value is not None else None
                else:
                    setting = AppSettings(key=key, value=str(value) if value is not None else None)
                    db.session.add(setting)
            
            db.session.commit()
            return jsonify({"message": "Configuración guardada"})
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 500

    # ========== BILLING / CHECKOUT ==========
    def get_usd_cop_rate():
        """Obtiene la tasa de cambio USD -> COP actual"""
        try:
            import requests
            # API gratuita, actualiza una vez al día
            resp = requests.get("https://api.exchangerate-api.com/v4/latest/USD", timeout=5)
            if resp.status_code == 200:
                data = resp.json()
                rate = data.get("rates", {}).get("COP", 4200)
                return rate
        except Exception as e:
            print(f"Error obteniendo tasa de cambio: {e}")
        
        # Fallback si falla la API
        return 4200

    @app.route("/api/billing/checkout", methods=["POST"])
    @token_required
    def create_checkout():
        data = request.get_json() or {}
        plan = data.get("plan", "pro_monthly")
        payment_method = (data.get("payment_method") or "card").lower()

        if plan not in {"pro_monthly", "pro_quarterly", "pro_annual"}:
            return jsonify({"error": "Plan inválido"}), 400

        if payment_method not in {"nequi", "card", "bancolombia", "pse"}:
            return jsonify({"error": "Método de pago inválido"}), 400

        # Obtener tasa de cambio
        usd_cop_rate = get_usd_cop_rate()
        app.logger.info(f"Using USD/COP Rate: {usd_cop_rate}")

        monthly_usd = app.config.get("PRO_MONTHLY_PRICE_USD", 5.99)
        quarterly_discount = app.config.get("PRO_QUARTERLY_DISCOUNT", 0.10)
        annual_discount = app.config.get("PRO_ANNUAL_DISCOUNT", 0.30)
        
        # Calcular precios en USD con descuento
        monthly_total_usd = monthly_usd
        quarterly_total_usd = monthly_usd * 3 * (1 - quarterly_discount)
        annual_total_usd = monthly_usd * 12 * (1 - annual_discount)

        # Convertir a COP y redondear a la centena más cercana
        def to_cop(usd_val):
            val = usd_val * usd_cop_rate
            return int(round(val / 100.0) * 100)

        monthly = to_cop(monthly_total_usd)
        quarterly = to_cop(quarterly_total_usd)
        annual = to_cop(annual_total_usd)

        app.logger.info(f"Calculated Prices (COP): Monthly={monthly}, Quarterly={quarterly}, Annual={annual}")

        if plan == "pro_monthly":
            amount = monthly
        elif plan == "pro_quarterly":
            amount = quarterly
        else:
            amount = annual

        wompi_pk = (os.getenv("WOMPI_PUBLIC_KEY") or app.config.get("WOMPI_PUBLIC_KEY") or "").strip()
        wompi_sk = (os.getenv("WOMPI_PRIVATE_KEY") or app.config.get("WOMPI_PRIVATE_KEY") or "").strip()
        wompi_env_var = (os.getenv("WOMPI_ENV") or app.config.get("WOMPI_ENV") or "prod").lower().strip()
        if wompi_pk and "pub_test" in wompi_pk:
            wompi_env = "test"
        else:
            wompi_env = wompi_env_var
        wompi_base = "https://production.wompi.co" if wompi_env == "prod" else "https://sandbox.wompi.co"

        if not wompi_pk:
            return jsonify({"error": "No está configurada la llave pública de Wompi (WOMPI_PUBLIC_KEY)"}), 500
        if not wompi_sk:
            return jsonify({"error": "No está configurada la llave privada de Wompi (WOMPI_PRIVATE_KEY)"}), 500

        try:
            import requests, uuid

            reference = f"sub-{plan}-{uuid.uuid4().hex[:10]}"
            redirect_url = (os.getenv("MP_SUCCESS_URL") or app.config.get("MP_SUCCESS_URL") or "http://localhost:5000")
            amount_cents = int(amount * 100)

            payload = {
                "name": f"EnCaja {'Mensual' if plan=='pro_monthly' else 'Trimestral' if plan=='pro_quarterly' else 'Anual'}",
                "description": f"Suscripción {plan}",
                "single_use": False,
                "collect_shipping": False,
                "currency": "COP",
                "amount_in_cents": amount_cents,
                "redirect_url": redirect_url
            }
            h = {"Authorization": f"Bearer {wompi_sk}", "Content-Type": "application/json"}
            
            # Wompi API v1 requires amount in cents to be integer
            # Ensure redirect_url is valid
            if not redirect_url or "localhost" in redirect_url:
                # Fallback for dev environment or missing config
                # In production this should be set to the real domain
                redirect_url = "https://app.encaja.co" 
                
            payload = {
                "name": f"EnCaja {'Mensual' if plan=='pro_monthly' else 'Trimestral' if plan=='pro_quarterly' else 'Anual'}",
                "description": f"Suscripción {plan}",
                "single_use": False,
                "collect_shipping": False,
                "currency": "COP",
                "amount_in_cents": amount_cents,
                "redirect_url": redirect_url
            }
            
            # Log critical info for debugging
            app.logger.info(f"Wompi Env: {wompi_env}, Base: {wompi_base}, Amount: {amount_cents}")
            app.logger.info(f"Wompi Request Payload: {payload}")
            
            try:
                # Disable SSL verification temporarily to bypass potential cert issues in container
                # and use a very robust try-except block to ensure JSON is ALWAYS returned
                presp = requests.post(
                    f"{wompi_base}/v1/payment_links", 
                    json=payload, 
                    headers=h, 
                    timeout=30,
                    verify=False  # CRITICAL: Fix for potential SSL/TLS issues in Railway container
                )
                
                # Check if we got a success status code
                if presp.status_code not in [200, 201]:
                    app.logger.error(f"Wompi Error Status: {presp.status_code}. Body: {presp.text}")
                    return jsonify({
                        "error": f"Error Wompi ({presp.status_code}): {presp.text}",
                        "details": f"Status {presp.status_code}: {presp.text}"
                    }), 502

                pdata = presp.json().get("data")
                
                # Try to get URL directly, or construct it from ID
                if pdata and "url" in pdata:
                    init_point = pdata["url"]
                elif pdata and "id" in pdata:
                    # Fallback: Construct URL using ID
                    init_point = f"https://checkout.wompi.co/l/{pdata['id']}"
                else:
                     app.logger.error(f"Invalid Wompi response format: {presp.text}")
                     return jsonify({
                        "error": f"Respuesta inesperada de Wompi (JSON inválido): {presp.text}",
                        "details": f"Wompi respondió: {presp.text}"
                    }), 502
                
            except Exception as e:
                # Catch-all for ANY error during the request (timeout, connection, ssl, parsing)
                # This ensures we NEVER return a raw 502 to the frontend without details
                error_msg = str(e)
                app.logger.error(f"CRITICAL WOMPI ERROR: {error_msg}")
                import traceback
                app.logger.error(traceback.format_exc())
                
                return jsonify({
                    "error": "Error de conexión con pasarela de pago",
                    "details": f"Error interno: {error_msg}"
                }), 502

            checkout = {
                "provider": "wompi",
                "payment_method": payment_method,
                "plan": plan,
                "currency": "COP",
                "amount": amount,
                "init_point": init_point,
                "reference": reference,
                "status": "ready"
            }
            return jsonify({"checkout": checkout})
        except Exception as e:
            app.logger.error("Error inesperado creando pago Wompi: %s", str(e))
            import traceback
            app.logger.error(traceback.format_exc())
            return jsonify({
                "error": "Ocurrió un error al iniciar el pago con Wompi.",
                "details": str(e)
            }), 502

    @app.route("/api/billing/confirm-wompi", methods=["POST"])
    @token_required
    def confirm_wompi_transaction():
        data = request.get_json() or {}
        tx_id = data.get("id")
        
        if not tx_id:
            return jsonify({"error": "Transaction ID required"}), 400

        wompi_pk = os.getenv("WOMPI_PUBLIC_KEY") or app.config.get("WOMPI_PUBLIC_KEY")
        wompi_env_var = (os.getenv("WOMPI_ENV") or app.config.get("WOMPI_ENV") or "prod").lower()
        
        if wompi_pk and "pub_test" in wompi_pk:
            wompi_env = "test"
        else:
            wompi_env = wompi_env_var
            
        wompi_base = "https://production.wompi.co" if wompi_env == "prod" else "https://sandbox.wompi.co"
        
        try:
            import requests
            resp = requests.get(f"{wompi_base}/v1/transactions/{tx_id}")
            if resp.status_code == 404:
                return jsonify({"error": "Transacción no encontrada"}), 404
            
            resp.raise_for_status()
            tx_data = resp.json().get("data", {})
            
            status = tx_data.get("status")
            reference = tx_data.get("reference", "") or ""
            amount_in_cents = tx_data.get("amount_in_cents") or 0
            currency = tx_data.get("currency") or "COP"
            payment_method_info = tx_data.get("payment_method") or {}
            payment_method = payment_method_info.get("type")
            
            if status == "APPROVED":
                plan = "pro_monthly"
                if "pro_annual" in reference:
                    plan = "pro_annual"
                elif "pro_quarterly" in reference:
                    plan = "pro_quarterly"
                
                duration_days = 30
                if plan == "pro_quarterly":
                    duration_days = 90
                elif plan == "pro_annual":
                    duration_days = 365
                
                user = g.current_user
                now = datetime.utcnow()
                base_start = now
                if user.membership_end and user.membership_end > now:
                    base_start = user.membership_end
                membership_end = base_start + timedelta(days=duration_days)
                
                user.plan = "pro"
                user.membership_plan = plan
                user.membership_start = now
                user.membership_end = membership_end
                user.membership_auto_renew = True
                
                payment = SubscriptionPayment(
                    user_id=user.id,
                    plan=plan,
                    amount=(amount_in_cents or 0) / 100.0,
                    currency=currency,
                    payment_method=payment_method,
                    payment_date=now,
                    status="completed",
                    transaction_id=tx_id,
                )
                db.session.add(payment)
                db.session.commit()
                
                return jsonify({
                    "success": True, 
                    "message": "Pago aprobado. ¡Ahora eres PRO!",
                    "plan": user.plan,
                    "membership": {
                        "plan": user.membership_plan,
                        "start": user.membership_start.isoformat() if user.membership_start else None,
                        "end": user.membership_end.isoformat() if user.membership_end else None,
                        "auto_renew": user.membership_auto_renew,
                    }
                })
            elif status == "DECLINED":
                 return jsonify({"error": "El pago fue rechazado"}), 400
            elif status == "VOIDED":
                 return jsonify({"error": "El pago fue anulado"}), 400
            elif status == "ERROR":
                 return jsonify({"error": "Error en la transacción"}), 400
            else:
                 return jsonify({"message": f"Estado del pago: {status}", "status": status})
                 
        except Exception as e:
            return jsonify({"error": f"Error verificando pago: {str(e)}"}), 500

    @app.route("/api/upgrade-to-pro", methods=["POST"])
    @token_required
    def upgrade_to_pro():
        user = g.current_user
        user.plan = "pro"
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "¡Ahora tienes Plan PRO!",
            "plan": user.plan
        })

    # ========== AUTH ROUTES ==========
    @app.route("/api/auth/register", methods=["POST"])
    def register():
        data = request.get_json() or {}
        email = data.get("email", "").strip().lower()
        password = data.get("password", "")
        name = data.get("name", "").strip()
        
        print(f"[DEBUG] Register - name: {name}, email: {email}")

        if not email or not password or not name:
            return jsonify({"error": "Email, password y nombre son requeridos"}), 400

        import re
        if len(password) < 8:
            return jsonify({"error": "La contraseña debe tener al menos 8 caracteres"}), 400
        if not re.search(r"\d", password):
            return jsonify({"error": "La contraseña debe contener al menos un número"}), 400
        if not re.search(r"[\W_]", password):
            return jsonify({"error": "La contraseña debe contener al menos un carácter especial"}), 400

        user, error = AuthManager.register(email, password, name)
        if error:
            return jsonify({"error": error}), 400

        # In tests, auto-verify and return tokens to keep legacy flows
        if app.config.get("TESTING"):
            user.email_verified = True
            user.email_verification_code = None
            user.email_verification_expires = None
            db.session.commit()
            access_token = create_token(user.id, "access")
            refresh_token = create_token(user.id, "refresh")
            return jsonify({
                "user": user.to_dict(),
                "access_token": access_token,
                "refresh_token": refresh_token
            }), 201

        # Return verification code in response for development (when SMTP is not configured)
        # In production, the code is sent via email
        response_data = {
            "user": user.to_dict(),
            "verification_required": True,
            "message": "Revisa tu correo para el código de verificación"
        }
        
        # Include verification code for development/debugging purposes
        # This helps when SMTP is not configured
        if app.config.get("DEBUG"):
            response_data["verification_code"] = user.email_verification_code
        
        return jsonify(response_data), 201

    @app.route("/api/auth/verify-email", methods=["POST"])
    def verify_email():
        data = request.get_json() or {}
        email = data.get("email", "").strip().lower()
        code = data.get("code", "").strip()

        if not email or not code:
            return jsonify({"error": "Email y código son requeridos"}), 400

        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({"error": "Usuario no encontrado"}), 404

        if user.email_verified:
            return jsonify({"message": "Email ya verificado"})

        if not user.email_verification_code or not user.email_verification_expires:
            return jsonify({"error": "Código de verificación no disponible"}), 400

        if user.email_verification_expires < datetime.utcnow():
            return jsonify({"error": "Código de verificación expirado"}), 400

        if user.email_verification_code != code:
            return jsonify({"error": "Código de verificación inválido"}), 400

        user.email_verified = True
        user.email_verification_code = None
        user.email_verification_expires = None
        db.session.commit()
        
        # Generar tokens automáticamente tras verificar
        access_token = create_token(user.id, "access")
        refresh_token = create_token(user.id, "refresh")

        return jsonify({
            "message": "Email verificado correctamente",
            "user": user.to_dict(),
            "access_token": access_token,
            "refresh_token": refresh_token
        })

    @app.route("/api/auth/login", methods=["POST"])
    def login():
        try:
            # Force JSON parsing or fail gracefully
            if not request.is_json:
                # Try to parse anyway if content-type is missing but body exists
                try:
                    data = request.get_json(force=True)
                except:
                    # Last resort: try form data
                    data = request.form.to_dict()
                    if not data:
                        return jsonify({"error": "Content-Type must be application/json"}), 400
            else:
                data = request.get_json()
                
            data = data or {}
            email = data.get("email", "").strip().lower()
            password = data.get("password", "")

            if not email or not password:
                return jsonify({"error": "Email y password son requeridos"}), 400

            user, access_token, refresh_token, error = AuthManager.login(email, password)
            if error:
                return jsonify({"error": error}), 401

            return jsonify({
                "user": user.to_dict(),
                "access_token": access_token,
                "refresh_token": refresh_token
            })
        except Exception as e:
            app.logger.error(f"Login error: {str(e)}")
            import traceback
            app.logger.error(traceback.format_exc())
            # Ensure 500 errors are returned as JSON
            return jsonify({"error": "Error interno del servidor", "details": str(e)}), 500

    @app.route("/api/auth/refresh", methods=["POST"])
    def refresh():
        data = request.get_json() or {}
        refresh_token = data.get("refresh_token")

        if not refresh_token:
            return jsonify({"error": "Refresh token requerido"}), 400

        new_token, error = AuthManager.refresh(refresh_token)
        if error:
            return jsonify({"error": error}), 401

        return jsonify({"access_token": new_token})

    @app.route("/api/auth/change-password", methods=["POST"])
    @token_required
    def change_password():
        data = request.get_json() or {}
        current_password = data.get("current_password", "")
        new_password = data.get("new_password", "")

        if not current_password or not new_password:
            return jsonify({"error": "Contraseña actual y nueva son requeridas"}), 400

        if len(new_password) < 6:
            return jsonify({"error": "La nueva contraseña debe tener al menos 6 caracteres"}), 400

        user = g.current_user
        if not user.check_password(current_password):
            return jsonify({"error": "La contraseña actual no es correcta"}), 400

        user.set_password(new_password)
        db.session.commit()

        return jsonify({"message": "Contraseña actualizada"})

    @app.route("/api/auth/forgot-password", methods=["POST"])
    def forgot_password():
        data = request.get_json() or {}
        email = data.get("email", "").strip().lower()

        if not email:
            return jsonify({"error": "Email requerido"}), 400

        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({"error": "Usuario no encontrado"}), 404

        code = AuthManager.generate_email_otp()
        user.reset_password_code = code
        user.reset_password_expires = datetime.utcnow() + timedelta(minutes=10)
        db.session.commit()

        AuthManager.send_password_reset_email(user.email, user.name, code)

        return jsonify({"message": "Te enviamos un código para restablecer tu contraseña"})

    @app.route("/api/auth/reset-password", methods=["POST"])
    def reset_password():
        data = request.get_json() or {}
        email = data.get("email", "").strip().lower()
        code = data.get("code", "").strip()
        new_password = data.get("new_password", "")

        if not email or not code or not new_password:
            return jsonify({"error": "Email, código y nueva contraseña son requeridos"}), 400

        if len(new_password) < 6:
            return jsonify({"error": "La nueva contraseña debe tener al menos 6 caracteres"}), 400

        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({"error": "Usuario no encontrado"}), 404

        if not user.reset_password_code or not user.reset_password_expires:
            return jsonify({"error": "Código de recuperación no disponible"}), 400

        if user.reset_password_expires < datetime.utcnow():
            return jsonify({"error": "Código de recuperación expirado"}), 400

        if user.reset_password_code != code:
            return jsonify({"error": "Código de recuperación inválido"}), 400

        user.set_password(new_password)
        user.reset_password_code = None
        user.reset_password_expires = None
        db.session.commit()

        return jsonify({"message": "Contraseña restablecida correctamente"})

    @app.route("/api/auth/me", methods=["GET"])
    @token_required
    def get_current_user():
        user = g.current_user
        try:
            from backend.membership import ensure_membership_active
            ensure_membership_active(user)
        except Exception:
            pass
        user_data = user.to_dict()
        # Add permissions
        from backend.auth import has_permission
        user_data['permissions'] = {
            'admin': has_permission(user, 'admin.*'),
            'admin_users': has_permission(user, 'admin.users'),
            'admin_roles': has_permission(user, 'admin.roles'),
            'admin_permissions': has_permission(user, 'admin.permissions'),
            'products': has_permission(user, 'products.*'),
            'products_read': has_permission(user, 'products.read'),
            'products_create': has_permission(user, 'products.create'),
            'clients': has_permission(user, 'clients.*'),
            'clients_read': has_permission(user, 'clients.read'),
            'sales': has_permission(user, 'sales.*'),
            'sales_read': has_permission(user, 'sales.read'),
            'expenses': has_permission(user, 'expenses.*'),
            'expenses_read': has_permission(user, 'expenses.read'),
            'payments': has_permission(user, 'payments.*'),
            'payments_read': has_permission(user, 'payments.read'),
        }
        return jsonify({"user": user_data})

    @app.route("/api/membership/cancel", methods=["POST"])
    @token_required
    def cancel_membership():
        user = g.current_user
        if not getattr(user, "membership_plan", None) or not getattr(user, "membership_end", None):
            return jsonify({"error": "No tienes una membresía activa"}), 400
        user.membership_auto_renew = False
        db.session.commit()
        return jsonify({
            "success": True,
            "message": "La renovación automática de tu membresía ha sido cancelada.",
            "membership_auto_renew": user.membership_auto_renew
        })

    # ========== BUSINESS ROUTES ==========
    @app.route("/api/businesses", methods=["GET"])
    @token_required
    def get_businesses():
        businesses = Business.query.filter_by(user_id=g.current_user.id).all()
        default_templates = {
            "collection_message": (
                "Hola {cliente} 😊\n"
                "Te escribo de *{negocio}*.\n\n"
                "Según mi registro, tienes un saldo pendiente de *${deuda}*.\n"
                "¿Me confirmas por favor cuándo puedes realizar el pago?\n\n"
                "Gracias 🙌"
            ),
            "sale_message": (
                "Hola {cliente}, gracias por tu compra en *{negocio}*.\n\n"
                "*Detalle:*\n{items}\n"
                "*TOTAL: ${total}*\n"
                "Pagado: ${pagado}\n"
                "Saldo: ${saldo}\n\n"
                "¡Esperamos verte pronto! 👋"
            )
        }
        changed = False
        for b in businesses:
            if not b.whatsapp_templates:
                b.whatsapp_templates = default_templates
                changed = True
        if changed:
            db.session.commit()
        return jsonify({"businesses": [b.to_dict() for b in businesses]})

    @app.route("/api/businesses", methods=["POST"])
    @token_required
    def create_business():
        data = request.get_json() or {}
        name = data.get("name", "").strip()
        
        if not name:
            return jsonify({"error": "Nombre del negocio es requerido"}), 400

        # Verificar límite del plan free
        if g.current_user.plan == "free":
            count = Business.query.filter_by(user_id=g.current_user.id).count()
            if count >= 1:
                return jsonify({
                    "error": "Plan gratuito limitado a 1 negocio",
                    "upgrade_url": "/upgrade"
                }), 403

        default_templates = {
            "collection_message": (
                "Hola {cliente} 😊\n"
                "Te escribo de *{negocio}*.\n\n"
                "Según mi registro, tienes un saldo pendiente de *${deuda}*.\n"
                "¿Me confirmas por favor cuándo puedes realizar el pago?\n\n"
                "Gracias 🙌"
            ),
            "sale_message": (
                "Hola {cliente}, gracias por tu compra en *{negocio}*.\n\n"
                "*Detalle:*\n{items}\n"
                "*TOTAL: ${total}*\n"
                "Pagado: ${pagado}\n"
                "Saldo: ${saldo}\n\n"
                "¡Esperamos verte pronto! 👋"
            )
        }
        business = Business(
            user_id=g.current_user.id,
            name=name,
            currency=data.get("currency", "COP"),
            timezone=data.get("timezone", "America/Bogota"),
            settings=data.get("settings", {}),
            whatsapp_templates=default_templates
        )

        db.session.add(business)
        db.session.commit()

        return jsonify({"business": business.to_dict()}), 201

    @app.route("/api/businesses/<int:business_id>", methods=["GET"])
    @token_required
    def get_business(business_id):
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404
        if not business.whatsapp_templates:
            business.whatsapp_templates = {
                "collection_message": (
                    "Hola {cliente} 😊\n"
                    "Te escribo de *{negocio}*.\n\n"
                    "Según mi registro, tienes un saldo pendiente de *${deuda}*.\n"
                    "¿Me confirmas por favor cuándo puedes realizar el pago?\n\n"
                    "Gracias 🙌"
                ),
                "sale_message": (
                    "Hola {cliente}, gracias por tu compra en *{negocio}*.\n\n"
                    "*Detalle:*\n{items}\n"
                    "*TOTAL: ${total}*\n"
                    "Pagado: ${pagado}\n"
                    "Saldo: ${saldo}\n\n"
                    "¡Esperamos verte pronto! 👋"
                )
            }
            db.session.commit()
        return jsonify({"business": business.to_dict()})

    @app.route("/api/businesses/<int:business_id>", methods=["PUT"])
    @token_required
    def update_business(business_id):
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        data = request.get_json() or {}
        if "name" in data:
            business.name = data["name"].strip()
        if "currency" in data:
            business.currency = data["currency"]
        if "timezone" in data:
            business.timezone = data["timezone"]
        if "monthly_sales_goal" in data:
            try:
                business.monthly_sales_goal = float(data["monthly_sales_goal"])
            except:
                pass
        if "whatsapp_templates" in data:
            # Merge templates
            current_templates = business.whatsapp_templates or {}
            new_templates = data["whatsapp_templates"]
            # Update current with new (simple merge)
            current_templates.update(new_templates)
            business.whatsapp_templates = current_templates
            
        if "settings" in data:
            # Merge settings (preserve existing logo if not provided)
            current_settings = business.settings or {}
            new_settings = data["settings"]
            # Ensure we don't overwrite the logo if it's not in the new settings but exists in current
            if "logo" in current_settings and "logo" not in new_settings:
                new_settings["logo"] = current_settings["logo"]
            business.settings = new_settings

        db.session.commit()
        return jsonify({"business": business.to_dict()})

    @app.route("/api/businesses/<int:business_id>/logo", methods=["POST"])
    @token_required
    def upload_logo(business_id):
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404
        
        if 'logo' not in request.files:
            return jsonify({"error": "No se encontró archivo de imagen"}), 400
        
        file = request.files['logo']
        if file.filename == '':
            return jsonify({"error": "No se selected ningún archivo"}), 400
        
        # Save to assets folder
        import uuid
        ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else 'png'
        filename = f"logo_{business_id}_{uuid.uuid4().hex[:8]}.{ext}"
        filepath = os.path.join('assets', filename)
        file.save(filepath)
        
        # Update business settings with logo path
        settings = business.settings or {}
        settings['logo'] = '/' + filepath.replace('\\', '/')
        business.settings = settings
        db.session.commit()
        
        return jsonify({"logo_url": settings['logo']})

    @app.route("/api/businesses/<int:business_id>", methods=["DELETE"])
    @token_required
    def delete_business(business_id):
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        db.session.delete(business)
        db.session.commit()
        return jsonify({"ok": True, "deleted_id": business_id})

    # ========== PRODUCT ROUTES ==========
    @app.route("/api/businesses/<int:business_id>/products", methods=["GET"])
    @token_required
    @permission_required('products.read')
    def get_products(business_id):
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        search = request.args.get("search")
        category = request.args.get("category")

        query = Product.query.filter_by(business_id=business_id)

        if search:
            query = query.filter(Product.name.ilike(f"%{search}%"))

        if category:
            query = query.filter(Product.category == category)

        products = query.order_by(Product.name).all()
        return jsonify({"products": [p.to_dict() for p in products]})

    @app.route("/api/businesses/<int:business_id>/products", methods=["POST"])
    @token_required
    @permission_required('products.create')
    def create_product(business_id):
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404
        # Plan FREE: limitar a 5 productos
        if g.current_user.plan == "free":
            product_count = Product.query.filter_by(business_id=business_id).count()
            if product_count >= 5:
                return jsonify({
                    "error": "Tu plan gratuito permite hasta 5 productos. Actualiza a Pro para añadir más.",
                    "upgrade_url": "/upgrade"
                }), 403

        data = request.get_json() or {}
        name = data.get("name", "").strip()
        price = data.get("price")

        if not name:
            return jsonify({"error": "Nombre del producto es requerido"}), 400

        try:
            price = float(price) if price else 0
            if price < 0:
                raise ValueError()
        except:
            return jsonify({"error": "Precio debe ser un número positivo"}), 400

        product = Product(
            business_id=business_id,
            name=name,
            description=data.get("description", "").strip() or None,
            type=data.get("type", "product"),
            sku=data.get("sku", "").strip() or None,
            price=price,
            cost=data.get("cost"),
            unit=data.get("unit", "und"),
            stock=data.get("stock", 0),
            low_stock_threshold=data.get("low_stock_threshold", 5)
        )

        db.session.add(product)
        db.session.commit()

        return jsonify({"product": product.to_dict()}), 201

    @app.route("/api/businesses/<int:business_id>/products/<int:product_id>", methods=["GET"])
    @token_required
    def get_product(business_id, product_id):
        product = Product.query.filter_by(id=product_id, business_id=business_id).first()
        if not product:
            return jsonify({"error": "Producto no encontrado"}), 404
        return jsonify({"product": product.to_dict()})

    @app.route("/api/businesses/<int:business_id>/products/<int:product_id>", methods=["PUT"])
    @token_required
    @permission_required('products.update')
    def update_product(business_id, product_id):
        product = Product.query.filter_by(id=product_id, business_id=business_id).first()
        if not product:
            return jsonify({"error": "Producto no encontrado"}), 404

        data = request.get_json() or {}
        if "name" in data:
            product.name = data["name"]
        if "description" in data:
            product.description = data["description"]
        if "type" in data:
            product.type = data["type"]
        if "sku" in data:
            product.sku = data["sku"].strip() or None
        if "price" in data:
            product.price = float(data["price"])
        if "cost" in data:
            product.cost = float(data["cost"]) if data["cost"] else None
        if "unit" in data:
            product.unit = data["unit"]
        if "stock" in data:
            product.stock = float(data["stock"]) if data["stock"] else 0
        if "low_stock_threshold" in data:
            product.low_stock_threshold = float(data["low_stock_threshold"]) if data["low_stock_threshold"] else 5
        if "active" in data:
            product.active = bool(data["active"])

        db.session.commit()
        return jsonify({"product": product.to_dict()})

    @app.route("/api/businesses/<int:business_id>/products/<int:product_id>", methods=["DELETE"])
    @token_required
    @permission_required('products.delete')
    def delete_product(business_id, product_id):
        product = Product.query.filter_by(id=product_id, business_id=business_id).first()
        if not product:
            return jsonify({"error": "Producto no encontrado"}), 404

        db.session.delete(product)
        db.session.commit()
        return jsonify({"ok": True})

    # ========== CUSTOMER ROUTES ==========
    @app.route("/api/businesses/<int:business_id>/customers", methods=["GET"])
    @token_required
    @permission_required('clients.read')
    def get_customers(business_id):
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        search = request.args.get("search")

        query = Customer.query.filter_by(business_id=business_id)

        if search:
            query = query.filter(Customer.name.ilike(f"%{search}%"))

        customers = query.order_by(Customer.name).all()
        return jsonify({"customers": [c.to_dict() for c in customers]})

    @app.route("/api/businesses/<int:business_id>/customers", methods=["POST"])
    @token_required
    @permission_required('clients.create')
    def create_customer(business_id):
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404
        # Plan FREE: limitar a 5 clientes
        if g.current_user.plan == "free":
            customer_count = Customer.query.filter_by(business_id=business_id).count()
            if customer_count >= 5:
                return jsonify({
                    "error": "Tu plan gratuito permite hasta 5 clientes. Actualiza a Pro para registrar más.",
                    "upgrade_url": "/upgrade"
                }), 403

        data = request.get_json() or {}
        name = data.get("name", "").strip()

        if not name:
            return jsonify({"error": "Nombre del cliente es requerido"}), 400

        customer = Customer(
            business_id=business_id,
            name=name,
            phone=data.get("phone", "").strip() or None,
            address=data.get("address", "").strip() or None,
            notes=data.get("notes", "").strip() or None
        )

        db.session.add(customer)
        db.session.commit()

        return jsonify({"customer": customer.to_dict()}), 201

    @app.route("/api/businesses/<int:business_id>/customers/debtors", methods=["GET"])
    @token_required
    @permission_required('clients.read')
    def get_debtors(business_id):
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        # Get customers with balance
        customers = Customer.query.filter_by(business_id=business_id).all()
        debtors = []

        for customer in customers:
            # Calculate balance
            charges = db.session.query(db.func.sum(LedgerEntry.amount)).filter(
                LedgerEntry.customer_id == customer.id,
                LedgerEntry.entry_type == "charge"
            ).scalar() or 0

            payments = db.session.query(db.func.sum(LedgerEntry.amount)).filter(
                LedgerEntry.customer_id == customer.id,
                LedgerEntry.entry_type == "payment"
            ).scalar() or 0

            balance = charges - payments

            if balance > 0:
                # Get oldest debt date
                oldest_charge = LedgerEntry.query.filter_by(
                    customer_id=customer.id,
                    entry_type="charge"
                ).order_by(LedgerEntry.entry_date).first()

                debtors.append({
                    "id": customer.id,
                    "name": customer.name,
                    "phone": customer.phone,
                    "balance": round(balance, 2),
                    "since": oldest_charge.entry_date.isoformat() if oldest_charge else None
                })

        # Sort by balance descending
        debtors.sort(key=lambda x: x["balance"], reverse=True)

        return jsonify({"debtors": debtors})

    @app.route("/api/businesses/<int:business_id>/customers/<int:customer_id>/whatsapp-collection-message", methods=["GET"])
    @token_required
    @permission_required('clients.read')
    def get_whatsapp_collection_message(business_id, customer_id):
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        customer = Customer.query.filter_by(id=customer_id, business_id=business_id).first()
        if not customer:
            return jsonify({"error": "Cliente no encontrado"}), 404

        # Calculate balance
        charges = db.session.query(db.func.sum(LedgerEntry.amount)).filter(
            LedgerEntry.customer_id == customer_id,
            LedgerEntry.entry_type == "charge"
        ).scalar() or 0

        payments = db.session.query(db.func.sum(LedgerEntry.amount)).filter(
            LedgerEntry.customer_id == customer_id,
            LedgerEntry.entry_type == "payment"
        ).scalar() or 0

        balance = charges - payments
        balance = round(balance, 2)

        # Format money
        try:
            formatted_balance = "{:,.0f}".format(balance).replace(",", ".")
        except:
            formatted_balance = str(balance)

        # Build message
        business_name = business.name or "nosotros"
        
        # Default template if not set
        default_template = (
            "Hola {cliente} 😊\n"
            "Te escribo de *{negocio}*.\n\n"
            "Según mi registro, tienes un saldo pendiente de *${deuda}*.\n"
            "¿Me confirmas por favor cuándo puedes realizar el pago?\n\n"
            "Gracias 🙌"
        )
        
        # Get custom template if exists
        templates = business.whatsapp_templates or {}
        template = templates.get("collection_message", default_template)
        
        # Replace variables
        message = template.replace("{cliente}", customer.name)\
                          .replace("{negocio}", business_name)\
                          .replace("{deuda}", formatted_balance)

        return jsonify({
            "message": message,
            "clientName": customer.name,
            "debt": balance
        })

    @app.route("/api/businesses/<int:business_id>/customers/<int:customer_id>", methods=["GET"])
    @token_required
    def get_customer(business_id, customer_id):
        customer = Customer.query.filter_by(id=customer_id, business_id=business_id).first()
        if not customer:
            return jsonify({"error": "Cliente no encontrado"}), 404

        # Get balance
        charges = db.session.query(db.func.sum(LedgerEntry.amount)).filter(
            LedgerEntry.customer_id == customer_id,
            LedgerEntry.entry_type == "charge"
        ).scalar() or 0

        payments = db.session.query(db.func.sum(LedgerEntry.amount)).filter(
            LedgerEntry.customer_id == customer_id,
            LedgerEntry.entry_type == "payment"
        ).scalar() or 0

        balance = charges - payments

        customer_data = customer.to_dict()
        customer_data["balance"] = round(balance, 2)

        return jsonify({"customer": customer_data})

    @app.route("/api/businesses/<int:business_id>/customers/<int:customer_id>", methods=["PUT"])
    @token_required
    @permission_required('clients.update')
    def update_customer(business_id, customer_id):
        customer = Customer.query.filter_by(id=customer_id, business_id=business_id).first()
        if not customer:
            return jsonify({"error": "Cliente no encontrado"}), 404

        data = request.get_json() or {}
        if "name" in data:
            customer.name = data["name"].strip()
        if "phone" in data:
            customer.phone = data["phone"].strip() or None
        if "address" in data:
            customer.address = data["address"].strip() or None
        if "notes" in data:
            customer.notes = data["notes"].strip() or None
        if "active" in data:
            customer.active = bool(data["active"])

        db.session.commit()
        return jsonify({"customer": customer.to_dict()})

    @app.route("/api/businesses/<int:business_id>/customers/<int:customer_id>", methods=["DELETE"])
    @token_required
    @permission_required('clients.delete')
    def delete_customer(business_id, customer_id):
        customer = Customer.query.filter_by(id=customer_id, business_id=business_id).first()
        if not customer:
            return jsonify({"error": "Cliente no encontrado"}), 404

        db.session.delete(customer)
        db.session.commit()
        return jsonify({"ok": True})

    # ========== SALE ROUTES ==========
    @app.route("/api/businesses/<int:business_id>/sales", methods=["GET"])
    @token_required
    @permission_required('sales.read')
    def get_sales(business_id):
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        # Get date filters
        start_date = request.args.get("start_date")
        end_date = request.args.get("end_date")
        search = request.args.get("search")
        status = request.args.get("status")

        query = Sale.query.filter_by(business_id=business_id)

        if start_date:
            try:
                start = datetime.strptime(start_date, "%Y-%m-%d").date()
                query = query.filter(Sale.sale_date >= start)
            except:
                pass

        if end_date:
            try:
                end = datetime.strptime(end_date, "%Y-%m-%d").date()
                query = query.filter(Sale.sale_date <= end)
            except:
                pass

        if search:
            # Search in customer name through customer relationship
            query = query.join(Customer, Sale.customer_id == Customer.id).filter(
                Customer.name.ilike(f"%{search}%")
            )

        if status == 'paid':
            query = query.filter(Sale.paid == True)
        elif status == 'pending':
            query = query.filter(Sale.paid == False)

        sales = query.order_by(Sale.sale_date.desc()).limit(500).all()
        return jsonify({"sales": [s.to_dict() for s in sales]})

    @app.route("/api/businesses/<int:business_id>/sales", methods=["POST"])
    @token_required
    @permission_required('sales.create')
    def create_sale(business_id):
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404
        # Plan FREE: limitar a 20 ventas
        if g.current_user.plan == "free":
            sales_count = Sale.query.filter_by(business_id=business_id).count()
            if sales_count >= 20:
                return jsonify({
                    "error": "Tu plan gratuito permite hasta 20 ventas. Actualiza a Pro para seguir registrando.",
                    "upgrade_url": "/upgrade"
                }), 403

        data = request.get_json() or {}
        items = data.get("items", [])

        if not items:
            return jsonify({"error": "Items de venta son requeridos"}), 400

        # Calculate totals
        subtotal = sum(item.get("total", 0) for item in items)
        discount = float(data.get("discount", 0))
        total = subtotal - discount

        if total <= 0:
            return jsonify({"error": "Total debe ser mayor a 0"}), 400

        payment_method = data.get("payment_method", "cash")
        paid = payment_method != "credit"  # Si es crédito, no está pagado

        # Parse sale date
        sale_date = date.today()
        if data.get("sale_date"):
            try:
                sale_date = datetime.strptime(data["sale_date"], "%Y-%m-%d").date()
            except:
                pass

        sale = Sale(
            business_id=business_id,
            customer_id=data.get("customer_id"),
            sale_date=sale_date,
            items=items,
            subtotal=subtotal,
            discount=discount,
            total=total,
            balance=total if payment_method == "credit" else 0,
            payment_method=payment_method,
            paid=paid,
            note=data.get("note", "").strip() or None
        )

        # Calculate total cost for profit tracking
        total_cost = 0
        try:
            for item in items:
                pid = item.get("product_id")
                qty = float(item.get("qty", 1))
                if pid:
                    product = Product.query.get(pid)
                    if product and product.cost:
                        total_cost += product.cost * qty
        except Exception as e:
            print(f"Error calculating sale cost: {e}")
            pass
            
        sale.total_cost = total_cost

        db.session.add(sale)
        db.session.flush()  # Get sale.id

        # If credit sale, create ledger charge
        if not paid and data.get("customer_id"):
            charge = LedgerEntry(
                business_id=business_id,
                customer_id=data["customer_id"],
                entry_type="charge",
                amount=total,
                entry_date=sale_date,
                note=f"Venta #{sale.id}",
                ref_type="sale",
                ref_id=sale.id
            )
            db.session.add(charge)

        db.session.commit()

        # Generate invoice URL
        try:
            s = URLSafeTimedSerializer(app.config["SECRET_KEY"])
            token = s.dumps(sale.id, salt="receipt-view")
            invoice_url = url_for('public_receipt', token=token, _external=True)
        except Exception:
            invoice_url = ""

        return jsonify({
            "sale": sale.to_dict(),
            "invoice_url": invoice_url
        }), 201

    @app.route("/api/businesses/<int:business_id>/fix-costs", methods=["POST"])
    @token_required
    def fix_sales_costs(business_id):
        """Fix missing total_cost for historical sales"""
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404
            
        sales = Sale.query.filter(
            Sale.business_id == business_id,
            (Sale.total_cost == 0) | (Sale.total_cost == None)
        ).all()
        
        count = 0
        
        # Batch processing to avoid memory issues
        for sale in sales:
            try:
                total_cost = 0
                if sale.items:
                    for item in sale.items:
                        pid = item.get("product_id")
                        qty = float(item.get("qty", 1))
                        if pid:
                            product = Product.query.get(pid)
                            if product and product.cost:
                                total_cost += product.cost * qty
                sale.total_cost = total_cost
                count += 1
            except Exception as e:
                print(f"Error fixing sale {sale.id}: {e}")
        
        db.session.commit()
        return jsonify({"message": f"Updated costs for {count} sales"})

    @app.route("/api/businesses/<int:business_id>/sales/<int:sale_id>", methods=["GET"])
    @token_required
    def get_sale(business_id, sale_id):
        sale = Sale.query.filter_by(id=sale_id, business_id=business_id).first()
        if not sale:
            return jsonify({"error": "Venta no encontrada"}), 404
        return jsonify({"sale": sale.to_dict()})

    @app.route("/api/businesses/<int:business_id>/sales/<int:sale_id>", methods=["DELETE"])
    @token_required
    @permission_required('sales.delete')
    def delete_sale(business_id, sale_id):
        sale = Sale.query.filter_by(id=sale_id, business_id=business_id).first()
        if not sale:
            return jsonify({"error": "Venta no encontrada"}), 404

        # Delete related ledger entries
        LedgerEntry.query.filter_by(ref_type="sale", ref_id=sale_id).delete()
        
        db.session.delete(sale)
        db.session.commit()
        return jsonify({"ok": True})

    # ========== ORDER ROUTES ==========
    def _ensure_sale_from_order(order, sale_date=None):
        try:
            note_tag = f"Desde pedido {order.order_number} (ID {order.id})"
            existing = Sale.query.filter_by(business_id=order.business_id, note=note_tag).first()
            if existing:
                return existing
            
            items = order.items or []
            total_cost = 0
            
            for item in items:
                pid = item.get("product_id")
                qty = item.get("qty") if item.get("qty") is not None else item.get("quantity")
                try:
                    qty = float(qty) if qty is not None else 1.0
                except:
                    qty = 1.0
                
                if pid:
                    product = Product.query.get(pid)
                    if product:
                        # Discount stock for physical products
                        if product.type == 'product':
                            product.stock = (product.stock or 0) - qty
                        
                        # Calculate cost
                        if product.cost:
                            total_cost += (product.cost or 0) * qty
            
            sale = Sale(
                business_id=order.business_id,
                customer_id=order.customer_id,
                sale_date=sale_date or date.today(),
                items=items,
                subtotal=order.subtotal or 0,
                discount=order.discount or 0,
                total=order.total or 0,
                balance=0,
                payment_method="cash",
                paid=True,
                note=note_tag
            )
            sale.total_cost = total_cost
            db.session.add(sale)
            db.session.flush()
            return sale
        except Exception as e:
            app.logger.error(f"Error creando venta desde pedido {order.id}: {e}")
            return None

    @app.route("/api/businesses/<int:business_id>/orders", methods=["GET"])
    @token_required
    @permission_required('sales.read')
    def get_orders(business_id):
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        # Filters
        status = request.args.get("status")
        customer_id = request.args.get("customer_id")
        search = request.args.get("search")
        start_date = request.args.get("start_date")
        end_date = request.args.get("end_date")
        sort = request.args.get("sort", "newest")  # newest, oldest, highest, lowest

        query = Order.query.filter_by(business_id=business_id)

        if status:
            query = query.filter(Order.status == status)

        if customer_id:
            query = query.filter(Order.customer_id == customer_id)

        if search:
            query = query.filter(Order.order_number.ilike(f"%{search}%"))

        if start_date:
            try:
                start = datetime.strptime(start_date, "%Y-%m-%d")
                query = query.filter(Order.order_date >= start)
            except:
                pass

        if end_date:
            try:
                end = datetime.strptime(end_date, "%Y-%m-%d")
                query = query.filter(Order.order_date <= end)
            except:
                pass

        # Sorting
        if sort == "oldest":
            query = query.order_by(Order.order_date.asc())
        elif sort == "highest":
            query = query.order_by(Order.total.desc())
        elif sort == "lowest":
            query = query.order_by(Order.total.asc())
        else:  # newest
            query = query.order_by(Order.order_date.desc())

        orders = query.limit(500).all()
        return jsonify({"orders": [o.to_dict() for o in orders]})

    @app.route("/api/businesses/<int:business_id>/orders", methods=["POST"])
    @token_required
    @permission_required('sales.create')
    def create_order(business_id):
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        data = request.get_json()

        # Generate unique order number scoped to business
        # Format: ORD-{business_id}-{sequence}
        count = Order.query.filter_by(business_id=business_id).count()
        next_num = count + 1
        
        while True:
            order_number = f"ORD-{business_id}-{next_num:05d}"
            if not Order.query.filter_by(order_number=order_number).first():
                break
            next_num += 1

        customer_id = data.get("customer_id")
        if customer_id == "":
            customer_id = None
            
        items = data.get("items", [])
        subtotal = data.get("subtotal", 0)
        discount = data.get("discount", 0)
        total = data.get("total", subtotal - discount)
        notes = data.get("notes", "")
        
        # Handle order date
        order_date_str = data.get("order_date")
        order_date = datetime.utcnow()
        if order_date_str:
            try:
                # Append current time to the date if only date is provided
                # Or just parse the date and set time to now or 00:00
                # Assuming format YYYY-MM-DD
                dt = datetime.strptime(order_date_str, "%Y-%m-%d")
                # Keep current time for precision if it's today, otherwise use end of day or start?
                # Let's just use the date part combined with current time for ordering
                now = datetime.utcnow()
                order_date = dt.replace(hour=now.hour, minute=now.minute, second=now.second)
            except ValueError:
                pass # Use default

        order = Order(
            business_id=business_id,
            customer_id=customer_id,
            order_number=order_number,
            status="pending",
            items=items,
            subtotal=subtotal,
            discount=discount,
            total=total,
            notes=notes,
            order_date=order_date
        )

        db.session.add(order)
        db.session.commit()

        return jsonify({"order": order.to_dict()}), 201

    @app.route("/api/businesses/<int:business_id>/orders/<int:order_id>", methods=["GET"])
    @token_required
    @permission_required('sales.read')
    def get_order(business_id, order_id):
        order = Order.query.filter_by(id=order_id, business_id=business_id).first()
        if not order:
            return jsonify({"error": "Pedido no encontrado"}), 404
        return jsonify({"order": order.to_dict()})

    @app.route("/api/businesses/<int:business_id>/orders/<int:order_id>", methods=["PUT"])
    @token_required
    @permission_required('sales.update')
    def update_order(business_id, order_id):
        order = Order.query.filter_by(id=order_id, business_id=business_id).first()
        if not order:
            return jsonify({"error": "Pedido no encontrado"}), 404

        data = request.get_json()

        prev_status = order.status
        if "status" in data:
            order.status = data["status"]
        if "customer_id" in data:
            order.customer_id = data["customer_id"]
        if "items" in data:
            order.items = data["items"]
        if "subtotal" in data:
            order.subtotal = data["subtotal"]
        if "discount" in data:
            order.discount = data["discount"]
        if "total" in data:
            order.total = data["total"]
        if "notes" in data:
            order.notes = data["notes"]

        try:
            if prev_status != "completed" and order.status == "completed":
                sale_date = None
                date_str = data.get("sale_date") or data.get("completed_at")
                if date_str:
                    try:
                        sale_date = datetime.strptime(date_str, "%Y-%m-%d").date()
                    except:
                        pass
                _ensure_sale_from_order(order, sale_date=sale_date)
        except Exception as e:
            app.logger.error(f"No se pudo crear la venta desde el pedido {order.id}: {e}")

        db.session.commit()
        return jsonify({"order": order.to_dict()})

    @app.route("/api/businesses/<int:business_id>/orders/<int:order_id>", methods=["DELETE"])
    @token_required
    @permission_required('sales.delete')
    def delete_order(business_id, order_id):
        order = Order.query.filter_by(id=order_id, business_id=business_id).first()
        if not order:
            return jsonify({"error": "Pedido no encontrado"}), 404

        db.session.delete(order)
        db.session.commit()
        return jsonify({"ok": True})

    @app.route("/api/businesses/<int:business_id>/orders/<int:order_id>/status", methods=["PATCH"])
    @token_required
    @permission_required('sales.update')
    def update_order_status(business_id, order_id):
        order = Order.query.filter_by(id=order_id, business_id=business_id).first()
        if not order:
            return jsonify({"error": "Pedido no encontrado"}), 404

        data = request.get_json()
        status = data.get("status")

        if status not in ["pending", "in_progress", "completed", "cancelled"]:
            return jsonify({"error": "Estado inválido"}), 400

        prev_status = order.status
        order.status = status
        try:
            if prev_status != "completed" and status == "completed":
                sale_date = None
                date_str = data.get("sale_date") or data.get("completed_at")
                if date_str:
                    try:
                        sale_date = datetime.strptime(date_str, "%Y-%m-%d").date()
                    except:
                        pass
                _ensure_sale_from_order(order, sale_date=sale_date)
        except Exception as e:
            app.logger.error(f"No se pudo crear la venta desde el pedido {order.id}: {e}")

        db.session.commit()

        return jsonify({"order": order.to_dict()})

    @app.route("/api/businesses/<int:business_id>/orders/<int:order_id>/pdf", methods=["GET"])
    @token_required
    def get_order_pdf(business_id, order_id):
        order = Order.query.filter_by(id=order_id, business_id=business_id).first()
        if not order:
            return jsonify({"error": "Pedido no encontrado"}), 404

        # Get business profile
        settings = AppSettings.query.all()
        settings_dict = {s.key: s.value for s in settings}
        business = Business.query.get(business_id)
        
        # Prepare context
        context = {
            "order": order,
            "business": business,
            "items": order.items,
            "customer": order.customer,
            "date": order.order_date.strftime("%d/%m/%Y"),
            "settings": settings_dict,
            "logo_url": business.settings.get("logo") if business.settings else None,
            "subtotal": order.subtotal,
            "discount": order.discount,
            "total": order.total,
            "notes": order.notes
        }

        # Render HTML
        html_content = render_template("order_pdf.html", **context)
        
        # Create PDF
        if not HAS_XHTML2PDF:
            return jsonify({"error": "La librería de generación de PDF no está instalada en el servidor"}), 500

        pdf_buffer = BytesIO()
        try:
            pisa_status = pisa.CreatePDF(html_content, dest=pdf_buffer)
            if pisa_status.err:
                return jsonify({"error": "Error al generar PDF"}), 500
        except Exception as e:
            return jsonify({"error": f"Error: {str(e)}"}), 500
            
        pdf_buffer.seek(0)
        return send_file(
            pdf_buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f'Pedido_{order.order_number}.pdf'
        )

    @app.route("/api/businesses/<int:business_id>/orders/stats", methods=["GET"])
    @token_required
    @permission_required('sales.read')
    def get_order_stats(business_id):
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        # Total orders
        total_orders = Order.query.filter_by(business_id=business_id).count()

        # Orders by status
        pending = Order.query.filter_by(business_id=business_id, status="pending").count()
        in_progress = Order.query.filter_by(business_id=business_id, status="in_progress").count()
        completed = Order.query.filter_by(business_id=business_id, status="completed").count()
        cancelled = Order.query.filter_by(business_id=business_id, status="cancelled").count()

        # Total revenue from completed orders
        from sqlalchemy import func
        revenue_result = db.session.query(func.sum(Order.total)).filter(
            Order.business_id == business_id,
            Order.status == "completed"
        ).scalar() or 0

        return jsonify({
            "total_orders": total_orders,
            "pending": pending,
            "in_progress": in_progress,
            "completed": completed,
            "cancelled": cancelled,
            "total_revenue": revenue_result
        })

    # ========== EXPENSE ROUTES ==========
    @app.route("/api/businesses/<int:business_id>/expenses", methods=["GET"])
    @token_required
    @permission_required('expenses.read')
    def get_expenses(business_id):
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        start_date = request.args.get("start_date")
        end_date = request.args.get("end_date")
        category = request.args.get("category")
        search = request.args.get("search")

        query = Expense.query.filter_by(business_id=business_id)

        if start_date:
            try:
                start = datetime.strptime(start_date, "%Y-%m-%d").date()
                query = query.filter(Expense.expense_date >= start)
            except:
                pass

        if end_date:
            try:
                end = datetime.strptime(end_date, "%Y-%m-%d").date()
                query = query.filter(Expense.expense_date <= end)
            except:
                pass

        if category:
            query = query.filter(Expense.category == category)

        if search:
            query = query.filter(Expense.description.ilike(f"%{search}%"))

        expenses = query.order_by(Expense.expense_date.desc()).limit(500).all()
        return jsonify({"expenses": [e.to_dict() for e in expenses]})

    @app.route("/api/businesses/<int:business_id>/expenses", methods=["POST"])
    @token_required
    @permission_required('expenses.create')
    def create_expense(business_id):
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        data = request.get_json() or {}
        category = data.get("category", "").strip()
        amount = data.get("amount")

        if not category:
            return jsonify({"error": "Categoría es requerida"}), 400

        try:
            amount = float(amount)
            if amount <= 0:
                raise ValueError()
        except:
            return jsonify({"error": "Monto debe ser un número positivo"}), 400

        expense_date = date.today()
        if data.get("expense_date"):
            try:
                expense_date = datetime.strptime(data["expense_date"], "%Y-%m-%d").date()
            except:
                pass

        expense = Expense(
            business_id=business_id,
            expense_date=expense_date,
            category=category,
            amount=amount,
            description=data.get("description", "").strip() or None
        )

        db.session.add(expense)
        db.session.commit()

        return jsonify({"expense": expense.to_dict()}), 201

    @app.route("/api/businesses/<int:business_id>/expenses/<int:expense_id>", methods=["PUT"])
    @token_required
    @permission_required('expenses.update')
    def update_expense(business_id, expense_id):
        expense = Expense.query.filter_by(id=expense_id, business_id=business_id).first()
        if not expense:
            return jsonify({"error": "Gasto no encontrado"}), 404

        data = request.get_json() or {}
        if "category" in data:
            expense.category = data["category"].strip()
        if "amount" in data:
            expense.amount = float(data["amount"])
        if "description" in data:
            expense.description = data["description"].strip() or None
        if "expense_date" in data:
            try:
                expense.expense_date = datetime.strptime(data["expense_date"], "%Y-%m-%d").date()
            except:
                pass

        db.session.commit()
        return jsonify({"expense": expense.to_dict()})

    @app.route("/api/businesses/<int:business_id>/expenses/<int:expense_id>", methods=["DELETE"])
    @token_required
    @permission_required('expenses.delete')
    def delete_expense(business_id, expense_id):
        expense = Expense.query.filter_by(id=expense_id, business_id=business_id).first()
        if not expense:
            return jsonify({"error": "Gasto no encontrado"}), 404

        db.session.delete(expense)
        db.session.commit()
        return jsonify({"ok": True})

    # ========== RECURRING EXPENSE ROUTES ==========
    @app.route("/api/businesses/<int:business_id>/recurring-expenses", methods=["GET"])
    @token_required
    @permission_required('expenses.read')
    def get_recurring_expenses(business_id):
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        expenses = RecurringExpense.query.filter_by(business_id=business_id).order_by(RecurringExpense.due_day).all()
        return jsonify({"recurring_expenses": [e.to_dict() for e in expenses]})

    @app.route("/api/businesses/<int:business_id>/recurring-expenses", methods=["POST"])
    @token_required
    @permission_required('expenses.create')
    def create_recurring_expense(business_id):
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        data = request.get_json()
        if not data or not data.get("name") or not data.get("amount") or not data.get("due_day"):
            return jsonify({"error": "Datos incompletos"}), 400

        try:
            due_day = int(data["due_day"])
            if not (1 <= due_day <= 31):
                return jsonify({"error": "Día debe ser entre 1 y 31"}), 400

            # Calculate initial next_due_date
            today = date.today()
            frequency = data.get("frequency", "monthly")
            import calendar

            def get_valid_date(y, m, d):
                # Normalize month (handle overflow)
                # Simple year increment if month > 12
                while m > 12:
                    m -= 12
                    y += 1
                last_day = calendar.monthrange(y, m)[1]
                return date(y, m, min(d, last_day))

            # Try to set date to this month's due_day
            next_due = get_valid_date(today.year, today.month, due_day)
            
            # If passed, move to next interval
            if next_due < today:
                if frequency == 'monthly':
                    next_due = get_valid_date(next_due.year, next_due.month + 1, due_day)
                elif frequency == 'annual':
                    next_due = get_valid_date(next_due.year + 1, next_due.month, due_day)
                elif frequency == 'weekly':
                     while next_due < today:
                         next_due += timedelta(days=7)
                elif frequency == 'biweekly':
                     while next_due < today:
                         next_due += timedelta(days=15)
            
            expense = RecurringExpense(
                business_id=business_id,
                name=data["name"],
                amount=float(data["amount"]),
                due_day=due_day,
                frequency=frequency,
                next_due_date=next_due,
                category=data.get("category"),
                is_active=data.get("is_active", True)
            )
            db.session.add(expense)
            db.session.commit()
            return jsonify({"recurring_expense": expense.to_dict()}), 201
        except Exception as e:
            return jsonify({"error": str(e)}), 400

    @app.route("/api/businesses/<int:business_id>/recurring-expenses/<int:expense_id>", methods=["PUT"])
    @token_required
    @permission_required('expenses.update')
    def update_recurring_expense(business_id, expense_id):
        expense = RecurringExpense.query.filter_by(id=expense_id, business_id=business_id).first()
        if not expense:
            return jsonify({"error": "Gasto recurrente no encontrado"}), 404

        data = request.get_json()
        try:
            if "name" in data:
                expense.name = data["name"]
            if "amount" in data:
                expense.amount = float(data["amount"])
            if "due_day" in data:
                due_day = int(data["due_day"])
                if not (1 <= due_day <= 31):
                    return jsonify({"error": "Día debe ser entre 1 y 31"}), 400
                expense.due_day = due_day
            if "frequency" in data:
                expense.frequency = data["frequency"]
            if "next_due_date" in data:
                # Expect YYYY-MM-DD
                try:
                    expense.next_due_date = datetime.strptime(data["next_due_date"], "%Y-%m-%d").date()
                except:
                    pass # Ignore invalid date format
            if "category" in data:
                expense.category = data["category"]
            if "is_active" in data:
                expense.is_active = bool(data["is_active"])
            
            db.session.commit()
            return jsonify({"recurring_expense": expense.to_dict()})
        except Exception as e:
            return jsonify({"error": str(e)}), 400

    @app.route("/api/businesses/<int:business_id>/recurring-expenses/<int:expense_id>", methods=["DELETE"])
    @token_required
    @permission_required('expenses.delete')
    def delete_recurring_expense(business_id, expense_id):
        expense = RecurringExpense.query.filter_by(id=expense_id, business_id=business_id).first()
        if not expense:
            return jsonify({"error": "Gasto recurrente no encontrado"}), 404

        db.session.delete(expense)
        db.session.commit()
        return jsonify({"ok": True})

    # ========== SALES GOALS ROUTES (PRO) ==========
    @app.route("/api/businesses/<int:business_id>/sales-goals", methods=["GET"])
    @token_required
    def get_sales_goals(business_id):
        # PRO Check - Disabled for demo/fix
        # if g.current_user.plan != 'pro':
        #     return jsonify({"code": "PRO_REQUIRED", "message": "Disponible solo en PRO"}), 403

        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        status_filter = request.args.get("status", "active")
        
        query = SalesGoal.query.filter_by(business_id=business_id)
        if status_filter == 'active':
            # Active or Achieved but not yet archived/congrats_archived
            query = query.filter(SalesGoal.congrats_archived == False)
        elif status_filter == 'archived':
            query = query.filter(SalesGoal.congrats_archived == True)
            
        goals = query.order_by(SalesGoal.end_date).all()
        
        results = []
        for goal in goals:
            # Calculate current amount
            current_amount = db.session.query(func.sum(Sale.total)).filter(
                Sale.business_id == business_id,
                Sale.sale_date >= goal.start_date,
                Sale.sale_date <= goal.end_date
            ).scalar() or 0
            
            # Check achievement
            if goal.status == 'active' and current_amount >= goal.target_amount:
                goal.status = 'achieved'
                goal.achieved_at = datetime.utcnow()
                db.session.commit()
            
            progress_pct = min(100, (current_amount / goal.target_amount) * 100) if goal.target_amount > 0 else 0
            
            should_show_congrats = (
                goal.status == 'achieved' and 
                not goal.congrats_archived and 
                goal.last_congrats_seen_at is None
            )
            
            data = goal.to_dict()
            data['current_amount'] = current_amount
            data['progress_pct'] = progress_pct
            data['should_show_congrats'] = should_show_congrats
            results.append(data)
            
        return jsonify({"sales_goals": results})

    @app.route("/api/businesses/<int:business_id>/sales-goals", methods=["POST"])
    @token_required
    def create_sales_goal(business_id):
        # if g.current_user.plan != 'pro':
        #     return jsonify({"code": "PRO_REQUIRED", "message": "Disponible solo en PRO"}), 403

        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        data = request.get_json()
        if not data.get("title") or not data.get("target_amount") or not data.get("start_date") or not data.get("end_date"):
            return jsonify({"error": "Datos incompletos"}), 400

        try:
            start_date = datetime.strptime(data["start_date"], "%Y-%m-%d").date()
            end_date = datetime.strptime(data["end_date"], "%Y-%m-%d").date()
            if end_date < start_date:
                return jsonify({"error": "Fecha fin debe ser mayor o igual a inicio"}), 400
            
            goal = SalesGoal(
                user_id=g.current_user.id,
                business_id=business_id,
                title=data["title"],
                description=data.get("description"),
                target_amount=float(data["target_amount"]),
                start_date=start_date,
                end_date=end_date
            )
            db.session.add(goal)
            db.session.commit()
            return jsonify({"sales_goal": goal.to_dict()}), 201
        except Exception as e:
            return jsonify({"error": str(e)}), 400

    @app.route("/api/businesses/<int:business_id>/sales-goals/<int:goal_id>", methods=["PUT"])
    @token_required
    def update_sales_goal(business_id, goal_id):
        # if g.current_user.plan != 'pro':
        #     return jsonify({"code": "PRO_REQUIRED", "message": "Disponible solo en PRO"}), 403

        goal = SalesGoal.query.filter_by(id=goal_id, business_id=business_id).first()
        if not goal:
            return jsonify({"error": "Meta no encontrada"}), 404
            
        if goal.status == 'archived' or goal.congrats_archived:
             return jsonify({"error": "No se puede editar una meta archivada"}), 400

        data = request.get_json()
        try:
            if "title" in data: goal.title = data["title"]
            if "description" in data: goal.description = data["description"]
            if "target_amount" in data: goal.target_amount = float(data["target_amount"])
            if "start_date" in data: goal.start_date = datetime.strptime(data["start_date"], "%Y-%m-%d").date()
            if "end_date" in data: goal.end_date = datetime.strptime(data["end_date"], "%Y-%m-%d").date()
            
            if goal.end_date < goal.start_date:
                 return jsonify({"error": "Fecha fin debe ser mayor o igual a inicio"}), 400

            db.session.commit()
            return jsonify({"sales_goal": goal.to_dict()})
        except Exception as e:
            return jsonify({"error": str(e)}), 400

    @app.route("/api/businesses/<int:business_id>/sales-goals/<int:goal_id>/archive", methods=["POST"])
    @token_required
    def archive_sales_goal(business_id, goal_id):
        # if g.current_user.plan != 'pro':
        #     return jsonify({"code": "PRO_REQUIRED", "message": "Disponible solo en PRO"}), 403

        goal = SalesGoal.query.filter_by(id=goal_id, business_id=business_id).first()
        if not goal:
            return jsonify({"error": "Meta no encontrada"}), 404

        goal.status = 'archived'
        goal.congrats_archived = True
        db.session.commit()
        return jsonify({"ok": True})

    @app.route("/api/businesses/<int:business_id>/sales-goals/<int:goal_id>/mark-congrats-seen", methods=["POST"])
    @token_required
    def mark_sales_goal_seen(business_id, goal_id):
        if g.current_user.plan != 'pro':
            return jsonify({"code": "PRO_REQUIRED", "message": "Disponible solo en PRO"}), 403

        goal = SalesGoal.query.filter_by(id=goal_id, business_id=business_id).first()
        if not goal:
            return jsonify({"error": "Meta no encontrada"}), 404

        goal.last_congrats_seen_at = datetime.utcnow()
        db.session.commit()
        return jsonify({"ok": True})

    # ========== PAYMENT ROUTES ==========
    @app.route("/api/businesses/<int:business_id>/payments", methods=["GET"])
    @token_required
    @permission_required('payments.read')
    def get_payments(business_id):
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404
        
        start_date = request.args.get("start_date")
        end_date = request.args.get("end_date")
        search = request.args.get("search")
        
        query = Payment.query.filter_by(business_id=business_id)
        
        if start_date:
            try:
                start = datetime.strptime(start_date, "%Y-%m-%d").date()
                query = query.filter(Payment.payment_date >= start)
            except:
                pass
        
        if end_date:
            try:
                end = datetime.strptime(end_date, "%Y-%m-%d").date()
                query = query.filter(Payment.payment_date <= end)
            except:
                pass
        
        if search:
            # Search in customer name through customer relationship
            query = query.join(Customer, Payment.customer_id == Customer.id).filter(
                Customer.name.ilike(f"%{search}%")
            )
        
        payments = query.order_by(Payment.payment_date.desc()).limit(500).all()
        return jsonify({"payments": [p.to_dict() for p in payments]})

    @app.route("/api/businesses/<int:business_id>/payments", methods=["POST"])
    @token_required
    @permission_required('payments.create')
    def create_payment(business_id):
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        data = request.get_json() or {}
        customer_id = data.get("customer_id")
        amount = data.get("amount")

        if not customer_id:
            return jsonify({"error": "Cliente es requerido"}), 400

        try:
            amount = float(amount)
            if amount <= 0:
                raise ValueError()
        except:
            return jsonify({"error": "Monto debe ser un número positivo"}), 400

        payment_date = date.today()
        if data.get("payment_date"):
            try:
                payment_date = datetime.strptime(data["payment_date"], "%Y-%m-%d").date()
            except:
                pass

        payment = Payment(
            business_id=business_id,
            customer_id=customer_id,
            sale_id=data.get("sale_id"),
            payment_date=payment_date,
            amount=amount,
            method=data.get("method", "cash"),
            note=data.get("note", "").strip() or None
        )

        db.session.add(payment)
        db.session.flush()

        # Create ledger entry
        ledger_entry = LedgerEntry(
            business_id=business_id,
            customer_id=customer_id,
            entry_type="payment",
            amount=amount,
            entry_date=payment_date,
            note=data.get("note", "").strip() or f"Pago #{payment.id}",
            ref_type="payment",
            ref_id=payment.id
        )
        db.session.add(ledger_entry)
        db.session.flush()

        # --- Auto-allocation Logic ---
        # Automatically apply payment to pending sales (FIFO)
        remaining_payment = amount
        
        # Find pending sales for this customer, ordered by date
        pending_sales = Sale.query.filter(
            Sale.business_id == business_id,
            Sale.customer_id == customer_id,
            Sale.paid == False
        ).order_by(Sale.sale_date.asc()).all()
        
        for sale in pending_sales:
            if remaining_payment <= 0.01:
                break
                
            # Calculate amount to pay for this sale
            sale_balance = sale.balance
            
            # Amount we can pay
            amount_to_pay = min(sale_balance, remaining_payment)
            
            if amount_to_pay > 0:
                # Update sale balance
                sale.balance -= amount_to_pay
                remaining_payment -= amount_to_pay
                
                # If balance is effectively zero, mark as paid
                if sale.balance <= 0.01:
                    sale.balance = 0
                    sale.paid = True
                
                # Find associated ledger charge
                charge_entry = LedgerEntry.query.filter_by(
                    business_id=business_id,
                    customer_id=customer_id,
                    ref_type='sale',
                    ref_id=sale.id,
                    entry_type='charge'
                ).first()
                
                # Create allocation record
                if charge_entry:
                    allocation = LedgerAllocation(
                        payment_id=ledger_entry.id,
                        charge_id=charge_entry.id,
                        amount=amount_to_pay
                    )
                    db.session.add(allocation)
        # -----------------------------

        db.session.commit()

        return jsonify({"payment": payment.to_dict()}), 201

    @app.route("/api/businesses/<int:business_id>/payments/<int:payment_id>", methods=["GET"])
    @token_required
    def get_payment(business_id, payment_id):
        payment = Payment.query.filter_by(id=payment_id, business_id=business_id).first()
        if not payment:
            return jsonify({"error": "Pago no encontrado"}), 404
        return jsonify({"payment": payment.to_dict()})

    @app.route("/api/businesses/<int:business_id>/payments/<int:payment_id>", methods=["DELETE"])
    @token_required
    @permission_required('payments.delete')
    def delete_payment(business_id, payment_id):
        payment = Payment.query.filter_by(id=payment_id, business_id=business_id).first()
        if not payment:
            return jsonify({"error": "Pago no encontrado"}), 404

        # Reverse allocations
        ledger_entry = LedgerEntry.query.filter_by(ref_type="payment", ref_id=payment.id).first()
        if ledger_entry:
            allocations = LedgerAllocation.query.filter_by(payment_id=ledger_entry.id).all()
            for alloc in allocations:
                # Find the charge (sale) and restore balance
                charge = LedgerEntry.query.get(alloc.charge_id)
                if charge and charge.ref_type == "sale":
                    sale = Sale.query.get(charge.ref_id)
                    if sale:
                        sale.balance += alloc.amount
                        # If balance restored, it might not be paid anymore? 
                        # Actually, if balance > 0, it's not paid.
                        # Floating point tolerance
                        if sale.balance > 0.01:
                            sale.paid = False
            
            # Delete allocations
            LedgerAllocation.query.filter_by(payment_id=ledger_entry.id).delete()
            # Delete ledger entry
            db.session.delete(ledger_entry)

        db.session.delete(payment)
        db.session.commit()
        return jsonify({"ok": True})

    # ========== REPORT ROUTES ==========
    @app.route("/api/businesses/<int:business_id>/reports/daily", methods=["GET"])
    @token_required
    def daily_report(business_id):
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404
        
        today = date.today()
        
        # Get period parameter: today, week, month
        period = request.args.get("period", "today")
        
        # Calculate date range based on period
        if period == "week":
            # Get start of week (Monday)
            start_date = today - timedelta(days=today.weekday())
            end_date = today
        elif period == "month":
            # Get start of month
            start_date = today.replace(day=1)
            end_date = today
        else:
            # Default to today
            start_date = today
            end_date = today
        
        # Allow custom date range override
        if request.args.get("start_date"):
            try:
                start_date = datetime.strptime(request.args.get("start_date"), "%Y-%m-%d").date()
            except:
                pass
        
        if request.args.get("end_date"):
            try:
                end_date = datetime.strptime(request.args.get("end_date"), "%Y-%m-%d").date()
            except:
                pass
        
        target_date = start_date  # For compatibility with existing code
        
        # Sales for the period
        sales = Sale.query.filter(
            Sale.business_id == business_id,
            Sale.sale_date >= start_date,
            Sale.sale_date <= end_date
        ).all()
        sales_total = sum(s.total for s in sales)
        sales_count = len(sales)
        
        # Expenses for the period
        expenses = Expense.query.filter(
            Expense.business_id == business_id,
            Expense.expense_date >= start_date,
            Expense.expense_date <= end_date
        ).all()
        expenses_total = sum(e.amount for e in expenses)
        expenses_count = len(expenses)
        
        # Payments for the period
        payments = Payment.query.filter(
            Payment.business_id == business_id,
            Payment.payment_date >= start_date,
            Payment.payment_date <= end_date
        ).all()
        payments_total = sum(p.amount for p in payments)
        
        # Cash flow
        cash_in = sum(s.total for s in sales if s.payment_method == "cash") + payments_total
        cash_out = expenses_total
        
        return jsonify({
            "date": target_date.isoformat(),
            "period": period,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "sales": {
                "count": sales_count,
                "total": sales_total
            },
            "expenses": {
                "count": expenses_count,
                "total": expenses_total
            },
            "payments": {
                "count": len(payments),
                "total": payments_total
            },
            "cash_flow": {
                "in": cash_in,
                "out": cash_out,
                "net": cash_in - cash_out
            }
        })

    @app.route("/api/businesses/<int:business_id>/reports/summary", methods=["GET"])
    @app.route("/api/businesses/<int:business_id>/summary", methods=["GET"])
    @token_required
    def summary_report(business_id):
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        # Get date range (default: current month)
        today = date.today()
        start_of_month = today.replace(day=1)
        
        # Get period parameter: today, week, month
        period = request.args.get("period", "today")
        
        # Calculate date range based on period
        if period == "week":
            # Get start of week (Monday)
            start_date = today - timedelta(days=today.weekday())
            end_date = today
        elif period == "month":
            # Get start of month
            start_date = today.replace(day=1)
            end_date = today
        else:
            # Default to today
            start_date = today
            end_date = today
        
        # Allow custom date range override
        start_date_param = request.args.get("start_date")
        end_date_param = request.args.get("end_date")

        if start_date_param:
            try:
                start_date = datetime.strptime(start_date_param, "%Y-%m-%d").date()
            except:
                pass

        if end_date_param:
            try:
                end_date = datetime.strptime(end_date_param, "%Y-%m-%d").date()
            except:
                pass
        
        # Use start_date as the start of the period for backward compatibility
        start_of_month = start_date
        today = end_date

        # Sales
        # Optimize: Aggregate sales total and count in SQL
        sales_stats = db.session.query(
            func.sum(Sale.total),
            func.count(Sale.id)
        ).filter(
            Sale.business_id == business_id,
            Sale.sale_date >= start_of_month,
            Sale.sale_date <= today
        ).first()
        
        sales_total = sales_stats[0] or 0
        sales_count = sales_stats[1] or 0
        
        # Calculate costs for profit (Optimized)
        total_cost = 0
        try:
            # First try using the total_cost column (instant)
            total_cost_query = db.session.query(func.sum(Sale.total_cost)).filter(
                Sale.business_id == business_id,
                Sale.sale_date >= start_of_month,
                Sale.sale_date <= today
            ).scalar()
            
            if total_cost_query is not None and total_cost_query > 0:
                total_cost = total_cost_query
            else:
                # Fallback: Calculate from items if total_cost is missing/zero (slow but necessary for old data)
                # Optimize: Fetch only items JSON to avoid full object hydration
                sales_items = db.session.query(Sale.items).filter(
                    Sale.business_id == business_id,
                    Sale.sale_date >= start_of_month,
                    Sale.sale_date <= today,
                    (Sale.total_cost == 0) | (Sale.total_cost == None)
                ).all()

                # Only proceed if there are sales needing calculation
                if sales_items:
                    # Get all product IDs from sales items
                    product_ids = set()
                    for (items_json,) in sales_items:
                        if not items_json: continue
                        for item in items_json:
                            pid = item.get("product_id")
                            if pid:
                                product_ids.add(pid)
                    
                    # Fetch products map
                    products_map = {}
                    if product_ids:
                        products = Product.query.filter(Product.id.in_(product_ids)).all()
                        products_map = {p.id: p for p in products}

                    for (items_json,) in sales_items:
                        if not items_json: continue
                        for item in items_json:
                            pid = item.get("product_id")
                            if pid and pid in products_map:
                                product = products_map[pid]
                                if product.cost:
                                    qty = float(item.get("qty", 1))
                                    total_cost += product.cost * qty
        except Exception as e:
            print(f"Error calculating costs: {e}")
            pass

        # Expenses
        expenses_total = 0
        expenses_count = 0
        try:
            # Optimize: Aggregate expenses total and count in SQL
            expenses_stats = db.session.query(
                func.sum(Expense.amount),
                func.count(Expense.id)
            ).filter(
                Expense.business_id == business_id,
                Expense.expense_date >= start_of_month,
                Expense.expense_date <= today
            ).first()
            
            if expenses_stats:
                expenses_total = expenses_stats[0] or 0
                expenses_count = expenses_stats[1] or 0
        except Exception as e:
            print(f"Error calculating expenses: {e}")
            pass

        # Accounts receivable logic - SIMPLIFIED and ROBUST
        # Directly use Sale balance which is always available and safer
        try:
            accounts_receivable = db.session.query(func.sum(Sale.balance)).filter(
                Sale.business_id == business_id,
                Sale.balance > 0
            ).scalar() or 0
        except Exception as e:
            print(f"Error calculating receivables: {e}")
            accounts_receivable = 0

        # Payments for the period
        payments = Payment.query.filter(
            Payment.business_id == business_id,
            Payment.payment_date >= start_of_month,
            Payment.payment_date <= today
        ).all()
        payments_total = sum(p.amount for p in payments)
        
        # Cash flow: Cash Sales + Payments
        cash_sales = db.session.query(func.sum(Sale.total)).filter(
            Sale.business_id == business_id,
            Sale.sale_date >= start_of_month,
            Sale.sale_date <= today,
            Sale.payment_method == "cash"
        ).scalar() or 0
        
        # Calculate Cost of Goods Sold for Realized Profit (Cash Basis)
        # 1. Cost of Cash Sales (fully realized)
        cash_sales_cost = 0
        try:
            # Get items for cash sales in period
            cash_sales_items = db.session.query(Sale.items).filter(
                Sale.business_id == business_id,
                Sale.sale_date >= start_of_month,
                Sale.sale_date <= today,
                Sale.payment_method == "cash"
            ).all()
            
            # Calculate cost
            # (Reuse logic or simplify)
            # For efficiency, we can query total_cost directly if available
            cash_sales_cost_query = db.session.query(func.sum(Sale.total_cost)).filter(
                Sale.business_id == business_id,
                Sale.sale_date >= start_of_month,
                Sale.sale_date <= today,
                Sale.payment_method == "cash"
            ).scalar()
            
            if cash_sales_cost_query is not None and cash_sales_cost_query > 0:
                cash_sales_cost = cash_sales_cost_query
            else:
                # Fallback to calculating from items (simplified for brevity)
                pass # Assume total_cost is populated or accept 0 for legacy
        except:
            pass
            
        # 2. Cost portion of Payments (for Credit/Partial sales)
        payments_cost = 0
        try:
            # Get payments in period that are for sales (not generic income if any)
            # We need to fetch payments with their associated sale to get the cost ratio
            payments_with_sales = db.session.query(Payment, Sale).join(Sale, Payment.sale_id == Sale.id).filter(
                Payment.business_id == business_id,
                Payment.payment_date >= start_of_month,
                Payment.payment_date <= today
            ).all()
            
            for pay, sale in payments_with_sales:
                if sale.total > 0:
                    # Calculate Cost Ratio of the Sale
                    # Sale.total_cost should be populated. If not, margin is unknown (assume 0 cost? or 100% profit? safer to assume 0 cost for cash flow if unknown)
                    sale_cost = sale.total_cost or 0
                    cost_ratio = sale_cost / sale.total
                    
                    # Realized Cost for this payment
                    realized_cost = pay.amount * cost_ratio
                    payments_cost += realized_cost
        except Exception as e:
            print(f"Error calculating payments cost: {e}")
            pass

        cash_in = cash_sales + payments_total
        cash_out = expenses_total
        
        # Realized Profit (Utilidad) = Cash In - Cash Out - Realized Cost
        # Realized Cost = Cost of Cash Sales + Cost portion of Payments
        total_realized_cost = cash_sales_cost + payments_cost
        
        # Net Cash Flow (Net Cash Increase) = Cash In - Cash Out
        # But "Utilidad" usually means Profit.
        # User asked: "quiero que tambien saques el costo del producto para que al actualizarce en el resumen, tambien se saque el valor de la utilidad"
        # So "Utilidad" in the summary box should be Realized Profit.
        
        realized_profit = cash_in - cash_out - total_realized_cost
        cash_net = realized_profit # User likely wants this "Profit" to be shown as the utility


        return jsonify({
            "period": {
                "start": start_of_month.isoformat(),
                "end": today.isoformat()
            },
            "sales": {
                "count": sales_count,
                "total": sales_total
            },
            "expenses": {
                "count": expenses_count,
                "total": expenses_total
            },
            "profit": {
                "gross": sales_total - total_cost,
                "net": sales_total - total_cost - expenses_total
            },
            "cash_flow": {
                "in": cash_in,
                "out": cash_out,
                "net": cash_net
            },
            "accounts_receivable": round(accounts_receivable, 2)
        })

    @app.route("/api/businesses/<int:business_id>/reports/top-products", methods=["GET"])
    @token_required
    def top_products(business_id):
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        # Aggregate sales by product
        # Optimize: Fetch only items JSON to avoid full object hydration
        sales_items = db.session.query(Sale.items).filter_by(business_id=business_id).all()
        
        product_stats = {}
        for (items_json,) in sales_items:
            if not items_json: continue
            for item in items_json:
                pid = item.get("product_id")
                name = item.get("name", "Producto")
                qty = item.get("qty", 1)
                total = item.get("total", 0)

                if pid not in product_stats:
                    product_stats[pid] = {"name": name, "qty": 0, "total": 0}
                
                product_stats[pid]["qty"] += qty
                product_stats[pid]["total"] += total

        # Sort and limit
        sorted_products = sorted(product_stats.values(), key=lambda x: x["total"], reverse=True)[:10]

        return jsonify({"top_products": sorted_products})

    # ========== DASHBOARD ROUTES ==========
    @app.route("/api/businesses/<int:business_id>/dashboard", methods=["GET"])
    @token_required
    def get_dashboard(business_id):
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        from datetime import date, timedelta
        from sqlalchemy import func
        from sqlalchemy.orm import joinedload # Add joinedload import

        today = date.today()
        thirty_days_ago = today - timedelta(days=30)
        sixty_days_ago = today - timedelta(days=60)

        # Sales stats for projections (last 30 days)
        sales_30_days = db.session.query(func.sum(Sale.total)).filter(
            Sale.business_id == business_id,
            Sale.sale_date >= thirty_days_ago
        ).scalar() or 0

        # Previous 30 days for comparison
        sales_prev_30 = db.session.query(func.sum(Sale.total)).filter(
            Sale.business_id == business_id,
            Sale.sale_date >= sixty_days_ago,
            Sale.sale_date < thirty_days_ago
        ).scalar() or 0

        # Daily average
        daily_avg = sales_30_days / 30 if sales_30_days > 0 else 0
        
        # Initialize growth_rate
        growth_rate = 0
        
        # Projection: next 30 days based on trend
        if sales_prev_30 > 0:
            growth_rate = (sales_30_days - sales_prev_30) / sales_prev_30
            projected_next_30 = sales_30_days * (1 + growth_rate)
        else:
            projected_next_30 = sales_30_days

        # Inventory alerts (low stock)
        low_stock_products = Product.query.filter(
            Product.business_id == business_id,
            Product.active == True,
            Product.stock <= Product.low_stock_threshold
        ).order_by(Product.stock).limit(10).all()

        low_stock_alerts = [{
            "id": p.id,
            "name": p.name,
            "sku": p.sku,
            "stock": p.stock,
            "threshold": p.low_stock_threshold,
            "unit": p.unit
        } for p in low_stock_products]

        # Fiados alerts (unpaid sales)
        unpaid_sales = Sale.query.options(joinedload(Sale.customer)).filter(
            Sale.business_id == business_id,
            Sale.paid == False,
            Sale.balance > 0
        ).order_by(Sale.sale_date).limit(10).all()

        fiados_alerts = []
        total_fiados = 0
        for sale in unpaid_sales:
            fiados_alerts.append({
                "id": sale.id,
                "customer_name": sale.customer.name if sale.customer else "Sin cliente",
                "date": sale.sale_date.isoformat(),
                "total": sale.total,
                "balance": sale.balance
            })
            total_fiados += sale.balance

        # Recent activity (last 5 sales)
        recent_sales = Sale.query.options(joinedload(Sale.customer)).filter_by(business_id=business_id).order_by(Sale.sale_date.desc()).limit(5).all()

        return jsonify({
            "projections": {
                "daily_average": round(daily_avg, 2),
                "last_30_days": round(sales_30_days, 2),
                "previous_30_days": round(sales_prev_30, 2),
                "projected_next_30": round(projected_next_30, 2),
                "growth_rate": round(growth_rate * 100, 1) if sales_prev_30 > 0 else 0
            },
            "inventory_alerts": {
                "count": len(low_stock_alerts),
                "products": low_stock_alerts
            },
            "fiados_alerts": {
                "count": len(fiados_alerts),
                "total": round(total_fiados, 2),
                "sales": fiados_alerts
            },
            "recent_sales": [{
                "id": s.id,
                "date": s.sale_date.isoformat(),
                "total": s.total,
                "customer_name": s.customer.name if s.customer else "Venta rápida"
            } for s in recent_sales]
        })

    # ========== ANALYTICS ROUTES ==========
    @app.route("/api/businesses/<int:business_id>/analytics/sales-trend", methods=["GET"])
    @token_required
    def sales_trend(business_id):
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404
        
        from datetime import date, timedelta
        from sqlalchemy import func
        
        period = request.args.get("period", "daily")  # daily, weekly, monthly
        days = int(request.args.get("days", 30))
        
        today = date.today()
        start_date = today - timedelta(days=days)
        
        if period == "daily":
            # Group by day
            sales_data = db.session.query(
                func.date(Sale.sale_date).label("date"),
                func.sum(Sale.total).label("total"),
                func.count(Sale.id).label("count")
            ).filter(
                Sale.business_id == business_id,
                Sale.sale_date >= start_date
            ).group_by(func.date(Sale.sale_date)).order_by(func.date(Sale.sale_date)).all()
            
            trend = [{
                "date": str(r.date),
                "total": float(r.total or 0),
                "count": r.count
            } for r in sales_data]
            
        elif period == "weekly":
            # Group by week
            sales_data = db.session.query(
                func.strftime("%Y-W%W", Sale.sale_date).label("week"),
                func.sum(Sale.total).label("total"),
                func.count(Sale.id).label("count")
            ).filter(
                Sale.business_id == business_id,
                Sale.sale_date >= start_date
            ).group_by(func.strftime("%Y-W%W", Sale.sale_date)).order_by(func.strftime("%Y-W%W", Sale.sale_date)).all()
            
            trend = [{
                "date": r.week,
                "total": float(r.total or 0),
                "count": r.count
            } for r in sales_data]
            
        else:  # monthly
            sales_data = db.session.query(
                func.strftime("%Y-%m", Sale.sale_date).label("month"),
                func.sum(Sale.total).label("total"),
                func.count(Sale.id).label("count")
            ).filter(
                Sale.business_id == business_id,
                Sale.sale_date >= start_date
            ).group_by(func.strftime("%Y-%m", Sale.sale_date)).order_by(func.strftime("%Y-%m", Sale.sale_date)).all()
            
            trend = [{
                "date": r.month,
                "total": float(r.total or 0),
                "count": r.count
            } for r in sales_data]
        
        return jsonify({
            "period": period,
            "days": days,
            "trend": trend
        })

    @app.route("/api/businesses/<int:business_id>/quick-notes", methods=["GET"])
    @token_required
    def get_quick_notes(business_id):
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        notes = QuickNote.query.filter_by(business_id=business_id).order_by(QuickNote.created_at.desc()).limit(20).all()
        return jsonify({"notes": [n.to_dict() for n in notes]})

    @app.route("/api/businesses/<int:business_id>/quick-notes", methods=["POST"])
    @token_required
    def create_quick_note(business_id):
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        data = request.get_json()
        note_text = data.get("note", "").strip()

        if not note_text:
            return jsonify({"error": "La nota no puede estar vacía"}), 400
        
        if len(note_text) > 280:
            return jsonify({"error": "La nota es demasiado larga (máx 280 caracteres)"}), 400

        note = QuickNote(
            business_id=business_id,
            note=note_text
        )
        db.session.add(note)
        db.session.commit()
        
        return jsonify({"note": note.to_dict()}), 201

    @app.route("/api/businesses/<int:business_id>/quick-notes/<int:note_id>", methods=["DELETE"])
    @token_required
    def delete_quick_note(business_id, note_id):
        note = QuickNote.query.filter_by(id=note_id, business_id=business_id).first()
        if not note:
            return jsonify({"error": "Nota no encontrada"}), 404

        db.session.delete(note)
        db.session.commit()
        return jsonify({"ok": True})

    @app.route("/api/businesses/<int:business_id>/analytics/comparison", methods=["GET"])
    @token_required
    def period_comparison(business_id):
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404
        
        from datetime import date, timedelta
        from sqlalchemy import func
        
        today = date.today()
        
        # Current period (last 30 days)
        current_start = today - timedelta(days=30)
        current_sales = db.session.query(func.sum(Sale.total)).filter(
            Sale.business_id == business_id,
            Sale.sale_date >= current_start
        ).scalar() or 0
        
        current_expenses = db.session.query(func.sum(Expense.amount)).filter(
            Expense.business_id == business_id,
            Expense.expense_date >= current_start
        ).scalar() or 0
        
        # Previous period (30-60 days ago)
        prev_start = today - timedelta(days=60)
        prev_end = today - timedelta(days=30)
        prev_sales = db.session.query(func.sum(Sale.total)).filter(
            Sale.business_id == business_id,
            Sale.sale_date >= prev_start,
            Sale.sale_date < prev_end
        ).scalar() or 0
        
        prev_expenses = db.session.query(func.sum(Expense.amount)).filter(
            Expense.business_id == business_id,
            Expense.expense_date >= prev_start,
            Expense.expense_date < prev_end
        ).scalar() or 0
        
        # Year ago
        year_ago_start = today - timedelta(days=365)
        year_ago_sales = db.session.query(func.sum(Sale.total)).filter(
            Sale.business_id == business_id,
            Sale.sale_date >= year_ago_start
        ).scalar() or 0
        
        # Calculate growth
        sales_growth = ((current_sales - prev_sales) / prev_sales * 100) if prev_sales > 0 else 0
        expenses_growth = ((current_expenses - prev_expenses) / prev_expenses * 100) if prev_expenses > 0 else 0

        # Monthly Goal Calculation
        current_month_start = date(today.year, today.month, 1)
        # Use existing current_sales if it matches month, but current_sales is last 30 days.
        # We need specific current month sales for goal tracking
        month_sales = db.session.query(func.sum(Sale.total)).filter(
            Sale.business_id == business_id,
            Sale.sale_date >= current_month_start
        ).scalar() or 0
        
        goal_data = {
            "goal": business.monthly_sales_goal or 0,
            "current": float(month_sales),
            "percentage": 0
        }
        
        if goal_data["goal"] > 0:
            goal_data["percentage"] = min(100, round((goal_data["current"] / goal_data["goal"]) * 100, 1))

        # Upcoming recurring expenses
        upcoming_expenses = []
        try:
            today_date = date.today()
            recurring = RecurringExpense.query.filter_by(
                business_id=business_id, 
                is_active=True
            ).all()

            for exp in recurring:
                days_until = 999
                status = "unknown"

                if exp.next_due_date:
                    days_until = (exp.next_due_date - today_date).days
                    if days_until < 0:
                        status = "overdue"
                    elif days_until == 0:
                        status = "due_today"
                    elif days_until <= 7:
                        status = "due_soon"
                else:
                    # Fallback for old records without next_due_date
                    # Check if due in next 7 days or overdue
                    # Simplified logic: use due_day of current month
                    try:
                        due_date = date(today_date.year, today_date.month, exp.due_day)
                    except:
                        due_date = today_date
                    
                    days_until = (due_date - today_date).days
                    
                    # Check if already paid this month
                    is_paid = Expense.query.filter(
                        Expense.business_id == business_id,
                        Expense.expense_date >= current_month_start,
                        Expense.category == exp.category,
                        Expense.amount >= exp.amount * 0.9, 
                        Expense.amount <= exp.amount * 1.1
                    ).first() is not None

                    if not is_paid:
                        if days_until < 0:
                            status = "overdue" # Passed this month and not paid
                        elif days_until == 0:
                            status = "due_today"
                        elif days_until <= 7:
                            status = "due_soon"
                        else:
                             # Check wrap around for next month? No, too complex for fallback.
                             pass

                if status in ["overdue", "due_today", "due_soon"]:
                    upcoming_expenses.append({
                        "id": exp.id,
                        "name": exp.name,
                        "amount": exp.amount,
                        "due_day": exp.due_day,
                        "next_due_date": exp.next_due_date.isoformat() if exp.next_due_date else None,
                        "days_until": abs(days_until),
                        "status": status
                    })
            
            # Sort: Overdue first, then by days
            def sort_key(x):
                if x["status"] == "overdue": return -100 + x["days_until"]
                if x["status"] == "due_today": return -50
                return x["days_until"]

            upcoming_expenses.sort(key=sort_key)
            upcoming_expenses = upcoming_expenses[:5] # Limit to 5
            
        except Exception as e:
            print(f"Error calculating upcoming expenses: {e}")
            import traceback
            traceback.print_exc()
        
        return jsonify({
            "current_period": {
                "start": current_start.isoformat(),
                "end": today.isoformat(),
                "sales": float(current_sales),
                "expenses": float(current_expenses),
                "profit": float(current_sales - current_expenses)
            },
            "monthly_goal": goal_data,
            "upcoming_expenses": upcoming_expenses,
            "previous_period": {
                "start": prev_start.isoformat(),
                "end": prev_end.isoformat(),
                "sales": float(prev_sales),
                "expenses": float(prev_expenses),
                "profit": float(prev_sales - prev_expenses)
            },
            "year_ago_sales": float(year_ago_sales),
            "growth": {
                "sales": round(sales_growth, 1),
                "expenses": round(expenses_growth, 1),
                "profit": round(((current_sales - current_expenses) - (prev_sales - prev_expenses)) / (prev_sales - prev_expenses) * 100, 1) if (prev_sales - prev_expenses) > 0 else 0
            }
        })

    @app.route("/api/businesses/<int:business_id>/analytics/metrics", methods=["GET"])
    @token_required
    def business_metrics(business_id):
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404
        
        from datetime import date, timedelta
        from sqlalchemy import func
        
        today = date.today()
        
        # Total sales all time
        total_sales = db.session.query(func.sum(Sale.total)).filter(
            Sale.business_id == business_id
        ).scalar() or 0
        
        # Total expenses all time
        total_expenses = db.session.query(func.sum(Expense.amount)).filter(
            Expense.business_id == business_id
        ).scalar() or 0
        
        # Total customers
        total_customers = Customer.query.filter_by(business_id=business_id).count()
        
        # Total products
        total_products = Product.query.filter_by(business_id=business_id).count()
        
        # Average sale value
        avg_sale_value = db.session.query(func.avg(Sale.total)).filter(
            Sale.business_id == business_id
        ).scalar() or 0
        
        # Best selling products
        top_products = db.session.query(
            Sale.items,
            func.sum(Sale.total).label("total")
        ).filter(
            Sale.business_id == business_id
        ).all()
        
        # Count sales by payment method
        cash_sales = Sale.query.filter_by(business_id=business_id, payment_method="cash").count()
        transfer_sales = Sale.query.filter_by(business_id=business_id, payment_method="transfer").count()
        credit_sales = Sale.query.filter_by(business_id=business_id, payment_method="credit").count()
        
        # Active customers (with purchases in last 30 days)
        thirty_days_ago = today - timedelta(days=30)
        active_customers = db.session.query(func.count(func.distinct(Sale.customer_id))).filter(
            Sale.business_id == business_id,
            Sale.sale_date >= thirty_days_ago,
            Sale.customer_id != None
        ).scalar() or 0
        
        # Accounts receivable
        accounts_receivable = db.session.query(func.sum(Sale.balance)).filter(
            Sale.business_id == business_id,
            Sale.paid == False
        ).scalar() or 0
        
        return jsonify({
            "totals": {
                "sales": float(total_sales),
                "expenses": float(total_expenses),
                "profit": float(total_sales - total_expenses),
                "customers": total_customers,
                "products": total_products
            },
            "averages": {
                "sale_value": float(avg_sale_value)
            },
            "payment_methods": {
                "cash": cash_sales,
                "transfer": transfer_sales,
                "credit": credit_sales
            },
            "active_customers_30d": active_customers,
            "accounts_receivable": float(accounts_receivable)
        })

    # ========== EXPORT ROUTES ==========
    @app.route("/api/businesses/<int:business_id>/export/sales", methods=["GET"])
    @token_required
    def export_sales(business_id):
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404
        # Plan FREE: sin acceso a exportación
        if g.current_user.plan == "free":
            return jsonify({
                "error": "La exportación está disponible solo en Pro. Actualiza tu plan para usar esta función.",
                "upgrade_url": "/upgrade"
            }), 403

        from backend.services.export import export_sales_excel

        start_date = request.args.get("start_date")
        end_date = request.args.get("end_date")

        try:
            filepath = export_sales_excel(business_id, start_date, end_date)
            return jsonify({"download_url": f"/api/download/{filepath}"})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/api/businesses/<int:business_id>/export/expenses", methods=["GET"])
    @token_required
    def export_expenses(business_id):
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404
        # Plan FREE: sin acceso a exportación
        if g.current_user.plan == "free":
            return jsonify({
                "error": "La exportación está disponible solo en Pro. Actualiza tu plan para usar esta función.",
                "upgrade_url": "/upgrade"
            }), 403

        from backend.services.export import export_expenses_excel

        start_date = request.args.get("start_date")
        end_date = request.args.get("end_date")

        try:
            filepath = export_expenses_excel(business_id, start_date, end_date)
            return jsonify({"download_url": f"/api/download/{filepath}"})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/api/download/<filename>", methods=["GET"])
    @token_required
    def download_file(filename):
        return send_from_directory(
            app.config.get("EXPORT_DIR", "exports"),
            filename,
            as_attachment=True
        )

    # ========== BACKUP ROUTES ==========
    @app.route("/api/businesses/<int:business_id>/backup", methods=["GET"])
    @token_required
    def get_backup(business_id):
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404
        # Plan FREE: sin acceso a exportar backup
        if g.current_user.plan == "free":
            return jsonify({
                "error": "La exportación de backup está disponible solo en Pro. Actualiza tu plan para usar esta función.",
                "upgrade_url": "/upgrade"
            }), 403

        from backend.services.export import create_backup_json

        try:
            filepath = create_backup_json(business_id)
            return jsonify({"download_url": f"/api/download/{filepath}"})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/api/businesses/<int:business_id>/restore", methods=["POST"])
    @token_required
    def restore_backup(business_id):
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404
        # Plan FREE: sin acceso a importar/restore
        if g.current_user.plan == "free":
            return jsonify({
                "error": "La importación está disponible solo en Pro. Actualiza tu plan para usar esta función.",
                "upgrade_url": "/upgrade"
            }), 403

        data = request.get_json() or {}
        backup_data = data.get("data")

        if not backup_data:
            return jsonify({"error": "Datos de backup requeridos"}), 400

        from backend.services.export import restore_from_backup

        try:
            restore_from_backup(business_id, backup_data)
            return jsonify({"ok": True})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    # ========== ADMIN ROUTES ==========
    @app.route("/api/admin/stats", methods=["GET"])
    @token_required
    @permission_required('admin.*')
    def get_admin_stats():
        """Get admin statistics - focused on users and memberships"""
        # Check if user is admin
        if not g.current_user.is_admin:
            return jsonify({"error": "Unauthorized. Admin access required."}), 403
        
        # User statistics
        total_users = User.query.count()
        free_users = User.query.filter_by(plan="free").count()
        pro_users = User.query.filter_by(plan="pro").count()
        
        # Activity stats
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        new_users_30d = User.query.filter(User.created_at >= thirty_days_ago).count()
        active_users_30d = User.query.filter(User.last_login >= thirty_days_ago).count()
        
        # Global platform stats
        total_businesses = Business.query.count()
        total_products_global = Product.query.count()
        total_customers_global = Customer.query.count()
        
        # Membership payment statistics
        total_membership_payments = SubscriptionPayment.query.count()
        total_membership_income = db.session.query(db.func.sum(SubscriptionPayment.amount)).filter(
            SubscriptionPayment.status == "completed"
        ).scalar() or 0
        
        # Income growth (Current Month vs Last Month)
        now = datetime.utcnow()
        first_day_this_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        # Calculate first day of last month
        if now.month == 1:
            first_day_last_month = now.replace(year=now.year-1, month=12, day=1, hour=0, minute=0, second=0)
        else:
            first_day_last_month = now.replace(month=now.month-1, day=1, hour=0, minute=0, second=0)
            
        income_this_month = db.session.query(db.func.sum(SubscriptionPayment.amount)).filter(
            SubscriptionPayment.status == "completed",
            SubscriptionPayment.payment_date >= first_day_this_month
        ).scalar() or 0
        
        income_last_month = db.session.query(db.func.sum(SubscriptionPayment.amount)).filter(
            SubscriptionPayment.status == "completed",
            SubscriptionPayment.payment_date >= first_day_last_month,
            SubscriptionPayment.payment_date < first_day_this_month
        ).scalar() or 0
        
        income_growth = 0
        if income_last_month > 0:
            income_growth = ((income_this_month - income_last_month) / income_last_month) * 100
        
        # Payments by plan type
        pro_monthly_payments = SubscriptionPayment.query.filter_by(plan="pro_monthly", status="completed").count()
        pro_annual_payments = SubscriptionPayment.query.filter_by(plan="pro_annual", status="completed").count()
        pro_monthly_income = db.session.query(db.func.sum(SubscriptionPayment.amount)).filter(
            SubscriptionPayment.plan == "pro_monthly",
            SubscriptionPayment.status == "completed"
        ).scalar() or 0
        pro_annual_income = db.session.query(db.func.sum(SubscriptionPayment.amount)).filter(
            SubscriptionPayment.plan == "pro_annual",
            SubscriptionPayment.status == "completed"
        ).scalar() or 0
        
        pro_quarterly_payments = SubscriptionPayment.query.filter(
            SubscriptionPayment.plan == "pro_quarterly",
            SubscriptionPayment.status == "completed"
        ).count()
        pro_quarterly_income = db.session.query(db.func.sum(SubscriptionPayment.amount)).filter(
            SubscriptionPayment.plan == "pro_quarterly",
            SubscriptionPayment.status == "completed"
        ).scalar() or 0

        return jsonify({
            "total_users": total_users,
            "free_users": free_users,
            "pro_users": pro_users,
            "new_users_30d": new_users_30d,
            "active_users_30d": active_users_30d,
            "total_businesses": total_businesses,
            "total_products_global": total_products_global,
            "total_customers_global": total_customers_global,
            "total_membership_payments": total_membership_payments,
            "total_membership_income": total_membership_income,
            "income_this_month": income_this_month,
            "income_growth": income_growth,
            "pro_monthly_payments": pro_monthly_payments,
            "pro_quarterly_payments": pro_quarterly_payments,
            "pro_annual_payments": pro_annual_payments,
            "pro_monthly_income": pro_monthly_income,
            "pro_quarterly_income": pro_quarterly_income,
            "pro_annual_income": pro_annual_income
        })

    @app.route("/api/admin/businesses", methods=["GET"])
    @token_required
    @permission_required('admin.*')
    def get_all_businesses_admin():
        """Get all businesses (admin view)"""
        # Admin should see ALL businesses, not just their own
        businesses = Business.query.all()
        result = []
        for b in businesses:
            sales_count = Sale.query.filter_by(business_id=b.id).count()
            sales_total = db.session.query(db.func.sum(Sale.total)).filter_by(business_id=b.id).scalar() or 0
            expenses_total = db.session.query(db.func.sum(Expense.amount)).filter_by(business_id=b.id).scalar() or 0
            customers_count = Customer.query.filter_by(business_id=b.id).count()
            
            # Get owner name
            owner = User.query.get(b.user_id)
            user_name = owner.name if owner else "Desconocido"
            
            result.append({
                "id": b.id, "name": b.name, "currency": b.currency,
                "sales_count": sales_count, "sales_total": sales_total,
                "expenses_total": expenses_total, "customers_count": customers_count,
                "created_at": b.created_at.isoformat() if b.created_at else None,
                "user_name": user_name
            })
        return jsonify({"businesses": result})

    # ========== ADMIN GLOBAL DATA ==========
    @app.route("/api/admin/all-customers", methods=["GET"])
    @token_required
    @permission_required('admin.*')
    def get_all_customers_admin():
        """Get all customers from all businesses"""
        customers = db.session.query(
            Customer, Business.name, User.name
        ).join(Business, Customer.business_id == Business.id).join(User, Business.user_id == User.id).all()
        result = []
        for customer, business_name, user_name in customers:
            c = customer.to_dict()
            c['business_name'] = business_name
            c['user_name'] = user_name
            result.append(c)
        return jsonify({"customers": result})

    @app.route("/api/admin/all-products", methods=["GET"])
    @token_required
    @permission_required('admin.*')
    def get_all_products_admin():
        """Get all products from all businesses"""
        products = db.session.query(
            Product, Business.name, User.name
        ).join(Business, Product.business_id == Business.id).join(User, Business.user_id == User.id).all()
        result = []
        for product, business_name, user_name in products:
            p = product.to_dict()
            p['business_name'] = business_name
            p['user_name'] = user_name
            result.append(p)
        return jsonify({"products": result})

    @app.route("/api/admin/analytics", methods=["GET"])
    @token_required
    @permission_required('admin.*')
    def get_analytics_admin():
        """Get global analytics across all businesses"""
        # Total stats
        total_users = User.query.count()
        total_businesses = Business.query.count()
        total_customers = Customer.query.count()
        total_products = Product.query.count()
        total_sales = Sale.query.count()
        
        # Revenue
        total_revenue = db.session.query(db.func.sum(Sale.total)).scalar() or 0
        total_expenses = db.session.query(db.func.sum(Expense.amount)).scalar() or 0
        
        # Recent activity
        recent_sales = Sale.query.order_by(Sale.created_at.desc()).limit(5).all()
        recent_users = User.query.order_by(User.created_at.desc()).limit(5).all()
        
        # Plan distribution
        plan_counts = db.session.query(
            User.plan, db.func.count(User.id)
        ).group_by(User.plan).all()
        
        return jsonify({
            "total_users": total_users,
            "total_businesses": total_businesses,
            "total_customers": total_customers,
            "total_products": total_products,
            "total_sales": total_sales,
            "total_revenue": float(total_revenue),
            "total_expenses": float(total_expenses),
            "net_income": float(total_revenue) - float(total_expenses),
            "recent_sales": [s.to_dict() for s in recent_sales],
            "recent_users": [u.to_dict() for u in recent_users],
            "plan_distribution": {plan: count for plan, count in plan_counts}
        })

    @app.route("/api/admin/customers", methods=["GET"])
    @token_required
    @permission_required('admin.*')
    def get_customers_admin():
        """Get all customers for admin"""
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 20, type=int)
        search = request.args.get("search", "")
        
        query = Customer.query
        if search:
            query = query.filter(Customer.name.ilike(f"%{search}%") | Customer.email.ilike(f"%{search}%"))
            
        pagination = query.order_by(Customer.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        
        customers = []
        for c in pagination.items:
            c_dict = c.to_dict()
            # Add business name
            business = Business.query.get(c.business_id)
            c_dict['business_name'] = business.name if business else "Unknown"
            customers.append(c_dict)
            
        return jsonify({
            "customers": customers,
            "total": pagination.total,
            "pages": pagination.pages,
            "page": page
        })

    @app.route("/api/admin/products", methods=["GET"])
    @token_required
    @permission_required('admin.*')
    def get_products_admin():
        """Get all products for admin"""
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 20, type=int)
        search = request.args.get("search", "")
        
        query = Product.query
        if search:
            query = query.filter(Product.name.ilike(f"%{search}%"))
            
        pagination = query.order_by(Product.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        
        products = []
        for p in pagination.items:
            p_dict = p.to_dict()
            # Add business name
            business = Business.query.get(p.business_id)
            p_dict['business_name'] = business.name if business else "Unknown"
            products.append(p_dict)
            
        return jsonify({
            "products": products,
            "total": pagination.total,
            "pages": pagination.pages,
            "page": page
        })

    @app.route("/api/admin/security", methods=["GET"])
    @token_required
    @permission_required('admin.*')
    def get_security_admin():
        """Get security information"""
        # Get recent audit logs related to security
        security_logs = AuditLog.query.filter(
            AuditLog.action.in_(['login', 'logout', 'failed_login', 'password_change', 'permission_denied'])
        ).order_by(AuditLog.timestamp.desc()).limit(20).all()
        
        # Count by action type
        login_attempts = AuditLog.query.filter(
            AuditLog.action.in_(['login', 'failed_login'])
        ).count()
        failed_logins = AuditLog.query.filter(AuditLog.action == 'failed_login').count()
        
        # Active sessions (users with recent activity)
        active_users = User.query.filter(
            User.last_login != None
        ).order_by(User.last_login.desc()).limit(10).all()
        
        return jsonify({
            "security_logs": [log.to_dict() for log in security_logs],
            "login_attempts": login_attempts,
            "failed_logins": failed_logins,
            "success_rate": ((login_attempts - failed_logins) / login_attempts * 100) if login_attempts > 0 else 100,
            "active_users": [u.to_dict() for u in active_users]
        })

    @app.route("/api/admin/domains", methods=["GET"])
    @token_required
    @permission_required('admin.*')
    def get_domains_admin():
        """Get domain configuration"""
        # Get app settings for domains
        custom_domain = AppSettings.query.filter_by(key='custom_domain').first()
        ssl_enabled = AppSettings.query.filter_by(key='ssl_enabled').first()
        domain_verified = AppSettings.query.filter_by(key='domain_verified').first()
        
        return jsonify({
            "domains": [
                {
                    "domain": custom_domain.value if custom_domain else None,
                    "ssl_enabled": ssl_enabled.value == 'true' if ssl_enabled else False,
                    "verified": domain_verified.value == 'true' if domain_verified else False,
                    "status": "active" if (custom_domain and domain_verified and domain_verified.value == 'true') else "pending"
                }
            ],
            "available_tlds": [".app", ".com", ".net", ".org", ".io"]
        })

    @app.route("/api/admin/integrations", methods=["GET"])
    @token_required
    @permission_required('admin.*')
    def get_integrations_admin():
        """Get integrations status"""
        # Get integration settings
        stripe_enabled = AppSettings.query.filter_by(key='stripe_enabled').first()
        paypal_enabled = AppSettings.query.filter_by(key='paypal_enabled').first()
        email_provider = AppSettings.query.filter_by(key='email_provider').first()
        webhook_url = AppSettings.query.filter_by(key='webhook_url').first()
        
        return jsonify({
            "integrations": [
                {
                    "id": "stripe",
                    "name": "Stripe",
                    "enabled": stripe_enabled.value == 'true' if stripe_enabled else False,
                    "status": "connected" if (stripe_enabled and stripe_enabled.value == 'true') else "disconnected",
                    "description": "Procesamiento de pagos"
                },
                {
                    "id": "paypal",
                    "name": "PayPal",
                    "enabled": paypal_enabled.value == 'true' if paypal_enabled else False,
                    "status": "connected" if (paypal_enabled and paypal_enabled.value == 'true') else "disconnected",
                    "description": "Pagos con PayPal"
                },
                {
                    "id": "email",
                    "name": "Email",
                    "enabled": email_provider.value != None if email_provider else False,
                    "status": "connected" if (email_provider and email_provider.value) else "disconnected",
                    "description": f"Proveedor: {email_provider.value if email_provider else 'No configurado'}"
                },
                {
                    "id": "webhooks",
                    "name": "Webhooks",
                    "enabled": webhook_url.value != None if webhook_url else False,
                    "status": "active" if (webhook_url and webhook_url.value) else "inactive",
                    "description": "Notificaciones en tiempo real"
                }
            ]
        })

    @app.route("/api/admin/integrations/<integration_id>", methods=["POST"])
    @token_required
    @permission_required('admin.*')
    def save_integration_config(integration_id):
        """Save integration configuration"""
        data = request.get_json() or {}
        config = data.get('config', {})
        enabled = data.get('enabled', False)
        
        # Map integration IDs to setting keys
        key_mapping = {
            'stripe': 'stripe_enabled',
            'paypal': 'paypal_enabled',
            'email': 'email_provider',
            'webhooks': 'webhook_url'
        }
        
        # Config field mappings
        config_keys = {
            'stripe': ['stripe_api_key', 'stripe_webhook_secret'],
            'paypal': ['paypal_client_id', 'paypal_secret'],
            'email': ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_password', 'smtp_from'],
            'webhooks': ['webhook_url', 'webhook_secret']
        }
        
        main_key = key_mapping.get(integration_id)
        if not main_key:
            return jsonify({"error": "Integración no válida"}), 400
        
        # Save enabled status
        setting = AppSettings.query.filter_by(key=main_key).first()
        if not setting:
            setting = AppSettings(key=main_key, value=str(enabled).lower())
            db.session.add(setting)
        else:
            setting.value = str(enabled).lower()
        
        # Save config fields
        for config_key in config_keys.get(integration_id, []):
            if config_key in config:
                setting_key = f"{integration_id}_{config_key}"
                setting = AppSettings.query.filter_by(key=setting_key).first()
                if not setting:
                    setting = AppSettings(key=setting_key, value=config[config_key])
                    db.session.add(setting)
                else:
                    setting.value = config[config_key]
        
        db.session.commit()
        return jsonify({"ok": True})

    # ========== ADMIN USER MANAGEMENT ==========
    @app.route("/api/admin/users", methods=["GET"])
    @token_required
    @permission_required('admin.users')
    def get_all_users_admin():
        """Get all users for admin management"""
        print(f"[DEBUG] GET /api/admin/users - Loading users from DB")
        print(f"[DB PATH] {app.config.get('SQLALCHEMY_DATABASE_URI', 'unknown')}")
        users = User.query.order_by(User.created_at.desc()).all()
        result = []
        for u in users:
            user_data = u.to_dict()
            # Get roles
            user_data['roles'] = [ur.role.to_dict() for ur in u.roles]
            result.append(user_data)
        print(f"[DEBUG] GET /api/admin/users - Found {len(result)} users")
        return jsonify({"users": result})

    @app.route("/api/admin/users", methods=["POST"])
    @token_required
    @permission_required('admin.users')
    def create_user_admin():
        """Create a new user (admin only)"""
        try:
            data = request.get_json() or {}
            email = data.get("email", "").strip().lower()
            password = data.get("password", "")
            name = data.get("name", "").strip()
            
            print(f"[DEBUG] Creating user - name: {name}, email: {email}, data: {data}")
            print(f"[DB PATH] {app.config.get('SQLALCHEMY_DATABASE_URI', 'unknown')}")
            
            if not email or not password or not name:
                return jsonify({"error": "Email, password y nombre son requeridos"}), 400
            
            # Check if email exists
            if User.query.filter_by(email=email).first():
                return jsonify({"error": "El email ya está en uso"}), 400
            
            user = User(
                email=email,
                name=name,
                is_admin=data.get("is_admin", False),
                is_active=data.get("is_active", True),
                plan=data.get("plan", "free")
            )
            user.set_password(password)
            db.session.add(user)
            db.session.flush()  # Flush to get the user ID
            
            print(f"[DEBUG] User created with ID: {user.id}")
            
            # Assign roles if provided - accept both role_ids (array) and role_id (single)
            role_ids = data.get("role_ids", [])
            single_role_id = data.get("role_id")
            if single_role_id:
                # Convert to int for comparison
                try:
                    single_role_id = int(single_role_id)
                    if single_role_id not in role_ids:
                        role_ids.append(single_role_id)
                except (ValueError, TypeError):
                    pass
            
            for role_id in role_ids:
                try:
                    role = Role.query.get(int(role_id))
                    if role:
                        user_role = UserRole(user_id=user.id, role_id=int(role_id))
                        db.session.add(user_role)
                except (ValueError, TypeError) as e:
                    print(f"[DEBUG] Error assigning role: {e}")
                    pass
            
            db.session.commit()
            print(f"[DEBUG] User committed successfully: {user.email}")
            return jsonify({"ok": True, "user": user.to_dict()}), 201
        except Exception as e:
            db.session.rollback()
            print(f"[ERROR] Error creating user: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500

    @app.route("/api/admin/users/<int:user_id>", methods=["GET"])
    @token_required
    @permission_required('admin.users')
    def get_user_admin(user_id):
        """Get user by ID"""
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "Usuario no encontrado"}), 404
        user_data = user.to_dict()
        user_data['roles'] = [ur.role.to_dict() for ur in user.roles]
        return jsonify({"user": user_data})

    @app.route("/api/admin/users/<int:user_id>", methods=["PUT"])
    @token_required
    @permission_required('admin.users')
    def update_user_admin(user_id):
        """Update user (admin only)"""
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "Usuario no encontrado"}), 404
        
        data = request.get_json() or {}
        if "email" in data:
            new_email = (data["email"] or "").strip().lower()
            if new_email and new_email != user.email:
                existing = User.query.filter(User.email == new_email, User.id != user_id).first()
                if existing:
                    return jsonify({"error": "El email ya está en uso"}), 400
                user.email = new_email
        if "name" in data:
            user.name = data["name"].strip()
        if "is_admin" in data:
            user.is_admin = bool(data["is_admin"])
        if "is_active" in data:
            user.is_active = bool(data["is_active"])
        if "plan" in data:
            user.plan = data["plan"]
        
        # Update roles if provided - accept both role_ids (array) and role_id (single)
        if "role_ids" in data or "role_id" in data:
            # Remove existing roles
            UserRole.query.filter_by(user_id=user_id).delete()
            
            role_ids = data.get("role_ids", [])
            single_role_id = data.get("role_id")
            if single_role_id:
                try:
                    single_role_id = int(single_role_id)
                    if single_role_id not in role_ids:
                        role_ids.append(single_role_id)
                except (ValueError, TypeError):
                    pass
            
            # Add new roles
            for role_id in role_ids:
                role = Role.query.get(role_id)
                if role:
                    user_role = UserRole(user_id=user_id, role_id=role_id)
                    db.session.add(user_role)
        
        db.session.commit()
        return jsonify({"user": user.to_dict()})

    @app.route("/api/admin/users/<int:user_id>", methods=["DELETE"])
    @token_required
    @permission_required('admin.users')
    def delete_user_admin(user_id):
        """Delete user (admin only)"""
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "Usuario no encontrado"}), 404
        
        # Prevent deleting yourself
        if user.id == g.current_user.id:
            return jsonify({"error": "No puedes eliminarte a ti mismo"}), 400
        
        db.session.delete(user)
        db.session.commit()
        return jsonify({"ok": True})

    @app.route("/api/admin/users/by-email", methods=["DELETE"])
    @token_required
    @permission_required('admin.users')
    def delete_user_by_email_admin():
        data = request.get_json() or {}
        email = (data.get("email") or "").strip().lower()
        if not email:
            return jsonify({"error": "Email requerido"}), 400
        
        users = User.query.filter_by(email=email).all()
        deleted = 0
        for u in users:
            if u.id == g.current_user.id:
                continue
            db.session.delete(u)
            deleted += 1
        
        db.session.commit()
        return jsonify({"ok": True, "deleted": deleted})

    @app.route("/api/admin/users/<int:user_id>/reset-password", methods=["POST"])
    @token_required
    @permission_required('admin.users')
    def reset_user_password(user_id):
        """Reset user password (admin only)"""
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "Usuario no encontrado"}), 404
        
        data = request.get_json() or {}
        new_password = data.get("password", "")
        
        if not new_password or len(new_password) < 4:
            return jsonify({"error": "La contraseña debe tener al menos 4 caracteres"}), 400
        
        user.set_password(new_password)
        db.session.commit()
        return jsonify({"ok": True, "message": "Contraseña actualizada"})

    @app.route("/api/admin/users/<int:user_id>/roles", methods=["GET"])
    @token_required
    @permission_required('admin.users')
    def get_user_roles(user_id):
        """Get roles for a user"""
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "Usuario no encontrado"}), 404
        
        user_roles = UserRole.query.filter_by(user_id=user_id).all()
        return jsonify({"roles": [ur.role_id for ur in user_roles]})

    @app.route("/api/admin/users/<int:user_id>/roles", methods=["PUT"])
    @token_required
    @permission_required('admin.users')
    def update_user_roles(user_id):
        """Update roles for a user"""
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "Usuario no encontrado"}), 404
        
        data = request.get_json() or {}
        role_ids = data.get("roles", [])
        
        # Remove existing roles
        UserRole.query.filter_by(user_id=user_id).delete()
        
        # Add new roles
        for role_id in role_ids:
            role = Role.query.get(role_id)
            if role:
                user_role = UserRole(user_id=user_id, role_id=role_id, assigned_by=g.current_user.id)
                db.session.add(user_role)
        
        db.session.commit()
        return jsonify({"ok": True, "message": "Roles actualizados"})

    # ========== ADMIN ROLE MANAGEMENT ==========
    @app.route("/api/admin/roles", methods=["GET"])
    @token_required
    @permission_required('admin.roles')
    def get_all_roles_admin():
        """Get all roles"""
        roles = Role.query.all()
        return jsonify({"roles": [r.to_dict() for r in roles]})

    @app.route("/api/admin/roles", methods=["POST"])
    @token_required
    @permission_required('admin.roles')
    def create_role_admin():
        """Create a new role"""
        data = request.get_json() or {}
        name = data.get("name", "").strip().upper()
        description = data.get("description", "").strip()
        permissions = data.get("permissions", [])
        
        print(f"[DEBUG] Creating role: name={name}, description={description}, permissions={permissions}")
        
        if not name:
            return jsonify({"error": "El nombre del rol es requerido"}), 400
        
        existing = Role.query.filter_by(name=name).first()
        if existing:
            print(f"[DEBUG] Role already exists: {name}")
            return jsonify({"error": "El rol ya existe"}), 400
        
        role = Role(name=name, description=description, is_system=False)
        db.session.add(role)
        db.session.flush()
        print(f"[DEBUG] Role created with id: {role.id}")
        
        # Add permissions - accept both permission names (strings) and IDs (integers)
        permissions = data.get("permissions", [])
        for perm in permissions:
            if isinstance(perm, int):
                # It's an ID
                p = Permission.query.get(perm)
            elif isinstance(perm, str):
                # It's a name
                p = Permission.query.filter_by(name=perm).first()
            else:
                p = None
            
            if p:
                rp = RolePermission(role_id=role.id, permission_id=p.id)
                db.session.add(rp)
        
        db.session.commit()
        return jsonify({"role": role.to_dict()}), 201

    @app.route("/api/admin/roles/<int:role_id>", methods=["GET"])
    @token_required
    @permission_required('admin.roles')
    def get_role_admin(role_id):
        """Get role by ID"""
        role = Role.query.get(role_id)
        if not role:
            return jsonify({"error": "Rol no encontrado"}), 404
        return jsonify({"role": role.to_dict()})

    @app.route("/api/admin/roles/<int:role_id>", methods=["PUT"])
    @token_required
    @permission_required('admin.roles')
    def update_role_admin(role_id):
        """Update role"""
        role = Role.query.get(role_id)
        if not role:
            return jsonify({"error": "Rol no encontrado"}), 404
        
        if role.is_system:
            return jsonify({"error": "No se puede modificar un rol del sistema"}), 400
        
        data = request.get_json() or {}
        if "description" in data:
            role.description = data["description"].strip()
        
        # Update permissions if provided
        if "permissions" in data:
            # Remove existing permissions
            RolePermission.query.filter_by(role_id=role_id).delete()
            # Add new permissions
            for perm_name in data["permissions"]:
                perm = Permission.query.filter_by(name=perm_name).first()
                if perm:
                    rp = RolePermission(role_id=role_id, permission_id=perm.id)
                    db.session.add(rp)
        
        db.session.commit()
        return jsonify({"role": role.to_dict()})

    @app.route("/api/admin/roles/<int:role_id>", methods=["DELETE"])
    @token_required
    @permission_required('admin.roles')
    def delete_role_admin(role_id):
        """Delete role"""
        role = Role.query.get(role_id)
        if not role:
            return jsonify({"error": "Rol no encontrado"}), 404
        
        if role.is_system:
            return jsonify({"error": "No se puede eliminar un rol del sistema"}), 400
        
        db.session.delete(role)
        db.session.commit()
        return jsonify({"ok": True})

    @app.route("/api/admin/roles/<int:role_id>/permissions", methods=["POST"])
    @app.route("/api/admin/roles/<int:role_id>/permissions/bulk", methods=["POST"])
    @token_required
    @permission_required('admin.roles')
    def update_role_permissions(role_id):
        """Update all permissions for a role (bulk replace)"""
        from backend.models import Role, Permission, RolePermission
        
        role = Role.query.get(role_id)
        if not role:
            return jsonify({"error": "Rol no encontrado"}), 404
        
        data = request.get_json() or {}
        permissions = data.get("permissions", [])
        
        if not isinstance(permissions, list):
            return jsonify({"error": "permissions debe ser una lista"}), 400
        
        # Remove all existing permissions
        RolePermission.query.filter_by(role_id=role_id).delete()
        
        # Add new permissions
        for perm_name in permissions:
            perm = Permission.query.filter_by(name=perm_name).first()
            if perm:
                rp = RolePermission(role_id=role_id, permission_id=perm.id)
                db.session.add(rp)
        
        db.session.commit()
        return jsonify({"ok": True})
        """Add permission to role"""
        role = Role.query.get(role_id)
        if not role:
            return jsonify({"error": "Rol no encontrado"}), 404
        
        data = request.get_json() or {}
        permission_name = data.get("permission")
        
        if not permission_name:
            return jsonify({"error": "Nombre del permiso es requerido"}), 400
        
        perm = Permission.query.filter_by(name=permission_name).first()
        if not perm:
            return jsonify({"error": "Permiso no encontrado"}), 404
        
        # Check if already exists
        existing = RolePermission.query.filter_by(role_id=role_id, permission_id=perm.id).first()
        if existing:
            return jsonify({"error": "El permiso ya está asignado al rol"}), 400
        
        rp = RolePermission(role_id=role_id, permission_id=perm.id)
        db.session.add(rp)
        db.session.commit()
        return jsonify({"ok": True})

    @app.route("/api/admin/roles/<int:role_id>/permissions", methods=["DELETE"])
    @token_required
    @permission_required('admin.permissions')
    def remove_permission_from_role(role_id):
        """Remove permission from role"""
        role = Role.query.get(role_id)
        if not role:
            return jsonify({"error": "Rol no encontrado"}), 404
        
        data = request.get_json() or {}
        permission_name = data.get("permission")
        
        if not permission_name:
            return jsonify({"error": "Nombre del permiso es requerido"}), 400
        
        perm = Permission.query.filter_by(name=permission_name).first()
        if not perm:
            return jsonify({"error": "Permiso no encontrado"}), 404
        
        RolePermission.query.filter_by(role_id=role_id, permission_id=perm.id).delete()
        db.session.commit()
        return jsonify({"ok": True})

    @app.route("/api/admin/seed-rbac", methods=["POST"])
    @token_required
    @permission_required('admin.*')
    def reseed_rbac():
        base_permissions = [
            {"name": "admin.*", "description": "Acceso total al panel de administración", "category": "admin"},
            {"name": "admin.users", "description": "Gestionar usuarios", "category": "admin"},
            {"name": "admin.roles", "description": "Gestionar roles", "category": "admin"},
            {"name": "admin.permissions", "description": "Gestionar permisos", "category": "admin"},
            {"name": "products.*", "description": "Acceso completo a productos", "category": "products"},
            {"name": "products.read", "description": "Ver productos", "category": "products"},
            {"name": "products.create", "description": "Crear productos", "category": "products"},
            {"name": "products.update", "description": "Editar productos", "category": "products"},
            {"name": "products.delete", "description": "Eliminar productos", "category": "products"},
            {"name": "clients.*", "description": "Acceso completo a clientes", "category": "clients"},
            {"name": "clients.read", "description": "Ver clientes", "category": "clients"},
            {"name": "clients.create", "description": "Crear clientes", "category": "clients"},
            {"name": "clients.update", "description": "Editar clientes", "category": "clients"},
            {"name": "clients.delete", "description": "Eliminar clientes", "category": "clients"},
            {"name": "sales.*", "description": "Acceso completo a ventas", "category": "sales"},
            {"name": "sales.read", "description": "Ver ventas", "category": "sales"},
            {"name": "sales.create", "description": "Crear ventas", "category": "sales"},
            {"name": "sales.update", "description": "Editar ventas", "category": "sales"},
            {"name": "sales.delete", "description": "Eliminar ventas", "category": "sales"},
            {"name": "payments.*", "description": "Acceso completo a pagos", "category": "payments"},
            {"name": "payments.read", "description": "Ver pagos", "category": "payments"},
            {"name": "payments.create", "description": "Registrar pagos", "category": "payments"},
            {"name": "payments.update", "description": "Editar pagos", "category": "payments"},
            {"name": "payments.delete", "description": "Eliminar pagos", "category": "payments"},
            {"name": "expenses.*", "description": "Acceso completo a gastos", "category": "expenses"},
            {"name": "expenses.read", "description": "Ver gastos", "category": "expenses"},
            {"name": "expenses.create", "description": "Crear gastos", "category": "expenses"},
            {"name": "expenses.update", "description": "Editar gastos", "category": "expenses"},
            {"name": "expenses.delete", "description": "Eliminar gastos", "category": "expenses"},
            {"name": "summary.*", "description": "Acceso completo a resúmenes y reportes", "category": "summary"},
            {"name": "summary.dashboard", "description": "Ver dashboard", "category": "summary"},
            {"name": "summary.financial", "description": "Ver estados financieros", "category": "summary"},
            {"name": "export.*", "description": "Acceso completo a exportaciones", "category": "export"},
            {"name": "export.pdf", "description": "Exportar PDF", "category": "export"},
            {"name": "export.excel", "description": "Exportar Excel", "category": "export"},
            {"name": "settings.*", "description": "Acceso completo a configuración", "category": "settings"},
            {"name": "settings.business", "description": "Configuración del negocio", "category": "settings"},
        ]

        roles_config = [
            {
                "name": "SUPERADMIN",
                "description": "Administrador supreme con acceso total al sistema",
                "is_system": True,
                "permissions": ["admin.*"],
            },
            {
                "name": "ADMIN",
                "description": "Administrador del negocio con acceso completo",
                "is_system": True,
                "permissions": [
                    "products.*",
                    "clients.*",
                    "sales.*",
                    "payments.*",
                    "expenses.*",
                    "summary.*",
                    "export.*",
                    "settings.*",
                ],
            },
            {
                "name": "VENTAS",
                "description": "Rol para vendedores - acceso a ventas, clientes y productos",
                "is_system": True,
                "permissions": [
                    "products.read",
                    "clients.*",
                    "sales.*",
                    "payments.create",
                    "summary.dashboard",
                ],
            },
            {
                "name": "CONTABILIDAD",
                "description": "Rol para área contable - acceso a reportes y gastos",
                "is_system": True,
                "permissions": [
                    "clients.read",
                    "sales.read",
                    "payments.*",
                    "expenses.*",
                    "summary.*",
                    "export.*",
                ],
            },
            {
                "name": "LECTOR",
                "description": "Solo lectura - puede ver información sin modificar",
                "is_system": True,
                "permissions": [
                    "products.read",
                    "clients.read",
                    "sales.read",
                    "payments.read",
                    "expenses.read",
                    "summary.dashboard",
                ],
            },
        ]

        try:
            permissions_map = {}
            for perm_data in base_permissions:
                existing_perm = Permission.query.filter_by(name=perm_data["name"]).first()
                if not existing_perm:
                    perm = Permission(
                        name=perm_data["name"],
                        description=perm_data["description"],
                        category=perm_data["category"],
                    )
                    db.session.add(perm)
                    db.session.flush()
                    permissions_map[perm_data["name"]] = perm
                else:
                    permissions_map[perm_data["name"]] = existing_perm

            roles_map = {}
            for role_data in roles_config:
                role_name = role_data["name"]
                perm_names = role_data["permissions"]
                existing_role = Role.query.filter_by(name=role_name).first()
                if not existing_role:
                    role = Role(
                        name=role_name,
                        description=role_data["description"],
                        is_system=role_data["is_system"],
                    )
                    db.session.add(role)
                    db.session.flush()
                else:
                    role = existing_role

                for perm_name in perm_names:
                    perm_obj = permissions_map.get(perm_name)
                    if not perm_obj:
                        continue
                    existing_rp = RolePermission.query.filter_by(
                        role_id=role.id, permission_id=perm_obj.id
                    ).first()
                    if not existing_rp:
                        db.session.add(
                            RolePermission(role_id=role.id, permission_id=perm_obj.id)
                        )

                roles_map[role_name] = role

            db.session.commit()
            return jsonify({"ok": True, "roles": list(roles_map.keys())})
        except Exception as e:
            db.session.rollback()
            print(f"[RBAC] reseed error: {e}")
            return jsonify({"error": "RBAC reseed failed", "detail": str(e)}), 500

    # ========== ADMIN DATA MANAGEMENT ==========
    @app.route("/api/admin/data-stats", methods=["GET"])
    @token_required
    @permission_required('admin.*')
    def get_data_stats():
        """Get database statistics"""
        from backend.models import User, Business, Customer, Product, Sale, Payment, Expense
        
        users = User.query.count()
        businesses = Business.query.count()
        customers = Customer.query.count()
        products = Product.query.count()
        sales = Sale.query.count()
        payments = Payment.query.count()
        expenses = Expense.query.count()
        
        return jsonify({
            "stats": {
                "users": users,
                "businesses": businesses,
                "customers": customers,
                "products": products,
                "sales": sales,
                "payments": payments,
                "expenses": expenses,
                "last_backup": None
            }
        })

    @app.route("/api/admin/export", methods=["GET"])
    @token_required
    @permission_required('admin.*')
    def export_data():
        """Export all data"""
        # Plan FREE: sin acceso a exportación
        if g.current_user.plan == "free":
            return jsonify({
                "error": "La exportación está disponible solo en Pro. Actualiza tu plan para usar esta función.",
                "upgrade_url": "/upgrade"
            }), 403
        from backend.models import User, Business, Customer, Product, Sale, Payment, Expense, AuditLog
        import json
        
        format_type = request.args.get('format', 'json')
        
        data = {
            "export_date": datetime.datetime.utcnow().isoformat(),
            "users": [u.to_dict() for u in User.query.all()],
            "businesses": [b.to_dict() for b in Business.query.all()],
            "customers": [c.to_dict() for c in Customer.query.all()],
            "products": [p.to_dict() for p in Product.query.all()],
            "sales": [s.to_dict() for s in Sale.query.all()],
            "payments": [p.to_dict() for p in Payment.query.all()],
            "expenses": [e.to_dict() for e in Expense.query.all()],
            "audit_logs": [a.to_dict() for a in AuditLog.query.limit(1000).all()]
        }
        
        if format_type == 'csv':
            # Simple CSV export for sales
            sales = Sale.query.all()
            csv_data = "id,business_id,customer_id,total,balance,paid,sale_date\n"
            for s in sales:
                csv_data += f"{s.id},{s.business_id},{s.customer_id},{s.total},{s.balance},{s.paid},{s.sale_date}\n"
            
            from flask import Response
            return Response(
                csv_data,
                mimetype="text/csv",
                headers={"Content-disposition": f"attachment; filename=export_{datetime.datetime.now().strftime('%Y%m%d')}.csv"}
            )
        
        return jsonify(data)

    @app.route("/api/admin/import", methods=["POST"])
    @token_required
    @permission_required('admin.*')
    def import_data():
        """Import data from JSON file"""
        # Plan FREE: sin acceso a importación
        if g.current_user.plan == "free":
            return jsonify({
                "error": "La importación está disponible solo en Pro. Actualiza tu plan para usar esta función.",
                "upgrade_url": "/upgrade"
            }), 403
        from backend.models import User, Business, Customer, Product, Sale, Payment, Expense
        
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        try:
            import json
            data = json.load(file)
            
            imported = {"users": 0, "businesses": 0, "customers": 0, "products": 0}
            
            # Import businesses
            if 'businesses' in data:
                for b in data['businesses']:
                    if not Business.query.get(b.get('id')):
                        business = Business(
                            id=b['id'],
                            user_id=b['user_id'],
                            name=b['name'],
                            currency=b.get('currency', 'USD'),
                            timezone=b.get('timezone', 'UTC')
                        )
                        db.session.add(business)
                        imported['businesses'] += 1
            
            # Import customers
            if 'customers' in data:
                for c in data['customers']:
                    if not Customer.query.get(c.get('id')):
                        customer = Customer(
                            id=c['id'],
                            business_id=c['business_id'],
                            name=c['name'],
                            phone=c.get('phone'),
                            address=c.get('address'),
                            notes=c.get('notes'),
                            active=c.get('active', True)
                        )
                        db.session.add(customer)
                        imported['customers'] += 1
            
            # Import products
            if 'products' in data:
                for p in data['products']:
                    if not Product.query.get(p.get('id')):
                        product = Product(
                            id=p['id'],
                            business_id=p['business_id'],
                            name=p['name'],
                            sku=p.get('sku'),
                            price=p.get('price', 0),
                            cost=p.get('cost'),
                            unit=p.get('unit'),
                            stock=p.get('stock', 0),
                            active=p.get('active', True)
                        )
                        db.session.add(product)
                        imported['products'] += 1
            
            db.session.commit()
            return jsonify({"ok": True, "imported": imported})
        
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 400

    # ========== ADMIN PERMISSIONS ==========
    @app.route("/api/admin/permissions", methods=["GET"])
    @token_required
    @permission_required('admin.permissions')
    def get_all_permissions_admin():
        """Get all permissions"""
        permissions = Permission.query.all()
        return jsonify({"permissions": [p.to_dict() for p in permissions]})

    # ========== ADMIN AUDIT LOGS ==========
    @app.route("/api/admin/audit", methods=["GET"])
    @token_required
    @permission_required('admin.*')
    def get_audit_logs():
        """Get audit logs"""
        # Get pagination params
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 50, type=int)
        entity = request.args.get("entity")
        action = request.args.get("action")
        user_id = request.args.get("user_id", type=int)
        
        query = AuditLog.query
        
        if entity:
            query = query.filter(AuditLog.entity == entity)
        if action:
            query = query.filter(AuditLog.action == action)
        if user_id:
            query = query.filter(AuditLog.user_id == user_id)
        
        # Order by most recent
        query = query.order_by(AuditLog.timestamp.desc())
        
        # Paginate
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        # Get user info for each log
        logs = []
        for log in pagination.items:
            log_data = log.to_dict()
            if log.user_id:
                user = User.query.get(log.user_id)
                log_data['user_email'] = user.email if user else None
            logs.append(log_data)
        
        return jsonify({
            "logs": logs,
            "total": pagination.total,
            "page": page,
            "per_page": per_page,
            "pages": pagination.pages
        })

    # ========== PUBLIC CONTENT API ==========
    @app.route("/api/banners", methods=["GET"])
    def get_public_banners():
        """Get active banners for public site"""
        banners = Banner.query.filter_by(active=True).order_by(Banner.order.asc()).all()
        return jsonify({"banners": [b.to_dict() for b in banners]})

    @app.route("/api/faqs", methods=["GET"])
    def get_public_faqs():
        """Get active FAQs for public site"""
        faqs = FAQ.query.filter_by(active=True).order_by(FAQ.order.asc()).all()
        return jsonify({"faqs": [f.to_dict() for f in faqs]})
        
    @app.route("/api/prices", methods=["GET"])
    def get_public_prices():
        """Get pricing configuration"""
        config = AppSettings.query.filter_by(key="pricing_config").first()
        if config:
            import json
            return jsonify(json.loads(config.value))
        return jsonify({})

    # ========== ADMIN CONTENT MANAGEMENT ==========
    @app.route("/api/admin/banners", methods=["GET"])
    @token_required
    @permission_required('admin.*')
    def get_admin_banners():
        """Get all banners (admin)"""
        banners = Banner.query.order_by(Banner.order.asc()).all()
        return jsonify({"banners": [b.to_dict() for b in banners]})

    @app.route("/api/admin/banners", methods=["POST"])
    @token_required
    @permission_required('admin.*')
    def create_banner():
        """Create banner"""
        data = request.get_json() or {}
        if not data.get("title") or not data.get("image_url"):
            return jsonify({"error": "Título e imagen son requeridos"}), 400
            
        banner = Banner(
            title=data["title"],
            image_url=data["image_url"],
            link=data.get("link", ""),
            active=data.get("active", True),
            order=data.get("order", 0)
        )
        db.session.add(banner)
        db.session.commit()
        return jsonify({"banner": banner.to_dict()}), 201

    @app.route("/api/admin/banners/<int:banner_id>", methods=["PUT"])
    @token_required
    @permission_required('admin.*')
    def update_banner(banner_id):
        """Update banner"""
        banner = Banner.query.get(banner_id)
        if not banner:
            return jsonify({"error": "Banner no encontrado"}), 404
            
        data = request.get_json() or {}
        if "title" in data: banner.title = data["title"]
        if "image_url" in data: banner.image_url = data["image_url"]
        if "link" in data: banner.link = data["link"]
        if "active" in data: banner.active = bool(data["active"])
        if "order" in data: banner.order = int(data["order"])
        
        db.session.commit()
        return jsonify({"banner": banner.to_dict()})

    @app.route("/api/admin/banners/<int:banner_id>", methods=["DELETE"])
    @token_required
    @permission_required('admin.*')
    def delete_banner(banner_id):
        """Delete banner"""
        banner = Banner.query.get(banner_id)
        if not banner:
            return jsonify({"error": "Banner no encontrado"}), 404
            
        db.session.delete(banner)
        db.session.commit()
        return jsonify({"ok": True})

    @app.route("/api/admin/faqs", methods=["GET"])
    @token_required
    @permission_required('admin.*')
    def get_admin_faqs():
        """Get all FAQs (admin)"""
        faqs = FAQ.query.order_by(FAQ.order.asc()).all()
        return jsonify({"faqs": [f.to_dict() for f in faqs]})

    @app.route("/api/admin/faqs", methods=["POST"])
    @token_required
    @permission_required('admin.*')
    def create_faq():
        """Create FAQ"""
        data = request.get_json() or {}
        if not data.get("question") or not data.get("answer"):
            return jsonify({"error": "Pregunta y respuesta son requeridas"}), 400
            
        faq = FAQ(
            question=data["question"],
            answer=data["answer"],
            active=data.get("active", True),
            order=data.get("order", 0)
        )
        db.session.add(faq)
        db.session.commit()
        return jsonify({"faq": faq.to_dict()}), 201

    @app.route("/api/admin/faqs/<int:faq_id>", methods=["PUT"])
    @token_required
    @permission_required('admin.*')
    def update_faq(faq_id):
        """Update FAQ"""
        faq = FAQ.query.get(faq_id)
        if not faq:
            return jsonify({"error": "FAQ no encontrada"}), 404
            
        data = request.get_json() or {}
        if "question" in data: faq.question = data["question"]
        if "answer" in data: faq.answer = data["answer"]
        if "active" in data: faq.active = bool(data["active"])
        if "order" in data: faq.order = int(data["order"])
        
        db.session.commit()
        return jsonify({"faq": faq.to_dict()})

    @app.route("/api/admin/faqs/<int:faq_id>", methods=["DELETE"])
    @token_required
    @permission_required('admin.*')
    def delete_faq(faq_id):
        """Delete FAQ"""
        faq = FAQ.query.get(faq_id)
        if not faq:
            return jsonify({"error": "FAQ no encontrada"}), 404
            
        db.session.delete(faq)
        db.session.commit()
        return jsonify({"ok": True})

    @app.route("/api/admin/prices", methods=["POST"])
    @token_required
    @permission_required('admin.*')
    def update_prices():
        """Update pricing config"""
        data = request.get_json() or {}
        import json
        
        config = AppSettings.query.filter_by(key="pricing_config").first()
        if not config:
            config = AppSettings(key="pricing_config")
            db.session.add(config)
        
        config.value = json.dumps(data)
        db.session.commit()
        return jsonify({"ok": True})

    # ========== STATIC FILES ==========
    @app.route("/assets/<path:filename>")
    def serve_assets(filename):
        import os
        roots = []
        env_root = os.environ.get("CUADERNO_ROOT")
        if env_root:
            roots.append(env_root)
        roots.append(os.getcwd())
        roots.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        seen = set()
        for root in roots:
            if not root or root in seen:
                continue
            seen.add(root)
            public_assets = os.path.join(root, "public", "assets")
            project_assets = os.path.join(root, "assets")
            frontend_assets = os.path.join(root, "frontend", "assets")
            public_path = os.path.join(public_assets, filename)
            project_path = os.path.join(project_assets, filename)
            frontend_path = os.path.join(frontend_assets, filename)
            if os.path.exists(public_path):
                return send_from_directory(public_assets, filename)
            if os.path.exists(project_path):
                return send_from_directory(project_assets, filename)
            if os.path.exists(frontend_path):
                return send_from_directory(frontend_assets, filename)
        return jsonify({"error": "Not found"}), 404

    @app.route("/public/assets/<path:filename>")
    def serve_public_assets(filename):
        return send_from_directory("../public/assets", filename)

    @app.route("/favicon.ico")
    def favicon():
        import os
        roots = []
        env_root = os.environ.get("CUADERNO_ROOT")
        if env_root:
            roots.append(env_root)
        roots.append(os.getcwd())
        roots.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        seen = set()
        for root in roots:
            if not root or root in seen:
                continue
            seen.add(root)
            public_dir = os.path.join(root, "public")
            root_file = os.path.join(root, "favicon.ico")
            public_file = os.path.join(public_dir, "favicon.ico")
            if os.path.exists(public_file):
                return send_from_directory(public_dir, "favicon.ico")
            if os.path.exists(root_file):
                return send_from_directory(root, "favicon.ico")
        return jsonify({"error": "Not found"}), 404

    @app.route("/api/contact", methods=["POST"])
    def contact():
        data = request.get_json() or {}
        name = (data.get("name") or "").strip()
        email = (data.get("email") or "").strip()
        query_type = (data.get("type") or "").strip()
        message = (data.get("message") or "").strip()
        if not name or not email or not message:
            return jsonify({"error": "Nombre, email y mensaje son requeridos"}), 400
        subject = "[Landing] Nueva consulta"
        body_lines = [
            f"Nombre: {name}",
            f"Email: {email}",
            f"Tipo de consulta: {query_type or 'no especificado'}",
            "",
            message,
        ]
        body = "\n".join(body_lines)
        try:
            from backend.auth import AuthManager
            sent = AuthManager.send_plain_email("encajapp@gmail.com", subject, body)
            if not sent:
                return jsonify({"error": "No se pudo enviar el mensaje, intenta más tarde"}), 500
        except Exception as e:
            print(f"[CONTACT] Error enviando mensaje: {e}")
            return jsonify({"error": "No se pudo enviar el mensaje, intenta más tarde"}), 500
        return jsonify({"success": True})
    
    # ========== PUBLIC CUSTOMER API ==========
    @app.route("/api/public/register", methods=["POST"])
    def public_register():
        """Public registration for customers"""
        try:
            data = request.get_json() or {}
            name = (data.get("name", "") or "").strip()[:100]
            phone = (data.get("phone", "") or "").strip()[:20]
            address = (data.get("address", "") or "").strip()[:200]
            
            if not phone:
                return jsonify({"error": "El celular es requerido"}), 400
            
            # Get first business
            business = Business.query.first()
            if not business:
                return jsonify({"error": "No hay negocios disponibles"}), 400
            
            # Check if customer exists
            existing = Customer.query.filter_by(business_id=business.id, phone=phone).first()
            if existing:
                return jsonify({"success": True, "message": "Cliente ya registrado", "customer_id": existing.id})
            
            # Create new customer
            customer = Customer(
                business_id=business.id,
                name=name or "Cliente",
                phone=phone,
                address=address,
                active=True
            )
            db.session.add(customer)
            db.session.commit()
            
            return jsonify({"success": True, "message": "Registro exitoso", "customer_id": customer.id})
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 500
    
    @app.route("/api/public/login", methods=["POST"])
    def public_login():
        """Public login for customers - returns token"""
        try:
            data = request.get_json() or {}
            phone = (data.get("phone", "") or "").strip()
            password = (data.get("password", "") or "")
            
            if not phone or not password:
                return jsonify({"error": "Celular y contraseña requeridos"}), 400
            
            # Get first business
            business = Business.query.first()
            if not business:
                return jsonify({"error": "No hay negocios disponibles"}), 400
            
            # Find customer
            customer = Customer.query.filter_by(business_id=business.id, phone=phone).first()
            if not customer:
                return jsonify({"error": "Cliente no encontrado"}), 404
            
            # Generate simple token (in production, use proper JWT)
            import base64
            token_data = f"customer_{customer.id}_{business.id}"
            token = base64.b64encode(token_data.encode()).decode()
            
            return jsonify({
                "success": True,
                "token": token,
                "customer_id": customer.id,
                "customer_name": customer.name
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    @app.route("/api/public/business")
    def public_business_info():
        """Get public business info for store page"""
        try:
            business = Business.query.first()
            if not business:
                return jsonify({"error": "Negocio no encontrado"}), 404
            
            settings = business.settings or {}
            return jsonify({
                "id": business.id,
                "name": business.name,
                "phone": business.phone or "",
                "address": business.address or "",
                "logo": settings.get("logo", "")
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    @app.route("/admin")
    def admin():
        """Legacy admin route - redirect to panel"""
        return send_from_directory("../frontend", "panel.html")

    # Remove legacy static handler if it exists here, as it is handled by the main serve_static
    # The duplicate serve_static at the end of create_app seems redundant or legacy.
    # I will remove it to avoid conflicts with the one defined earlier.

    with app.app_context():
        db.create_all()
        try:
            try:
                from backend.seeds import seed_rbac
                seed_rbac()
            except ImportError as e:
                print(f"Warning: Could not run RBAC seed: {e}")
            
            admin_email = os.getenv("ADMIN_EMAIL", "admin@cuaderno.app")
            admin_password = os.getenv("ADMIN_PASSWORD", "admin123")
            admin_name = os.getenv("ADMIN_NAME", "Administrador")
            
            admin_user = User.query.filter_by(email=admin_email.lower()).first()
            if not admin_user:
                admin_user = User(
                    email=admin_email.lower(),
                    name=admin_name,
                    plan="pro",
                    is_admin=True,
                    email_verified=True
                )
                admin_user.set_password(admin_password)
                db.session.add(admin_user)
                db.session.flush()
                print(f"[INIT] Admin user created: {admin_email}")
            else:
                admin_user.is_admin = True
                admin_user.email_verified = True
                admin_user.plan = "pro"
                admin_user.set_password(admin_password)
                print(f"[INIT] Existing user promoted to admin: {admin_email}")
            
            superadmin_role = Role.query.filter_by(name="SUPERADMIN").first()
            if superadmin_role and admin_user.id:
                existing_role = UserRole.query.filter_by(user_id=admin_user.id, role_id=superadmin_role.id).first()
                if not existing_role:
                    user_role = UserRole(user_id=admin_user.id, role_id=superadmin_role.id)
                    db.session.add(user_role)
                    print(f"[INIT] Assigned SUPERADMIN role to {admin_email}")
            
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            print(f"[INIT] Skipping seed due to error: {e}")

    return app


# ========== BUSINESS PROFILE (RECEIPTS) - Outside create_app ==========
def register_receipt_routes(application):
    """Register receipt routes with the app"""
    from flask import request, jsonify, send_file
    from io import BytesIO
    from datetime import datetime
    
    # PIL for receipt generation (optional)
    try:
        from PIL import Image, ImageDraw, ImageFont
        HAS_PIL = True
    except ImportError:
        HAS_PIL = False
    
    @application.route("/api/business_profile", methods=["GET"])
    def get_business_profile():
        """Get business profile for receipts"""
        try:
            result = db.session.execute(db.text("SELECT * FROM business_profile WHERE id=1")).fetchone()
            if not result:
                db.session.execute(db.text("""
                    INSERT INTO business_profile (id, business_name, phone, tax_id, address, message, updated_at)
                    VALUES (1, '', '', '', '', '', '')
                """))
                db.session.commit()
                result = db.session.execute(db.text("SELECT * FROM business_profile WHERE id=1")).fetchone()
            
            if result:
                return jsonify({
                    "id": result[0], "business_name": result[1] or "",
                    "phone": result[2] or "", "tax_id": result[3] or "",
                    "address": result[4] or "", "message": result[5] or "", "updated_at": result[6] or ""
                })
            return jsonify({"error": "Perfil no encontrado"}), 404
        except Exception as e:
            return jsonify({"id": 1, "business_name": "", "phone": "", "tax_id": "", "address": "", "message": "", "updated_at": ""})

    @application.route("/api/business_profile", methods=["PUT"])
    def update_business_profile():
        data = request.get_json() or {}
        business_name = (data.get("business_name", "") or "")[:120]
        phone = (data.get("phone", "") or "")[:20]
        tax_id = (data.get("tax_id", "") or "")[:20]
        address = (data.get("address", "") or "")[:200]
        message = (data.get("message", "") or "")[:500]
        
        try:
            result = db.session.execute(db.text("SELECT id FROM business_profile WHERE id=1")).fetchone()
            if not result:
                db.session.execute(db.text("""
                    INSERT INTO business_profile (id, business_name, phone, tax_id, address, message, updated_at)
                    VALUES (1, :business_name, :phone, :tax_id, :address, :message, :updated_at)
                """), {"business_name": business_name, "phone": phone, "tax_id": tax_id, "address": address, "message": message, "updated_at": datetime.utcnow().isoformat()})
            else:
                db.session.execute(db.text("""
                    UPDATE business_profile SET business_name=:business_name, phone=:phone, tax_id=:tax_id, address=:address, message=:message, updated_at=:updated_at WHERE id=1
                """), {"business_name": business_name, "phone": phone, "tax_id": tax_id, "address": address, "message": message, "updated_at": datetime.utcnow().isoformat()})
            db.session.commit()
            return jsonify({"success": True})
        except Exception as e:
            try:
                db.session.execute(db.text("""
                    CREATE TABLE IF NOT EXISTS business_profile (id INTEGER PRIMARY KEY CHECK (id=1), business_name TEXT NOT NULL DEFAULT '', phone TEXT DEFAULT '', tax_id TEXT DEFAULT '', address TEXT DEFAULT '', message TEXT DEFAULT '', updated_at TEXT DEFAULT '')
                """))
                db.session.commit()
                return jsonify({"success": True})
            except:
                db.session.rollback()
                return jsonify({"error": str(e)}), 500

    @application.route("/api/receipt", methods=["GET"])
    def get_receipt():
        if not HAS_PIL:
            return jsonify({"error": "PIL/Pillow no está instalado. Instala: pip install Pillow"}), 500
        
        try:
            sale_id = request.args.get("sale_id", type=int)
        except:
            return jsonify({"error": "sale_id inválido"}), 400
        
        if not sale_id:
            return jsonify({"error": "sale_id es requerido"}), 400
        
        sale = Sale.query.get(sale_id)
        if not sale:
            return jsonify({"error": "Venta no encontrada"}), 404
        
        customer = Customer.query.get(sale.customer_id) if sale.customer_id else None
        
        profile_data = {"business_name": "Mi Negocio", "phone": "", "tax_id": "", "address": "", "message": ""}
        try:
            result = db.session.execute(db.text("SELECT * FROM business_profile WHERE id=1")).fetchone()
            if result:
                profile_data = {"business_name": result[1] or "Mi Negocio", "phone": result[2] or "", "tax_id": result[3] or "", "address": result[4] or "", "message": result[5] or ""}
        except:
            pass
        
        receipt_number = f"RC-{datetime.now().year}-{sale.id:06d}"
        total = sale.total
        paid = total if sale.paid else 0
        balance = sale.balance or 0
        
        try:
            # Receipt dimensions and styling
            width, height = 450, 500 + (len(sale.items) * 25)
            img = Image.new('RGB', (width, height), color=(250, 250, 252))
            draw = ImageDraw.Draw(img)
            
            # Colors
            primary_color = (41, 128, 185)  # Blue
            secondary_color = (52, 73, 94)  # Dark gray
            accent_color = (46, 204, 113)   # Green
            text_color = (44, 62, 80)        # Dark text
            light_gray = (189, 195, 199)
            white = (255, 255, 255)
            
            # Decorative border
            draw.rectangle([(5, 5), (width-5, height-5)], outline=primary_color, width=3)
            draw.rectangle([(10, 10), (width-10, height-10)], outline=light_gray, width=1)
            
            # Header background
            draw.rectangle([(15, 15), (width-15, 90)], fill=primary_color)
            
            try:
                font_title = ImageFont.truetype("arial.ttf", 22)
                font_header = ImageFont.truetype("arial.ttf", 16)
                font_normal = ImageFont.truetype("arial.ttf", 13)
                font_small = ImageFont.truetype("arial.ttf", 10)
                font_tiny = ImageFont.truetype("arial.ttf", 9)
            except:
                font_title = font_header = font_normal = font_small = font_tiny = ImageFont.load_default()
            
            # Business name in header (white text on blue)
            y = 25
            business_name = profile_data["business_name"] or "RECIBO DE VENTA"
            draw.text((width//2, y), business_name.upper(), fill='white', anchor='mm', font=font_title)
            y += 30
            draw.text((width//2, y), "COMPROBANTE DE PAGO", fill='white', anchor='mm', font=font_header)
            
            # Reset y for content
            y = 110
            
            # Receipt info box
            draw.rectangle([(20, y), (width-20, y+60)], outline=light_gray, width=1)
            y += 15
            draw.text((30, y), f"Recibo #: {receipt_number}", fill=secondary_color, font=font_normal)
            y += 18
            draw.text((30, y), f"Fecha: {sale.sale_date}", fill=secondary_color, font=font_normal)
            y += 18
            draw.text((30, y), f"Hora: {datetime.now().strftime('%H:%M:%S')}", fill=secondary_color, font=font_normal)
            
            # Business info
            y += 25
            if profile_data["tax_id"]:
                draw.text((30, y), f"NIT/RUT: {profile_data['tax_id']}", fill=text_color, font=font_small)
                y += 15
            if profile_data["phone"]:
                draw.text((30, y), f"Teléfono: {profile_data['phone']}", fill=text_color, font=font_small)
                y += 15
            if profile_data["address"]:
                draw.text((30, y), f"Dirección: {profile_data['address']}", fill=text_color, font=font_small)
                y += 15
            
            # Separator line
            y += 10
            draw.line([(30, y), (width-30, y)], fill=primary_color, width=2)
            y += 15
            
            # Customer info
            customer_name = customer.name if customer else "Cliente general"
            customer_doc = customer.tax_id if customer and hasattr(customer, 'tax_id') else ""
            draw.text((30, y), f"CLIENTE:", fill=primary_color, font=font_small)
            y += 15
            draw.text((30, y), customer_name, fill=text_color, font=font_normal)
            if customer_doc:
                y += 15
                draw.text((30, y), f"Documento: {customer_doc}", fill=text_color, font=font_small)
            
            # Separator
            y += 20
            draw.line([(30, y), (width-30, y)], fill=light_gray, width=1)
            y += 15
            
            # Items header
            draw.text((35, y), "DESCRIPCIÓN", fill=primary_color, font=font_small)
            draw.text((280, y), "CANT.", fill=primary_color, font=font_small)
            draw.text((360, y), "PRECIO", fill=primary_color, font=font_small)
            
            # Items separator
            y += 18
            draw.line([(30, y), (width-30, y)], fill=light_gray, width=1)
            y += 10
            
            for item in sale.items:
                name = item.get("name", "Producto")[:25]
                qty = item.get("qty", 1)
                price = item.get("price", 0)
                item_total = item.get("total", qty * price)
                
                draw.text((35, y), name, fill=text_color, font=font_small)
                draw.text((285, y), str(qty), fill=text_color, font=font_small)
                draw.text((360, y), f"${price:,.0f}", fill=text_color, font=font_small)
                y += 18
                
                # Show subtotal if different from total
                if item_total != price * qty:
                    draw.text((320, y), f"Subtotal: ${item_total:,.0f}", fill=(128, 128, 128), font=font_tiny)
                    y += 15
            
            # Total section
            y += 15
            draw.line([(30, y), (width-30, y)], fill=primary_color, width=2)
            y += 15
            
            # Total box with background
            draw.rectangle([(250, y-5), (width-20, y+55)], fill=(245, 247, 250))
            draw.text((260, y), "SUBTOTAL:", fill=text_color, font=font_normal)
            draw.text((380, y), f"${total:,.0f}", fill=text_color, font=font_normal)
            y += 22
            draw.text((260, y), "TOTAL A PAGAR:", fill=secondary_color, font=font_normal)
            draw.text((380, y), f"${total:,.0f}", fill=secondary_color, font=font_normal)
            y += 22
            
            # Payment status
            if paid > 0:
                draw.text((260, y), f"PAGADO:", fill=accent_color, font=font_normal)
                draw.text((380, y), f"${paid:,.0f}", fill=accent_color, font=font_normal)
            if balance > 0:
                y += 22
                draw.text((260, y), "SALDO PENDIENTE:", fill=(231, 76, 60), font=font_normal)
                draw.text((380, y), f"${balance:,.0f}", fill=(231, 76, 60), font=font_normal)
            
            # Custom message from business
            y += 40
            if profile_data["message"]:
                draw.line([(30, y-10), (width-30, y-10)], fill=light_gray, width=1)
                y += 5
                draw.text((width//2, y), "📝 MENSAJE", fill=primary_color, anchor='mm', font=font_small)
                y += 18
                # Wrap message text
                import textwrap
                message_lines = textwrap.wrap(profile_data["message"], width=45)
                for line in message_lines:
                    draw.text((30, y), line, fill=(100, 100, 100), font=font_small)
                    y += 14
            
            # Footer
            y = height - 50
            draw.line([(50, y), (width-50, y)], fill=light_gray, width=1)
            y += 10
            draw.text((width//2, y), "Gracias por su compra!", fill=primary_color, anchor='mm', font=font_normal)
            y += 18
            draw.text((width//2, y), f"Sistema de Gestión - {datetime.now().year}", fill=light_gray, anchor='mm', font=font_tiny)
            
            img_bytes = BytesIO()
            img.save(img_bytes, format='PNG')
            img_bytes.seek(0)
            return send_file(img_bytes, mimetype='image/png', as_attachment=False, download_name=f'recibo_{sale_id}.png')
        except Exception as e:
            return jsonify({"error": f"Error: {str(e)}"}), 500

    @application.route("/api/receipt/link/<int:sale_id>", methods=["GET"])
    @token_required
    def get_receipt_link(sale_id):
        current_user = g.current_user
        try:
            sale = Sale.query.get(sale_id)
            if not sale:
                return jsonify({"error": "Venta no encontrada"}), 404
            
            # Ensure user owns the business of the sale
            business = Business.query.get(sale.business_id)
            if not business or business.user_id != current_user.id:
                return jsonify({"error": "No autorizado"}), 403

            s = URLSafeTimedSerializer(application.config["SECRET_KEY"])
            token = s.dumps(sale.id, salt="receipt-view")
            
            link = url_for('public_receipt', token=token, _external=True)
            path = url_for('public_receipt', token=token, _external=False)
            return jsonify({"url": link, "path": path, "token": token})
        except Exception as e:
            print(f"Error generating receipt link: {e}")
            return jsonify({"error": f"Error interno: {str(e)}"}), 500

    @application.route("/api/public/r/<token>")
    def public_receipt(token):
        s = URLSafeTimedSerializer(application.config["SECRET_KEY"])
        try:
            sale_id = s.loads(token, salt="receipt-view", max_age=86400 * 30) # 30 days valid
        except SignatureExpired:
            return "El enlace del recibo ha expirado.", 404
        except BadSignature:
            return "Enlace inválido.", 404
            
        sale = Sale.query.get(sale_id)
        if not sale:
            return "Venta no encontrada", 404
            
        business = Business.query.get(sale.business_id)
        customer = Customer.query.get(sale.customer_id) if sale.customer_id else None
        
        profile_data = {"business_name": business.name, "phone": "", "tax_id": "", "address": "", "message": ""}
        try:
            result = db.session.execute(db.text("SELECT * FROM business_profile WHERE id=1")).fetchone()
            if result:
                profile_data = {
                    "business_name": result[1] or business.name,
                    "phone": result[2] or "", 
                    "tax_id": result[3] or "", 
                    "address": result[4] or "", 
                    "message": result[5] or ""
                }
        except:
            pass
            
        receipt_number = f"RC-{sale.sale_date.year}-{sale.id:06d}"
        
        return render_template('receipt_view.html', 
                               sale=sale, 
                               business=profile_data, 
                               customer=customer, 
                               receipt_number=receipt_number)


# Create app instance
app = create_app()

# Register additional routes
register_receipt_routes(app)

# Additional route for WhatsApp sharing - get sale by ID
@app.route("/api/sales", methods=["GET"])
def get_sale_for_whatsapp():
    """Get sale data for WhatsApp sharing"""
    from flask import request
    sale_id = request.args.get("id", type=int)
    if not sale_id:
        return jsonify({"error": "id es requerido"}), 400
    
    sale = Sale.query.get(sale_id)
    if not sale:
        return jsonify({"error": "Venta no encontrada"}), 404
    
    return jsonify({
        "sales": [{
            "id": sale.id,
            "total": sale.total,
            "paid": sale.paid,
            "balance": sale.balance,
            "customer_id": sale.customer_id,
            "sale_date": sale.sale_date.isoformat() if sale.sale_date else None
        }]
    })

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8001"))
    debug = os.getenv("FLASK_ENV", "development") != "production"
    app.run(host="127.0.0.1", port=port, debug=debug)

# Cómo correr en desarrollo para servir frontend y API desde 127.0.0.1:5000
# Windows PowerShell:
#   $env:APP_ENV="dev"
#   python main.py
# Mac/Linux:
#   export APP_ENV=dev
#   python main.py
# Abrir: http://127.0.0.1:5000
