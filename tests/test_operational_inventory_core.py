import os
import sys
from datetime import date

import pytest
from sqlalchemy.pool import StaticPool

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.config import TestingConfig
from backend.database import db
from backend.main import create_app
from backend.models import (
    Business,
    Product,
    ProductMovement,
    RawMaterial,
    Recipe,
    RecipeConsumption,
    RecipeItem,
    Sale,
    User,
)
from backend.services.business_operational_profile import normalize_business_operational_profile
from backend.services.operational_inventory import InsufficientRawMaterialsError, register_stock_production
from backend.services.sale_inventory import apply_sale_inventory_effects


class TestOperationalCoreConfig(TestingConfig):
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SQLALCHEMY_ENGINE_OPTIONS = {
        "connect_args": {"check_same_thread": False},
        "poolclass": StaticPool,
    }


@pytest.fixture
def app():
    app = create_app(TestOperationalCoreConfig)
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()


@pytest.fixture
def app_ctx(app):
    with app.app_context():
        yield
        db.session.rollback()
        db.drop_all()
        db.create_all()


@pytest.fixture
def actor(app_ctx):
    user = User(
        email="operational@example.com",
        password_hash="test-hash",
        name="Operational Owner",
        plan="business",
        account_type="personal",
        email_verified=True,
    )
    db.session.add(user)
    db.session.flush()
    return user


def _build_business(actor, **profile_overrides):
    profile = normalize_business_operational_profile(
        {
            "operational_model": "mixed",
            "inventory_model": "mixed",
            "fulfillment_mode": "hybrid",
            "production_mode": "mixed",
            "recipe_mode": "fixed",
            "production_control_mode": "enabled",
            "manages_raw_materials": True,
            "tracks_finished_goods_stock": True,
            "uses_raw_inventory": True,
            "uses_recipes": True,
            "controls_production": True,
            "supports_quotes": True,
            "supports_make_to_order": True,
            "consumes_raw_materials_on_production": True,
            "consumes_raw_materials_on_sale": True,
            "consumes_raw_materials_on_quote_conversion": True,
            **profile_overrides,
        }
    )
    business = Business(
        user_id=actor.id,
        name="Operational QA Business",
        currency="COP",
        settings={"operational_profile": profile},
    )
    db.session.add(business)
    db.session.flush()
    return business


def _create_recipe_product(
    *,
    business,
    fulfillment_mode,
    product_type="product",
    raw_stock=100.0,
    product_stock=0.0,
    quantity_required=2.0,
    product_cost=8.0,
):
    raw_material = RawMaterial(
        business_id=business.id,
        name=f"Raw for {fulfillment_mode}",
        unit="kg",
        current_stock=raw_stock,
        minimum_stock=0,
        reference_cost=3.0,
        is_active=True,
    )
    product = Product(
        business_id=business.id,
        name=f"Product {fulfillment_mode}",
        type=product_type,
        price=25.0,
        cost=product_cost,
        unit="und",
        stock=product_stock,
        low_stock_threshold=0,
        fulfillment_mode=fulfillment_mode,
        active=True,
    )
    db.session.add_all([raw_material, product])
    db.session.flush()

    recipe = Recipe(
        business_id=business.id,
        product_id=product.id,
        name=f"Recipe {fulfillment_mode}",
        is_active=True,
    )
    db.session.add(recipe)
    db.session.flush()

    recipe_item = RecipeItem(
        recipe_id=recipe.id,
        raw_material_id=raw_material.id,
        quantity_required=quantity_required,
        sort_order=0,
    )
    db.session.add(recipe_item)
    db.session.flush()
    return product, raw_material, recipe


def _create_sale(business, actor, total=25.0):
    sale = Sale(
        business_id=business.id,
        user_id=actor.id,
        sale_date=date.today(),
        items=[],
        subtotal=total,
        discount=0,
        total=total,
        balance=0,
        collected_amount=total,
        payment_method="cash",
        paid=True,
        created_by_name=actor.name,
        created_by_role="owner",
        updated_by_user_id=actor.id,
    )
    db.session.add(sale)
    db.session.flush()
    return sale


def test_make_to_stock_production_then_sale_only_reduces_finished_goods(actor):
    business = _build_business(actor, tracks_finished_goods_stock=True)
    product, raw_material, _recipe = _create_recipe_product(
        business=business,
        fulfillment_mode="make_to_stock",
        raw_stock=30.0,
        product_stock=0.0,
        quantity_required=2.0,
    )

    production = register_stock_production(
        business=business,
        product=product,
        quantity=3,
        actor_user=actor,
        role_snapshot="owner",
        notes="Lote operativo",
    )
    db.session.flush()

    assert production["recipe_consumption"].source_type == "production"
    assert production["recipe_consumption"].source_document_type == "product"
    assert production["recipe_consumption"].source_document_id == product.id
    assert product.stock == pytest.approx(3.0)
    assert raw_material.current_stock == pytest.approx(24.0)

    sale = _create_sale(business, actor, total=25.0)
    items = [{"product_id": product.id, "quantity": 1, "qty": 1, "unit_price": 25.0, "total": 25.0}]

    total_cost = apply_sale_inventory_effects(
        business=business,
        sale=sale,
        items=items,
        actor_user=actor,
        role_snapshot="owner",
        raw_material_consumption_mode="sale",
    )
    db.session.flush()

    assert total_cost == pytest.approx(8.0)
    assert product.stock == pytest.approx(2.0)
    assert raw_material.current_stock == pytest.approx(24.0)
    assert RecipeConsumption.query.count() == 1
    assert items[0]["inventory_effects"]["finished_goods_stock_decremented"] is True
    assert items[0]["inventory_effects"]["raw_material_consumed"] is False



def test_make_to_stock_production_rolls_back_on_insufficient_raw_materials(actor):
    business = _build_business(actor, tracks_finished_goods_stock=True)
    product, raw_material, _recipe = _create_recipe_product(
        business=business,
        fulfillment_mode="make_to_stock",
        raw_stock=4.0,
        product_stock=0.0,
        quantity_required=3.0,
    )

    with pytest.raises(InsufficientRawMaterialsError):
        register_stock_production(
            business=business,
            product=product,
            quantity=2,
            actor_user=actor,
            role_snapshot="owner",
        )

    db.session.flush()
    assert product.stock == pytest.approx(0.0)
    assert raw_material.current_stock == pytest.approx(4.0)
    assert RecipeConsumption.query.count() == 0



def test_manual_stock_adjustment_does_not_consume_raw_materials(actor):
    business = _build_business(actor, tracks_finished_goods_stock=True)
    product, raw_material, _recipe = _create_recipe_product(
        business=business,
        fulfillment_mode="make_to_stock",
        raw_stock=15.0,
        product_stock=1.0,
        quantity_required=1.5,
    )

    product.stock += 4
    movement = ProductMovement(
        product_id=product.id,
        business_id=business.id,
        user_id=actor.id,
        type="in",
        quantity=4,
        reason="Ajuste manual QA",
        created_by_name=actor.name,
        created_by_role="owner",
    )
    db.session.add(movement)
    db.session.flush()

    assert product.stock == pytest.approx(5.0)
    assert raw_material.current_stock == pytest.approx(15.0)
    assert RecipeConsumption.query.count() == 0



def test_make_to_order_direct_sale_consumes_raw_materials_without_finished_goods_stock(actor):
    business = _build_business(
        actor,
        tracks_finished_goods_stock=False,
        consumes_raw_materials_on_sale=True,
        consumes_raw_materials_on_production=False,
    )
    product, raw_material, _recipe = _create_recipe_product(
        business=business,
        fulfillment_mode="make_to_order",
        raw_stock=20.0,
        product_stock=0.0,
        quantity_required=2.0,
    )
    sale = _create_sale(business, actor, total=50.0)
    items = [{"product_id": product.id, "quantity": 2, "qty": 2, "unit_price": 25.0, "total": 50.0}]

    total_cost = apply_sale_inventory_effects(
        business=business,
        sale=sale,
        items=items,
        actor_user=actor,
        role_snapshot="owner",
        raw_material_consumption_mode="sale",
    )
    db.session.flush()

    consumption = RecipeConsumption.query.one()
    assert total_cost == pytest.approx(12.0)
    assert product.stock == pytest.approx(0.0)
    assert raw_material.current_stock == pytest.approx(16.0)
    assert consumption.related_sale_id == sale.id
    assert consumption.source_type == "sale"
    assert consumption.source_document_type == "sale"
    assert consumption.source_document_id == sale.id
    assert items[0]["inventory_effects"]["finished_goods_stock_decremented"] is False
    assert items[0]["inventory_effects"]["raw_material_consumed"] is True
    assert items[0]["inventory_effects"]["raw_material_source_type"] == "sale"



def test_make_to_order_order_conversion_consumes_raw_materials_with_traceability(actor):
    business = _build_business(
        actor,
        tracks_finished_goods_stock=False,
        consumes_raw_materials_on_sale=True,
        consumes_raw_materials_on_production=False,
    )
    product, raw_material, _recipe = _create_recipe_product(
        business=business,
        fulfillment_mode="make_to_order",
        raw_stock=10.0,
        product_stock=0.0,
        quantity_required=1.0,
    )
    sale = _create_sale(business, actor, total=25.0)
    items = [{"product_id": product.id, "quantity": 1, "qty": 1, "unit_price": 25.0, "total": 25.0}]

    apply_sale_inventory_effects(
        business=business,
        sale=sale,
        items=items,
        actor_user=actor,
        role_snapshot="owner",
        raw_material_consumption_mode="order_conversion",
    )
    db.session.flush()

    consumption = RecipeConsumption.query.one()
    assert raw_material.current_stock == pytest.approx(9.0)
    assert consumption.source_type == "order_conversion"
    assert items[0]["inventory_effects"]["raw_material_source_type"] == "order_conversion"



def test_resale_stock_sale_only_reduces_finished_goods(actor):
    business = _build_business(
        actor,
        tracks_finished_goods_stock=True,
        manages_raw_materials=False,
        uses_raw_inventory=False,
        uses_recipes=False,
        consumes_raw_materials_on_sale=False,
        consumes_raw_materials_on_production=False,
    )
    product = Product(
        business_id=business.id,
        name="Resale QA",
        type="product",
        price=18.0,
        cost=7.0,
        unit="und",
        stock=6.0,
        low_stock_threshold=0,
        fulfillment_mode="resale_stock",
        active=True,
    )
    db.session.add(product)
    db.session.flush()
    sale = _create_sale(business, actor, total=36.0)
    items = [{"product_id": product.id, "quantity": 2, "qty": 2, "unit_price": 18.0, "total": 36.0}]

    total_cost = apply_sale_inventory_effects(
        business=business,
        sale=sale,
        items=items,
        actor_user=actor,
        role_snapshot="owner",
        raw_material_consumption_mode="sale",
    )
    db.session.flush()

    assert total_cost == pytest.approx(14.0)
    assert product.stock == pytest.approx(4.0)
    assert RecipeConsumption.query.count() == 0
    assert items[0]["inventory_effects"]["finished_goods_stock_decremented"] is True
    assert items[0]["inventory_effects"]["raw_material_consumed"] is False



def test_service_sale_has_no_inventory_effects(actor):
    business = _build_business(
        actor,
        tracks_finished_goods_stock=False,
        manages_raw_materials=False,
        uses_raw_inventory=False,
        uses_recipes=False,
        consumes_raw_materials_on_sale=False,
        consumes_raw_materials_on_production=False,
    )
    service = Product(
        business_id=business.id,
        name="Service QA",
        type="service",
        price=40.0,
        cost=0.0,
        unit="hr",
        stock=0.0,
        low_stock_threshold=0,
        fulfillment_mode="service",
        active=True,
    )
    db.session.add(service)
    db.session.flush()
    sale = _create_sale(business, actor, total=40.0)
    items = [{"product_id": service.id, "quantity": 1, "qty": 1, "unit_price": 40.0, "total": 40.0}]

    total_cost = apply_sale_inventory_effects(
        business=business,
        sale=sale,
        items=items,
        actor_user=actor,
        role_snapshot="owner",
        raw_material_consumption_mode="sale",
    )
    db.session.flush()

    assert total_cost == pytest.approx(0.0)
    assert service.stock == pytest.approx(0.0)
    assert RecipeConsumption.query.count() == 0
    assert items[0]["inventory_effects"]["finished_goods_stock_decremented"] is False
    assert items[0]["inventory_effects"]["raw_material_consumed"] is False
