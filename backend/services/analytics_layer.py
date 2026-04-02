from datetime import datetime, timedelta
from sqlalchemy import func, case, cast, Date
from sqlalchemy.sql.expression import literal
from backend.database import db
from backend.models import Sale, Product, LedgerEntry, Expense, Payment, DebtPayment, Debt, Customer, ProductMovement, Reminder

class AnalyticsLayer:
    def __init__(self, business_id):
        self.business_id = business_id

    def _get_debt_scope(self, category):
        normalized = str(category or "").strip().lower()
        return "financial" if normalized in {"tarjetas", "prestamos", "financiaciones", "creditos", "leasing"} else "operational"

    def get_profitability_data(self, start_date=None, end_date=None):
        """
        Calcula la rentabilidad por producto y categoría.
        Aplana los items de venta (JSON) y los cruza con costos.
        """
        query = db.session.query(Sale).filter(Sale.business_id == self.business_id)
        if start_date:
            query = query.filter(Sale.sale_date >= start_date)
        if end_date:
            query = query.filter(Sale.sale_date <= end_date)
            
        sales = query.all()
        
        # Estructura: { product_id: { name, category, qty, revenue, cost, profit } }
        product_stats = {}
        
        # Cache de productos para obtener costo actual y categoría si no están en venta
        # Nota: Idealmente la venta debería guardar el costo histórico. 
        # Si la venta tiene total_cost, lo usamos. Si no, usamos el del producto actual.
        all_products = {p.id: p for p in Product.query.filter_by(business_id=self.business_id).all()}
        
        for sale in sales:
            if not sale.items or not isinstance(sale.items, list):
                continue
                
            for item in sale.items:
                if not isinstance(item, dict):
                    continue
                    
                p_id = item.get('product_id')
                p_name = item.get('name', 'Desconocido')
                qty = float(item.get('qty', 0))
                total_sale = float(item.get('total', 0))
                
                # Intentar obtener costo
                # 1. Si la venta guardó el costo unitario (ideal)
                # 2. Si no, buscar en producto actual
                unit_cost = 0
                category = "General"
                
                if p_id and p_id in all_products:
                    product = all_products[p_id]
                    unit_cost = product.cost or 0
                    # category = product.category # Si existiera categoría en modelo Product
                
                total_cost = unit_cost * qty
                profit = total_sale - total_cost
                
                key = p_id if p_id else p_name
                
                if key not in product_stats:
                    product_stats[key] = {
                        "id": p_id,
                        "name": p_name,
                        "category": category,
                        "qty": 0,
                        "revenue": 0,
                        "cost": 0,
                        "profit": 0
                    }
                
                product_stats[key]["qty"] += qty
                product_stats[key]["revenue"] += total_sale
                product_stats[key]["cost"] += total_cost
                product_stats[key]["profit"] += profit

        return list(product_stats.values())

    def get_aged_receivables(self):
        """
        Calcula la cartera por edades (0-30, 31-60, 61-90, >90).
        Basado en LedgerEntry.
        """
        # Obtener todos los clientes con movimientos
        # Necesitamos reconstruir el saldo pendiente y su antigüedad.
        # Estrategia simplificada: 
        # 1. Obtener saldo actual por cliente.
        # 2. Si saldo > 0, buscar las ventas más recientes que suman ese saldo (FIFO inverso) para determinar antigüedad.
        
        # Paso 1: Saldos por cliente
        customers_balance = {}
        
        entries = db.session.query(LedgerEntry).filter(
            LedgerEntry.business_id == self.business_id
        ).order_by(LedgerEntry.entry_date.desc()).all()
        
        for entry in entries:
            cid = entry.customer_id
            if cid not in customers_balance:
                customers_balance[cid] = {"balance": 0, "entries": []}
            
            amount = entry.amount
            if entry.entry_type == 'payment':
                amount = -amount
            
            customers_balance[cid]["balance"] += amount
            if entry.entry_type == 'charge':
                customers_balance[cid]["entries"].append(entry)
        
        aged_results = []
        today = datetime.now().date()
        
        for cid, data in customers_balance.items():
            balance = data["balance"]
            if balance <= 100: # Ignorar saldos insignificantes
                continue
                
            # Clasificar el saldo pendiente
            # Asumimos que el saldo pendiente corresponde a las ventas más recientes (o más antiguas según política, aquí usaremos antigüedad de la deuda viva)
            # Para "Cartera Vencida" normalmente se mira la fecha de vencimiento. Si no hay, usamos fecha de venta.
            
            breakdown = {
                "0-30": 0,
                "31-60": 0,
                "61-90": 0,
                "+90": 0,
                "total": balance
            }
            
            remaining_balance = balance
            
            # Recorrer cargos del más reciente al más antiguo para ver cuáles componen el saldo (LIFO para composición de saldo vivo?? No, normalmente se paga lo más viejo primero, asi que el saldo vivo es lo más nuevo)
            # CORRECCIÓN: Si el cliente paga, paga lo más viejo. Por tanto, lo que debe es lo más NUEVO.
            # Iteramos las deudas de la más nueva a la más vieja acumulando hasta llegar al saldo.
            
            sorted_charges = sorted(data["entries"], key=lambda x: x.entry_date, reverse=True)
            
            for charge in sorted_charges:
                if remaining_balance <= 0:
                    break
                
                charge_amount = charge.amount
                # Cuánto de este cargo está todavía pendiente?
                # En un modelo simple sin asignación explícita, asumimos que todo el saldo pendiente pertenece a estos últimos cargos.
                amount_contributing = min(remaining_balance, charge_amount)
                
                days_diff = (today - charge.entry_date).days
                
                if days_diff <= 30:
                    breakdown["0-30"] += amount_contributing
                elif days_diff <= 60:
                    breakdown["31-60"] += amount_contributing
                elif days_diff <= 90:
                    breakdown["61-90"] += amount_contributing
                else:
                    breakdown["+90"] += amount_contributing
                
                remaining_balance -= amount_contributing
            
            # Si sobró saldo (raro si la lógica contable está bien, pero posible por ajustes manuales), lo metemos a +90
            if remaining_balance > 0:
                 breakdown["+90"] += remaining_balance

            # Buscar nombre cliente (optimizar query fuera del loop si son muchos)
            # Aquí lo hacemos simple o pasamos el nombre si lo tuviéramos
            from backend.models import Customer
            cust = Customer.query.get(cid)
            customer_name = cust.name if cust else f"Cliente {cid}"
            
            aged_results.append({
                "customer_name": customer_name,
                **breakdown
            })
            
        return aged_results

    def get_cashflow_data(self, start_date, end_date):
        """
        Flujo de Caja Operativo (Entradas y Salidas reales de dinero).
        No ventas devengadas, sino cobradas.
        """
        # Entradas: Pagos de clientes (Sales Cash + Debt Payments)
        # Salidas: Gastos (Expenses + Recurring) + Debt Payments (pagos a proveedores si hubiera)
        
        cash_in = db.session.query(
            Payment.payment_date.label('date'),
            func.sum(Payment.amount).label('total'),
            literal('Venta/Abono').label('type')
        ).filter(
            Payment.business_id == self.business_id,
            Payment.payment_date >= start_date,
            Payment.payment_date <= end_date
        ).group_by(Payment.payment_date).all()
        
        timeline = {}
        
        for r in cash_in:
            d = r.date.isoformat() if hasattr(r.date, 'isoformat') else str(r.date)
            if d not in timeline:
                timeline[d] = {
                    "in": 0,
                    "operational_expense": 0,
                    "supplier_payment": 0,
                    "operational_obligation_payment": 0,
                    "financial_debt_payment": 0,
                }
            timeline[d]["in"] += r.total

        expenses = Expense.query.filter(
            Expense.business_id == self.business_id,
            Expense.expense_date >= start_date,
            Expense.expense_date <= end_date
        ).all()
        debt_ids = sorted({expense.debt_id for expense in expenses if expense.debt_id})
        debts_by_id = {}
        if debt_ids:
            debts_by_id = {
                debt.id: debt
                for debt in Debt.query.filter(Debt.id.in_(debt_ids), Debt.business_id == self.business_id).all()
            }

        for expense in expenses:
            d = expense.expense_date.isoformat() if hasattr(expense.expense_date, 'isoformat') else str(expense.expense_date)
            if d not in timeline:
                timeline[d] = {
                    "in": 0,
                    "operational_expense": 0,
                    "supplier_payment": 0,
                    "operational_obligation_payment": 0,
                    "financial_debt_payment": 0,
                }
            source_type = str(expense.source_type or "manual").strip().lower()
            amount = float(expense.amount or 0)
            if source_type == "supplier_payment":
                timeline[d]["supplier_payment"] += amount
            elif source_type == "debt_payment":
                related_debt = debts_by_id.get(expense.debt_id)
                scope = self._get_debt_scope(related_debt.category if related_debt else None)
                if scope == "financial":
                    timeline[d]["financial_debt_payment"] += amount
                else:
                    timeline[d]["operational_obligation_payment"] += amount
            else:
                timeline[d]["operational_expense"] += amount

        result = []
        for date_str in sorted(timeline.keys()):
            item = timeline[date_str]
            outcome = (
                item["operational_expense"]
                + item["supplier_payment"]
                + item["operational_obligation_payment"]
                + item["financial_debt_payment"]
            )
            result.append({
                "date": date_str,
                "income": item["in"],
                "operational_expense": item["operational_expense"],
                "supplier_payment": item["supplier_payment"],
                "operational_obligation_payment": item["operational_obligation_payment"],
                "financial_debt_payment": item["financial_debt_payment"],
                "outcome": outcome,
                "net": item["in"] - outcome
            })
            
        return result

    def get_team_performance_summary(self, start_date=None, end_date=None):
        """
        Reporte consolidado de gestión por equipo.
        Retorna lista de empleados con sus métricas.
        """
        # Estructura base
        team_stats = {}
        
        def get_stat(user_id, name="Desconocido", role=""):
            if user_id not in team_stats:
                team_stats[user_id] = {
                    "user_id": user_id,
                    "name": name,
                    "role": role,
                    "sales_count": 0,
                    "sales_total": 0,
                    "payments_count": 0,
                    "payments_total": 0,
                    "expenses_count": 0,
                    "expenses_total": 0,
                    "customers_created": 0,
                    "movements_count": 0,
                    "reminders_created": 0
                }
            return team_stats[user_id]

        # 1. Ventas (Productividad)
        sales_q = db.session.query(
            Sale.user_id,
            Sale.created_by_name,
            Sale.created_by_role,
            func.count(Sale.id),
            func.sum(Sale.total)
        ).filter(Sale.business_id == self.business_id)
        
        if start_date: sales_q = sales_q.filter(Sale.sale_date >= start_date)
        if end_date: sales_q = sales_q.filter(Sale.sale_date <= end_date)
        
        for uid, uname, urole, count, total in sales_q.group_by(Sale.user_id, Sale.created_by_name, Sale.created_by_role).all():
            if not uid: continue
            s = get_stat(uid, uname or "Usuario", urole)
            s["sales_count"] += count
            s["sales_total"] += (total or 0)
            if uname and s["name"] == "Desconocido": s["name"] = uname
            if urole and not s["role"]: s["role"] = urole

        # 2. Pagos (Caja Real)
        pay_q = db.session.query(
            Payment.created_by_user_id,
            Payment.created_by_name,
            Payment.created_by_role,
            func.count(Payment.id),
            func.sum(Payment.amount)
        ).filter(Payment.business_id == self.business_id)
        
        if start_date: pay_q = pay_q.filter(Payment.payment_date >= start_date)
        if end_date: pay_q = pay_q.filter(Payment.payment_date <= end_date)
        
        for uid, uname, urole, count, total in pay_q.group_by(Payment.created_by_user_id, Payment.created_by_name, Payment.created_by_role).all():
            if not uid: continue
            s = get_stat(uid, uname or "Usuario", urole)
            s["payments_count"] += count
            s["payments_total"] += (total or 0)
            if uname and s["name"] == "Desconocido": s["name"] = uname

        # 3. Gastos (Salidas)
        exp_q = db.session.query(
            Expense.created_by_user_id,
            Expense.created_by_name,
            Expense.created_by_role,
            func.count(Expense.id),
            func.sum(Expense.amount)
        ).filter(Expense.business_id == self.business_id)
        
        if start_date: exp_q = exp_q.filter(Expense.expense_date >= start_date)
        if end_date: exp_q = exp_q.filter(Expense.expense_date <= end_date)
        
        for uid, uname, urole, count, total in exp_q.group_by(Expense.created_by_user_id, Expense.created_by_name, Expense.created_by_role).all():
            if not uid: continue
            s = get_stat(uid, uname or "Usuario", urole)
            s["expenses_count"] += count
            s["expenses_total"] += (total or 0)
            if uname and s["name"] == "Desconocido": s["name"] = uname

        # 4. Clientes Creados
        cust_q = db.session.query(
            Customer.created_by_user_id,
            Customer.created_by_name,
            Customer.created_by_role,
            func.count(Customer.id)
        ).filter(Customer.business_id == self.business_id)
        
        if start_date: cust_q = cust_q.filter(Customer.created_at >= start_date)
        if end_date: cust_q = cust_q.filter(Customer.created_at <= end_date)
        
        for uid, uname, urole, count in cust_q.group_by(Customer.created_by_user_id, Customer.created_by_name, Customer.created_by_role).all():
            if not uid: continue
            s = get_stat(uid, uname or "Usuario", urole)
            s["customers_created"] += count
            if uname and s["name"] == "Desconocido": s["name"] = uname

        # 5. Movimientos (Logística)
        from backend.models import ProductMovement, Reminder
        
        mov_q = db.session.query(
            ProductMovement.user_id,
            ProductMovement.created_by_name,
            ProductMovement.created_by_role,
            func.count(ProductMovement.id)
        ).filter(ProductMovement.business_id == self.business_id)
        
        if start_date: mov_q = mov_q.filter(ProductMovement.created_at >= start_date)
        if end_date: mov_q = mov_q.filter(ProductMovement.created_at <= end_date)
        
        for uid, uname, urole, count in mov_q.group_by(ProductMovement.user_id, ProductMovement.created_by_name, ProductMovement.created_by_role).all():
            if not uid: continue
            s = get_stat(uid, uname or "Usuario", urole)
            s["movements_count"] += count
            if uname and s["name"] == "Desconocido": s["name"] = uname

        # 6. Recordatorios
        rem_q = db.session.query(
            Reminder.created_by_user_id,
            Reminder.created_by_name,
            Reminder.created_by_role,
            func.count(Reminder.id)
        ).filter(Reminder.business_id == self.business_id)
        
        if start_date: rem_q = rem_q.filter(Reminder.created_at >= start_date)
        if end_date: rem_q = rem_q.filter(Reminder.created_at <= end_date)
        
        for uid, uname, urole, count in rem_q.group_by(Reminder.created_by_user_id, Reminder.created_by_name, Reminder.created_by_role).all():
            if not uid: continue
            s = get_stat(uid, uname or "Usuario", urole)
            s["reminders_created"] += count
            if uname and s["name"] == "Desconocido": s["name"] = uname

        return list(team_stats.values())

    def get_team_activity_detail(self, start_date=None, end_date=None):
        """
        Obtiene un log cronológico unificado de actividades del equipo.
        """
        activities = []
        
        # 1. Ventas
        sales_q = db.session.query(Sale).filter(Sale.business_id == self.business_id)
        if start_date: sales_q = sales_q.filter(Sale.sale_date >= start_date)
        if end_date: sales_q = sales_q.filter(Sale.sale_date <= end_date)
        
        for s in sales_q.all():
            c_name = s.customer.name if s.customer else 'General'
            activities.append({
                "date": s.created_at, 
                "user_name": s.created_by_name or "Desconocido",
                "user_role": s.created_by_role or "",
                "action": "Venta",
                "reference": f"Venta #{s.id}",
                "amount": s.total,
                "detail": f"Cliente: {c_name}"
            })

        # 2. Pagos
        pay_q = db.session.query(Payment).filter(Payment.business_id == self.business_id)
        if start_date: pay_q = pay_q.filter(Payment.payment_date >= start_date)
        if end_date: pay_q = pay_q.filter(Payment.payment_date <= end_date)

        for p in pay_q.all():
            activities.append({
                "date": p.created_at,
                "user_name": p.created_by_name or "Desconocido",
                "user_role": p.created_by_role or "",
                "action": "Recaudo",
                "reference": f"Pago #{p.id}",
                "amount": p.amount,
                "detail": f"Método: {p.method}"
            })
            
        # 3. Gastos
        exp_q = db.session.query(Expense).filter(Expense.business_id == self.business_id)
        if start_date: exp_q = exp_q.filter(Expense.expense_date >= start_date)
        if end_date: exp_q = exp_q.filter(Expense.expense_date <= end_date)

        for e in exp_q.all():
            activities.append({
                "date": e.created_at,
                "user_name": e.created_by_name or "Desconocido",
                "user_role": e.created_by_role or "",
                "action": "Gasto",
                "reference": f"Gasto #{e.id}",
                "amount": e.amount,
                "detail": f"{e.category}: {e.description}"
            })

        # 4. Clientes
        cust_q = db.session.query(Customer).filter(Customer.business_id == self.business_id)
        if start_date: cust_q = cust_q.filter(Customer.created_at >= start_date)
        if end_date: cust_q = cust_q.filter(Customer.created_at <= end_date)
        
        for c in cust_q.all():
            activities.append({
                "date": c.created_at,
                "user_name": c.created_by_name or "Desconocido",
                "user_role": c.created_by_role or "",
                "action": "Cliente Nuevo",
                "reference": f"Cliente #{c.id}",
                "amount": 0,
                "detail": c.name
            })

        # 5. Movimientos
        from backend.models import ProductMovement, Reminder
        mov_q = db.session.query(ProductMovement).filter(ProductMovement.business_id == self.business_id)
        if start_date: mov_q = mov_q.filter(ProductMovement.created_at >= start_date)
        if end_date: mov_q = mov_q.filter(ProductMovement.created_at <= end_date)
        
        for m in mov_q.all():
             p_name = m.product.name if m.product else 'Eliminado'
             activities.append({
                "date": m.created_at,
                "user_name": m.created_by_name or (m.user.name if m.user else "Sistema"),
                "user_role": m.created_by_role or "",
                "action": f"Inventario ({m.type})",
                "reference": f"Mov #{m.id}",
                "amount": 0,
                "detail": f"{m.quantity}x {p_name} ({m.reason})"
            })

        # 6. Recordatorios
        rem_q = db.session.query(Reminder).filter(Reminder.business_id == self.business_id)
        if start_date: rem_q = rem_q.filter(Reminder.created_at >= start_date)
        if end_date: rem_q = rem_q.filter(Reminder.created_at <= end_date)

        for r in rem_q.all():
             activities.append({
                "date": r.created_at,
                "user_name": r.created_by_name or "Desconocido",
                "user_role": r.created_by_role or "",
                "action": "Recordatorio",
                "reference": f"Rec #{r.id}",
                "amount": 0,
                "detail": r.title
            })
            
        # Ordenar por fecha descendente (más reciente primero)
        # Manejar fechas nulas por seguridad
        activities.sort(key=lambda x: x["date"] if x["date"] else datetime.min, reverse=True)
        return activities
