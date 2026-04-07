#!/usr/bin/env python3
"""
Script to generate test sales data for the last 30 days
"""
import sys
import os
from datetime import date, timedelta
import random

# Add the backend to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.main import app, db
from backend.models import Sale, Product, Customer, Business, LedgerEntry

def generate_test_sales():
    with app.app_context():
        # Get the business
        business = Business.query.first()
        if not business:
            print("No business found!")
            return
        
        # Get some products
        products = Product.query.filter_by(business_id=business.id, active=True).limit(10).all()
        if not products:
            print("No products found! Creating some...")
            # Create test products
            test_products = [
                Product(business_id=business.id, name="Producto A", sku="A001", price=10000, cost=5000, unit="und", stock=100, active=True),
                Product(business_id=business.id, name="Producto B", sku="B001", price=15000, cost=8000, unit="und", stock=80, active=True),
                Product(business_id=business.id, name="Producto C", sku="C001", price=20000, cost=10000, unit="und", stock=50, active=True),
            ]
            for p in test_products:
                db.session.add(p)
            db.session.commit()
            products = Product.query.filter_by(business_id=business.id, active=True).limit(10).all()
        
        # Get or create a test customer
        customer = Customer.query.filter_by(business_id=business.id).first()
        if not customer:
            customer = Customer(
                business_id=business.id,
                name="Cliente de Prueba",
                phone="3001234567",
                active=True
            )
            db.session.add(customer)
            db.session.commit()
        
        # Generate sales for the last 60 days (30 for previous period + 30 for current)
        today = date.today()
        thirty_days_ago = today - timedelta(days=30)
        sixty_days_ago = today - timedelta(days=60)
        
        # Delete existing test sales from the last 60 days
        Sale.query.filter(
            Sale.business_id == business.id,
            Sale.sale_date >= sixty_days_ago
        ).delete()
        db.session.commit()
        
        print(f"Generating sales from {sixty_days_ago} to {today}...")
        
        total_sales = 0
        # Generate 60 days of data
        for day_offset in range(60):
            sale_date = sixty_days_ago + timedelta(days=day_offset)
            
            # Generate 1-5 sales per day
            num_sales = random.randint(1, 5)
            
            for _ in range(num_sales):
                # Random number of items (1-3)
                num_items = random.randint(1, 3)
                items = []
                subtotal = 0
                
                for _ in range(num_items):
                    product = random.choice(products)
                    quantity = random.randint(1, 3)
                    items.append({
                        "product_id": product.id,
                        "name": product.name,
                        "quantity": quantity,
                        "price": product.price,
                        "subtotal": product.price * quantity
                    })
                    subtotal += product.price * quantity
                
                discount = random.choice([0, 0, 0, subtotal * 0.1])  # 25% chance of 10% discount
                total = subtotal - discount
                
                is_fiado = random.random() < 0.1  # 10% chance of fiado
                
                sale = Sale(
                    business_id=business.id,
                    customer_id=customer.id,
                    sale_date=sale_date,
                    items=items,
                    subtotal=subtotal,
                    discount=discount,
                    total=total,
                    balance=total if is_fiado else 0,  # fiado = owes money
                    paid=not is_fiado,  # fiado is not paid yet
                    payment_method=random.choice(["cash", "card", "transfer"])
                )
                db.session.add(sale)
                db.session.flush()  # Get the sale ID
                
                # If fiado, create ledger entry (charge)
                if is_fiado:
                    ledger_entry = LedgerEntry(
                        business_id=business.id,
                        customer_id=customer.id,
                        entry_type="charge",
                        amount=total,
                        entry_date=sale_date,
                        note=f"Venta #{sale.id}",
                        ref_type="sale",
                        ref_id=sale.id
                    )
                    db.session.add(ledger_entry)
                total_sales += 1
        
        db.session.commit()
        print(f"Generated {total_sales} test sales!")

if __name__ == "__main__":
    generate_test_sales()
