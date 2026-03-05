import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
from datetime import datetime
from io import BytesIO
from openpyxl import Workbook

DB_FILE = "cuaderno.db"

app = Flask(__name__, static_folder=None)
CORS(app, resources={r"/api/*": {"origins": [
    "https://camino-resonante-contabilidad.web.app",
    "https://camino-resonante-contabilidad.firebaseapp.com",
    "http://localhost",
    "http://127.0.0.1"
]}})


# ---------------- DB helpers ----------------
def db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def utc_now():
    return datetime.utcnow().isoformat(timespec="seconds") + "Z"


def ensure_column(conn, table: str, column: str, ddl: str):
    cols = [r["name"] for r in conn.execute(f"PRAGMA table_info({table})").fetchall()]
    if column not in cols:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {ddl}")


def init_db_and_seed():
    conn = db()
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kind TEXT NOT NULL CHECK(kind IN ('income','expense')),
        amount REAL NOT NULL,
        tx_date TEXT NOT NULL,
        category TEXT,
        note TEXT,
        created_at TEXT NOT NULL
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        sku TEXT,
        price REAL NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_date TEXT NOT NULL,
        product_id INTEGER NOT NULL,
        qty INTEGER NOT NULL CHECK(qty >= 1),
        unit_price REAL NOT NULL,
        total REAL NOT NULL,
        note TEXT,
        created_at TEXT NOT NULL,
        customer_id INTEGER,
        paid INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY(product_id) REFERENCES products(id)
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        entry_type TEXT NOT NULL CHECK(entry_type IN ('charge','payment')),
        amount REAL NOT NULL CHECK(amount > 0),
        entry_date TEXT NOT NULL,
        note TEXT,
        ref_type TEXT,
        ref_id INTEGER,
        created_at TEXT NOT NULL,
        FOREIGN KEY(customer_id) REFERENCES customers(id)
    )
    """)

    # Allocations: payment -> charge
    cur.execute("""
    CREATE TABLE IF NOT EXISTS ledger_allocations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        payment_id INTEGER NOT NULL,
        charge_id INTEGER NOT NULL,
        amount REAL NOT NULL CHECK(amount > 0),
        created_at TEXT NOT NULL,
        FOREIGN KEY(payment_id) REFERENCES ledger(id),
        FOREIGN KEY(charge_id) REFERENCES ledger(id)
    )
    """)

    # Settings table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )
    """)

    # Migrations for transactions reference
    ensure_column(conn, "transactions", "ref_type", "ref_type TEXT")
    ensure_column(conn, "transactions", "ref_id", "ref_id INTEGER")

    # Seed products if empty
    count = cur.execute("SELECT COUNT(*) AS c FROM products").fetchone()["c"]
    if count == 0:
        seeds = [
            ("Yogurt griego 500g", "YG-500G", 12000.0),
            ("Yogurt griego 1000g", "YG-1000G", 20000.0),
            ("Promo 2x1000g", "PROMO-2X1K", 36000.0),
        ]
        for name, sku, price in seeds:
            cur.execute(
                "INSERT INTO products(name, sku, price, active, created_at) VALUES(?,?,?,?,?)",
                (name, sku, price, 1, utc_now())
            )

    # Seed default debt term if not exists
    term = cur.execute("SELECT value FROM settings WHERE key='debt_term_days'").fetchone()
    if not term:
        cur.execute("INSERT INTO settings(key, value) VALUES('debt_term_days', '30')")

    conn.commit()
    conn.close()


# --------------- Business logic: strict allocation ---------------
def allocate_payment_strict(conn, customer_id: int, payment_ledger_id: int, amount: float):
    """
    Allocates a payment across customer's unpaid charges (oldest first).
    Charges are ledger rows with entry_type='charge'. Allocations stored in ledger_allocations.
    """
    cur = conn.cursor()

    # Fetch charges and how much already allocated for each
    charges = cur.execute("""
        SELECT
          l.id AS charge_id,
          l.amount AS charge_amount,
          l.entry_date AS entry_date,
          COALESCE(SUM(a.amount),0) AS allocated
        FROM ledger l
        LEFT JOIN ledger_allocations a ON a.charge_id = l.id
        WHERE l.customer_id=? AND l.entry_type='charge'
        GROUP BY l.id
        ORDER BY l.entry_date ASC, l.id ASC
    """, (customer_id,)).fetchall()

    remaining = float(amount)

    for ch in charges:
        if remaining <= 0:
            break
        due = float(ch["charge_amount"]) - float(ch["allocated"])
        if due <= 0.00001:
            continue

        pay_part = min(due, remaining)
        cur.execute("""
            INSERT INTO ledger_allocations(payment_id, charge_id, amount, created_at)
            VALUES(?,?,?,?)
        """, (payment_ledger_id, ch["charge_id"], pay_part, utc_now()))
        remaining -= pay_part

    # After allocations, update sales.paid strictly for sales charges
    update_sales_paid_flags(conn, customer_id)


def update_sales_paid_flags(conn, customer_id: int):
    """
    Updates sales.paid based on allocations linked to charges that reference sales.
    A sale is paid if its related charge is fully allocated.
    """
    cur = conn.cursor()

    # Charges tied to sales (ref_type='sale')
    sale_charges = cur.execute("""
        SELECT l.id AS charge_id, l.ref_id AS sale_id, l.amount AS charge_amount,
               COALESCE(SUM(a.amount),0) AS allocated
        FROM ledger l
        LEFT JOIN ledger_allocations a ON a.charge_id = l.id
        WHERE l.customer_id=? AND l.entry_type='charge' AND l.ref_type='sale' AND l.ref_id IS NOT NULL
        GROUP BY l.id
    """, (customer_id,)).fetchall()

    # For each sale, set paid based on charge allocation
    for r in sale_charges:
        sale_id = int(r["sale_id"])
        due = float(r["charge_amount"]) - float(r["allocated"])
        is_paid = 1 if due <= 0.00001 else 0
        cur.execute("UPDATE sales SET paid=? WHERE id=?", (is_paid, sale_id))


def customer_balance(conn, customer_id: int):
    cur = conn.cursor()
    row = cur.execute("""
        SELECT
          COALESCE(SUM(CASE WHEN entry_type='charge' THEN amount END),0) AS charges,
          COALESCE(SUM(CASE WHEN entry_type='payment' THEN amount END),0) AS payments
        FROM ledger
        WHERE customer_id=?
    """, (customer_id,)).fetchone()
    charges = float(row["charges"])
    payments = float(row["payments"])
    return round(charges - payments, 2), charges, payments


# ---------------- Static: index, assets, favicon ----------------
@app.get("/")
def root():
    return send_from_directory("public", "index.html")


@app.get("/index.html")
def root2():
    return send_from_directory("public", "index.html")


@app.get("/landing.html")
def landing():
    return send_from_directory("public", "landing.html")


@app.get("/assets/<path:filename>")
def assets(filename):
    return send_from_directory("public/assets", filename)


@app.get("/favicon.ico")
def favicon():
    return send_from_directory("public", "favicon.ico")


# ---------------- API: Transactions ----------------
@app.get("/api/transactions")
def get_transactions():
    date_from = request.args.get("from")
    date_to = request.args.get("to")
    
    conn = db()
    where = ""
    params = []
    
    if date_from and date_to:
        try:
            datetime.strptime(date_from, "%Y-%m-%d")
            datetime.strptime(date_to, "%Y-%m-%d")
            where = "WHERE tx_date BETWEEN ? AND ?"
            params = [date_from, date_to]
        except:
            return jsonify({"error": "from/to inválidos (YYYY-MM-DD)"}), 400

    rows = conn.execute(f"""
        SELECT id, kind, amount, tx_date AS date, category, note, created_at, ref_type, ref_id
        FROM transactions
        {where}
        ORDER BY tx_date DESC, id DESC
    """, params).fetchall()
    conn.close()
    return jsonify({"transactions": [dict(r) for r in rows]})


@app.post("/api/transactions")
def post_transaction():
    p = request.get_json(silent=True) or {}
    for k in ("kind", "amount", "date"):
        if k not in p:
            return jsonify({"error": "Faltan campos: kind, amount, date"}), 400

    if p["kind"] not in ("income", "expense"):
        return jsonify({"error": "kind debe ser income o expense"}), 400

    try:
        amount = float(p["amount"])
        if amount <= 0:
            raise ValueError()
    except:
        return jsonify({"error": "amount debe ser número > 0"}), 400

    try:
        datetime.strptime(p["date"], "%Y-%m-%d")
    except:
        return jsonify({"error": "date debe ser YYYY-MM-DD"}), 400

    category = (p.get("category") or "").strip()
    note = (p.get("note") or "").strip()

    conn = db()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO transactions(kind, amount, tx_date, category, note, created_at, ref_type, ref_id)
        VALUES(?,?,?,?,?,?,?,?)
    """, (p["kind"], amount, p["date"], category, note, utc_now(), p.get("ref_type"), p.get("ref_id")))
    conn.commit()
    new_id = cur.lastrowid
    conn.close()
    return jsonify({"ok": True, "id": new_id}), 201


@app.delete("/api/transactions")
def delete_transaction():
    tid = request.args.get("id")
    if not tid:
        return jsonify({"error": "id requerido"}), 400
    try:
        tx_id = int(tid)
    except:
        return jsonify({"error": "id inválido"}), 400

    conn = db()
    cur = conn.cursor()
    row = cur.execute("SELECT id FROM transactions WHERE id=?", (tx_id,)).fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "No existe ese movimiento"}), 404

    cur.execute("DELETE FROM transactions WHERE id=?", (tx_id,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "deleted_id": tx_id})


# ---------------- API: Products ----------------
@app.get("/api/products")
def get_products():
    conn = db()
    rows = conn.execute("""
        SELECT id, name, sku, price, active, created_at
        FROM products
        ORDER BY active DESC, name ASC
    """).fetchall()
    conn.close()
    return jsonify({"products": [dict(r) for r in rows]})


@app.post("/api/products")
def post_product():
    p = request.get_json(silent=True) or {}
    name = (p.get("name") or "").strip()
    sku = (p.get("sku") or "").strip()

    try:
        price = float(p.get("price", 0))
        if price <= 0:
            raise ValueError()
    except:
        return jsonify({"error": "price debe ser número > 0"}), 400

    if not name:
        return jsonify({"error": "name es requerido"}), 400

    conn = db()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO products(name, sku, price, active, created_at)
        VALUES(?,?,?,?,?)
    """, (name, sku, price, 1, utc_now()))
    conn.commit()
    new_id = cur.lastrowid
    conn.close()
    return jsonify({"ok": True, "id": new_id}), 201


# ---------------- API: Customers ----------------
@app.get("/api/customers")
def get_customers():
    conn = db()
    rows = conn.execute("""
        SELECT id, name, phone, address, active, created_at
        FROM customers
        ORDER BY active DESC, name ASC
    """).fetchall()
    conn.close()
    return jsonify({"customers": [dict(r) for r in rows]})


@app.post("/api/customers")
def post_customer():
    p = request.get_json(silent=True) or {}
    name = (p.get("name") or "").strip()
    phone = (p.get("phone") or "").strip()
    address = (p.get("address") or "").strip()

    if not name:
        return jsonify({"error": "name es requerido"}), 400

    conn = db()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO customers(name, phone, address, active, created_at)
        VALUES(?,?,?,?,?)
    """, (name, phone, address, 1, utc_now()))
    conn.commit()
    new_id = cur.lastrowid
    conn.close()
    return jsonify({"ok": True, "id": new_id, "customer": {"id": new_id, "name": name, "phone": phone, "address": address, "active": 1, "created_at": utc_now(), "balance": 0}}), 201


@app.put("/api/customers")
def update_customer():
    cid = request.args.get("id")
    if not cid:
        return jsonify({"error": "id requerido"}), 400
    try:
        customer_id = int(cid)
    except:
        return jsonify({"error": "id inválido"}), 400

    p = request.get_json(silent=True) or {}

    conn = db()
    cur = conn.cursor()

    exists = cur.execute("SELECT id FROM customers WHERE id=?", (customer_id,)).fetchone()
    if not exists:
        conn.close()
        return jsonify({"error": "Cliente no existe"}), 404

    sets = []
    params = []

    if "name" in p:
        name = (p.get("name") or "").strip()
        if not name:
            conn.close()
            return jsonify({"error": "name no puede estar vacío"}), 400
        sets.append("name=?"); params.append(name)

    if "phone" in p:
        phone = (p.get("phone") or "").strip()
        sets.append("phone=?"); params.append(phone)

    if "address" in p:
        address = (p.get("address") or "").strip()
        sets.append("address=?"); params.append(address)

    if "active" in p:
        sets.append("active=?"); params.append(1 if bool(p.get("active")) else 0)

    if not sets:
        conn.close()
        return jsonify({"error": "No hay campos para actualizar"}), 400

    params.append(customer_id)
    cur.execute(f"UPDATE customers SET {', '.join(sets)} WHERE id=?", params)
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "updated_id": customer_id})


@app.delete("/api/customers")
def delete_customer():
    cid = request.args.get("id")
    if not cid:
        return jsonify({"error": "id requerido"}), 400
    try:
        customer_id = int(cid)
    except:
        return jsonify({"error": "id inválido"}), 400

    conn = db()
    cur = conn.cursor()

    exists = cur.execute("SELECT id FROM customers WHERE id=?", (customer_id,)).fetchone()
    if not exists:
        conn.close()
        return jsonify({"error": "Cliente no existe"}), 404

    # Check dependencies (sales, ledger)
    has_sales = cur.execute("SELECT id FROM sales WHERE customer_id=?", (customer_id,)).fetchone()
    has_ledger = cur.execute("SELECT id FROM ledger WHERE customer_id=?", (customer_id,)).fetchone()

    if has_sales or has_ledger:
        # Soft delete
        cur.execute("UPDATE customers SET active=0 WHERE id=?", (customer_id,))
        conn.commit()
        conn.close()
        return jsonify({"ok": True, "deleted_id": customer_id, "message": "Cliente desactivado por tener registros asociados"})

    cur.execute("DELETE FROM customers WHERE id=?", (customer_id,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "deleted_id": customer_id})


@app.get("/api/customers_with_balance")
def get_customers_with_balance():
    conn = db()
    
    # 1. Get basic balance info
    rows = conn.execute("""
        SELECT
          c.id, c.name, c.phone, c.address, c.active,
          COALESCE(SUM(CASE WHEN l.entry_type='charge' THEN l.amount END),0) AS charges,
          COALESCE(SUM(CASE WHEN l.entry_type='payment' THEN l.amount END),0) AS payments
        FROM customers c
        LEFT JOIN ledger l ON l.customer_id = c.id
        GROUP BY c.id
        ORDER BY c.active DESC, (charges - payments) DESC, c.name ASC
    """).fetchall()

    # 2. Get unpaid charges info for calculating oldest_due_date
    unpaid_charges = conn.execute("""
        SELECT
            l.customer_id,
            l.entry_date
        FROM ledger l
        LEFT JOIN ledger_allocations a ON a.charge_id = l.id
        WHERE l.entry_type = 'charge'
        GROUP BY l.id
        HAVING (l.amount - COALESCE(SUM(a.amount), 0)) > 0.00001
        ORDER BY l.entry_date ASC
    """).fetchall()

    # Map customer_id -> oldest_due_date
    oldest_dates = {}
    for uc in unpaid_charges:
        cid = uc["customer_id"]
        if cid not in oldest_dates:
            oldest_dates[cid] = uc["entry_date"]

    # 3. Get debt term setting
    term_row = conn.execute("SELECT value FROM settings WHERE key='debt_term_days'").fetchone()
    term_days = int(term_row["value"]) if term_row else 30

    out = []
    now = datetime.utcnow()
    
    for r in rows:
        bal = float(r["charges"]) - float(r["payments"])
        cid = r["id"]
        oldest_date = oldest_dates.get(cid)
        
        days_since_oldest = 0
        is_overdue = False
        
        if oldest_date and bal > 0.00001:
            try:
                d = datetime.strptime(oldest_date, "%Y-%m-%d")
                delta = now - d
                days_since_oldest = delta.days
                if days_since_oldest > term_days:
                    is_overdue = True
            except:
                pass

        out.append({
            "id": r["id"],
            "name": r["name"],
            "phone": r["phone"],
            "address": r["address"],
            "active": r["active"],
            "charges": float(r["charges"]),
            "payments": float(r["payments"]),
            "balance": round(bal, 2),
            "status": "PAZ_Y_SALVO" if bal <= 0.00001 else "DEBE",
            "oldest_due_date": oldest_date,
            "days_since_oldest": days_since_oldest,
            "is_overdue": is_overdue
        })
    conn.close()
    return jsonify({"customers": out, "term_days": term_days})


# ---------------- API: Ledger ----------------
@app.get("/api/ledger")
def get_ledger():
    cid = request.args.get("customer_id")
    if not cid:
        return jsonify({"error": "customer_id requerido"}), 400
    try:
        customer_id = int(cid)
    except:
        return jsonify({"error": "customer_id inválido"}), 400

    conn = db()
    rows = conn.execute("""
        SELECT id, customer_id, entry_type, amount, entry_date, note, ref_type, ref_id, created_at
        FROM ledger
        WHERE customer_id=?
        ORDER BY entry_date DESC, id DESC
        LIMIT 200
    """, (customer_id,)).fetchall()
    conn.close()
    return jsonify({"ledger": [dict(r) for r in rows]})


@app.post("/api/ledger")
def post_ledger():
    p = request.get_json(silent=True) or {}

    for k in ("customer_id", "entry_type", "amount", "entry_date"):
        if k not in p:
            return jsonify({"error": "Faltan campos: customer_id, entry_type, amount, entry_date"}), 400

    try:
        customer_id = int(p["customer_id"])
    except:
        return jsonify({"error": "customer_id inválido"}), 400

    entry_type = p["entry_type"]
    if entry_type not in ("charge", "payment"):
        return jsonify({"error": "entry_type debe ser charge o payment"}), 400

    try:
        amount = float(p["amount"])
        if amount <= 0:
            raise ValueError()
    except:
        return jsonify({"error": "amount debe ser número > 0"}), 400

    try:
        datetime.strptime(p["entry_date"], "%Y-%m-%d")
    except:
        return jsonify({"error": "entry_date debe ser YYYY-MM-DD"}), 400

    note = (p.get("note") or "").strip()
    ref_type = (p.get("ref_type") or "manual").strip()
    ref_id = p.get("ref_id", None)

    conn = db()
    cur = conn.cursor()

    c = cur.execute("SELECT id FROM customers WHERE id=? AND active=1", (customer_id,)).fetchone()
    if not c:
        conn.close()
        return jsonify({"error": "Cliente no existe o está inactivo"}), 400

    cur.execute("""
        INSERT INTO ledger(customer_id, entry_type, amount, entry_date, note, ref_type, ref_id, created_at)
        VALUES(?,?,?,?,?,?,?,?)
    """, (customer_id, entry_type, amount, p["entry_date"], note, ref_type, ref_id, utc_now()))
    ledger_id = cur.lastrowid

    # Strict allocation if payment
    if entry_type == "payment":
        allocate_payment_strict(conn, customer_id, ledger_id, amount)

    conn.commit()
    conn.close()
    return jsonify({"ok": True, "id": ledger_id}), 201


@app.delete("/api/ledger")
def delete_ledger():
    lid = request.args.get("id")
    if not lid:
        return jsonify({"error": "id requerido"}), 400
    try:
        ledger_id = int(lid)
    except:
        return jsonify({"error": "id inválido"}), 400

    conn = db()
    cur = conn.cursor()
    row = cur.execute("SELECT id, customer_id, entry_type FROM ledger WHERE id=?", (ledger_id,)).fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "No existe ese pago/cargo"}), 404

    customer_id = int(row["customer_id"])
    entry_type = row["entry_type"]

    # Remove allocations involving this ledger row
    if entry_type == "payment":
        cur.execute("DELETE FROM ledger_allocations WHERE payment_id=?", (ledger_id,))
    if entry_type == "charge":
        cur.execute("DELETE FROM ledger_allocations WHERE charge_id=?", (ledger_id,))

    cur.execute("DELETE FROM ledger WHERE id=?", (ledger_id,))

    # Recompute paid flags
    update_sales_paid_flags(conn, customer_id)

    conn.commit()
    conn.close()
    return jsonify({"ok": True, "deleted_id": ledger_id})


# ---------------- API: Sales ----------------
@app.get("/api/sales")
def get_sales():
    conn = db()
    rows = conn.execute("""
        SELECT
          s.id, s.sale_date, s.product_id, p.name AS product_name,
          s.qty, s.unit_price, s.total, s.note, s.created_at,
          s.customer_id, s.paid,
          c.name AS customer_name
        FROM sales s
        JOIN products p ON p.id = s.product_id
        LEFT JOIN customers c ON c.id = s.customer_id
        ORDER BY s.sale_date DESC, s.id DESC
    """).fetchall()
    conn.close()
    return jsonify({"sales": [dict(r) for r in rows]})


@app.post("/api/sales")
def post_sale():
    p = request.get_json(silent=True) or {}

    for k in ("sale_date", "product_id", "qty"):
        if k not in p:
            return jsonify({"error": "Faltan campos: sale_date, product_id, qty"}), 400

    try:
        datetime.strptime(p["sale_date"], "%Y-%m-%d")
    except:
        return jsonify({"error": "sale_date debe ser YYYY-MM-DD"}), 400

    try:
        product_id = int(p["product_id"])
        qty = int(p["qty"])
        if qty < 1:
            raise ValueError()
    except:
        return jsonify({"error": "product_id y qty deben ser enteros (qty>=1)"}), 400

    note = (p.get("note") or "").strip()

    paid = 1 if bool(p.get("paid", True)) else 0

    customer_id = p.get("customer_id", None)
    if customer_id in ("", None):
        customer_id = None
    else:
        try:
            customer_id = int(customer_id)
        except:
            return jsonify({"error": "customer_id inválido"}), 400

    if paid == 0 and not customer_id:
        return jsonify({"error": "Si no pagó, debes seleccionar un cliente"}), 400

    conn = db()
    cur = conn.cursor()

    prod = cur.execute("SELECT id, name, price FROM products WHERE id=? AND active=1", (product_id,)).fetchone()
    if not prod:
        conn.close()
        return jsonify({"error": "Producto no existe o está inactivo"}), 400

    if customer_id:
        cust = cur.execute("SELECT id FROM customers WHERE id=? AND active=1", (customer_id,)).fetchone()
        if not cust:
            conn.close()
            return jsonify({"error": "Cliente no existe o está inactivo"}), 400

    unit_price = float(prod["price"])
    total = round(unit_price * qty, 2)

    cur.execute("""
        INSERT INTO sales(sale_date, product_id, qty, unit_price, total, note, created_at, customer_id, paid)
        VALUES(?,?,?,?,?,?,?,?,?)
    """, (p["sale_date"], product_id, qty, unit_price, total, note, utc_now(), customer_id, paid))
    sale_id = cur.lastrowid

    # Ingreso automático ligado a venta
    cur.execute("""
        INSERT INTO transactions(kind, amount, tx_date, category, note, created_at, ref_type, ref_id)
        VALUES('income', ?, ?, 'Ventas', ?, ?, 'sale', ?)
    """, (total, p["sale_date"], f"Venta: {prod['name']} x{qty}. {note}".strip(), utc_now(), sale_id))

    # Si no pagó: cargo (charge) ligado a la venta
    if paid == 0 and customer_id:
        cur.execute("""
            INSERT INTO ledger(customer_id, entry_type, amount, entry_date, note, ref_type, ref_id, created_at)
            VALUES(?,?,?,?,?,?,?,?)
        """, (
            customer_id, "charge", total, p["sale_date"],
            f"Venta fiada: {prod['name']} x{qty}. {note}".strip(),
            "sale", sale_id, utc_now()
        ))
        # Sales paid flag should be 0
        cur.execute("UPDATE sales SET paid=0 WHERE id=?", (sale_id,))

    conn.commit()
    conn.close()
    return jsonify({"ok": True, "id": sale_id, "total": total}), 201


@app.delete("/api/sales")
def delete_sale():
    sid = request.args.get("id")
    if not sid:
        return jsonify({"error": "id requerido"}), 400
    try:
        sale_id = int(sid)
    except:
        return jsonify({"error": "id inválido"}), 400

    conn = db()
    cur = conn.cursor()

    sale = cur.execute("SELECT id, customer_id FROM sales WHERE id=?", (sale_id,)).fetchone()
    if not sale:
        conn.close()
        return jsonify({"error": "No existe esa venta"}), 404

    customer_id = sale["customer_id"]

    # Borra cargo en ledger ligado a la venta y sus allocations
    charge_rows = cur.execute("""
        SELECT id FROM ledger
        WHERE ref_type='sale' AND ref_id=? AND entry_type='charge'
    """, (sale_id,)).fetchall()

    for ch in charge_rows:
        cur.execute("DELETE FROM ledger_allocations WHERE charge_id=?", (ch["id"],))
        cur.execute("DELETE FROM ledger WHERE id=?", (ch["id"],))

    # Borra ingreso automático ligado a la venta
    cur.execute("DELETE FROM transactions WHERE ref_type='sale' AND ref_id=?", (sale_id,))

    # Borra venta
    cur.execute("DELETE FROM sales WHERE id=?", (sale_id,))

    # Recalcular paid flags del cliente (si aplica)
    if customer_id:
        update_sales_paid_flags(conn, int(customer_id))

    conn.commit()
    conn.close()
    return jsonify({"ok": True, "deleted_id": sale_id})


# ---------------- API: Summary ----------------
@app.get("/api/summary")
def get_summary():
    date_from = request.args.get("from")
    date_to = request.args.get("to")

    def valid_iso(d):
        if not d:
            return None
        datetime.strptime(d, "%Y-%m-%d")
        return d

    try:
        date_from = valid_iso(date_from)
        date_to = valid_iso(date_to)
    except:
        return jsonify({"error": "from/to inválidos, usa YYYY-MM-DD"}), 400

    conn = db()
    params = []
    where = ""
    if date_from and date_to:
        where = "WHERE tx_date BETWEEN ? AND ?"
        params = [date_from, date_to]

    row = conn.execute(f"""
        SELECT
          COALESCE(SUM(CASE WHEN kind='income' THEN amount END),0) AS income,
          COALESCE(SUM(CASE WHEN kind='expense' THEN amount END),0) AS expense
        FROM transactions
        {where}
    """, params).fetchone()

    income = float(row["income"])
    expense = float(row["expense"])
    balance = income - expense

    where2, params2 = "", []
    if date_from and date_to:
        where2 = "WHERE sale_date BETWEEN ? AND ?"
        params2 = [date_from, date_to]

    sales_by_month = conn.execute(f"""
        SELECT substr(sale_date,1,7) AS ym, COALESCE(SUM(total),0) AS total
        FROM sales
        {where2}
        GROUP BY ym
        ORDER BY ym DESC
        LIMIT 12
    """, params2).fetchall()

    conn.close()

    return jsonify({
        "range": {"from": date_from, "to": date_to},
        "totals": {"income": income, "expense": expense, "balance": balance},
        "sales_by_month": [dict(r) for r in sales_by_month]
    })


# ---------------- API: Settings ----------------
@app.get("/api/settings")
def get_settings():
    conn = db()
    rows = conn.execute("SELECT key, value FROM settings").fetchall()
    conn.close()
    
    settings = {row["key"]: row["value"] for row in rows}
    return jsonify(settings)

# ---------------- API: Businesses (Mock for Single Tenant) ----------------
@app.get("/api/businesses")
def get_businesses():
    # Return a default single business to satisfy the frontend
    return jsonify({
        "businesses": [
            {
                "id": 1,
                "user_id": 1,
                "name": "Mi Negocio",
                "currency": "COP",
                "created_at": utc_now()
            }
        ]
    })

@app.put("/api/settings")
def update_settings():
    p = request.get_json(silent=True) or {}
    conn = db()
    cur = conn.cursor()
    
    for key, value in p.items():
        # Insert or replace
        cur.execute("INSERT OR REPLACE INTO settings(key, value) VALUES(?, ?)", (str(key), str(value)))
        
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


# ---------------- Export Excel ----------------
@app.get("/export.xlsx")
def export_xlsx():
    date_from = request.args.get("from")
    date_to = request.args.get("to")

    try:
        if date_from:
            datetime.strptime(date_from, "%Y-%m-%d")
        if date_to:
            datetime.strptime(date_to, "%Y-%m-%d")
    except:
        return jsonify({"error": "from/to inválidos (YYYY-MM-DD)"}), 400

    conn = db()

    def between_clause(col):
        if date_from and date_to:
            return f"WHERE {col} BETWEEN ? AND ?", [date_from, date_to]
        return "", []

    tx_where, tx_params = between_clause("tx_date")
    sales_where, sales_params = between_clause("sale_date")
    led_where, led_params = between_clause("entry_date")

    txs = conn.execute(f"""
        SELECT id, kind, amount, tx_date, category, note, created_at, ref_type, ref_id
        FROM transactions {tx_where}
        ORDER BY tx_date ASC, id ASC
    """, tx_params).fetchall()

    sales = conn.execute(f"""
        SELECT s.id, s.sale_date, p.name AS product, s.qty, s.unit_price, s.total,
               s.paid, c.name AS customer, s.note, s.created_at
        FROM sales s
        JOIN products p ON p.id=s.product_id
        LEFT JOIN customers c ON c.id=s.customer_id
        {sales_where}
        ORDER BY s.sale_date ASC, s.id ASC
    """, sales_params).fetchall()

    customers = conn.execute("""
        SELECT id, name, phone, address, active, created_at
        FROM customers
        ORDER BY name ASC
    """).fetchall()

    ledger = conn.execute(f"""
        SELECT l.id, c.name AS customer, l.entry_type, l.amount, l.entry_date, l.note, l.ref_type, l.ref_id, l.created_at
        FROM ledger l JOIN customers c ON c.id=l.customer_id
        {led_where}
        ORDER BY l.entry_date ASC, l.id ASC
    """, led_params).fetchall()

    conn.close()

    wb = Workbook()
    wb.remove(wb.active)

    def make_sheet(name, headers, rows, mapper):
        ws = wb.create_sheet(title=name)
        ws.append(headers)
        for r in rows:
            ws.append(mapper(r))

    make_sheet(
        "Ventas",
        ["id","fecha","producto","qty","precio_unit","total","pagó","cliente","nota","created_at"],
        sales,
        lambda r: [r["id"], r["sale_date"], r["product"], r["qty"], r["unit_price"], r["total"],
                   "SI" if r["paid"] == 1 else "NO", r["customer"], r["note"], r["created_at"]]
    )

    make_sheet(
        "Movimientos",
        ["id","tipo","monto","fecha","categoria","nota","ref_type","ref_id","created_at"],
        txs,
        lambda r: [r["id"], r["kind"], r["amount"], r["tx_date"], r["category"], r["note"], r["ref_type"], r["ref_id"], r["created_at"]]
    )

    make_sheet(
        "Clientes",
        ["id","nombre","telefono","direccion","activo","created_at"],
        customers,
        lambda r: [r["id"], r["name"], r["phone"], r["address"], r["active"], r["created_at"]]
    )

    make_sheet(
        "Cartera_Ledger",
        ["id","cliente","tipo","monto","fecha","nota","ref_type","ref_id","created_at"],
        ledger,
        lambda r: [r["id"], r["customer"], r["entry_type"], r["amount"], r["entry_date"], r["note"], r["ref_type"], r["ref_id"], r["created_at"]]
    )

    bio = BytesIO()
    wb.save(bio)
    data = bio.getvalue()

    fname = "cuaderno_export.xlsx" if not (date_from and date_to) else f"cuaderno_{date_from}_a_{date_to}.xlsx"
    return (
        data,
        200,
        {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": f'attachment; filename="{fname}"'
        }
    )


if __name__ == "__main__":
    init_db_and_seed()
    host, port = "127.0.0.1", 8001
    print(f"✅ App:  http://{host}:{port}/")
    print(f"✅ Export: http://{host}:{port}/export.xlsx?from=YYYY-MM-DD&to=YYYY-MM-DD")
    port = int(os.environ.get("PORT", 8001))
    app.run(host="0.0.0.0", port=port, debug=False)
