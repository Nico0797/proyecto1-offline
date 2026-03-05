# Cuaderno - Modelos de Datos
# ============================================
"""
Modelos SQLAlchemy para la base de datos
"""
from datetime import datetime
from backend.database import db
import bcrypt


class User(db.Model):
    """Usuario de la aplicación"""
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    plan = db.Column(db.String(20), default="free")  # free | pro
    is_admin = db.Column(db.Boolean, default=False)  # Admin flag
    email_verified = db.Column(db.Boolean, default=False)
    email_verification_code = db.Column(db.String(20))
    email_verification_expires = db.Column(db.DateTime)
    reset_password_code = db.Column(db.String(20))
    reset_password_expires = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    # RBAC fields
    last_login = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)
    membership_plan = db.Column(db.String(20))
    membership_start = db.Column(db.DateTime)
    membership_end = db.Column(db.DateTime)
    membership_auto_renew = db.Column(db.Boolean, default=True)

    # Relationships
    businesses = db.relationship("Business", backref="user", lazy="dynamic", cascade="all, delete-orphan")
    roles = db.relationship(
        "UserRole", 
        back_populates="user", 
        cascade="all, delete-orphan",
        foreign_keys="UserRole.user_id"
    )
    audit_logs = db.relationship("AuditLog", back_populates="user", lazy="dynamic")

    def set_password(self, password):
        """Hashear password"""
        self.password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    def check_password(self, password):
        """Verificar password"""
        return bcrypt.checkpw(password.encode("utf-8"), self.password_hash.encode("utf-8"))

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "plan": self.plan,
            "is_admin": self.is_admin,
            "email_verified": self.email_verified,
            "last_login": self.last_login.isoformat() if self.last_login else None,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "membership_plan": self.membership_plan,
            "membership_start": self.membership_start.isoformat() if self.membership_start else None,
            "membership_end": self.membership_end.isoformat() if self.membership_end else None,
            "membership_auto_renew": self.membership_auto_renew,
        }

    def __repr__(self):
        return f"<User {self.email}>"


class Business(db.Model):
    """Negocio"""
    __tablename__ = "businesses"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    currency = db.Column(db.String(10), default="COP")
    timezone = db.Column(db.String(50), default="America/Bogota")
    monthly_sales_goal = db.Column(db.Float, default=0)
    whatsapp_templates = db.Column(db.JSON, default={})
    settings = db.Column(db.JSON, default={})
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    products = db.relationship("Product", backref="business", lazy="dynamic", cascade="all, delete-orphan")
    customers = db.relationship("Customer", backref="business", lazy="dynamic", cascade="all, delete-orphan")
    sales = db.relationship("Sale", backref="business", lazy="dynamic", cascade="all, delete-orphan")
    expenses = db.relationship("Expense", backref="business", lazy="dynamic", cascade="all, delete-orphan")
    payments = db.relationship("Payment", backref="business", lazy="dynamic", cascade="all, delete-orphan")
    ledger_entries = db.relationship("LedgerEntry", backref="business", lazy="dynamic", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "currency": self.currency,
            "timezone": self.timezone,
            "monthly_sales_goal": self.monthly_sales_goal,
            "whatsapp_templates": self.whatsapp_templates,
            "settings": self.settings,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<Business {self.name}>"


class Product(db.Model):
    """Producto o servicio"""
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    type = db.Column(db.String(20), default="product")  # product, service
    sku = db.Column(db.String(50))
    price = db.Column(db.Float, nullable=False)
    cost = db.Column(db.Float)  # Costo para calcular utilidad
    unit = db.Column(db.String(50), default="und")  # und, kg, lt, hr, etc.
    stock = db.Column(db.Float, default=0)  # Cantidad en inventario
    low_stock_threshold = db.Column(db.Float, default=5)  # Alerta cuando stock <= este valor
    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "business_id": self.business_id,
            "name": self.name,
            "description": self.description,
            "type": self.type,
            "sku": self.sku,
            "price": self.price,
            "cost": self.cost,
            "unit": self.unit,
            "stock": self.stock,
            "low_stock_threshold": self.low_stock_threshold,
            "active": self.active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<Product {self.name}>"


class Customer(db.Model):
    """Cliente"""
    __tablename__ = "customers"

    id = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(50))
    address = db.Column(db.Text)
    notes = db.Column(db.Text)
    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    sales = db.relationship("Sale", backref="customer", lazy="dynamic")
    payments = db.relationship("Payment", backref="customer", lazy="dynamic")
    ledger_entries = db.relationship("LedgerEntry", backref="customer", lazy="dynamic")

    def to_dict(self):
        return {
            "id": self.id,
            "business_id": self.business_id,
            "name": self.name,
            "phone": self.phone,
            "address": self.address,
            "notes": self.notes,
            "active": self.active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<Customer {self.name}>"


class Sale(db.Model):
    """Venta"""
    __tablename__ = "sales"

    id = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=False, index=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("customers.id"), index=True)
    sale_date = db.Column(db.Date, nullable=False)
    items = db.Column(db.JSON, nullable=False)  # [{product_id, name, qty, unit_price, total}]
    subtotal = db.Column(db.Float, nullable=False)
    discount = db.Column(db.Float, default=0)
    total = db.Column(db.Float, nullable=False)
    balance = db.Column(db.Float, default=0)  # Saldo pendiente para ventas fiadas
    total_cost = db.Column(db.Float, default=0)  # Costo total de la venta (para reportes rápidos)
    payment_method = db.Column(db.String(20), default="cash")  # cash, transfer, credit
    paid = db.Column(db.Boolean, default=True)  # True = pagado, False = fiado
    note = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    payments = db.relationship("Payment", backref="sale", lazy="dynamic")

    def to_dict(self):
        return {
            "id": self.id,
            "business_id": self.business_id,
            "customer_id": self.customer_id,
            "sale_date": self.sale_date.isoformat() if self.sale_date else None,
            "items": self.items,
            "subtotal": self.subtotal,
            "discount": self.discount,
            "total": self.total,
            "balance": self.balance,
            "total_cost": self.total_cost,
            "payment_method": self.payment_method,
            "paid": self.paid,
            "note": self.note,
            "customer_name": self.customer.name if self.customer else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<Sale {self.id} - {self.total}>"


class Expense(db.Model):
    """Gasto"""
    __tablename__ = "expenses"

    id = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=False, index=True)
    expense_date = db.Column(db.Date, nullable=False)
    category = db.Column(db.String(100), nullable=False)  # servicios, inventario, mantenimiento, etc.
    amount = db.Column(db.Float, nullable=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "business_id": self.business_id,
            "expense_date": self.expense_date.isoformat() if self.expense_date else None,
            "category": self.category,
            "amount": self.amount,
            "description": self.description,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<Expense {self.category} - {self.amount}>"


class RecurringExpense(db.Model):
    """Gasto recurrente"""
    __tablename__ = "recurring_expenses"

    id = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    amount = db.Column(db.Float, nullable=False, default=0)
    due_day = db.Column(db.Integer, nullable=False)  # 1-31 (Keep for reference)
    frequency = db.Column(db.String(20), default='monthly') # monthly, weekly, biweekly, annual
    next_due_date = db.Column(db.Date) # Specific date for next alert
    category = db.Column(db.String(100))
    is_active = db.Column(db.Boolean, default=True, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "business_id": self.business_id,
            "name": self.name,
            "amount": self.amount,
            "due_day": self.due_day,
            "frequency": self.frequency,
            "next_due_date": self.next_due_date.isoformat() if self.next_due_date else None,
            "category": self.category,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<RecurringExpense {self.name} - {self.amount}>"


class QuickNote(db.Model):
    """Nota rápida"""
    __tablename__ = "quick_notes"

    id = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=False, index=True)
    note = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "business_id": self.business_id,
            "note": self.note,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<QuickNote {self.id}>"


class SalesGoal(db.Model):
    """Metas de Ventas"""
    __tablename__ = "sales_goals"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    target_amount = db.Column(db.Float, nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(20), default="active")  # active, achieved, archived
    achieved_at = db.Column(db.DateTime)
    congrats_archived = db.Column(db.Boolean, default=False)
    last_congrats_seen_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "business_id": self.business_id,
            "title": self.title,
            "description": self.description,
            "target_amount": self.target_amount,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "status": self.status,
            "achieved_at": self.achieved_at.isoformat() if self.achieved_at else None,
            "congrats_archived": self.congrats_archived,
            "last_congrats_seen_at": self.last_congrats_seen_at.isoformat() if self.last_congrats_seen_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Payment(db.Model):
    """Pago/Abono de cliente"""
    __tablename__ = "payments"

    id = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=False, index=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("customers.id"), nullable=False, index=True)
    sale_id = db.Column(db.Integer, db.ForeignKey("sales.id"), index=True)
    payment_date = db.Column(db.Date, nullable=False)
    amount = db.Column(db.Float, nullable=False)
    method = db.Column(db.String(20), default="cash")  # cash, transfer
    note = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "business_id": self.business_id,
            "customer_id": self.customer_id,
            "sale_id": self.sale_id,
            "payment_date": self.payment_date.isoformat() if self.payment_date else None,
            "amount": self.amount,
            "method": self.method,
            "note": self.note,
            "customer_name": self.customer.name if self.customer else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<Payment {self.amount}>"


class LedgerEntry(db.Model):
    """Entrada del libro mayor (cuentas por cobrar)"""
    __tablename__ = "ledger_entries"

    id = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=False, index=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("customers.id"), nullable=False, index=True)
    entry_type = db.Column(db.String(20), nullable=False)  # charge | payment
    amount = db.Column(db.Float, nullable=False)
    entry_date = db.Column(db.Date, nullable=False)
    note = db.Column(db.Text)
    ref_type = db.Column(db.String(20))  # sale
    ref_id = db.Column(db.Integer)  # sale_id
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    allocations_from = db.relationship(
        "LedgerAllocation",
        foreign_keys="LedgerAllocation.payment_id",
        backref="payment_entry",
        lazy="dynamic"
    )
    allocations_to = db.relationship(
        "LedgerAllocation",
        foreign_keys="LedgerAllocation.charge_id",
        backref="charge_entry",
        lazy="dynamic"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "business_id": self.business_id,
            "customer_id": self.customer_id,
            "entry_type": self.entry_type,
            "amount": self.amount,
            "entry_date": self.entry_date.isoformat() if self.entry_date else None,
            "note": self.note,
            "ref_type": self.ref_type,
            "ref_id": self.ref_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<LedgerEntry {self.entry_type} {self.amount}>"


class LedgerAllocation(db.Model):
    """Asignación de pago a cargo (para cuentas por cobrar)"""
    __tablename__ = "ledger_allocations"

    id = db.Column(db.Integer, primary_key=True)
    payment_id = db.Column(db.Integer, db.ForeignKey("ledger_entries.id"), nullable=False, index=True)
    charge_id = db.Column(db.Integer, db.ForeignKey("ledger_entries.id"), nullable=False, index=True)
    amount = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "payment_id": self.payment_id,
            "charge_id": self.charge_id,
            "amount": self.amount,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<Allocation {self.amount}>"


# ============================================
# RBAC - Modelos de Control de Acceso
# ============================================

class Permission(db.Model):
    """Permiso del sistema"""
    __tablename__ = "permissions"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False, index=True)
    description = db.Column(db.Text)
    category = db.Column(db.String(50))  # admin, products, clients, sales, payments, expenses, summary, export, settings
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    roles = db.relationship("RolePermission", back_populates="permission", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "category": self.category,
        }

    def __repr__(self):
        return f"<Permission {self.name}>"


class Role(db.Model):
    """Rol del sistema"""
    __tablename__ = "roles"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False, index=True)
    description = db.Column(db.Text)
    is_system = db.Column(db.Boolean, default=False)  # Roles del sistema no se pueden eliminar
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    user_roles = db.relationship("UserRole", back_populates="role", cascade="all, delete-orphan")
    permissions = db.relationship("RolePermission", back_populates="role", cascade="all, delete-orphan")

    def to_dict(self):
        # Get permissions names
        perm_names = [rp.permission.name for rp in self.permissions if rp.permission]
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "is_system": self.is_system,
            "permissions": perm_names,
        }

    def __repr__(self):
        return f"<Role {self.name}>"


class UserRole(db.Model):
    """Asociación User-Role"""
    __tablename__ = "user_roles"

    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), primary_key=True)
    role_id = db.Column(db.Integer, db.ForeignKey("roles.id"), primary_key=True)
    assigned_at = db.Column(db.DateTime, default=datetime.utcnow)
    assigned_by = db.Column(db.Integer, db.ForeignKey("users.id"))

    # Relationships - specify foreign_keys to resolve ambiguity
    user = db.relationship("User", back_populates="roles", foreign_keys=[user_id])
    role = db.relationship("Role", back_populates="user_roles")

    def __repr__(self):
        return f"<UserRole user={self.user_id} role={self.role_id}>"


class RolePermission(db.Model):
    """Asociación Role-Permission"""
    __tablename__ = "role_permissions"

    role_id = db.Column(db.Integer, db.ForeignKey("roles.id"), primary_key=True)
    permission_id = db.Column(db.Integer, db.ForeignKey("permissions.id"), primary_key=True)
    granted_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    role = db.relationship("Role", back_populates="permissions")
    permission = db.relationship("Permission", back_populates="roles")

    def __repr__(self):
        return f"<RolePermission role={self.role_id} permission={self.permission_id}>"


class AuditLog(db.Model):
    """Log de auditoría"""
    __tablename__ = "audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), index=True)
    action = db.Column(db.String(50), nullable=False, index=True)  # create, read, update, delete, login, logout
    entity = db.Column(db.String(50), nullable=False, index=True)  # user, role, permission, business, product, etc.
    entity_id = db.Column(db.Integer, index=True)
    old_value = db.Column(db.JSON)
    new_value = db.Column(db.JSON)
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.String(255))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    # Relationships
    user = db.relationship("User", back_populates="audit_logs")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "action": self.action,
            "entity": self.entity,
            "entity_id": self.entity_id,
            "old_value": self.old_value,
            "new_value": self.new_value,
            "ip_address": self.ip_address,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }

    def __repr__(self):
        return f"<AuditLog {self.action} {self.entity}>"


class SubscriptionPayment(db.Model):
    """Pagos de membresías premium (suscripciones)"""
    __tablename__ = "subscription_payments"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    plan = db.Column(db.String(20), nullable=False)  # pro_monthly, pro_annual
    amount = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(10), default="COP")
    payment_method = db.Column(db.String(20))  # nequi, card
    payment_date = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), default="completed")  # pending, completed, failed
    transaction_id = db.Column(db.String(100))  # ID externo de pago
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    user = db.relationship("User", backref=db.backref("subscription_payments", lazy="dynamic"))

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "plan": self.plan,
            "amount": self.amount,
            "currency": self.currency,
            "payment_method": self.payment_method,
            "payment_date": self.payment_date.isoformat() if self.payment_date else None,
            "status": self.status,
            "transaction_id": self.transaction_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<SubscriptionPayment user={self.user_id} plan={self.plan} amount={self.amount}>"


class Order(db.Model):
    """Pedido"""
    __tablename__ = "orders"

    id = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=False, index=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("customers.id"), index=True)
    order_number = db.Column(db.String(50), unique=True, nullable=False)
    status = db.Column(db.String(20), default="pending")  # pending, in_progress, completed, cancelled
    items = db.Column(db.JSON, nullable=False)  # [{product_id, name, qty, unit_price, total}]
    subtotal = db.Column(db.Float, nullable=False)
    discount = db.Column(db.Float, default=0)
    total = db.Column(db.Float, nullable=False)
    notes = db.Column(db.Text)
    order_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    customer = db.relationship("Customer", backref="orders")
    business = db.relationship("Business", backref="orders")

    def to_dict(self):
        return {
            "id": self.id,
            "business_id": self.business_id,
            "customer_id": self.customer_id,
            "order_number": self.order_number,
            "status": self.status,
            "items": self.items,
            "subtotal": self.subtotal,
            "discount": self.discount,
            "total": self.total,
            "notes": self.notes,
            "order_date": self.order_date.isoformat() if self.order_date else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "customer_name": self.customer.name if self.customer else None,
        }

    def __repr__(self):
        return f"<Order {self.order_number}>"


class AppSettings(db.Model):
    """Configuración global de la aplicación"""
    __tablename__ = "app_settings"

    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(50), unique=True, nullable=False, index=True)
    value = db.Column(db.Text)  # JSON string para valores complejos
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "key": self.key,
            "value": self.value,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f"<AppSettings key={self.key}>"


class Banner(db.Model):
    """Banners promocionales"""
    __tablename__ = "banners"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    image_url = db.Column(db.Text, nullable=False)
    link = db.Column(db.Text)
    active = db.Column(db.Boolean, default=True)
    order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "image_url": self.image_url,
            "link": self.link,
            "active": self.active,
            "order": self.order,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<Banner {self.title}>"


class FAQ(db.Model):
    """Preguntas frecuentes"""
    __tablename__ = "faqs"

    id = db.Column(db.Integer, primary_key=True)
    question = db.Column(db.Text, nullable=False)
    answer = db.Column(db.Text, nullable=False)
    active = db.Column(db.Boolean, default=True)
    order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "question": self.question,
            "answer": self.answer,
            "active": self.active,
            "order": self.order,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<FAQ {self.question}>"

