# Cuaderno - Modelos de Datos
# ============================================
"""
Modelos SQLAlchemy para la base de datos
"""
from datetime import datetime, date
from backend.database import db
import bcrypt
import uuid

BUSINESS_MODULE_DEFAULTS = {
    "sales": True,
    "customers": True,
    "products": True,
    "accounts_receivable": True,
    "reports": True,
    "quotes": False,
    "raw_inventory": False,
}

BUSINESS_MODULE_KEYS = tuple(BUSINESS_MODULE_DEFAULTS.keys())

class User(db.Model):
    """Usuario de la aplicación"""
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    # Email is no longer unique globally, but unique per context (personal vs team)
    email = db.Column(db.String(255), nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    
    # Account Isolation Fields
    account_type = db.Column(db.String(20), default="personal")  # personal, team_member
    linked_business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=True)

    plan = db.Column(db.String(20), default="free")  # free | pro
    is_admin = db.Column(db.Boolean, default=False)  # Admin flag
    email_verified = db.Column(db.Boolean, default=False)
    
    # ... rest of fields ...

    # Table arguments for composite constraints
    __table_args__ = (
        # Ensure email is unique for personal accounts
        db.Index('ix_users_email_personal', 'email', unique=True, 
                 postgresql_where=(db.text("account_type = 'personal'")),
                 sqlite_where=(db.text("account_type = 'personal'"))),
        # Ensure email + business is unique for team accounts
        db.Index('ix_users_email_team', 'email', 'linked_business_id', unique=True, 
                 postgresql_where=(db.text("account_type = 'team_member'")),
                 sqlite_where=(db.text("account_type = 'team_member'"))),
    )

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

    wompi_payment_source_id = db.Column(db.String(100))
    wompi_payment_brand = db.Column(db.String(50))
    wompi_payment_last4 = db.Column(db.String(10))

    # Relationships
    businesses = db.relationship(
        "Business", 
        foreign_keys="Business.user_id",
        back_populates="user",
        lazy="dynamic", 
        cascade="all, delete-orphan"
    )
    
    linked_business = db.relationship(
        "Business",
        foreign_keys=[linked_business_id],
        back_populates="linked_team_users"
    )

    roles = db.relationship(
        "UserRole", 
        back_populates="user", 
        cascade="all, delete-orphan",
        foreign_keys="UserRole.user_id"
    )
    audit_logs = db.relationship("AuditLog", back_populates="user", lazy="dynamic", foreign_keys="AuditLog.user_id")

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
            "account_type": self.account_type,
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
    user = db.relationship("User", foreign_keys=[user_id], back_populates="businesses")
    linked_team_users = db.relationship("User", foreign_keys="User.linked_business_id", back_populates="linked_business", lazy="dynamic")
    products = db.relationship("Product", backref="business", lazy="dynamic", cascade="all, delete-orphan")
    recurring_expenses = db.relationship("RecurringExpense", backref="business", lazy="dynamic", cascade="all, delete-orphan")
    quick_notes = db.relationship("QuickNote", backref="business", lazy="dynamic", cascade="all, delete-orphan")
    reminders = db.relationship("Reminder", backref="business", lazy="dynamic", cascade="all, delete-orphan")
    sales_goals = db.relationship("SalesGoal", backref="business", lazy="dynamic", cascade="all, delete-orphan")
    debts = db.relationship("Debt", backref="business", lazy="dynamic", cascade="all, delete-orphan")
    customers = db.relationship("Customer", backref="business", lazy="dynamic", cascade="all, delete-orphan")
    sales = db.relationship("Sale", backref="business", lazy="dynamic", cascade="all, delete-orphan")
    quotes = db.relationship("Quote", backref="business", lazy="dynamic", cascade="all, delete-orphan")
    invoices = db.relationship("Invoice", backref="business", lazy="dynamic", cascade="all, delete-orphan")
    raw_materials = db.relationship("RawMaterial", backref="business", lazy="dynamic", cascade="all, delete-orphan")
    raw_material_movements = db.relationship("RawMaterialMovement", backref="business", lazy="dynamic", cascade="all, delete-orphan")
    suppliers = db.relationship("Supplier", backref="business", lazy="dynamic", cascade="all, delete-orphan")
    raw_purchases = db.relationship("RawPurchase", backref="business", lazy="dynamic", cascade="all, delete-orphan")
    expenses = db.relationship("Expense", backref="business", lazy="dynamic", cascade="all, delete-orphan")
    payments = db.relationship("Payment", backref="business", lazy="dynamic", cascade="all, delete-orphan")
    ledger_entries = db.relationship("LedgerEntry", backref="business", lazy="dynamic", cascade="all, delete-orphan")
    team_members = db.relationship("TeamMember", backref="business", lazy="dynamic", cascade="all, delete-orphan")
    invitations = db.relationship("TeamInvitation", backref="business", lazy="dynamic", cascade="all, delete-orphan")
    modules = db.relationship("BusinessModule", back_populates="business", lazy="dynamic", cascade="all, delete-orphan")
    treasury_accounts = db.relationship("TreasuryAccount", backref="business", lazy="dynamic", cascade="all, delete-orphan")
    treasury_transfers = db.relationship("TreasuryTransfer", backref="business", lazy="dynamic", cascade="all, delete-orphan")
    invoice_settings = db.relationship("InvoiceSettings", backref="business", uselist=False, cascade="all, delete-orphan")

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
            "plan": self.user.plan if self.user else "free", # Inherit plan from owner
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<Business {self.name}>"


class BusinessModule(db.Model):
    __tablename__ = "business_modules"
    __table_args__ = (
        db.UniqueConstraint("business_id", "module_key", name="uq_business_modules_business_module_key"),
    )

    id = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=False, index=True)
    module_key = db.Column(db.String(50), nullable=False, index=True)
    enabled = db.Column(db.Boolean, nullable=False, default=True)
    config = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    business = db.relationship("Business", back_populates="modules")

    def to_dict(self):
        return {
            "id": self.id,
            "business_id": self.business_id,
            "module_key": self.module_key,
            "enabled": self.enabled,
            "config": self.config,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f"<BusinessModule {self.business_id}:{self.module_key}={self.enabled}>"


class TreasuryAccount(db.Model):
    __tablename__ = "treasury_accounts"
    __table_args__ = (
        db.UniqueConstraint("business_id", "payment_method_key", name="uq_treasury_accounts_business_payment_method_key"),
    )

    id = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    account_type = db.Column(db.String(30), nullable=False, default="cash", index=True)
    payment_method_key = db.Column(db.String(50), index=True)
    currency = db.Column(db.String(10), default="COP")
    opening_balance = db.Column(db.Float, nullable=False, default=0)
    notes = db.Column(db.Text)
    is_active = db.Column(db.Boolean, nullable=False, default=True, index=True)
    is_default = db.Column(db.Boolean, nullable=False, default=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "business_id": self.business_id,
            "name": self.name,
            "account_type": self.account_type,
            "payment_method_key": self.payment_method_key,
            "currency": self.currency,
            "opening_balance": round(float(self.opening_balance or 0), 2),
            "notes": self.notes,
            "is_active": self.is_active,
            "is_default": self.is_default,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f"<TreasuryAccount {self.business_id}:{self.name}>"


class TreasuryTransfer(db.Model):
    __tablename__ = "treasury_transfers"

    id = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=False, index=True)
    transfer_date = db.Column(db.Date, nullable=False, index=True)
    origin_account_id = db.Column(db.Integer, db.ForeignKey("treasury_accounts.id"), nullable=False, index=True)
    destination_account_id = db.Column(db.Integer, db.ForeignKey("treasury_accounts.id"), nullable=False, index=True)
    amount = db.Column(db.Float, nullable=False)
    note = db.Column(db.Text)
    created_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    created_by_name = db.Column(db.String(100))
    created_by_role = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    origin_account = db.relationship("TreasuryAccount", foreign_keys=[origin_account_id])
    destination_account = db.relationship("TreasuryAccount", foreign_keys=[destination_account_id])

    def to_dict(self):
        return {
            "id": self.id,
            "business_id": self.business_id,
            "transfer_date": self.transfer_date.isoformat() if self.transfer_date else None,
            "origin_account_id": self.origin_account_id,
            "origin_account_name": self.origin_account.name if self.origin_account else None,
            "origin_account_type": self.origin_account.account_type if self.origin_account else None,
            "destination_account_id": self.destination_account_id,
            "destination_account_name": self.destination_account.name if self.destination_account else None,
            "destination_account_type": self.destination_account.account_type if self.destination_account else None,
            "amount": round(float(self.amount or 0), 2),
            "note": self.note,
            "created_by_user_id": self.created_by_user_id,
            "created_by_name": self.created_by_name,
            "created_by_role": self.created_by_role,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<TreasuryTransfer {self.origin_account_id}->{self.destination_account_id} {self.amount}>"


class ProductBarcode(db.Model):
    """Códigos de barras adicionales para productos"""
    __tablename__ = "product_barcodes"

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False, index=True)
    code = db.Column(db.String(100), unique=True, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<Barcode {self.code}>"


class ProductMovement(db.Model):
    """Movimientos de inventario"""
    __tablename__ = "product_movements"

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False, index=True)
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"))  # Quién realizó el movimiento
    type = db.Column(db.String(20), nullable=False)  # in, out, adjustment, sale, return
    quantity = db.Column(db.Float, nullable=False)
    reason = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Traceability Snapshots
    created_by_name = db.Column(db.String(100))
    created_by_role = db.Column(db.String(50))

    # Relationships
    user = db.relationship("User", backref="product_movements")

    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "business_id": self.business_id,
            "user_id": self.user_id,
            "user_name": self.user.name if self.user else "Sistema",
            "type": self.type,
            "quantity": self.quantity,
            "reason": self.reason,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "created_by_name": self.created_by_name,
            "created_by_role": self.created_by_role,
        }

    def __repr__(self):
        return f"<ProductMovement {self.type} {self.quantity}>"


class RawMaterial(db.Model):
    __tablename__ = "raw_materials"

    id = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False, index=True)
    sku = db.Column(db.String(50), index=True)
    unit = db.Column(db.String(50), nullable=False, default="und")
    current_stock = db.Column(db.Float, nullable=False, default=0)
    minimum_stock = db.Column(db.Float, nullable=False, default=0)
    reference_cost = db.Column(db.Float)
    notes = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    movements = db.relationship(
        "RawMaterialMovement",
        backref="raw_material",
        lazy="dynamic",
        cascade="all, delete-orphan",
        order_by="RawMaterialMovement.created_at.desc(), RawMaterialMovement.id.desc()",
    )
    recipe_items = db.relationship("RecipeItem", backref="raw_material", lazy="dynamic")
    recipe_consumption_items = db.relationship("RecipeConsumptionItem", backref="raw_material", lazy="dynamic")

    def to_dict(self):
        return {
            "id": self.id,
            "business_id": self.business_id,
            "name": self.name,
            "sku": self.sku,
            "unit": self.unit,
            "current_stock": self.current_stock,
            "minimum_stock": self.minimum_stock,
            "reference_cost": self.reference_cost,
            "notes": self.notes,
            "is_active": self.is_active,
            "is_below_minimum": float(self.current_stock or 0) <= float(self.minimum_stock or 0),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f"<RawMaterial {self.name}>"


class RawMaterialMovement(db.Model):
    __tablename__ = "raw_material_movements"

    id = db.Column(db.Integer, primary_key=True)
    raw_material_id = db.Column(db.Integer, db.ForeignKey("raw_materials.id"), nullable=False, index=True)
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=False, index=True)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), index=True)
    raw_purchase_id = db.Column(db.Integer, db.ForeignKey("raw_purchases.id"), index=True)
    recipe_consumption_id = db.Column(db.Integer, db.ForeignKey("recipe_consumptions.id"), index=True)
    movement_type = db.Column(db.String(20), nullable=False, index=True)
    quantity = db.Column(db.Float, nullable=False)
    previous_stock = db.Column(db.Float, nullable=False, default=0)
    new_stock = db.Column(db.Float, nullable=False, default=0)
    reference_cost = db.Column(db.Float)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    created_by_name = db.Column(db.String(100))
    created_by_role = db.Column(db.String(50))

    user = db.relationship("User", foreign_keys=[created_by])
    raw_purchase = db.relationship("RawPurchase", backref="stock_movements")
    recipe_consumption = db.relationship("RecipeConsumption", backref="stock_movements")

    def to_dict(self):
        return {
            "id": self.id,
            "raw_material_id": self.raw_material_id,
            "business_id": self.business_id,
            "created_by": self.created_by,
            "movement_type": self.movement_type,
            "quantity": self.quantity,
            "previous_stock": self.previous_stock,
            "new_stock": self.new_stock,
            "reference_cost": self.reference_cost,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "created_by_name": self.created_by_name,
            "created_by_role": self.created_by_role,
            "raw_material_name": self.raw_material.name if self.raw_material else None,
            "raw_purchase_id": self.raw_purchase_id,
            "raw_purchase_number": self.raw_purchase.purchase_number if self.raw_purchase else None,
            "recipe_consumption_id": self.recipe_consumption_id,
        }

    def __repr__(self):
        return f"<RawMaterialMovement {self.movement_type} {self.quantity}>"


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
    fulfillment_mode = db.Column(db.String(30), index=True)
    active = db.Column(db.Boolean, default=True)
    image = db.Column(db.Text)  # Base64 image or URL
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    barcodes = db.relationship("ProductBarcode", backref="product", cascade="all, delete-orphan")
    movements = db.relationship("ProductMovement", backref="product", lazy="dynamic", cascade="all, delete-orphan")
    recipes = db.relationship("Recipe", backref="product", lazy="dynamic")
    recipe_consumptions = db.relationship("RecipeConsumption", backref="product", lazy="dynamic")

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
            "fulfillment_mode": self.fulfillment_mode,
            "active": self.active,
            "image": self.image,
            "barcodes": [b.code for b in self.barcodes],
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<Product {self.name}>"


class QuoteItem(db.Model):
    __tablename__ = "quote_items"

    id = db.Column(db.Integer, primary_key=True)
    quote_id = db.Column(db.Integer, db.ForeignKey("quotes.id"), nullable=False, index=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), index=True)
    description = db.Column(db.Text, nullable=False)
    quantity = db.Column(db.Float, nullable=False, default=1)
    unit_price = db.Column(db.Float, nullable=False, default=0)
    subtotal = db.Column(db.Float, nullable=False, default=0)
    fulfillment_mode = db.Column(db.String(30), index=True)
    sort_order = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    product = db.relationship("Product")

    def to_dict(self):
        return {
            "id": self.id,
            "quote_id": self.quote_id,
            "product_id": self.product_id,
            "description": self.description,
            "quantity": self.quantity,
            "unit_price": self.unit_price,
            "subtotal": self.subtotal,
            "fulfillment_mode": self.fulfillment_mode,
            "sort_order": self.sort_order,
            "product_name": self.product.name if self.product else None,
        }


class Recipe(db.Model):
    __tablename__ = "recipes"

    id = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=False, index=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False, index=True)
    notes = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    items = db.relationship(
        "RecipeItem",
        backref="recipe",
        lazy="dynamic",
        cascade="all, delete-orphan",
        order_by="RecipeItem.sort_order.asc(), RecipeItem.id.asc()",
    )
    consumptions = db.relationship(
        "RecipeConsumption",
        backref="recipe",
        lazy="dynamic",
        order_by="RecipeConsumption.created_at.desc(), RecipeConsumption.id.desc()",
    )

    def to_dict(self, include_items=True, include_summary=True):
        recipe_items = self.items.order_by(RecipeItem.sort_order.asc(), RecipeItem.id.asc()).all() if include_items else []
        theoretical_total_cost = 0
        if include_summary:
            summary_items = recipe_items if include_items else self.items.order_by(RecipeItem.sort_order.asc(), RecipeItem.id.asc()).all()
            theoretical_total_cost = round(sum(float(item.quantity_required or 0) * float(item.raw_material.reference_cost or 0) for item in summary_items if item.raw_material), 4)
        return {
            "id": self.id,
            "business_id": self.business_id,
            "product_id": self.product_id,
            "product_name": self.product.name if self.product else None,
            "product_type": self.product.type if self.product else None,
            "name": self.name,
            "notes": self.notes,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "items_count": self.items.count(),
            "consumptions_count": self.consumptions.count(),
            "theoretical_total_cost": theoretical_total_cost,
            "items": [item.to_dict() for item in recipe_items] if include_items else [],
        }

    def __repr__(self):
        return f"<Recipe {self.name}>"


class RecipeItem(db.Model):
    __tablename__ = "recipe_items"

    id = db.Column(db.Integer, primary_key=True)
    recipe_id = db.Column(db.Integer, db.ForeignKey("recipes.id"), nullable=False, index=True)
    raw_material_id = db.Column(db.Integer, db.ForeignKey("raw_materials.id"), nullable=False, index=True)
    quantity_required = db.Column(db.Float, nullable=False)
    notes = db.Column(db.Text)
    sort_order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "recipe_id": self.recipe_id,
            "raw_material_id": self.raw_material_id,
            "raw_material_name": self.raw_material.name if self.raw_material else None,
            "raw_material_unit": self.raw_material.unit if self.raw_material else None,
            "quantity_required": self.quantity_required,
            "notes": self.notes,
            "sort_order": self.sort_order,
            "reference_cost": self.raw_material.reference_cost if self.raw_material else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<RecipeItem recipe={self.recipe_id} material={self.raw_material_id}>"


class RecipeConsumption(db.Model):
    __tablename__ = "recipe_consumptions"

    id = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=False, index=True)
    recipe_id = db.Column(db.Integer, db.ForeignKey("recipes.id"), index=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), index=True)
    related_sale_id = db.Column(db.Integer, db.ForeignKey("sales.id"), index=True)
    source_type = db.Column(db.String(40), index=True)
    source_document_type = db.Column(db.String(40), index=True)
    source_document_id = db.Column(db.Integer, index=True)
    quantity_produced_or_sold = db.Column(db.Float, nullable=False)
    notes = db.Column(db.Text)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    created_by_name = db.Column(db.String(100))
    created_by_role = db.Column(db.String(50))

    items = db.relationship(
        "RecipeConsumptionItem",
        backref="recipe_consumption",
        lazy="dynamic",
        cascade="all, delete-orphan",
        order_by="RecipeConsumptionItem.id.asc()",
    )
    user = db.relationship("User", foreign_keys=[created_by])

    def to_dict(self, include_items=True):
        consumption_items = self.items.order_by(RecipeConsumptionItem.id.asc()).all() if include_items else []
        source_type = self.source_type or ("sale" if self.related_sale_id else "manual")
        return {
            "id": self.id,
            "business_id": self.business_id,
            "recipe_id": self.recipe_id,
            "recipe_name": self.recipe.name if self.recipe else None,
            "product_id": self.product_id,
            "product_name": self.product.name if self.product else None,
            "related_sale_id": self.related_sale_id,
            "source_type": source_type,
            "source_document_type": self.source_document_type,
            "source_document_id": self.source_document_id,
            "quantity_produced_or_sold": self.quantity_produced_or_sold,
            "notes": self.notes,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "created_by_name": self.created_by_name,
            "created_by_role": self.created_by_role,
            "items_count": self.items.count(),
            "items": [item.to_dict() for item in consumption_items] if include_items else [],
        }

    def __repr__(self):
        return f"<RecipeConsumption recipe={self.recipe_id} qty={self.quantity_produced_or_sold}>"


class RecipeConsumptionItem(db.Model):
    __tablename__ = "recipe_consumption_items"

    id = db.Column(db.Integer, primary_key=True)
    recipe_consumption_id = db.Column(db.Integer, db.ForeignKey("recipe_consumptions.id"), nullable=False, index=True)
    raw_material_id = db.Column(db.Integer, db.ForeignKey("raw_materials.id"), nullable=False, index=True)
    quantity_consumed = db.Column(db.Float, nullable=False)
    previous_stock = db.Column(db.Float, nullable=False, default=0)
    new_stock = db.Column(db.Float, nullable=False, default=0)
    raw_material_movement_id = db.Column(db.Integer, db.ForeignKey("raw_material_movements.id"), index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    movement = db.relationship("RawMaterialMovement", foreign_keys=[raw_material_movement_id])

    def to_dict(self):
        return {
            "id": self.id,
            "recipe_consumption_id": self.recipe_consumption_id,
            "raw_material_id": self.raw_material_id,
            "raw_material_name": self.raw_material.name if self.raw_material else None,
            "raw_material_unit": self.raw_material.unit if self.raw_material else None,
            "quantity_consumed": self.quantity_consumed,
            "previous_stock": self.previous_stock,
            "new_stock": self.new_stock,
            "raw_material_movement_id": self.raw_material_movement_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<RecipeConsumptionItem consumption={self.recipe_consumption_id} material={self.raw_material_id}>"


class Supplier(db.Model):
    __tablename__ = "suppliers"

    id = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False, index=True)
    contact_name = db.Column(db.String(255))
    phone = db.Column(db.String(50))
    email = db.Column(db.String(255))
    notes = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    purchases = db.relationship("RawPurchase", backref="supplier", lazy="dynamic")
    payables = db.relationship("SupplierPayable", backref="supplier", lazy="dynamic")
    supplier_payments = db.relationship("SupplierPayment", backref="supplier", lazy="dynamic")

    def to_dict(self):
        return {
            "id": self.id,
            "business_id": self.business_id,
            "name": self.name,
            "contact_name": self.contact_name,
            "phone": self.phone,
            "email": self.email,
            "notes": self.notes,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f"<Supplier {self.name}>"


class RawPurchase(db.Model):
    __tablename__ = "raw_purchases"
    __table_args__ = (
        db.UniqueConstraint("business_id", "purchase_number", name="uq_raw_purchases_business_purchase_number"),
    )

    id = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=False, index=True)
    supplier_id = db.Column(db.Integer, db.ForeignKey("suppliers.id"), index=True)
    purchase_number = db.Column(db.String(50), nullable=False, index=True)
    status = db.Column(db.String(20), nullable=False, default="draft", index=True)
    purchase_date = db.Column(db.Date, nullable=False)
    subtotal = db.Column(db.Float, nullable=False, default=0)
    total = db.Column(db.Float, nullable=False, default=0)
    notes = db.Column(db.Text)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    items = db.relationship(
        "RawPurchaseItem",
        backref="raw_purchase",
        lazy="dynamic",
        cascade="all, delete-orphan",
        order_by="RawPurchaseItem.id.asc()",
    )
    user = db.relationship("User", foreign_keys=[created_by])
    supplier_payable = db.relationship("SupplierPayable", backref="raw_purchase", uselist=False)

    def to_dict(self, include_items=True):
        items = self.items.order_by(RawPurchaseItem.id.asc()).all() if include_items else []
        financial_flow = None
        linked_purchase_expense = None
        if self.status == "confirmed":
            financial_flow = "payable" if self.supplier_payable else "cash"
            if financial_flow == "cash":
                linked_purchase_expense = Expense.query.filter_by(
                    raw_purchase_id=self.id,
                    source_type="purchase_payment",
                ).order_by(Expense.id.desc()).first()
        return {
            "id": self.id,
            "business_id": self.business_id,
            "supplier_id": self.supplier_id,
            "supplier_name": self.supplier.name if self.supplier else None,
            "purchase_number": self.purchase_number,
            "status": self.status,
            "purchase_date": self.purchase_date.isoformat() if self.purchase_date else None,
            "subtotal": self.subtotal,
            "total": self.total,
            "notes": self.notes,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "items_count": self.items.count(),
            "financial_flow": financial_flow,
            "purchase_payment_method": linked_purchase_expense.payment_method if linked_purchase_expense else None,
            "purchase_treasury_account_id": linked_purchase_expense.treasury_account_id if linked_purchase_expense else None,
            "purchase_treasury_account_name": linked_purchase_expense.treasury_account.name if linked_purchase_expense and linked_purchase_expense.treasury_account else None,
            "purchase_treasury_account_type": linked_purchase_expense.treasury_account.account_type if linked_purchase_expense and linked_purchase_expense.treasury_account else None,
            "supplier_payable_id": self.supplier_payable.id if self.supplier_payable else None,
            "supplier_payable_status": self.supplier_payable.status if self.supplier_payable else None,
            "supplier_payable_balance_due": self.supplier_payable.balance_due if self.supplier_payable else None,
            "items": [item.to_dict() for item in items] if include_items else [],
        }

    def __repr__(self):
        return f"<RawPurchase {self.purchase_number}>"


class RawPurchaseItem(db.Model):
    __tablename__ = "raw_purchase_items"

    id = db.Column(db.Integer, primary_key=True)
    raw_purchase_id = db.Column(db.Integer, db.ForeignKey("raw_purchases.id"), nullable=False, index=True)
    raw_material_id = db.Column(db.Integer, db.ForeignKey("raw_materials.id"), nullable=False, index=True)
    description = db.Column(db.Text)
    quantity = db.Column(db.Float, nullable=False)
    unit_cost = db.Column(db.Float, nullable=False)
    subtotal = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    raw_material = db.relationship("RawMaterial")

    def to_dict(self):
        return {
            "id": self.id,
            "raw_purchase_id": self.raw_purchase_id,
            "raw_material_id": self.raw_material_id,
            "raw_material_name": self.raw_material.name if self.raw_material else None,
            "raw_material_unit": self.raw_material.unit if self.raw_material else None,
            "description": self.description,
            "quantity": self.quantity,
            "unit_cost": self.unit_cost,
            "subtotal": self.subtotal,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<RawPurchaseItem purchase={self.raw_purchase_id} material={self.raw_material_id}>"


class SupplierPayable(db.Model):
    __tablename__ = "supplier_payables"
    __table_args__ = (
        db.UniqueConstraint("raw_purchase_id", name="uq_supplier_payables_raw_purchase_id"),
    )

    id = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=False, index=True)
    supplier_id = db.Column(db.Integer, db.ForeignKey("suppliers.id"), nullable=False, index=True)
    raw_purchase_id = db.Column(db.Integer, db.ForeignKey("raw_purchases.id"), index=True)
    amount_total = db.Column(db.Float, nullable=False, default=0)
    amount_paid = db.Column(db.Float, nullable=False, default=0)
    balance_due = db.Column(db.Float, nullable=False, default=0)
    status = db.Column(db.String(20), nullable=False, default="pending", index=True)
    due_date = db.Column(db.Date)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    payments = db.relationship(
        "SupplierPayment",
        backref="supplier_payable",
        lazy="dynamic",
        cascade="all, delete-orphan",
        order_by="SupplierPayment.payment_date.desc(), SupplierPayment.id.desc()",
    )

    def to_dict(self, include_payments=False):
        payments = self.payments.order_by(SupplierPayment.payment_date.desc(), SupplierPayment.id.desc()).all() if include_payments else []
        return {
            "id": self.id,
            "business_id": self.business_id,
            "supplier_id": self.supplier_id,
            "supplier_name": self.supplier.name if self.supplier else None,
            "supplier_is_active": self.supplier.is_active if self.supplier else None,
            "raw_purchase_id": self.raw_purchase_id,
            "raw_purchase_number": self.raw_purchase.purchase_number if self.raw_purchase else None,
            "raw_purchase_status": self.raw_purchase.status if self.raw_purchase else None,
            "amount_total": self.amount_total,
            "amount_paid": self.amount_paid,
            "balance_due": self.balance_due,
            "status": self.status,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "payments_count": self.payments.count(),
            "payments": [payment.to_dict() for payment in payments] if include_payments else [],
        }

    def __repr__(self):
        return f"<SupplierPayable supplier={self.supplier_id} balance={self.balance_due}>"


class SupplierPayment(db.Model):
    __tablename__ = "supplier_payments"

    id = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=False, index=True)
    supplier_id = db.Column(db.Integer, db.ForeignKey("suppliers.id"), nullable=False, index=True)
    supplier_payable_id = db.Column(db.Integer, db.ForeignKey("supplier_payables.id"), nullable=False, index=True)
    amount = db.Column(db.Float, nullable=False)
    payment_date = db.Column(db.Date, nullable=False, index=True)
    method = db.Column(db.String(50))
    treasury_account_id = db.Column(db.Integer, db.ForeignKey("treasury_accounts.id"), index=True)
    reference = db.Column(db.String(255))
    notes = db.Column(db.Text)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    created_by_name = db.Column(db.String(100))
    created_by_role = db.Column(db.String(50))

    user = db.relationship("User", foreign_keys=[created_by])
    treasury_account = db.relationship("TreasuryAccount", foreign_keys=[treasury_account_id])

    def to_dict(self):
        return {
            "id": self.id,
            "business_id": self.business_id,
            "supplier_id": self.supplier_id,
            "supplier_name": self.supplier.name if self.supplier else None,
            "supplier_payable_id": self.supplier_payable_id,
            "raw_purchase_id": self.supplier_payable.raw_purchase_id if self.supplier_payable else None,
            "raw_purchase_number": self.supplier_payable.raw_purchase.purchase_number if self.supplier_payable and self.supplier_payable.raw_purchase else None,
            "amount": self.amount,
            "payment_date": self.payment_date.isoformat() if self.payment_date else None,
            "method": self.method,
            "treasury_account_id": self.treasury_account_id,
            "treasury_account_name": self.treasury_account.name if self.treasury_account else None,
            "treasury_account_type": self.treasury_account.account_type if self.treasury_account else None,
            "reference": self.reference,
            "notes": self.notes,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "created_by_name": self.created_by_name,
            "created_by_role": self.created_by_role,
        }

    def __repr__(self):
        return f"<SupplierPayment payable={self.supplier_payable_id} amount={self.amount}>"


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

    # Traceability
    created_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    created_by_name = db.Column(db.String(100))
    created_by_role = db.Column(db.String(50))
    updated_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"))

    # Relationships
    sales = db.relationship("Sale", backref="customer", lazy="dynamic")
    quotes = db.relationship("Quote", backref="customer", lazy="dynamic")
    invoices = db.relationship("Invoice", backref="customer", lazy="dynamic")
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
            "created_by_user_id": self.created_by_user_id,
            "created_by_name": self.created_by_name,
            "created_by_role": self.created_by_role,
            "updated_by_user_id": self.updated_by_user_id,
        }

    def __repr__(self):
        return f"<Customer {self.name}>"


class Sale(db.Model):
    """Venta"""
    __tablename__ = "sales"

    id = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), index=True) # Usuario que realizó la venta
    customer_id = db.Column(db.Integer, db.ForeignKey("customers.id"), index=True)
    sale_date = db.Column(db.Date, nullable=False)
    items = db.Column(db.JSON, nullable=False)  # [{product_id, name, qty, unit_price, total}]
    subtotal = db.Column(db.Float, nullable=False)
    discount = db.Column(db.Float, default=0)
    total = db.Column(db.Float, nullable=False)
    balance = db.Column(db.Float, default=0)  # Saldo pendiente para ventas fiadas
    collected_amount = db.Column(db.Float, default=0)
    total_cost = db.Column(db.Float, default=0)  # Costo total de la venta (para reportes rápidos)
    payment_method = db.Column(db.String(20), default="cash")  # cash, transfer, credit
    treasury_account_id = db.Column(db.Integer, db.ForeignKey("treasury_accounts.id"), index=True)
    paid = db.Column(db.Boolean, default=True)  # True = pagado, False = fiado
    note = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Traceability Snapshots
    created_by_name = db.Column(db.String(100))
    created_by_role = db.Column(db.String(50))
    updated_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"))

    # Relationships
    user = db.relationship("User", foreign_keys=[user_id])
    payments = db.relationship("Payment", backref="sale", lazy="dynamic")
    treasury_account = db.relationship("TreasuryAccount", foreign_keys=[treasury_account_id])

    def to_dict(self, include_items=True):
        return {
            "id": self.id,
            "business_id": self.business_id,
            "customer_id": self.customer_id,
            "sale_date": self.sale_date.isoformat() if self.sale_date else None,
            "items": self.items if include_items else [],
            "subtotal": self.subtotal,
            "discount": self.discount,
            "total": self.total,
            "balance": self.balance,
            "collected_amount": self.collected_amount,
            "total_cost": self.total_cost,
            "payment_method": self.payment_method,
            "treasury_account_id": self.treasury_account_id,
            "treasury_account_name": self.treasury_account.name if self.treasury_account else None,
            "treasury_account_type": self.treasury_account.account_type if self.treasury_account else None,
            "paid": self.paid,
            "note": self.note,
            "customer_name": self.customer.name if self.customer else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "created_by_name": self.created_by_name,
            "created_by_role": self.created_by_role,
            "updated_by_user_id": self.updated_by_user_id,
        }

    def __repr__(self):
        return f"<Sale {self.id} - {self.total}>"


class Quote(db.Model):
    __tablename__ = "quotes"
    __table_args__ = (
        db.UniqueConstraint("business_id", "quote_code", name="uq_quotes_business_quote_code"),
    )

    id = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=False, index=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("customers.id"), index=True)
    quote_code = db.Column(db.String(50), nullable=False, index=True)
    status = db.Column(db.String(20), nullable=False, default="draft", index=True)
    issue_date = db.Column(db.Date, nullable=False)
    expiry_date = db.Column(db.Date)
    subtotal = db.Column(db.Float, nullable=False, default=0)
    discount = db.Column(db.Float, nullable=False, default=0)
    total = db.Column(db.Float, nullable=False, default=0)
    notes = db.Column(db.Text)
    terms = db.Column(db.Text)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), index=True)
    converted_sale_id = db.Column(db.Integer, db.ForeignKey("sales.id"), index=True)
    converted_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    items = db.relationship(
        "QuoteItem",
        backref="quote",
        cascade="all, delete-orphan",
        lazy=True,
        order_by="QuoteItem.sort_order.asc(), QuoteItem.id.asc()",
    )
    created_by_user = db.relationship("User", foreign_keys=[created_by])
    converted_sale = db.relationship("Sale", foreign_keys=[converted_sale_id])

    def to_dict(self):
        return {
            "id": self.id,
            "business_id": self.business_id,
            "customer_id": self.customer_id,
            "customer_name": self.customer.name if self.customer else None,
            "quote_code": self.quote_code,
            "status": self.status,
            "issue_date": self.issue_date.isoformat() if self.issue_date else None,
            "expiry_date": self.expiry_date.isoformat() if self.expiry_date else None,
            "subtotal": self.subtotal,
            "discount": self.discount,
            "total": self.total,
            "notes": self.notes,
            "terms": self.terms,
            "created_by": self.created_by,
            "created_by_name": self.created_by_user.name if self.created_by_user else None,
            "converted_sale_id": self.converted_sale_id,
            "converted_at": self.converted_at.isoformat() if self.converted_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "items": [item.to_dict() for item in self.items],
        }

    def __repr__(self):
        return f"<Quote {self.quote_code}>"


class Invoice(db.Model):
    __tablename__ = "invoices"
    __table_args__ = (
        db.UniqueConstraint("business_id", "invoice_number", name="uq_invoices_business_invoice_number"),
    )

    id = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=False, index=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("customers.id"), index=True)
    invoice_number = db.Column(db.String(50), nullable=False, index=True)
    status = db.Column(db.String(20), nullable=False, default="draft", index=True)
    issue_date = db.Column(db.Date, nullable=False, index=True)
    due_date = db.Column(db.Date, index=True)
    currency = db.Column(db.String(10), nullable=False, default="COP")
    subtotal = db.Column(db.Float, nullable=False, default=0)
    discount_total = db.Column(db.Float, nullable=False, default=0)
    tax_total = db.Column(db.Float, nullable=False, default=0)
    total = db.Column(db.Float, nullable=False, default=0)
    notes = db.Column(db.Text)
    payment_method = db.Column(db.String(50))
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), index=True)
    sent_at = db.Column(db.DateTime)
    paid_at = db.Column(db.DateTime)
    cancelled_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    items = db.relationship(
        "InvoiceItem",
        backref="invoice",
        cascade="all, delete-orphan",
        lazy=True,
        order_by="InvoiceItem.sort_order.asc(), InvoiceItem.id.asc()",
    )
    payments = db.relationship(
        "InvoicePayment",
        backref="invoice",
        cascade="all, delete-orphan",
        lazy=True,
        order_by="InvoicePayment.payment_date.desc(), InvoicePayment.id.desc()",
    )
    created_by_user = db.relationship("User", foreign_keys=[created_by])

    def to_dict(self, include_items=True, include_payments=True):
        payments = list(self.payments or [])
        paid_amount = round(sum(float(getattr(payment, "signed_amount", payment.amount or 0) or 0) for payment in payments), 2)
        paid_amount = round(max(paid_amount, 0), 2)
        gross_collected_amount = round(sum(float(payment.amount or 0) for payment in payments if getattr(payment, "event_type", "payment") == "payment"), 2)
        refunded_amount = round(sum(float(payment.amount or 0) for payment in payments if getattr(payment, "event_type", "payment") == "refund"), 2)
        reversed_amount = round(sum(float(payment.amount or 0) for payment in payments if getattr(payment, "event_type", "payment") == "reversal"), 2)
        outstanding_balance = round(max(float(self.total or 0) - paid_amount, 0), 2)
        today = date.today()
        is_overdue = bool(
            self.status not in {"draft", "paid", "cancelled"}
            and outstanding_balance > 0.01
            and self.due_date
            and self.due_date < today
        )

        effective_status = self.status
        if self.status != "cancelled":
            if outstanding_balance <= 0.01 and float(self.total or 0) > 0:
                effective_status = "paid"
            elif paid_amount > 0.01 and outstanding_balance > 0.01:
                effective_status = "partial"
            elif is_overdue:
                effective_status = "overdue"

        days_until_due = None
        if self.due_date:
            days_until_due = (self.due_date - today).days

        payment_payloads = []
        adjusted_amounts = {}
        for payment in payments:
            source_payment_id = getattr(payment, "source_payment_id", None)
            if source_payment_id is None:
                continue
            adjusted_amounts[source_payment_id] = round(
                float(adjusted_amounts.get(source_payment_id, 0) or 0) + float(payment.amount or 0),
                2,
            )

        for payment in payments:
            payment_payload = payment.to_dict()
            if payment_payload.get("event_type") == "payment":
                available_adjustment_amount = round(
                    max(float(payment.amount or 0) - float(adjusted_amounts.get(payment.id, 0) or 0), 0),
                    2,
                )
                payment_payload["available_adjustment_amount"] = available_adjustment_amount
                payment_payload["can_adjust"] = available_adjustment_amount > 0.01
            else:
                payment_payload["available_adjustment_amount"] = 0.0
                payment_payload["can_adjust"] = False
            payment_payloads.append(payment_payload)

        return {
            "id": self.id,
            "business_id": self.business_id,
            "customer_id": self.customer_id,
            "customer_name": self.customer.name if self.customer else None,
            "customer_phone": self.customer.phone if self.customer else None,
            "customer_address": self.customer.address if self.customer else None,
            "invoice_number": self.invoice_number,
            "status": effective_status,
            "status_base": self.status,
            "issue_date": self.issue_date.isoformat() if self.issue_date else None,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "currency": self.currency,
            "subtotal": round(float(self.subtotal or 0), 2),
            "discount_total": round(float(self.discount_total or 0), 2),
            "tax_total": round(float(self.tax_total or 0), 2),
            "total": round(float(self.total or 0), 2),
            "amount_paid": paid_amount,
            "gross_collected_amount": gross_collected_amount,
            "refunded_amount": refunded_amount,
            "reversed_amount": reversed_amount,
            "net_collected_amount": paid_amount,
            "outstanding_balance": outstanding_balance,
            "is_overdue": is_overdue,
            "days_until_due": days_until_due,
            "notes": self.notes,
            "payment_method": self.payment_method,
            "created_by": self.created_by,
            "created_by_name": self.created_by_user.name if self.created_by_user else None,
            "sent_at": self.sent_at.isoformat() if self.sent_at else None,
            "paid_at": self.paid_at.isoformat() if self.paid_at else None,
            "cancelled_at": self.cancelled_at.isoformat() if self.cancelled_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "items": [item.to_dict() for item in self.items] if include_items else [],
            "payments": payment_payloads if include_payments else [],
        }

    def __repr__(self):
        return f"<Invoice {self.invoice_number}>"


class InvoiceItem(db.Model):
    __tablename__ = "invoice_items"

    id = db.Column(db.Integer, primary_key=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey("invoices.id"), nullable=False, index=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), index=True)
    description = db.Column(db.Text, nullable=False)
    quantity = db.Column(db.Float, nullable=False, default=1)
    unit_price = db.Column(db.Float, nullable=False, default=0)
    discount = db.Column(db.Float, nullable=False, default=0)
    tax_rate = db.Column(db.Float, nullable=False, default=0)
    line_total = db.Column(db.Float, nullable=False, default=0)
    sort_order = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    product = db.relationship("Product")

    def to_dict(self):
        return {
            "id": self.id,
            "invoice_id": self.invoice_id,
            "product_id": self.product_id,
            "product_name": self.product.name if self.product else None,
            "description": self.description,
            "quantity": round(float(self.quantity or 0), 2),
            "unit_price": round(float(self.unit_price or 0), 2),
            "discount": round(float(self.discount or 0), 2),
            "tax_rate": round(float(self.tax_rate or 0), 2),
            "line_total": round(float(self.line_total or 0), 2),
            "sort_order": self.sort_order,
        }

    def __repr__(self):
        return f"<InvoiceItem {self.invoice_id}:{self.id}>"


class InvoiceSettings(db.Model):
    __tablename__ = "invoice_settings"
    __table_args__ = (
        db.UniqueConstraint("business_id", name="uq_invoice_settings_business"),
    )

    id = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=False, index=True)
    prefix = db.Column(db.String(20), nullable=False, default="INV")
    logo_url = db.Column(db.Text)
    brand_color = db.Column(db.String(20), nullable=False, default="#2563EB")
    accent_color = db.Column(db.String(20), nullable=False, default="#0F172A")
    footer_text = db.Column(db.Text)
    default_notes = db.Column(db.Text)
    default_terms = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "business_id": self.business_id,
            "prefix": self.prefix,
            "logo_url": self.logo_url,
            "brand_color": self.brand_color,
            "accent_color": self.accent_color,
            "footer_text": self.footer_text,
            "default_notes": self.default_notes,
            "default_terms": self.default_terms,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f"<InvoiceSettings {self.business_id}:{self.prefix}>"


class InvoicePayment(db.Model):
    __tablename__ = "invoice_payments"

    id = db.Column(db.Integer, primary_key=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey("invoices.id"), nullable=False, index=True)
    amount = db.Column(db.Float, nullable=False, default=0)
    payment_date = db.Column(db.Date, nullable=False, index=True)
    payment_method = db.Column(db.String(50))
    treasury_account_id = db.Column(db.Integer, db.ForeignKey("treasury_accounts.id"), index=True)
    event_type = db.Column(db.String(20), nullable=False, default="payment")
    source_payment_id = db.Column(db.Integer, db.ForeignKey("invoice_payments.id"), index=True)
    note = db.Column(db.Text)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    created_by_user = db.relationship("User", foreign_keys=[created_by])
    treasury_account = db.relationship("TreasuryAccount", foreign_keys=[treasury_account_id])
    source_payment = db.relationship("InvoicePayment", remote_side=[id], foreign_keys=[source_payment_id], backref=db.backref("adjustments", lazy=True))

    @property
    def signed_amount(self):
        amount = round(float(self.amount or 0), 2)
        if str(self.event_type or "payment").strip().lower() in {"refund", "reversal"}:
            return round(-amount, 2)
        return amount

    def to_dict(self):
        normalized_event_type = str(self.event_type or "payment").strip().lower() or "payment"
        return {
            "id": self.id,
            "invoice_id": self.invoice_id,
            "amount": round(float(self.amount or 0), 2),
            "signed_amount": self.signed_amount,
            "payment_date": self.payment_date.isoformat() if self.payment_date else None,
            "payment_method": self.payment_method,
            "treasury_account_id": self.treasury_account_id,
            "treasury_account_name": self.treasury_account.name if self.treasury_account else None,
            "treasury_account_type": self.treasury_account.account_type if self.treasury_account else None,
            "event_type": normalized_event_type,
            "source_payment_id": self.source_payment_id,
            "note": self.note,
            "created_by": self.created_by,
            "created_by_name": self.created_by_user.name if self.created_by_user else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<InvoicePayment {self.invoice_id}:{self.amount}>"


class Expense(db.Model):
    """Gasto"""
    __tablename__ = "expenses"

    id = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=False, index=True)
    expense_date = db.Column(db.Date, nullable=False)
    category = db.Column(db.String(100), nullable=False)  # servicios, inventario, mantenimiento, etc.
    amount = db.Column(db.Float, nullable=False)
    description = db.Column(db.Text)
    source_type = db.Column(db.String(20), default="manual")  # manual, recurring, debt_payment
    payment_method = db.Column(db.String(50))
    treasury_account_id = db.Column(db.Integer, db.ForeignKey("treasury_accounts.id"), index=True)
    recurring_expense_id = db.Column(db.Integer, db.ForeignKey("recurring_expenses.id"), index=True)
    debt_id = db.Column(db.Integer, db.ForeignKey("debts.id"), index=True)
    debt_payment_id = db.Column(db.Integer, db.ForeignKey("debt_payments.id"), index=True)
    raw_purchase_id = db.Column(db.Integer, db.ForeignKey("raw_purchases.id"), index=True)
    supplier_payable_id = db.Column(db.Integer, db.ForeignKey("supplier_payables.id"), index=True)
    supplier_payment_id = db.Column(db.Integer, db.ForeignKey("supplier_payments.id"), index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Traceability
    created_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    created_by_name = db.Column(db.String(100))
    created_by_role = db.Column(db.String(50))
    updated_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    raw_purchase = db.relationship("RawPurchase", foreign_keys=[raw_purchase_id])
    supplier_payable = db.relationship("SupplierPayable", foreign_keys=[supplier_payable_id])
    supplier_payment = db.relationship("SupplierPayment", foreign_keys=[supplier_payment_id])
    treasury_account = db.relationship("TreasuryAccount", foreign_keys=[treasury_account_id])

    def to_dict(self):
        return {
            "id": self.id,
            "business_id": self.business_id,
            "expense_date": self.expense_date.isoformat() if self.expense_date else None,
            "category": self.category,
            "amount": self.amount,
            "description": self.description,
            "source_type": self.source_type or "manual",
            "payment_method": self.payment_method,
            "treasury_account_id": self.treasury_account_id,
            "treasury_account_name": self.treasury_account.name if self.treasury_account else None,
            "treasury_account_type": self.treasury_account.account_type if self.treasury_account else None,
            "recurring_expense_id": self.recurring_expense_id,
            "debt_id": self.debt_id,
            "debt_payment_id": self.debt_payment_id,
            "raw_purchase_id": self.raw_purchase_id,
            "raw_purchase_number": self.raw_purchase.purchase_number if self.raw_purchase else None,
            "supplier_payable_id": self.supplier_payable_id,
            "supplier_payable_status": self.supplier_payable.status if self.supplier_payable else None,
            "supplier_payment_id": self.supplier_payment_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "created_by_user_id": self.created_by_user_id,
            "created_by_name": self.created_by_name,
            "created_by_role": self.created_by_role,
            "updated_by_user_id": self.updated_by_user_id,
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
    payment_flow = db.Column(db.String(20), default='cash') # cash, payable
    creditor_name = db.Column(db.String(255))
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
            "payment_flow": self.payment_flow or "cash",
            "creditor_name": self.creditor_name,
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


class Reminder(db.Model):
    """Recordatorios enriquecidos (compatibles con ReminderService)"""
    __tablename__ = "reminders"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4())) # UUID
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False)
    content = db.Column(db.Text)
    priority = db.Column(db.String(20), default="medium") # low, medium, high
    due_date = db.Column(db.String(20)) # YYYY-MM-DD
    due_time = db.Column(db.String(20)) # HH:MM
    tags = db.Column(db.JSON, default=[])
    status = db.Column(db.String(20), default="active") # active, completed, archived
    pinned = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Traceability
    created_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    created_by_name = db.Column(db.String(100))
    created_by_role = db.Column(db.String(50))
    updated_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"))

    def to_dict(self):
        return {
            "id": self.id,
            "businessId": self.business_id,
            "title": self.title,
            "content": self.content,
            "priority": self.priority,
            "dueDate": self.due_date,
            "dueTime": self.due_time,
            "tags": self.tags,
            "status": self.status,
            "pinned": self.pinned,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
            "createdByUserId": self.created_by_user_id,
            "createdByName": self.created_by_name,
            "createdByRole": self.created_by_role,
            "updatedByUserId": self.updated_by_user_id,
        }

    def __repr__(self):
        return f"<Reminder {self.title}>"


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

    # Relationships
    viewers = db.relationship("User", secondary="sales_goal_viewers", lazy="dynamic", backref="visible_goals")

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
            "viewers": [u.id for u in self.viewers] # Return IDs of viewers
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
    treasury_account_id = db.Column(db.Integer, db.ForeignKey("treasury_accounts.id"), index=True)
    note = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Traceability
    created_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    created_by_name = db.Column(db.String(100))
    created_by_role = db.Column(db.String(50))
    updated_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    treasury_account = db.relationship("TreasuryAccount", foreign_keys=[treasury_account_id])

    def to_dict(self):
        return {
            "id": self.id,
            "business_id": self.business_id,
            "customer_id": self.customer_id,
            "sale_id": self.sale_id,
            "payment_date": self.payment_date.isoformat() if self.payment_date else None,
            "amount": self.amount,
            "method": self.method,
            "treasury_account_id": self.treasury_account_id,
            "treasury_account_name": self.treasury_account.name if self.treasury_account else None,
            "treasury_account_type": self.treasury_account.account_type if self.treasury_account else None,
            "note": self.note,
            "customer_name": self.customer.name if self.customer else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "created_by_user_id": self.created_by_user_id,
            "created_by_name": self.created_by_name,
            "created_by_role": self.created_by_role,
            "updated_by_user_id": self.updated_by_user_id,
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
    scope = db.Column(db.String(20), default="business")  # system, business
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    roles = db.relationship("RolePermission", back_populates="permission", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "category": self.category,
            "scope": self.scope,
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
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=True) # NULL for system roles, ID for custom roles
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    user_roles = db.relationship("UserRole", back_populates="role", cascade="all, delete-orphan")
    permissions = db.relationship("RolePermission", back_populates="role", cascade="all, delete-orphan")
    business = db.relationship("Business", backref="roles")

    def to_dict(self):
        # Get permissions names
        # Security: Filter out system permissions if it's a business role
        if self.business_id:
             perm_names = [rp.permission.name for rp in self.permissions if rp.permission and rp.permission.scope != 'system']
        else:
             perm_names = [rp.permission.name for rp in self.permissions if rp.permission]

        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "is_system": self.is_system,
            "business_id": self.business_id,
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


sales_goal_viewers = db.Table('sales_goal_viewers',
    db.Column('sales_goal_id', db.Integer, db.ForeignKey('sales_goals.id'), primary_key=True),
    db.Column('user_id', db.Integer, db.ForeignKey('users.id'), primary_key=True)
)


class AuditLog(db.Model):
    """Log de auditoría"""
    __tablename__ = "audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), index=True)
    actor_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), index=True)
    actor_member_id = db.Column(db.Integer, db.ForeignKey("team_members.id"), index=True)
    actor_name = db.Column(db.String(100))
    actor_role = db.Column(db.String(100))
    module = db.Column(db.String(50), index=True)
    action = db.Column(db.String(50), nullable=False, index=True)  # create, read, update, delete, login, logout
    entity = db.Column(db.String(50), nullable=False, index=True)  # user, role, permission, business, product, etc.
    entity_type = db.Column(db.String(50), index=True)
    entity_id = db.Column(db.Integer, index=True)
    summary = db.Column(db.Text)
    metadata_json = db.Column(db.JSON)
    old_value = db.Column(db.JSON)
    new_value = db.Column(db.JSON)
    before_json = db.Column(db.JSON)
    after_json = db.Column(db.JSON)
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.String(255))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    # Relationships
    user = db.relationship("User", back_populates="audit_logs", foreign_keys=[user_id])

    def to_dict(self):
        details = self.metadata_json
        if details is None and (self.before_json is not None or self.after_json is not None):
            details = {
                "before": self.before_json,
                "after": self.after_json,
            }
        if details is None and (self.old_value is not None or self.new_value is not None):
            details = {
                "before": self.old_value,
                "after": self.new_value,
            }

        detail = None
        if isinstance(self.metadata_json, dict):
            detail = (
                self.metadata_json.get("detail")
                or self.metadata_json.get("details")
                or self.metadata_json.get("reason")
            )

        return {
            "id": self.id,
            "business_id": self.business_id,
            "user_id": self.user_id,
            "user_email": self.user.email if self.user else None,
            "actor_user_id": self.actor_user_id or self.user_id,
            "actor_member_id": self.actor_member_id,
            "actor_name": self.actor_name or (self.user.name if self.user else None),
            "actor_role": self.actor_role,
            "module": self.module,
            "action": self.action,
            "entity": self.entity,
            "entity_type": self.entity_type or self.entity,
            "entity_id": self.entity_id,
            "summary": self.summary,
            "detail": detail,
            "metadata_json": self.metadata_json,
            "old_value": self.old_value,
            "new_value": self.new_value,
            "before_json": self.before_json or self.old_value,
            "after_json": self.after_json or self.new_value,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "created_at": self.timestamp.isoformat() if self.timestamp else None,
            "details": details,
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


class Debt(db.Model):
    """Deuda del usuario (Cuentas por pagar)"""
    __tablename__ = "debts"

    id = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    creditor_name = db.Column(db.String(255)) # Nombre del proveedor/banco
    category = db.Column(db.String(100)) # Proveedores, Tarjetas, Préstamos, etc.
    total_amount = db.Column(db.Float, nullable=False)
    balance_due = db.Column(db.Float, nullable=False)
    start_date = db.Column(db.Date)
    due_date = db.Column(db.Date)
    frequency = db.Column(db.String(20)) # unique, weekly, biweekly, monthly, quarterly, annual
    interest_rate = db.Column(db.Float)
    installments = db.Column(db.Integer) # Número de cuotas
    estimated_installment = db.Column(db.Float) # Valor cuota estimada
    status = db.Column(db.String(20), default="pending") # pending, partial, paid, overdue
    origin_type = db.Column(db.String(20), default="manual") # manual, recurring
    recurring_expense_id = db.Column(db.Integer, db.ForeignKey("recurring_expenses.id"), index=True)
    generated_from_due_date = db.Column(db.Date)
    notes = db.Column(db.Text)
    reminder_enabled = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    payments = db.relationship("DebtPayment", backref="debt", lazy="dynamic", cascade="all, delete-orphan")

    def to_dict(self):
        amount_paid = max(float(self.total_amount or 0) - float(self.balance_due or 0), 0)
        today = date.today()
        is_paid = (self.status or "pending") == "paid" or float(self.balance_due or 0) <= 0
        scope = "financial" if str(self.category or "").strip().lower() in {"tarjetas", "prestamos", "financiaciones", "creditos", "leasing"} else "operational"
        days_until_due = None
        days_overdue = 0
        if self.due_date:
            days_until_due = (self.due_date - today).days
            if days_until_due < 0 and not is_paid:
                days_overdue = abs(days_until_due)
        return {
            "id": self.id,
            "business_id": self.business_id,
            "name": self.name,
            "creditor_name": self.creditor_name,
            "category": self.category,
            "total_amount": self.total_amount,
            "balance_due": self.balance_due,
            "amount_paid": round(amount_paid, 2),
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "frequency": self.frequency,
            "interest_rate": self.interest_rate,
            "installments": self.installments,
            "estimated_installment": self.estimated_installment,
            "status": self.status,
            "scope": scope,
            "status_label": "Pagada" if self.status == "paid" else "Parcial" if self.status == "partial" else "Vencida" if self.status == "overdue" else "Pendiente",
            "origin_type": self.origin_type or "manual",
            "recurring_expense_id": self.recurring_expense_id,
            "generated_from_due_date": self.generated_from_due_date.isoformat() if self.generated_from_due_date else None,
            "is_overdue": bool(self.due_date and self.due_date < today and not is_paid),
            "is_due_today": bool(self.due_date and self.due_date == today and not is_paid),
            "is_due_soon": bool(self.due_date and self.due_date > today and (self.due_date - today).days <= 7 and not is_paid),
            "days_until_due": days_until_due,
            "days_overdue": days_overdue,
            "notes": self.notes,
            "reminder_enabled": self.reminder_enabled,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f"<Debt {self.name} - {self.balance_due}>"


class DebtPayment(db.Model):
    """Abono a deuda"""
    __tablename__ = "debt_payments"

    id = db.Column(db.Integer, primary_key=True)
    debt_id = db.Column(db.Integer, db.ForeignKey("debts.id"), nullable=False, index=True)
    amount = db.Column(db.Float, nullable=False)
    payment_date = db.Column(db.Date, nullable=False)
    payment_method = db.Column(db.String(50)) # cash, transfer, etc.
    treasury_account_id = db.Column(db.Integer, db.ForeignKey("treasury_accounts.id"), index=True)
    note = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    treasury_account = db.relationship("TreasuryAccount", foreign_keys=[treasury_account_id])

    def to_dict(self):
        return {
            "id": self.id,
            "debt_id": self.debt_id,
            "amount": self.amount,
            "payment_date": self.payment_date.isoformat() if self.payment_date else None,
            "payment_method": self.payment_method,
            "treasury_account_id": self.treasury_account_id,
            "treasury_account_name": self.treasury_account.name if self.treasury_account else None,
            "treasury_account_type": self.treasury_account.account_type if self.treasury_account else None,
            "note": self.note,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<DebtPayment {self.amount}>"


class SummaryDailyAggregate(db.Model):
    __tablename__ = "summary_daily_aggregates"
    __table_args__ = (
        db.UniqueConstraint("business_id", "summary_date", name="uq_summary_daily_aggregates_business_date"),
        db.Index("ix_summary_daily_aggregates_business_summary_date", "business_id", "summary_date"),
    )

    id = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=False, index=True)
    summary_date = db.Column(db.Date, nullable=False, index=True)
    sales_total = db.Column(db.Float, nullable=False, default=0)
    sales_count = db.Column(db.Integer, nullable=False, default=0)
    total_cost = db.Column(db.Float, nullable=False, default=0)
    expenses_total = db.Column(db.Float, nullable=False, default=0)
    expenses_count = db.Column(db.Integer, nullable=False, default=0)
    payments_total = db.Column(db.Float, nullable=False, default=0)
    cash_sales_total = db.Column(db.Float, nullable=False, default=0)
    cash_sales_cost = db.Column(db.Float, nullable=False, default=0)
    payments_realized_cost = db.Column(db.Float, nullable=False, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    business = db.relationship("Business")

    def __repr__(self):
        return f"<SummaryDailyAggregate business={self.business_id} date={self.summary_date}>"


class SummaryCacheState(db.Model):
    __tablename__ = "summary_cache_states"
    __table_args__ = (
        db.UniqueConstraint("business_id", "namespace", name="uq_summary_cache_states_business_namespace"),
        db.Index("ix_summary_cache_states_business_namespace", "business_id", "namespace"),
    )

    id = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=False, index=True)
    namespace = db.Column(db.String(32), nullable=False, index=True)
    dirty = db.Column(db.Boolean, nullable=False, default=False)
    dirty_since = db.Column(db.DateTime)
    last_dirty_at = db.Column(db.DateTime)
    dirty_start_date = db.Column(db.Date)
    dirty_end_date = db.Column(db.Date)
    last_rebuilt_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    business = db.relationship("Business")

    def __repr__(self):
        return f"<SummaryCacheState business={self.business_id} namespace={self.namespace} dirty={self.dirty}>"

class ClientSyncOperation(db.Model):
    """Operación de sincronización del cliente"""
    __tablename__ = "client_sync_operations"
    __table_args__ = (
        db.UniqueConstraint("business_id", "user_id", "client_operation_id", name="uq_client_sync_operation_scope"),
    )

    id = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    client_operation_id = db.Column(db.String(120), nullable=False, index=True)
    entity_type = db.Column(db.String(50), nullable=False, index=True)
    action = db.Column(db.String(30), nullable=False, index=True)
    status = db.Column(db.String(20), nullable=False, default="pending", index=True)
    entity_id = db.Column(db.Integer, index=True)
    response_status = db.Column(db.Integer)
    response_payload = db.Column(db.JSON)
    error_message = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = db.relationship("User")

    def to_dict(self):
        return {
            "id": self.id,
            "business_id": self.business_id,
            "user_id": self.user_id,
            "client_operation_id": self.client_operation_id,
            "entity_type": self.entity_type,
            "action": self.action,
            "status": self.status,
            "entity_id": self.entity_id,
            "response_status": self.response_status,
            "response_payload": self.response_payload,
            "error_message": self.error_message,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f"<ClientSyncOperation {self.business_id}:{self.user_id}:{self.client_operation_id}>"

class TeamMember(db.Model):
    """Miembros del equipo de un negocio"""
    __tablename__ = "team_members"
    __table_args__ = (
        db.Index("ix_team_members_user_status_business", "user_id", "status", "business_id"),
    )

    id = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    role_id = db.Column(db.Integer, db.ForeignKey("roles.id"), nullable=False)
    status = db.Column(db.String(20), default="active") # active, inactive
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    role = db.relationship("Role")
    user = db.relationship("User", backref=db.backref("team_memberships", lazy="dynamic"))

    def to_dict(self):
        return {
            "id": self.id,
            "business_id": self.business_id,
            "user_id": self.user_id,
            "user_name": self.user.name if self.user else "Usuario",
            "user_email": self.user.email if self.user else "",
            "role": self.role.name if self.role else "Unknown",
            "role_id": self.role_id,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<TeamMember user={self.user_id} business={self.business_id} role={self.role_id}>"


class TeamInvitation(db.Model):
    """Invitaciones a formar parte del equipo"""
    __tablename__ = "team_invitations"

    id = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=False, index=True)
    email = db.Column(db.String(255), nullable=False)
    role_id = db.Column(db.Integer, db.ForeignKey("roles.id"), nullable=False)
    token = db.Column(db.String(100), unique=True, nullable=False, index=True)
    status = db.Column(db.String(20), default="pending") # pending, accepted, expired, cancelled
    message_id = db.Column(db.String(100))  # ID del mensaje en el proveedor de email
    delivery_status = db.Column(db.String(50))  # Estado de entrega (sent, delivered, opened, etc.)
    expires_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    invited_by = db.Column(db.Integer, db.ForeignKey("users.id"))
    
    # Tracking fields
    provider = db.Column(db.String(20)) # brevo, mailjet, smtp
    last_email_error = db.Column(db.Text)
    send_attempts = db.Column(db.Integer, default=0)
    last_sent_at = db.Column(db.DateTime)

    # Relationships
    role = db.relationship("Role")
    inviter = db.relationship("User", foreign_keys=[invited_by])

    def to_dict(self):
        return {
            "id": self.id,
            "business_id": self.business_id,
            "email": self.email,
            "role": self.role.name if self.role else "Unknown",
            "role_id": self.role_id,
            "token": self.token,
            "status": self.status,
            "delivery_status": self.delivery_status,
            "message_id": self.message_id,
            "last_email_error": self.last_email_error,
            "send_attempts": self.send_attempts,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_sent_at": self.last_sent_at.isoformat() if self.last_sent_at else None,
            "invited_by_name": self.inviter.name if self.inviter else "Sistema",
        }

    def __repr__(self):
        return f"<TeamInvitation {self.email} -> {self.business_id}>"


class TeamFeedback(db.Model):
    """Feedback interno de empleados a dueños"""
    __tablename__ = "team_feedback"

    id = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    type = db.Column(db.String(20), default="suggestion") # suggestion, complaint, notice, other
    subject = db.Column(db.String(255), nullable=False)
    message = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default="unread") # unread, read, archived
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    user = db.relationship("User")
    business = db.relationship("Business", backref="feedback")

    def to_dict(self):
        return {
            "id": self.id,
            "business_id": self.business_id,
            "user_id": self.user_id,
            "user_name": self.user.name if self.user else "Usuario",
            "type": self.type,
            "subject": self.subject,
            "message": self.message,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
