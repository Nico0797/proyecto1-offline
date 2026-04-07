from datetime import datetime
from io import BytesIO
import textwrap

from flask import g, jsonify, render_template, request, send_file, url_for
from sqlalchemy.exc import DBAPIError
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature

from backend.auth import token_required
from backend.database import db
from backend.models import Business, Customer, Sale

try:
    from PIL import Image, ImageDraw, ImageFont
    HAS_PIL = True
except ImportError:
    HAS_PIL = False


def _build_business_profile_payload(row, default_business_name=""):
    if not row:
        return {
            "id": 1,
            "business_name": default_business_name,
            "phone": "",
            "tax_id": "",
            "address": "",
            "message": "",
            "updated_at": "",
        }
    return {
        "id": row[0],
        "business_name": row[1] or default_business_name,
        "phone": row[2] or "",
        "tax_id": row[3] or "",
        "address": row[4] or "",
        "message": row[5] or "",
        "updated_at": row[6] or "",
    }


def _is_business_profile_table_missing_error(error):
    if not isinstance(error, DBAPIError):
        return False
    original_error = getattr(error, "orig", None)
    if getattr(original_error, "pgcode", None) == "42P01":
        return True
    message = str(error).lower()
    return "business_profile" in message and ("does not exist" in message or "undefinedtable" in message)


def _get_business_profile_row():
    return db.session.execute(db.text("SELECT * FROM business_profile WHERE id=1")).fetchone()


def register_receipt_routes(application):
    from flask import jsonify, request, send_file
    from io import BytesIO
    from datetime import datetime

    @application.route("/api/business_profile", methods=["GET"])
    def get_business_profile():
        try:
            result = _get_business_profile_row()
            return jsonify(_build_business_profile_payload(result))
        except Exception as e:
            db.session.rollback()
            if _is_business_profile_table_missing_error(e):
                application.logger.warning("business_profile table is missing; returning default receipt profile payload.")
            else:
                application.logger.warning("Could not read business_profile: %s", e)
            return jsonify(_build_business_profile_payload(None))

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
            db.session.rollback()
            if _is_business_profile_table_missing_error(e):
                application.logger.error("business_profile table is missing; apply migrations before updating receipt profile.")
                return jsonify({"error": "Tabla business_profile no disponible. Ejecuta las migraciones pendientes."}), 503
            return jsonify({"error": str(e)}), 500

    @application.route("/api/receipt", methods=["GET"])
    def get_receipt():
        if not HAS_PIL:
            return jsonify({"error": "PIL/Pillow no está instalado. Instala: pip install Pillow"}), 500

        try:
            sale_id = request.args.get("sale_id", type=int)
        except Exception:
            return jsonify({"error": "sale_id inválido"}), 400

        if not sale_id:
            return jsonify({"error": "sale_id es requerido"}), 400

        sale = Sale.query.get(sale_id)
        if not sale:
            return jsonify({"error": "Venta no encontrada"}), 404

        customer = Customer.query.get(sale.customer_id) if sale.customer_id else None

        profile_data = _build_business_profile_payload(None, default_business_name="Mi Negocio")
        try:
            result = _get_business_profile_row()
            profile_data = _build_business_profile_payload(result, default_business_name="Mi Negocio")
        except Exception:
            db.session.rollback()

        receipt_number = f"RC-{datetime.now().year}-{sale.id:06d}"
        total = sale.total
        paid = total if sale.paid else 0
        balance = sale.balance or 0

        try:
            width, height = 450, 500 + (len(sale.items) * 25)
            img = Image.new('RGB', (width, height), color=(250, 250, 252))
            draw = ImageDraw.Draw(img)

            primary_color = (41, 128, 185)
            secondary_color = (52, 73, 94)
            accent_color = (46, 204, 113)
            text_color = (44, 62, 80)
            light_gray = (189, 195, 199)

            draw.rectangle([(5, 5), (width-5, height-5)], outline=primary_color, width=3)
            draw.rectangle([(10, 10), (width-10, height-10)], outline=light_gray, width=1)
            draw.rectangle([(15, 15), (width-15, 90)], fill=primary_color)

            try:
                font_title = ImageFont.truetype("arial.ttf", 22)
                font_header = ImageFont.truetype("arial.ttf", 16)
                font_normal = ImageFont.truetype("arial.ttf", 13)
                font_small = ImageFont.truetype("arial.ttf", 10)
                font_tiny = ImageFont.truetype("arial.ttf", 9)
            except Exception:
                font_title = font_header = font_normal = font_small = font_tiny = ImageFont.load_default()

            y = 25
            business_name = profile_data["business_name"] or "RECIBO DE VENTA"
            draw.text((width//2, y), business_name.upper(), fill='white', anchor='mm', font=font_title)
            y += 30
            draw.text((width//2, y), "COMPROBANTE DE PAGO", fill='white', anchor='mm', font=font_header)
            y = 110

            draw.rectangle([(20, y), (width-20, y+60)], outline=light_gray, width=1)
            y += 15
            draw.text((30, y), f"Recibo #: {receipt_number}", fill=secondary_color, font=font_normal)
            y += 18
            draw.text((30, y), f"Fecha: {sale.sale_date}", fill=secondary_color, font=font_normal)
            y += 18
            draw.text((30, y), f"Hora: {datetime.now().strftime('%H:%M:%S')}", fill=secondary_color, font=font_normal)

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

            y += 10
            draw.line([(30, y), (width-30, y)], fill=primary_color, width=2)
            y += 15

            customer_name = customer.name if customer else "Cliente general"
            customer_doc = customer.tax_id if customer and hasattr(customer, 'tax_id') else ""
            draw.text((30, y), f"CLIENTE:", fill=primary_color, font=font_small)
            y += 15
            draw.text((30, y), customer_name, fill=text_color, font=font_normal)
            if customer_doc:
                y += 15
                draw.text((30, y), f"Documento: {customer_doc}", fill=text_color, font=font_small)

            y += 20
            draw.line([(30, y), (width-30, y)], fill=light_gray, width=1)
            y += 15

            draw.text((35, y), "DESCRIPCIÓN", fill=primary_color, font=font_small)
            draw.text((280, y), "CANT.", fill=primary_color, font=font_small)
            draw.text((360, y), "PRECIO", fill=primary_color, font=font_small)
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

                if item_total != price * qty:
                    draw.text((320, y), f"Subtotal: ${item_total:,.0f}", fill=(128, 128, 128), font=font_tiny)
                    y += 15

            y += 15
            draw.line([(30, y), (width-30, y)], fill=primary_color, width=2)
            y += 15

            draw.rectangle([(250, y-5), (width-20, y+55)], fill=(245, 247, 250))
            draw.text((260, y), "SUBTOTAL:", fill=text_color, font=font_normal)
            draw.text((380, y), f"${total:,.0f}", fill=text_color, font=font_normal)
            y += 22
            draw.text((260, y), "TOTAL A PAGAR:", fill=secondary_color, font=font_normal)
            draw.text((380, y), f"${total:,.0f}", fill=secondary_color, font=font_normal)
            y += 22

            if paid > 0:
                draw.text((260, y), f"PAGADO:", fill=accent_color, font=font_normal)
                draw.text((380, y), f"${paid:,.0f}", fill=accent_color, font=font_normal)
            if balance > 0:
                y += 22
                draw.text((260, y), "SALDO PENDIENTE:", fill=(231, 76, 60), font=font_normal)
                draw.text((380, y), f"${balance:,.0f}", fill=(231, 76, 60), font=font_normal)

            y += 40
            if profile_data["message"]:
                draw.line([(30, y-10), (width-30, y-10)], fill=light_gray, width=1)
                y += 5
                draw.text((width//2, y), "📝 MENSAJE", fill=primary_color, anchor='mm', font=font_small)
                y += 18
                message_lines = textwrap.wrap(profile_data["message"], width=45)
                for line in message_lines:
                    draw.text((30, y), line, fill=(100, 100, 100), font=font_small)
                    y += 14

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

            business = Business.query.get(sale.business_id)
            if not business or business.user_id != current_user.id:
                return jsonify({"error": "No autorizado"}), 403

            s = URLSafeTimedSerializer(application.config["SECRET_KEY"])
            token = s.dumps(sale.id, salt="receipt-view")

            link = url_for('public_receipt', token=token, _external=True)
            path = url_for('public_receipt', token=token, _external=False)
            return jsonify({"url": link, "path": path, "token": token})
        except Exception as e:
            return jsonify({"error": f"Error interno: {str(e)}"}), 500

    @application.route("/api/public/r/<token>")
    def public_receipt(token):
        s = URLSafeTimedSerializer(application.config["SECRET_KEY"])
        try:
            sale_id = s.loads(token, salt="receipt-view", max_age=86400 * 30)
        except SignatureExpired:
            return "El enlace del recibo ha expirado.", 404
        except BadSignature:
            return "Enlace inválido.", 404

        sale = Sale.query.get(sale_id)
        if not sale:
            return "Venta no encontrada", 404

        business = Business.query.get(sale.business_id)
        customer = Customer.query.get(sale.customer_id) if sale.customer_id else None

        profile_data = _build_business_profile_payload(None, default_business_name=business.name)
        try:
            result = _get_business_profile_row()
            profile_data = _build_business_profile_payload(result, default_business_name=business.name)
        except Exception:
            db.session.rollback()

        receipt_number = f"RC-{sale.sale_date.year}-{sale.id:06d}"

        return render_template('receipt_view.html', sale=sale, business=profile_data, customer=customer, receipt_number=receipt_number)
