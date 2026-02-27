        // Custom Alert/Confirm/Prompt System
        let modalCallback = null;
        let modalType = 'alert';
        
        function showCustomAlert(message, type = 'info') {
            return new Promise((resolve) => {
                const modal = document.getElementById('custom-modal');
                const icon = document.getElementById('modal-icon');
                const title = document.getElementById('modal-title');
                const msg = document.getElementById('modal-message');
                const input = document.getElementById('modal-input');
                const cancelBtn = document.getElementById('modal-cancel');
                const confirmBtn = document.getElementById('modal-confirm');
                
                modalType = 'alert';
                
                const icons = {
                    info: '<i class="ph ph-info text-xl text-blue-400"></i>',
                    success: '<i class="ph ph-check-circle text-xl text-green-400"></i>',
                    warning: '<i class="ph ph-warning text-xl text-yellow-400"></i>',
                    error: '<i class="ph ph-x-circle text-xl text-red-400"></i>',
                    question: '<i class="ph ph-question text-xl text-white"></i>'
                };
                
                const titles = {
                    info: 'Información',
                    success: 'Éxito',
                    warning: 'Advertencia',
                    error: 'Error',
                    question: 'Confirmar'
                };
                
                icon.innerHTML = icons[type] || icons.info;
                icon.className = 'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-white/10';
                title.textContent = titles[type] || 'Información';
                msg.textContent = message;
                input.classList.add('hidden');
                cancelBtn.classList.add('hidden');
                confirmBtn.textContent = 'Aceptar';
                confirmBtn.className = 'px-5 py-2.5 rounded-xl btn-primary transition-colors';
                
                modalCallback = resolve;
                modal.classList.remove('hidden');
            });
        }
        
        function showCustomConfirm(message, type = 'warning') {
            return new Promise((resolve) => {
                const modal = document.getElementById('custom-modal');
                const icon = document.getElementById('modal-icon');
                const title = document.getElementById('modal-title');
                const msg = document.getElementById('modal-message');
                const input = document.getElementById('modal-input');
                const cancelBtn = document.getElementById('modal-cancel');
                const confirmBtn = document.getElementById('modal-confirm');
                
                modalType = 'confirm';
                
                if (type === 'danger') {
                    icon.innerHTML = '<i class="ph ph-trash text-xl text-red-400"></i>';
                    icon.className = 'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-red-500/20';
                    title.textContent = '¿Eliminar elemento?';
                    confirmBtn.className = 'px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white transition-colors';
                } else {
                    icon.innerHTML = '<i class="ph ph-question text-xl text-white"></i>';
                    icon.className = 'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-yellow-500/20';
                    title.textContent = 'Confirmar';
                    confirmBtn.className = 'px-5 py-2.5 rounded-xl btn-primary transition-colors';
                }
                
                msg.textContent = message;
                input.classList.add('hidden');
                cancelBtn.classList.remove('hidden');
                cancelBtn.textContent = 'Cancelar';
                confirmBtn.textContent = 'Confirmar';
                
                modalCallback = (value) => resolve(value);
                modal.classList.remove('hidden');
            });
        }
        
        function showCustomPrompt(message, defaultValue = '') {
            return new Promise((resolve) => {
                const modal = document.getElementById('custom-modal');
                const icon = document.getElementById('modal-icon');
                const title = document.getElementById('modal-title');
                const msg = document.getElementById('modal-message');
                const input = document.getElementById('modal-input');
                const cancelBtn = document.getElementById('modal-cancel');
                const confirmBtn = document.getElementById('modal-confirm');
                
                modalType = 'prompt';
                
                icon.innerHTML = '<i class="ph ph-pencil text-xl text-white"></i>';
                icon.className = 'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-blue-500/20';
                title.textContent = 'Ingresar';
                msg.textContent = message;
                input.value = defaultValue;
                input.classList.remove('hidden');
                cancelBtn.classList.remove('hidden');
                cancelBtn.textContent = 'Cancelar';
                confirmBtn.textContent = 'Aceptar';
                confirmBtn.className = 'px-5 py-2.5 rounded-xl btn-primary transition-colors';
                
                modalCallback = (value) => resolve(value);
                modal.classList.remove('hidden');
                setTimeout(() => input.focus(), 100);
            });
        }
        
        function closeCustomModal() {
            const modal = document.getElementById('custom-modal');
            modal.classList.add('hidden');
            if (modalCallback) {
                if (modalType === 'confirm') {
                    modalCallback(false);
                } else if (modalType === 'prompt') {
                    modalCallback(null);
                }
                modalCallback = null;
            }
        }
        
        function confirmCustomModal() {
            const modal = document.getElementById('custom-modal');
            const input = document.getElementById('modal-input');
            modal.classList.add('hidden');
            if (modalCallback) {
                if (modalType === 'prompt') {
                    modalCallback(input.value || null);
                } else {
                    modalCallback(true);
                }
                modalCallback = null;
            }
        }
        
        // Keyboard support
        document.addEventListener('keydown', function(e) {
            const modal = document.getElementById('custom-modal');
            if (modal && !modal.classList.contains('hidden')) {
                if (e.key === 'Escape') {
                    closeCustomModal();
                } else if (e.key === 'Enter') {
                    confirmCustomModal();
                }
            }
        });
        
        // Override native alert/confirm/prompt with custom styled versions
        window.alert = function(message) {
            let type = 'info';
            const lowerMsg = message.toLowerCase();
            if (lowerMsg.includes('✅') || lowerMsg.includes('éxito') || lowerMsg.includes('correctamente') || lowerMsg.includes('listo') || lowerMsg.includes('guardado')) {
                type = 'success';
            } else if (lowerMsg.includes('error')) {
                type = 'error';
            } else if (lowerMsg.includes('advertencia') || lowerMsg.includes('cuidado')) {
                type = 'warning';
            }
            return showCustomAlert(message, type);
        };
        
        window.showConfirm = function(message) {
            return showCustomConfirm(message);
        };
        
        window.showPrompt = function(message, defaultValue) {
            return showCustomPrompt(message, defaultValue || '');
        };

        // Configuración para Capacitor / Híbrido (app móvil)
        const isCapacitor = !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform())
            || window.location.protocol === 'capacitor:'
            || (window.location.hostname === 'localhost' && window.location.port !== '5000' && window.location.port !== '8000');
        const API_BASE_URL = isCapacitor ? 'https://app.encaja.co' : '';

        // Cuaderno App
        const app = {
            // State
            user: null,
            business: null,
            businesses: [],
            token: null,
            products: [],
            customers: [],
            currentPage: 'dashboard',
            dashboardPeriod: 'month',
            pricingCycle: 'monthly',
            pricingMonthlyCop: 19900,
            pricingAnnualDiscount: 0.15,
            selectedPaymentMethod: 'card',
            
            // Storage helper - handles Tracking Prevention blocking localStorage
            storage: {
                get(key) {
                    try {
                        const item = localStorage.getItem(key);
                        return item ? JSON.parse(item) : null;
                    } catch(e) {}
                    try {
                        const item = sessionStorage.getItem(key);
                        return item ? JSON.parse(item) : null;
                    } catch(e) {}
                    if (window._appStorage && window._appStorage[key]) {
                        return window._appStorage[key];
                    }
                    return null;
                },
                set(key, value) {
                    try {
                        localStorage.setItem(key, JSON.stringify(value));
                        return true;
                    } catch(e) {}
                    try {
                        sessionStorage.setItem(key, JSON.stringify(value));
                        return true;
                    } catch(e) {}
                    if (!window._appStorage) window._appStorage = {};
                    window._appStorage[key] = value;
                    return true;
                },
                remove(key) {
                    try {
                        localStorage.removeItem(key);
                    } catch(e) {}
                    try {
                        sessionStorage.removeItem(key);
                    } catch(e) {}
                    if (window._appStorage && window._appStorage[key]) {
                        delete window._appStorage[key];
                    }
                }
            },
            
            // Format money
            formatMoney(amount) {
                return new Intl.NumberFormat('es-CO', {
                    style: 'currency',
                    currency: this.business?.currency || 'COP',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }).format(amount);
            },

            // WhatsApp Message Builder - Single Source of Truth
            buildWhatsappMessage(sale) {
                const customerName = this.customersMap && this.customersMap[sale.customer_id] ? this.customersMap[sale.customer_id] : '';
                const businessName = this.business ? this.business.name : 'Mi Negocio';
                
                // Get template or default
                const templates = this.business.whatsapp_templates || {};
                let template = templates.sale_message;
                
                if (!template) {
                    template = "Hola {cliente}, gracias por tu compra en *{negocio}*.\n\n" +
                               "*Detalle:*\n{items}\n" +
                               "*TOTAL: {total}*\n" +
                               "Pagado: {pagado}\n" +
                               "Saldo: {saldo}\n\n" +
                               "¡Esperamos verte pronto! 👋";
                }
                
                // Build items list
                let itemsList = "";
                if (sale.items && sale.items.length > 0) {
                    itemsList = sale.items.map(item => {
                        const price = item.price || 0;
                        const qty = item.qty || 1;
                        const subtotal = price * qty;
                        return `- ${item.name} (x${qty}): ${this.formatMoney(subtotal)}`;
                    }).join('\n');
                } else {
                    itemsList = "Sin detalle de productos";
                }
                
                // Replace variables
                let message = template
                    .replace(/{cliente}/g, customerName || 'Cliente')
                    .replace(/{negocio}/g, businessName)
                    .replace(/{total}/g, this.formatMoney(sale.total))
                    .replace(/{items}/g, itemsList)
                    .replace(/{pagado}/g, this.formatMoney(sale.paid || 0))
                    .replace(/{saldo}/g, this.formatMoney(sale.balance || 0));
                
                return message;
            },

            // Free Plan Check
            isFreePlan() {
                return !this.user || !this.user.plan || this.user.plan === 'free';
            },

            async checkFreeLimit(type) {
                if (!this.isFreePlan()) return true;

                let limit = 0;
                let current = 0;
                let label = '';

                try {
                    switch (type) {
                        case 'sales':
                            limit = 20;
                            // Check count from loaded sales if available, or fetch
                            const salesData = await this.api(`/businesses/${this.business.id}/sales?limit=1`); 
                            // Assuming backend returns total count in pagination or similar. 
                            // If not, fetching all might be heavy but necessary if no count endpoint.
                            // However, let's try to be efficient. If the backend returns 'total' in meta, good.
                            // If not, for now let's just fetch all as the limit is small (20) so for free users it won't be heavy.
                            const allSales = await this.api(`/businesses/${this.business.id}/sales`);
                            current = allSales.sales ? allSales.sales.length : 0;
                            label = 'ventas';
                            break;
                        case 'expenses':
                            limit = 20;
                            const allExpenses = await this.api(`/businesses/${this.business.id}/expenses`);
                            current = allExpenses.expenses ? allExpenses.expenses.length : 0;
                            label = 'gastos';
                            break;
                        case 'customers':
                            limit = 10;
                            const allCustomers = await this.api(`/businesses/${this.business.id}/customers`);
                            current = allCustomers.customers ? allCustomers.customers.length : 0;
                            label = 'clientes';
                            break;
                        case 'products':
                            limit = 5;
                            const allProducts = await this.api(`/businesses/${this.business.id}/products`);
                            current = allProducts.products ? allProducts.products.length : 0;
                            label = 'productos';
                            break;
                    }

                    if (current >= limit) {
                        const goPro = await showConfirm(`Has alcanzado el límite de ${limit} ${label} del Plan Gratuito.\n\n¿Deseas actualizar a Pro para tener ilimitado?`);
                        if (goPro) this.navigate('upgrade');
                        return false;
                    }
                    return true;
                } catch (e) {
                    console.error('Error checking limits:', e);
                    return true; 
                }
            },

            applyProLocks() {
                if (!this.isFreePlan()) return;

                // Lock sections with overlay
                const lockSection = (id, title) => {
                    const el = document.getElementById(id);
                    if (!el) return;
                    
                    // Check if already locked
                    if (el.querySelector('.pro-overlay')) return;
                    
                    el.classList.add('pro-locked');
                    el.style.position = 'relative'; 
                    
                    const overlay = document.createElement('div');
                    overlay.className = 'pro-overlay';
                    overlay.innerHTML = `
                        <div class="pro-overlay-content">
                            <div class="w-10 h-10 mx-auto mb-2 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                                <i class="ph ph-lock-key text-xl text-white"></i>
                            </div>
                            <h3 class="text-base font-bold text-white mb-1">Función Pro</h3>
                            <p class="text-white/70 text-xs mb-3">Actualiza para desbloquear ${title}.</p>
                            <button onclick="app.navigate('upgrade')" class="btn-primary px-4 py-1.5 rounded-lg text-xs font-bold shadow-lg shadow-blue-500/30 hover:scale-105 transition-transform w-full">
                                Ver Planes
                            </button>
                        </div>
                    `;
                    el.appendChild(overlay);
                };

                // Apply locks
                // Only lock if the element is visible/rendered
                setTimeout(() => {
                    lockSection('page-orders', 'Pedidos');
                    lockSection('page-recurring_expenses', 'Gastos Recurrentes');
                    lockSection('widget-quick-notes', 'Notas Rápidas'); 
                    lockSection('widget-projections', 'Proyecciones'); 
                    lockSection('dashboard-top-products', 'Productos Más Vendidos'); 
                    lockSection('widget-top-products', 'Productos Más Vendidos'); 
                }, 100);
            },
            
            reportProblem() {
                const userId = this.user ? this.user.id : 'N/A';
                const businessId = this.business ? this.business.id : 'N/A';
                const appVersion = '1.0.0'; // Hardcoded for now
                const browser = navigator.userAgent;
                
                const message = `Hola, quiero reportar un problema.\n\n` +
                    `Info Técnica:\n` +
                    `- User ID: ${userId}\n` +
                    `- Business ID: ${businessId}\n` +
                    `- App Version: ${appVersion}\n` +
                    `- Navegador: ${browser}\n\n` +
                    `Descripción del problema: `;
                
                const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
                // Replace with actual support number
                const supportNumber = '573001234567'; 
                const url = isMobile 
                    ? `https://wa.me/${supportNumber}?text=${encodeURIComponent(message)}`
                    : `https://web.whatsapp.com/send?phone=${supportNumber}&text=${encodeURIComponent(message)}`;
                
                window.open(url, '_blank');
            },

            reportProblemEmail() {
                const userId = this.user ? this.user.id : 'N/A';
                const businessId = this.business ? this.business.id : 'N/A';
                const appVersion = '1.0.0';
                const browser = navigator.userAgent;
                
                const subject = `Reporte de Problema - User ${userId}`;
                const body = `Hola equipo de soporte,\n\n` +
                    `Estoy experimentando el siguiente problema:\n\n\n` +
                    `----------------------------------------\n` +
                    `Información Técnica:\n` +
                    `- User ID: ${userId}\n` +
                    `- Business ID: ${businessId}\n` +
                    `- App Version: ${appVersion}\n` +
                    `- Navegador: ${browser}`;
                
                window.location.href = `mailto:soporte@encaja.co?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            },

            // API helpers
            async api(endpoint, options = {}) {
                // Si estamos en Capacitor, agregar la URL base
                const url = endpoint.startsWith('http') ? endpoint : (API_BASE_URL + '/api' + endpoint);
                const headers = {
                    'Content-Type': 'application/json',
                    ...options.headers
                };
                
                if (this.token) {
                    headers['Authorization'] = 'Bearer ' + this.token;
                }
                
                try {
                    console.log('API Request:', url, options);
                    const response = await fetch(url, {
                        ...options,
                        headers
                    });
                    
                    console.log('API Response:', response.status, response.statusText, response.headers.get('content-type'));
                    
                    // Guardar response para debugging
                    const status = response.status;
                    let responseText = '';
                    let responseData = null;
                    
                    // Check content-type to handle HTML responses
                    const contentType = response.headers.get('content-type');
                    if (!contentType || !contentType.includes('application/json')) {
                        responseText = await response.text();
                        console.error('Non-JSON response:', responseText.substring(0, 200));
                        throw new Error('El servidor devolvió HTML en lugar de JSON. Asegúrate de usar el puerto correcto del servidor');
                    }
                    
                    responseData = await response.json();
                    
                    if (!response.ok) {
                        if (status === 403 && responseData && responseData.upgrade_url) {
                            const goPro = await showConfirm((responseData.error || 'Función disponible solo en Pro') + '\n\n¿Quieres actualizar tu plan ahora?');
                            if (goPro) this.navigate('upgrade');
                            throw new Error(responseData.error || 'Acceso restringido');
                        }
                        
                        // Enhanced error reporting
                        const errorMsg = responseData.error || `Error ${status}: ${responseData.message || 'Error en la solicitud'}`;
                        const errorDetails = responseData.details ? `\nDetalles: ${responseData.details}` : '';
                        console.error('Full API Error:', responseData); // Log full object for debugging
                        
                        throw new Error(errorMsg + errorDetails);
                    }
                    
                    return responseData;
                } catch (error) {
                    console.error('API Error:', error);
                    
                    // Manejo específico de token expirado
                    if (error.message === "Inicio de sesión expirado" || error.code === "TOKEN_EXPIRED") {
                        alert("Tu sesión ha expirado. Por favor inicia sesión nuevamente.");
                        this.logout();
                        return;
                    }
                    
                    alert(error.message);
                    throw error;
                }
            },
            
            // Auth
            async login() {
                const email = document.getElementById('login-email').value;
                const password = document.getElementById('login-password').value;
                
                if (!email || !password) {
                    alert('Por favor completa todos los campos');
                    return;
                }
                
                try {
                    const data = await this.api('/auth/login', {
                        method: 'POST',
                        body: JSON.stringify({ email, password })
                    });
                    
                    this.user = data.user;
                    this.token = data.access_token;
                    this.saveAuth();
                    this.afterLogin();
                } catch (e) {
                    // Error already shown
                }
            },
            
            async register() {
                const name = document.getElementById('register-name').value;
                const email = document.getElementById('register-email').value;
                const password = document.getElementById('register-password').value;
                
                if (!name || !email || !password) {
                    showCustomAlert('Por favor completa todos los campos', 'warning');
                    return;
                }
                
                // Password validation: min 8 chars, 1 number, 1 special char
                const passwordRegex = /^(?=.*\d)(?=.*[\W_]).{8,}$/;
                if (!passwordRegex.test(password)) {
                    showCustomAlert('La contraseña debe tener al menos 8 caracteres, un número y un carácter especial.', 'warning');
                    return;
                }
                
                try {
                    const data = await this.api('/auth/register', {
                        method: 'POST',
                        body: JSON.stringify({ name, email, password })
                    });

                    // If verification code is in response (development mode), show it
                    if (data.verification_code) {
                        showCustomAlert(`Código de verificación: ${data.verification_code}\n\nEste código también se enviará a tu correo.`, 'success');
                        // Pre-fill the verification code
                        this.showVerify(email);
                        setTimeout(() => {
                            document.getElementById('verify-code').value = data.verification_code;
                        }, 100);
                    } else {
                        this.showVerify(email);
                    }
                } catch (e) {
                    // Error already shown by api wrapper or we can show custom alert here if needed
                    // Assuming api() handles error display or throws
                }
            },

            async verifyEmail() {
                const email = document.getElementById('verify-email').value;
                const code = document.getElementById('verify-code').value;

                if (!email || !code) {
                    alert('Email y código son requeridos');
                    return;
                }

                try {
                    const data = await this.api('/auth/verify-email', {
                        method: 'POST',
                        body: JSON.stringify({ email, code })
                    });

                    this.user = data.user;
                    this.token = data.access_token;
                    this.saveAuth();
                    this.afterLogin();
                } catch (e) {
                    // Error already shown
                }
            },
            
            logout() {
                this.user = null;
                this.token = null;
                this.business = null;
                this.storage.remove('cuaderno_auth');
                this.showAuth();
            },

            toggleBusinessMenu() {
                const menu = document.getElementById('business-switch-dropdown');
                if (menu) menu.classList.toggle('hidden');
            },
            
            toggleMainBusinessMenu() {
                const menu = document.getElementById('main-business-switch-dropdown');
                if (menu) menu.classList.toggle('hidden');
            },
            
            toggleSettingsMenu() {
                document.getElementById('settings-menu').classList.toggle('hidden');
            },
            
            toggleSidebar() {
                const sidebar = document.getElementById('sidebar');
                const overlay = document.getElementById('sidebar-overlay');
                
                if (sidebar.classList.contains('open')) {
                    this.closeSidebar();
                } else {
                    sidebar.classList.add('open');
                    if (overlay) overlay.classList.add('show');
                }
            },

            toggleFilters(id) {
                const el = document.getElementById(id);
                if (el) {
                    el.classList.toggle('hidden');
                }
            },
            
            closeSidebar() {
                const sidebar = document.getElementById('sidebar');
                const overlay = document.getElementById('sidebar-overlay');
                
                if (sidebar) sidebar.classList.remove('open');
                if (overlay) overlay.classList.remove('show');
            },
            
            saveAuth() {
                this.storage.set('cuaderno_auth', {
                    user: this.user,
                    token: this.token
                });
            },
            
            loadAuth() {
                const saved = this.storage.get('cuaderno_auth');
                if (saved) {
                    this.user = saved.user;
                    this.token = saved.token;
                    return true;
                }
                return false;
            },
            
            showAuth() {
                const auth = document.getElementById('auth-screen');
                const main = document.getElementById('main-app');
                
                auth.classList.remove('hidden');
                auth.style.display = 'block';
                auth.style.zIndex = '50';
                
                main.classList.add('hidden');
                main.style.display = 'none';
            },
            
            showLogin() {
                document.getElementById('login-form').classList.remove('hidden');
                document.getElementById('register-form').classList.add('hidden');
                document.getElementById('verify-form').classList.add('hidden');
                document.getElementById('forgot-form').classList.add('hidden');
                document.getElementById('reset-form').classList.add('hidden');
                const emailInput = document.getElementById('login-email');
                const passwordInput = document.getElementById('login-password');
                if (emailInput) emailInput.value = '';
                if (passwordInput) passwordInput.value = '';
                this.storage.remove('password_reset_flow');
            },
            
            showRegister() {
                document.getElementById('login-form').classList.add('hidden');
                document.getElementById('register-form').classList.remove('hidden');
                document.getElementById('verify-form').classList.add('hidden');
                document.getElementById('forgot-form').classList.add('hidden');
                document.getElementById('reset-form').classList.add('hidden');
            },

            showVerify(email = '') {
                document.getElementById('login-form').classList.add('hidden');
                document.getElementById('register-form').classList.add('hidden');
                document.getElementById('verify-form').classList.remove('hidden');
                document.getElementById('forgot-form').classList.add('hidden');
                document.getElementById('reset-form').classList.add('hidden');
                if (email) {
                    document.getElementById('verify-email').value = email;
                }
            },

            showForgotPassword() {
                document.getElementById('login-form').classList.add('hidden');
                document.getElementById('register-form').classList.add('hidden');
                document.getElementById('verify-form').classList.add('hidden');
                document.getElementById('forgot-form').classList.remove('hidden');
                document.getElementById('reset-form').classList.add('hidden');
            },

            showResetPassword() {
                document.getElementById('login-form').classList.add('hidden');
                document.getElementById('register-form').classList.add('hidden');
                document.getElementById('verify-form').classList.add('hidden');
                document.getElementById('forgot-form').classList.add('hidden');
                document.getElementById('reset-form').classList.remove('hidden');
            },

            async sendResetCode() {
                const email = document.getElementById('forgot-email').value;
                if (!email) {
                    alert('Ingresa tu email');
                    return;
                }

                try {
                    await this.api('/auth/forgot-password', {
                        method: 'POST',
                        body: JSON.stringify({ email })
                    });
                    alert('Te enviamos un código para restablecer tu contraseña.');
                    this.storage.set('password_reset_flow', { email });
                    this.showResetPassword();
                    document.getElementById('reset-email').value = email;
                } catch (e) {
                    // Error already shown
                }
            },

            async resetPassword() {
                const email = document.getElementById('reset-email').value;
                const code = document.getElementById('reset-code').value;
                const new_password = document.getElementById('reset-password').value;
                if (!email || !code || !new_password) {
                    alert('Completa todos los campos');
                    return;
                }

                try {
                    await this.api('/auth/reset-password', {
                        method: 'POST',
                        body: JSON.stringify({ email, code, new_password })
                    });
                    alert('Contraseña restablecida. Ya puedes iniciar sesión.');
                    this.storage.remove('password_reset_flow');
                    this.showLogin();
                } catch (e) {
                    // Error already shown
                }
            },
            
            async afterLogin() {
                const auth = document.getElementById('auth-screen');
                const main = document.getElementById('main-app');
                
                auth.classList.add('hidden');
                auth.style.display = 'none';
                
                main.classList.remove('hidden');
                main.style.display = 'flex';
                
                document.getElementById('header-user-name').textContent = this.user.name;
                
                // Show upgrade tab for free users
                if (this.user.plan === 'free') {
                    document.getElementById('nav-upgrade').classList.remove('hidden');
                }
                
                // Load businesses
                await this.loadBusinesses();
                
                const params = new URLSearchParams(window.location.search || '');
                const targetPage = params.get('page');
                const cycle = params.get('cycle');
                
                if (cycle === 'annual' || cycle === 'monthly') {
                    this.setPricingCycle(cycle);
                }
                
                if (targetPage === 'pricing' || targetPage === 'upgrade') {
                    if (this.user.plan === 'free') {
                        document.getElementById('nav-upgrade').classList.remove('hidden');
                    }
                    this.navigate(targetPage);
                } else {
                    this.navigate('dashboard');
                }
            },
            
            // Business
            async loadBusinesses() {
                const data = await this.api('/businesses');
                this.businesses = data.businesses;
                
                if (data.businesses.length > 0) {
                    // If no business is selected, select the first one
                    if (!this.business) {
                        this.business = data.businesses[0];
                    } else {
                        // Find the current business in the updated list
                        const current = data.businesses.find(b => b.id === this.business.id);
                        if (current) {
                            this.business = current;
                        } else {
                            this.business = data.businesses[0];
                        }
                    }
                    
                    const nameEl = document.getElementById('business-name');
                    const currencyEl = document.getElementById('business-currency');
                    const goalEl = document.getElementById('business-goal');
                    const logoEl = document.getElementById('business-logo');
                    if (nameEl) nameEl.value = this.business.name || '';
                    if (currencyEl) currencyEl.value = this.business.currency || '';
                    if (goalEl) goalEl.value = this.business.monthly_sales_goal || '';
                    // Logo
                    const settings = this.business.settings || {};
                    const logo = settings.logo || '';
                    if (logoEl) logoEl.value = logo;
                    // Update logo preview
                    const logoPreview = document.getElementById('business-logo-preview');
                    if (logoPreview) {
                        if (logo && logo.trim()) {
                            logoPreview.innerHTML = `<img src="${logo}" class="w-full h-full object-cover" onerror="this.parentElement.innerHTML='<span class=\\'text-3xl\\'>🏪</span>'">`;
                        } else {
                            logoPreview.innerHTML = '<span class="text-3xl">🏪</span>';
                        }
                    }
                    // Update header logo and name
                    this.updateHeader();
                    // Update business switch dropdown
                    this.updateBusinessSwitch();
                } else {
                    // Create first business
                    await this.api('/businesses', {
                        method: 'POST',
                        body: JSON.stringify({ name: 'Mi Negocio' })
                    });
                    await this.loadBusinesses();
                }
            },
            
            async saveBusiness() {
                const name = document.getElementById('business-name').value;
                const currency = document.getElementById('business-currency').value;
                const goal = document.getElementById('business-goal').value;
                const logo = document.getElementById('business-logo').value;
                
                await this.api(`/businesses/${this.business.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({ 
                        name, 
                        currency, 
                        monthly_sales_goal: goal ? parseFloat(goal) : 0,
                        settings: { logo } 
                    })
                });
                
                this.business.name = name;
                this.business.currency = currency;
                this.business.monthly_sales_goal = goal ? parseFloat(goal) : 0;
                this.business.settings = this.business.settings || {};
                this.business.settings.logo = logo;
                
                // Update in businesses array
                const index = this.businesses.findIndex(b => b.id === this.business.id);
                if (index !== -1) {
                    this.businesses[index] = this.business;
                }
                
                this.updateHeader();
                this.updateBusinessSwitch();
                alert('Negocio actualizado');
            },
            
            async updateBusinessSettings() {
                const nameEl = document.getElementById('business-name');
                const currencyEl = document.getElementById('business-currency');
                const goalEl = document.getElementById('business-goal');
                const collectionTemplateEl = document.getElementById('template-collection');
                const saleTemplateEl = document.getElementById('template-sale');
                
                const name = nameEl ? nameEl.value : this.business.name;
                const currency = currencyEl ? currencyEl.value : this.business.currency;
                const goal = goalEl ? goalEl.value : (this.business.monthly_sales_goal || 0);
                const collectionTemplate = collectionTemplateEl ? collectionTemplateEl.value : '';
                const saleTemplate = saleTemplateEl ? saleTemplateEl.value : '';
                
                if (!name) {
                    alert('El nombre es requerido');
                    return;
                }
                
                try {
                    const payload = {
                        name,
                        currency,
                        monthly_sales_goal: goal ? parseFloat(goal) : 0,
                        whatsapp_templates: {
                            collection_message: collectionTemplate,
                            sale_message: saleTemplate
                        }
                    };

                    const data = await this.api(`/businesses/${this.business.id}`, {
                        method: 'PUT',
                        body: JSON.stringify(payload)
                    });
                    
                    this.business = data.business;
                    // Update in list
                    const idx = this.businesses.findIndex(b => b.id === this.business.id);
                    if (idx >= 0) this.businesses[idx] = this.business;
                    
                    this.updateHeader();
                    this.updateBusinessSwitch();
                    alert('Configuración actualizada');
                } catch (e) {
                    alert('Error al actualizar: ' + e.message);
                }
            },
            
            generateReceipt(saleId) {
                const token = this.token;
                // Obtener enlace público del recibo
                fetch(`${API_BASE_URL}/api/receipt/link/${saleId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                .then(res => {
                    if (!res.ok) throw new Error('Error obteniendo enlace del recibo');
                    return res.json();
                })
                .then(data => {
                    let finalUrl = data.url;
                    if (data.path) {
                        const baseUrl = API_BASE_URL || window.location.origin;
                        finalUrl = `${baseUrl}${data.path}`;
                    }

                    if (finalUrl) {
                        window.open(finalUrl, '_system');
                    } else {
                        throw new Error('URL no encontrada');
                    }
                })
                .catch(e => {
                    console.error(e);
                    // Fallback a método antiguo si falla el link
                    const url = `${API_BASE_URL}/api/receipt?sale_id=${saleId}&format=png`;
                    fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
                        .then(r => r.blob())
                        .then(blob => {
                            const blobUrl = window.URL.createObjectURL(blob);
                            window.open(blobUrl, '_blank');
                        })
                        .catch(err => alert('No se pudo generar el recibo.'));
                });
            },
            
            async shareOnWhatsApp(saleId) {
                const sale = this.currentSales ? this.currentSales.find(s => s.id === saleId) : null;
                if (!sale) {
                    alert('Información de venta no disponible');
                    return;
                }

                try {
                    // Use unified builder (no link generation needed)
                    const message = this.buildWhatsappMessage(sale);
                    
                    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_system');
                } catch (e) {
                    console.error(e);
                    showCustomAlert('Error al generar mensaje: ' + e.message, 'error');
                }
            },

            async collectDebt(customerId) {
                try {
                    const data = await this.api(`/businesses/${this.business.id}/customers/${customerId}/whatsapp-collection-message`);
                    
                    if (data.debt <= 0) {
                        alert('Este cliente no tiene deuda pendiente.');
                        return;
                    }

                    const message = data.message;
                    
                    // Copy to clipboard
                    try {
                        await navigator.clipboard.writeText(message);
                        showCustomAlert('Mensaje copiado. Pega en WhatsApp.', 'success');
                    } catch (err) {
                        // Fallback
                        const textarea = document.createElement('textarea');
                        textarea.value = message;
                        document.body.appendChild(textarea);
                        textarea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textarea);
                        showCustomAlert('Mensaje copiado.', 'success');
                    }

                    // Open WhatsApp
                    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
                    const url = isMobile 
                        ? `https://wa.me/?text=${encodeURIComponent(message)}`
                        : `https://web.whatsapp.com/send?text=${encodeURIComponent(message)}`;
                    
                    window.open(url, '_blank');

                } catch (e) {
                    console.error(e);
                    alert('Error al generar mensaje de cobro: ' + e.message);
                }
            },
            
            async switchBusiness(businessId) {
                const business = this.businesses.find(b => b.id === businessId);
                if (business && business.id !== this.business.id) {
                    this.business = business;
                    // Update settings form
                    const nameEl2 = document.getElementById('business-name');
                    const currencyEl2 = document.getElementById('business-currency');
                    const logoEl2 = document.getElementById('business-logo');
                    const goalEl = document.getElementById('business-goal');
                    const collectionTemplateEl = document.getElementById('template-collection');
                    const saleTemplateEl = document.getElementById('template-sale');
                    
                    if (nameEl2) nameEl2.value = this.business.name || '';
                    if (currencyEl2) currencyEl2.value = this.business.currency || '';
                    if (goalEl) goalEl.value = this.business.monthly_sales_goal || '';
                    
                    const settings = this.business.settings || {};
                    const templates = this.business.whatsapp_templates || {};
                    
                    if (collectionTemplateEl) {
                        collectionTemplateEl.value = templates.collection_message || 
                            "Hola {cliente} 😊\n" +
                            "Te escribo de *{negocio}*.\n\n" +
                            "Según mi registro, tienes un saldo pendiente de *${deuda}*.\n" +
                            "¿Me confirmas por favor cuándo puedes realizar el pago?\n\n" +
                            "Gracias 🙌";
                    }

                    if (saleTemplateEl) {
                        saleTemplateEl.value = templates.sale_message || 
                            "Hola {cliente}, gracias por tu compra en *{negocio}*.\n\n" +
                            "*Detalle:*\n{items}\n" +
                            "*TOTAL: ${total}*\n" +
                            "Pagado: ${pagado}\n" +
                            "Saldo: ${saldo}\n\n" +
                            "¡Esperamos verte pronto! 👋";
                    }
                    
                    const logo = settings.logo || '';
                    if (logoEl2) logoEl2.value = logo;
                    const logoPreview = document.getElementById('business-logo-preview');
                    if (logoPreview) {
                        if (logo && logo.trim()) {
                            logoPreview.innerHTML = `<img src="${logo}" class="w-full h-full object-cover" onerror="this.parentElement.innerHTML='<span class=\\'text-3xl\\'>🏪</span>'">`;
                        } else {
                            logoPreview.innerHTML = '<span class="text-3xl">🏪</span>';
                        }
                    }
                    this.updateHeader();
                    this.updateBusinessSwitch();
                    this.loadPageData(this.currentPage);
                    alert(`Cambiado a: ${business.name}`);
                }
            },
            
            showAddBusinessModal() {
                this.closeModal(); // Ensure other modals are closed
                document.getElementById('add-business-name').value = '';
                const modal = document.getElementById('modal-add-business');
                const overlay = document.getElementById('modal-overlay');
                modal.classList.remove('hidden');
                modal.style.display = 'block';
                overlay.classList.remove('hidden');
                overlay.style.display = 'flex';
            },
            
            async addBusiness() {
                const name = document.getElementById('add-business-name').value.trim();
                if (!name) {
                    alert('El nombre del negocio es requerido');
                    return;
                }
                
                try {
                    const data = await this.api('/businesses', {
                        method: 'POST',
                        body: JSON.stringify({ name })
                    });
                    
                    this.businesses.push(data.business);
                    this.switchBusiness(data.business.id);
                    this.closeModal();
                } catch (error) {
                    console.error('Error adding business:', error);
                }
            },
            
            async uploadLogo(input) {
                const file = input.files[0];
                if (!file) return;
                
                const formData = new FormData();
                formData.append('logo', file);
                
                try {
                    const response = await fetch(`/api/businesses/${this.business.id}/logo`, {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer ' + this.token
                        },
                        body: formData
                    });
                    const data = await response.json();
                    if (data.logo_url) {
                        this.business.settings = this.business.settings || {};
                        this.business.settings.logo = data.logo_url;
                        const logoEl = document.getElementById('business-logo');
                        if (logoEl) logoEl.value = data.logo_url;
                        this.updateHeader();
                        // Update preview
                        const logoPreview = document.getElementById('business-logo-preview');
                        if (logoPreview) logoPreview.innerHTML = `<img src="${data.logo_url}" class="w-full h-full object-cover">`;
                        alert('Logo actualizado');
                    } else if (data.error) {
                        alert(data.error);
                    }
                } catch (e) {
                    alert('Error al subir logo');
                }
            },
            
            updateBusinessSwitch() {
                const itemsHtml = this.businesses.map(b => `
                    <a href="javascript:void(0)" onclick="app.switchBusiness(${b.id}); app.toggleMainBusinessMenu();" class="${b.id === this.business.id ? 'bg-white/10' : ''} flex items-center gap-2 px-4 py-2 hover:bg-white/5 transition-colors">
                        ${b.id === this.business.id ? '<i class="ph ph-check-circle text-green-400"></i>' : '<i class="ph ph-storefront text-white/50"></i>'}
                        <span class="truncate">${b.name}</span>
                    </a>
                `).join('');
                
                const addBusinessHtml = `
                    <div class="border-t border-white/10 mt-2 pt-2">
                        <a href="javascript:void(0)" onclick="app.showAddBusinessModal(); app.toggleMainBusinessMenu();" class="flex items-center gap-2 px-4 py-2 text-blue-400 hover:text-blue-300">
                            <i class="ph ph-plus-circle"></i> Nuevo Negocio
                        </a>
                    </div>
                `;
                
                const fullHtml = itemsHtml + addBusinessHtml;
                
                // Update Sidebar Dropdown
                const dropdown = document.getElementById('business-switch-dropdown');
                if (dropdown) dropdown.innerHTML = fullHtml;
                
                // Update Main Header Dropdown (Fix for 'Cambiar Negocio' button)
                const mainDropdown = document.getElementById('main-business-switch-dropdown');
                if (mainDropdown) mainDropdown.innerHTML = fullHtml;
            },
            
            updateHeader() {
                const settings = this.business.settings || {};
                const logo = settings.logo || '';
                const name = this.business.name || 'Mi Negocio';
                
                const headerName = document.getElementById('header-business-name');
                if (headerName) {
                    // Do not update header-business-name here as it contains the static app logo
                }
                
                // Update center business header
                const centerBusinessName = document.getElementById('center-business-name');
                if (centerBusinessName) {
                    centerBusinessName.textContent = name;
                }
            },

            async changePassword() {
                const current_password = document.getElementById('current-password').value;
                const new_password = document.getElementById('new-password').value;
                if (!current_password || !new_password) {
                    alert('Completa todos los campos');
                    return;
                }

                try {
                    await this.api('/auth/change-password', {
                        method: 'POST',
                        body: JSON.stringify({ current_password, new_password })
                    });
                    alert('Contraseña actualizada correctamente.');
                    document.getElementById('current-password').value = '';
                    document.getElementById('new-password').value = '';
                } catch (e) {
                    // Error already shown
                }
            },
            
            // Navigation
            navigate(page) {
                // Force close sidebar (mobile)
                if (window.innerWidth < 1024) {
                    this.closeSidebar();
                }
                
                this.currentPage = page;
                
                // Update nav
                document.querySelectorAll('.nav-item').forEach(el => {
                    el.classList.toggle('active', el.dataset.page === page);
                });
                
                // Show page
                document.querySelectorAll('.page').forEach(el => {
                    el.classList.add('hidden');
                });
                document.getElementById('page-' + page)?.classList.remove('hidden');

                if (page === 'admin') {
                    history.pushState({}, '', '/admin');
                } else if (window.location.pathname === '/admin') {
                    history.pushState({}, '', '/');
                }
                
                // Load data
                this.loadPageData(page);
            },
            
            async loadSettings() {
                await this.loadBusinesses();
                // await this.loadReceiptProfile(); // Removed as it doesn't exist
                
                // Subscription UI Logic
                const planContainer = document.getElementById('plan-info');
                const pricingContainer = document.getElementById('plan-pricing-container');
                const managementContainer = document.getElementById('plan-management-container');
                
                // Check if user is Pro (any variation)
                const isPro = this.user.plan && this.user.plan !== 'free';
                
                if (isPro) {
                    if (pricingContainer) pricingContainer.classList.add('hidden');
                    if (managementContainer) managementContainer.classList.remove('hidden');
                    
                    // Format Plan Name
                    let planName = 'Plan Pro';
                    let amount = '$5.99 USD';
                    let cycle = 'Mensual';
                    let billingDate = new Date();
                    
                    if (this.user.plan === 'pro_monthly' || this.user.plan === 'pro') {
                        planName = 'Plan Pro Mensual';
                        amount = '$5.99 USD';
                        cycle = 'Mensual';
                        billingDate.setMonth(billingDate.getMonth() + 1);
                    } else if (this.user.plan === 'pro_quarterly') {
                        planName = 'Plan Pro Trimestral';
                        amount = '$16.17 USD';
                        cycle = 'Trimestral';
                        billingDate.setMonth(billingDate.getMonth() + 3);
                    } else if (this.user.plan === 'pro_annual') {
                        planName = 'Plan Pro Anual';
                        amount = '$50.32 USD';
                        cycle = 'Anual';
                        billingDate.setFullYear(billingDate.getFullYear() + 1);
                    }
                    
                    if (planContainer) {
                        planContainer.innerHTML = `
                            <div class="flex justify-between items-start">
                                <div>
                                    <p class="font-bold text-lg text-white">${planName}</p>
                                    <p class="text-sm text-muted mt-1">Disfruta de todas las funciones ilimitadas.</p>
                                </div>
                                <span class="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-lg border border-green-500/30">Activo</span>
                            </div>
                        `;
                    }
                    
                    const billingEl = document.getElementById('sub-next-billing');
                    const amountEl = document.getElementById('sub-amount');
                    
                    if (billingEl) billingEl.textContent = billingDate.toLocaleDateString();
                    if (amountEl) amountEl.textContent = `${amount}`;
                    
                } else {
                    // Free User
                    if (pricingContainer) pricingContainer.classList.remove('hidden');
                    if (managementContainer) managementContainer.classList.add('hidden');
                    
                    if (planContainer) {
                        planContainer.innerHTML = `
                            <p class="font-bold text-lg">Plan Free - Prueba</p>
                            <p class="text-sm text-muted mt-1">Solo para pruebas. Limite: 5 productos, 5 clientes, 20 ventas</p>
                        `;
                    }
                    
                    this.renderPricing(); 
                }
            },
            
            manageSubscription() {
                alert('Pronto podrás gestionar tu método de pago aquí. Por ahora, contáctanos si necesitas cambios.');
            },
            
            async cancelSubscription() {
                if (confirm('¿Estás seguro que deseas cancelar tu suscripción? \n\nTu plan seguirá activo hasta el final del periodo actual, pero no se renovará automáticamente.')) {
                    const btn = document.activeElement;
                    const originalText = btn.innerText;
                    btn.innerText = 'Procesando...';
                    btn.disabled = true;
                    
                    setTimeout(() => {
                        alert('Tu solicitud de cancelación ha sido recibida. Te contactaremos para confirmar.');
                        btn.innerText = originalText;
                        btn.disabled = false;
                    }, 1500);
                }
            },

            async loadPageData(page) {
                switch(page) {
                    case 'dashboard':
                        await this.loadDashboard();
                        break;
                    case 'sales':
                        await this.loadSales();
                        break;
                    case 'expenses':
                        await this.loadExpenses();
                        break;
                    case 'recurring_expenses':
                        await this.loadRecurringExpenses();
                        break;
                    case 'payments':
                        await this.loadPayments();
                        break;
                    case 'customers':
                        await this.loadCustomers();
                        break;
                    case 'products':
                        await this.loadProducts();
                        break;
                    case 'reports':
                        // Allow free users to see reports but maybe with limitations or upsell
                        // Removed strict block for better UX (show teaser or basic stats)
                        await this.loadReports();
                        break;
                    case 'sales_goals':
                        await this.loadSalesGoals();
                        break;
                    case 'settings':
                        await this.loadSettings();
                        break;
                    case 'orders':
                        await this.loadOrders();
                        break;
                    case 'upgrade':
                        // Upgrade page doesn't need to load anything
                        break;
                    case 'pricing':
                        this.renderPricing();
                        break;
                }
                // Apply locks after loading data
                setTimeout(() => this.applyProLocks(), 200);
            },

            setPricingCycle(cycle) {
                this.pricingCycle = cycle;
                this.renderPricing();
            },

            renderPricing() {
                const base = 5.99;
                const quarterlyDiscount = 0.1;
                const annualDiscount = 0.3;
                const quarterlyTotal = base * 3 * (1 - quarterlyDiscount);
                const annualTotal = base * 12 * (1 - annualDiscount);
                const quarterlyMonthly = quarterlyTotal / 3;
                const annualMonthly = annualTotal / 12;
                const priceEl = document.getElementById('pro-price');
                const noteEl = document.getElementById('pro-price-note');
                const monthlyBtn = document.getElementById('pricing-monthly-btn');
                const quarterlyBtn = document.getElementById('pricing-quarterly-btn');
                const annualBtn = document.getElementById('pricing-annual-btn');
                const mDash = document.getElementById('dashboard-monthly-price');
                const qDash = document.getElementById('dashboard-quarterly-price');
                const qDashTotal = document.getElementById('dashboard-quarterly-total');
                const aDash = document.getElementById('dashboard-annual-price');
                const aDashSaving = document.getElementById('dashboard-annual-saving');

                if (mDash && qDash && qDashTotal && aDash && aDashSaving) {
                    mDash.textContent = base.toFixed(2);
                    qDash.textContent = quarterlyMonthly.toFixed(2);
                    qDashTotal.textContent = quarterlyTotal.toFixed(2);
                    aDash.textContent = annualMonthly.toFixed(2);
                    aDashSaving.textContent = '30%';
                }

                if (this.pricingCycle === 'annual') {
                    priceEl.textContent = `$${annualMonthly.toFixed(2)}`;
                    noteEl.textContent = `USD ${(annualTotal).toFixed(2)} anual (ahorra 30%)`;
                    monthlyBtn.classList.remove('btn-primary');
                    quarterlyBtn.classList.remove('btn-primary');
                    annualBtn.classList.add('btn-primary');
                } else if (this.pricingCycle === 'quarterly') {
                    priceEl.textContent = `$${quarterlyMonthly.toFixed(2)}`;
                    noteEl.textContent = `USD ${(quarterlyTotal).toFixed(2)} cada 3 meses (ahorra 10%)`;
                    monthlyBtn.classList.remove('btn-primary');
                    annualBtn.classList.remove('btn-primary');
                    quarterlyBtn.classList.add('btn-primary');
                } else {
                    priceEl.textContent = `$${base.toFixed(2)}`;
                    noteEl.textContent = `USD ${base.toFixed(2)} mensual`;
                    annualBtn.classList.remove('btn-primary');
                    quarterlyBtn.classList.remove('btn-primary');
                    monthlyBtn.classList.add('btn-primary');
                }
            },

            selectPaymentMethod(method) {
                this.selectedPaymentMethod = method;
                document.getElementById('pay-method-card').classList.toggle('btn-primary', method === 'card');
                document.getElementById('pay-method-nequi').classList.toggle('btn-primary', method === 'nequi');
            },

            async startCheckout() {
                const plan = this.pricingCycle === 'annual' ? 'pro_annual' : 'pro_monthly';
                const url = '/api/billing/checkout';
                const headers = {
                    'Content-Type': 'application/json'
                };
                if (this.token) {
                    headers['Authorization'] = 'Bearer ' + this.token;
                }
                
                try {
                    const response = await fetch(url, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({
                            plan,
                            payment_method: this.selectedPaymentMethod
                        })
                    });
                    
                    const contentType = response.headers.get('content-type') || '';
                    
                    if (contentType.includes('application/json')) {
                        const data = await response.json();
                        if (!response.ok) {
                            throw new Error(data.error || data.message || `Error ${response.status} al iniciar el pago`);
                        }
                        const checkoutUrl = data.checkout?.init_point || data.checkout?.url || data.checkout_url;
                        if (checkoutUrl) {
                            window.location.href = checkoutUrl;
                            return;
                        }
                        throw new Error('El servidor no devolvió una URL de pago válida.');
                    }
                    
                    if (response.redirected && response.url) {
                        window.location.href = response.url;
                        return;
                    }
                    
                    const html = await response.text();
                    console.error('Respuesta no JSON en checkout:', html.substring(0, 300));
                    alert('No se pudo iniciar el pago. Verifica que el backend esté ejecutándose en el mismo dominio y puerto que la app.');
                } catch (error) {
                    console.error('Error en checkout:', error);
                    alert(error.message || 'Error al iniciar el pago');
                }
            },
            
            // Dashboard
            setDashboardPeriod(period) {
                this.dashboardPeriod = period;
                this.loadDashboard();
            },

            async loadDashboard() {
                // Ensure prices are rendered correctly
                this.renderPricing();

                // Update UI buttons
                ['today', 'week', 'month', 'year'].forEach(p => {
                    const btn = document.getElementById(`period-${p}`);
                    if (btn) {
                        if (p === this.dashboardPeriod) {
                            btn.className = 'px-3 py-1.5 rounded-md text-xs font-medium transition-all bg-white/10 text-white shadow-sm whitespace-nowrap';
                        } else {
                            btn.className = 'px-3 py-1.5 rounded-md text-xs font-medium transition-all text-white/60 hover:text-white whitespace-nowrap';
                        }
                    }
                });

                // Update Summary Title
                const titles = {
                    today: 'Resumen de Hoy',
                    week: 'Resumen de la Semana',
                    month: 'Resumen del Mes',
                    year: 'Resumen del Año'
                };
                const summaryTitle = document.getElementById('dashboard-summary-title');
                if (summaryTitle) summaryTitle.textContent = titles[this.dashboardPeriod] || 'Resumen';

                // Daily report
                try {
                    const daily = await this.api(`/businesses/${this.business.id}/reports/daily`);
                    const dailyIn = daily.cash_flow ? daily.cash_flow.in : daily.sales.total;
                    document.getElementById('stat-cash-today').textContent = this.formatMoney(dailyIn);
                    document.getElementById('stat-sales-today').textContent = this.formatMoney(daily.sales.total);
                    document.getElementById('stat-expenses-today').textContent = this.formatMoney(daily.expenses.total);
                } catch (e) {
                    console.error('Error loading daily stats:', e);
                }
                
                // Monthly summary
                try {
                    let summaryUrl = `/businesses/${this.business.id}/reports/summary?period=${this.dashboardPeriod}`;
                    if (this.dashboardPeriod === 'year') {
                        const now = new Date();
                        const start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
                        const end = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
                        summaryUrl += `&start_date=${start}&end_date=${end}`;
                    }

                    const summary = await this.api(summaryUrl);
                    
                    // Fallback if cash_flow is missing (e.g. backend not fully updated yet)
                    const cashIn = summary.cash_flow ? summary.cash_flow.in : (summary.sales ? summary.sales.total : 0);
                    const cashOut = summary.cash_flow ? summary.cash_flow.out : (summary.expenses ? summary.expenses.total : 0);
                    const cashNet = summary.cash_flow ? summary.cash_flow.net : (summary.profit ? summary.profit.net : 0);

                    document.getElementById('month-income').textContent = this.formatMoney(cashIn);
                    document.getElementById('month-expenses').textContent = this.formatMoney(cashOut);
                    document.getElementById('month-profit').textContent = this.formatMoney(cashNet);
                    document.getElementById('stat-receivable').textContent = this.formatMoney(summary.accounts_receivable || 0);
                } catch (e) {
                    console.error('Error loading summary stats:', e);
                }
                
                // Debtors - Update table format
                try {
                    const debtors = await this.api(`/businesses/${this.business.id}/customers/debtors`);
                    const debtorsList = document.getElementById('debtors-list');
                    if (debtors.debtors.length === 0) {
                        debtorsList.innerHTML = '<tr><td colspan="4" class="text-muted text-center py-4">Sin deudores</td></tr>';
                    } else {
                        debtorsList.innerHTML = debtors.debtors.slice(0, 5).map(d => `
                            <tr>
                                <td>${d.name}</td>
                                <td class="money-negative">${this.formatMoney(d.balance)}</td>
                                <td>${d.since ? d.since.split('T')[0] : '-'}</td>
                                <td>
                                    <div class="flex gap-2">
                                        <button onclick="app.navigate('customers')" class="text-blue-400 hover:text-blue-300 p-1 rounded hover:bg-white/10" title="Ver detalle">
                                            <i class="ph ph-eye text-lg"></i>
                                        </button>
                                        <button onclick="app.collectDebt(${d.id})" class="text-green-400 hover:text-green-300 p-1 rounded hover:bg-white/10" title="Cobrar por WhatsApp">
                                            <i class="ph ph-whatsapp-logo text-lg"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('');
                    }
                } catch (e) {
                    console.error('Error loading debtors:', e);
                    document.getElementById('debtors-list').innerHTML = '<tr><td colspan="4" class="text-red-400 text-center py-4">Error al cargar deudores</td></tr>';
                }
                
                // Dashboard con proyecciones, inventarios y ventas recientes
                try {
                    const dashboard = await this.api(`/businesses/${this.business.id}/dashboard`);
                    
                    // Recent Sales - Load from dashboard data
                    const recentSalesTable = document.getElementById('recent-sales-table');
                    if (dashboard.recent_sales && dashboard.recent_sales.length > 0) {
                        recentSalesTable.innerHTML = dashboard.recent_sales.map(s => `
                            <tr>
                                <td>${s.date}</td>
                                <td class="money-positive">${this.formatMoney(s.total)}</td>
                                <td><span class="px-2 py-1 rounded-full text-xs bg-gray-500/20 text-gray-400">${s.customer_name}</span></td>
                            </tr>
                        `).join('');
                    } else {
                        recentSalesTable.innerHTML = '<tr><td colspan="3" class="text-muted text-center py-4">Sin ventas recientes</td></tr>';
                    }
                    
                    // Top Products - Load from reports API
                    // ... (Top products loading logic is already robust enough, but we keep it here or outside)
                    
                    // Proyecciones
                    const proj = dashboard.projections;
                    const projEl = document.getElementById('dashboard-projections');
                    if (projEl && proj) {
                        const growthIcon = proj.growth_rate >= 0 ? '<i class="ph ph-trend-up text-green-400"></i>' : '<i class="ph ph-trend-down text-red-400"></i>';
                        const growthClass = proj.growth_rate >= 0 ? 'text-green-400' : 'text-red-400';
                        projEl.innerHTML = `
                            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div class="bg-white/5 p-3 rounded-lg">
                                    <p class="text-xs text-muted">Promedio Diario</p>
                                    <p class="font-bold text-lg">${this.formatMoney(proj.daily_average)}</p>
                                </div>
                                <div class="bg-white/5 p-3 rounded-lg">
                                    <p class="text-xs text-muted">Últimos 30 días</p>
                                    <p class="font-bold text-lg">${this.formatMoney(proj.last_30_days)}</p>
                                </div>
                                <div class="bg-white/5 p-3 rounded-lg">
                                    <p class="text-xs text-muted">Proyectado 30 días</p>
                                    <p class="font-bold text-lg">${this.formatMoney(proj.projected_next_30)}</p>
                                </div>
                                <div class="bg-white/5 p-3 rounded-lg">
                                    <p class="text-xs text-muted">Crecimiento</p>
                                    <p class="font-bold text-lg ${growthClass}">${growthIcon} ${proj.growth_rate}%</p>
                                </div>
                            </div>
                        `;
                    }
                    
                    // Alertas de inventario
                    const inv = dashboard.inventory_alerts;
                    const invEl = document.getElementById('inventory-alerts');
                    if (invEl && inv) {
                        if (inv.count === 0) {
                            invEl.innerHTML = '<p class="text-muted"><i class="ph ph-check-circle text-green-400"></i> Inventario OK</p>';
                        } else {
                            invEl.innerHTML = `
                                <div class="bg-yellow-500/20 border border-yellow-500 rounded-lg p-3">
                                    <p class="font-bold text-yellow-300"><i class="ph ph-warning"></i> ${inv.count} productos con poco inventario</p>
                                    <div class="mt-2 space-y-1">
                                        ${inv.products.map(p => `
                                            <div class="flex justify-between text-sm">
                                                <span>${p.name}</span>
                                                <span class="text-yellow-300">${p.stock} ${p.unit} (mín: ${p.threshold})</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            `;
                        }
                    }
                    
                    // Alertas de fiados
                    const fiados = dashboard.fiados_alerts;
                    const fiadosEl = document.getElementById('fiados-alerts');
                    if (fiadosEl && fiados) {
                        if (fiados.count === 0) {
                            fiadosEl.innerHTML = '<p class="text-muted"><i class="ph ph-check-circle text-green-400"></i> Sin fiados pendientes</p>';
                        } else {
                            fiadosEl.innerHTML = `
                                <div class="bg-red-500/20 border border-red-500 rounded-lg p-3">
                                    <p class="font-bold text-red-300"><i class="ph ph-credit-card"></i> ${fiados.count} ventas fiadas (${this.formatMoney(fiados.total)})</p>
                                    <div class="mt-2 space-y-1">
                                        ${fiados.sales.slice(0, 5).map(s => `
                                            <div class="flex justify-between text-sm">
                                                <span>${s.customer_name}</span>
                                                <span class="text-red-300">${this.formatMoney(s.balance)}</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            `;
                        }
                    }
                } catch (e) {
                    console.error('Error loading detailed dashboard:', e);
                }
                
                // Recurring Expenses Alerts
                try {
                    const recurringData = await this.api(`/businesses/${this.business.id}/recurring-expenses`);
                    const alertsContainer = document.getElementById('dashboard-alerts');
                    const placeholder = document.getElementById('recurring-alerts-placeholder');
                    
                    if (recurringData.recurring_expenses && recurringData.recurring_expenses.length > 0) {
                        const today = new Date();
                        // Normalize today to start of day
                        const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                        
                        const alerts = [];
                        
                        recurringData.recurring_expenses.forEach(exp => {
                            if (!exp.is_active) return;
                            
                            // Determine due date
                            let dueDate;
                            if (exp.next_due_date) {
                                const parts = exp.next_due_date.split('-');
                                dueDate = new Date(parts[0], parts[1]-1, parts[2]);
                            } else {
                                dueDate = new Date(today.getFullYear(), today.getMonth(), exp.due_day);
                            }
                            
                            const diffTime = dueDate - todayDate;
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                            
                            if (diffDays < 0) {
                                // Overdue
                                alerts.push({
                                    type: 'overdue',
                                    html: `<div class="bg-red-500/20 border border-red-500/50 rounded-lg p-3 flex justify-between items-center mb-2">
                                            <div class="flex items-center gap-3">
                                                <div class="p-2 bg-red-500/20 rounded-lg text-red-400">
                                                    <i class="ph ph-warning-circle text-xl"></i>
                                                </div>
                                                <div>
                                                    <p class="font-bold text-red-300">Gasto Vencido: ${exp.name}</p>
                                                    <p class="text-xs text-white/60">Venció el ${this.formatDate(exp.next_due_date)} - ${this.formatMoney(exp.amount)}</p>
                                                </div>
                                            </div>
                                            <button onclick="app.navigate('recurring_expenses')" class="text-sm bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 transition-colors">Ver</button>
                                        </div>`
                                });
                            } else if (diffDays >= 0 && diffDays <= 5) {
                                // Upcoming (within 5 days)
                                alerts.push({
                                    type: 'upcoming',
                                    html: `<div class="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3 flex justify-between items-center mb-2">
                                            <div class="flex items-center gap-3">
                                                <div class="p-2 bg-yellow-500/20 rounded-lg text-yellow-400">
                                                    <i class="ph ph-clock text-xl"></i>
                                                </div>
                                                <div>
                                                    <p class="font-bold text-yellow-300">Próximo Vencimiento: ${exp.name}</p>
                                                    <p class="text-xs text-white/60">Vence el ${this.formatDate(exp.next_due_date)} - ${this.formatMoney(exp.amount)}</p>
                                                </div>
                                            </div>
                                            <button onclick="app.navigate('recurring_expenses')" class="text-sm bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 px-3 py-1 rounded-lg hover:bg-yellow-500/30 transition-colors">Ver</button>
                                        </div>`
                                });
                            }
                        });
                        
                        if (alerts.length > 0) {
                            // Inject into both containers to be safe, or decide on one.
                            // The user asked for "encima del card de caja hoy".
                            // "dashboard-alerts" is at the very top (above title).
                            // "recurring-alerts-placeholder" is below title, above cards.
                            // Based on request "encima del card de caja hoy", the placeholder is better.
                            
                            // Let's use the placeholder and clear the top one
                            if (placeholder) {
                                placeholder.innerHTML = alerts.map(a => a.html).join('');
                                placeholder.classList.remove('hidden');
                                placeholder.classList.add('mb-6');
                            }
                            
                            if (alertsContainer) {
                                alertsContainer.innerHTML = ''; 
                                alertsContainer.classList.add('hidden');
                            }
                        } else {
                            if (placeholder) {
                                placeholder.innerHTML = '';
                                placeholder.classList.add('hidden');
                            }
                            if (alertsContainer) {
                                alertsContainer.innerHTML = '';
                                alertsContainer.classList.add('hidden');
                            }
                        }
                    } else {
                         if (placeholder) {
                            placeholder.innerHTML = '';
                            placeholder.classList.add('hidden');
                        }
                        if (alertsContainer) {
                            alertsContainer.innerHTML = '';
                            alertsContainer.classList.add('hidden');
                        }
                    }
                } catch (e) {
                    console.error('Error loading recurring alerts:', e);
                }

                // Top Products - Load from reports API
                const topProductsTable = document.getElementById('top-products-table');
                try {
                    const topProducts = await this.api(`/businesses/${this.business.id}/reports/top-products`);
                    if (topProducts.top_products && topProducts.top_products.length > 0) {
                        topProductsTable.innerHTML = topProducts.top_products.slice(0, 5).map(p => `
                            <tr>
                                <td>${p.name}</td>
                                <td>${p.qty}</td>
                                <td class="money-positive">${this.formatMoney(p.total)}</td>
                            </tr>
                        `).join('');
                    } else {
                        topProductsTable.innerHTML = '<tr><td colspan="3" class="text-muted text-center py-4">Sin datos</td></tr>';
                    }
                } catch(e) {
                    topProductsTable.innerHTML = '<tr><td colspan="3" class="text-muted text-center py-4">Sin datos</td></tr>';
                }

                // Load Quick Notes
                this.loadQuickNotes();
            },
            
            async loadQuickNotes() {
                try {
                    const data = await this.api(`/businesses/${this.business.id}/quick-notes`);
                    const container = document.getElementById('quick-notes-list');
                    if (!data.notes || data.notes.length === 0) {
                        container.innerHTML = '<p class="text-sm text-white/30 text-center py-2">No hay notas guardadas.</p>';
                        return;
                    }
                    
                    container.innerHTML = data.notes.map(note => `
                        <div class="group flex justify-between items-start bg-white/5 p-3 rounded-lg hover:bg-white/10 transition-colors">
                            <div class="flex items-start gap-3 flex-1">
                                <input type="checkbox" onclick="app.deleteQuickNote(${note.id})" class="mt-1 rounded border-white/20 bg-white/10 text-green-500 focus:ring-green-500 cursor-pointer w-4 h-4">
                                <p class="text-sm text-white/80 break-words whitespace-pre-wrap">${this.escapeHtml(note.note)}</p>
                            </div>
                        </div>
                    `).join('');
                } catch (e) {
                    console.error('Error loading quick notes:', e);
                }
            },

            updateNoteCounter() {
                const input = document.getElementById('quick-note-input');
                const counter = document.getElementById('note-counter');
                if (input && counter) {
                    counter.textContent = `${input.value.length}/280`;
                    if (input.value.length >= 280) counter.classList.add('text-red-400');
                    else counter.classList.remove('text-red-400');
                }
            },

            async addQuickNote() {
                const input = document.getElementById('quick-note-input');
                const note = input.value.trim();
                
                if (!note) return;
                
                try {
                    await this.api(`/businesses/${this.business.id}/quick-notes`, {
                        method: 'POST',
                        body: JSON.stringify({ note })
                    });
                    
                    input.value = '';
                    this.updateNoteCounter();
                    this.loadQuickNotes();
                } catch (e) {
                    showCustomAlert('Error al guardar nota: ' + e.message, 'error');
                }
            },

            async deleteQuickNote(id) {
                // Ensure id is a number or valid string
                if (!id) return;
                
                // No confirmation needed for checkbox action, feels faster/smoother
                // if (!await showConfirm('¿Eliminar esta nota?')) return;
                
                try {
                    // Use DELETE method correctly
                    await this.api(`/businesses/${this.business.id}/quick-notes/${id}`, {
                         method: 'DELETE'
                    });
                    this.loadQuickNotes();
                    // showCustomAlert('Nota completada', 'success'); // Optional feedback
                } catch (e) {
                    showCustomAlert('Error al eliminar nota: ' + e.message, 'error');
                }
            },

            escapeHtml(text) {
                const map = {
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#039;'
                };
                return text.replace(/[&<>"']/g, function(m) { return map[m]; });
            },
            
            // Sales
            async loadSales() {
                try {
                    const start = document.getElementById('sales-start').value;
                    const end = document.getElementById('sales-end').value;
                    const search = document.getElementById('sales-search').value;
                    const statusFilter = document.getElementById('sales-status-filter').value;
                    const paymentFilter = document.getElementById('sales-payment-filter').value;
                    
                    let url = `/businesses/${this.business.id}/sales`;
                    const params = [];
                    if (start) params.push(`start_date=${start}`);
                    if (end) params.push(`end_date=${end}`);
                    if (search) params.push(`search=${encodeURIComponent(search)}`);
                    if (params.length) url += '?' + params.join('&');
                    
                    const data = await this.api(url);
                    
                    // Get customers for lookup
                    const customersData = await this.api(`/businesses/${this.business.id}/customers`);
                    const customers = {};
                    customersData.customers.forEach(c => customers[c.id] = c.name);
                    this.customersMap = customers; // Store for global access
                    
                    let sales = data.sales || [];
                    this.currentSales = sales; // Store for global access
                    
                    // Apply client-side filters
                    if (statusFilter) {
                        if (statusFilter === 'completed') {
                            sales = sales.filter(s => s.paid);
                        } else if (statusFilter === 'pending') {
                            sales = sales.filter(s => !s.paid);
                        } else if (statusFilter === 'cancelled') {
                            sales = sales.filter(s => s.cancelled);
                        }
                    }
                    
                    if (paymentFilter) {
                        sales = sales.filter(s => s.payment_method === paymentFilter);
                    }
                    
                    const tbody = document.getElementById('sales-table');
                    if (sales.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-8">Sin ventas registradas</td></tr>';
                    } else {
                        tbody.innerHTML = sales.map(s => `
                            <tr>
                                <td>${s.sale_date}</td>
                                <td>${customers[s.customer_id] || '-'}</td>
                                <td>${s.items.length}</td>
                                <td class="font-bold">${this.formatMoney(s.total)}</td>
                                <td class="${(s.balance || 0) > 0 ? 'money-negative' : 'money-positive'}">${this.formatMoney(s.balance || 0)}</td>
                                <td>${s.payment_method === 'cash' ? 'Efectivo' : s.payment_method === 'transfer' ? 'Transferencia' : s.payment_method === 'card' ? 'Tarjeta' : 'Fiado'}</td>
                                <td>${s.paid ? '<span class="text-green-400">Pagado</span>' : '<span class="text-red-400">Pendiente</span>'}</td>
                                <td>
                                    <div class="flex gap-2">
                                        <button onclick="app.deleteSale(${s.id})" class="text-red-400 hover:text-red-300 p-1 rounded hover:bg-white/10" title="Eliminar">
                                            <i class="ph ph-x text-lg"></i>
                                        </button>
                                        <button onclick="app.shareOnWhatsApp(${s.id})" class="text-green-400 hover:text-green-300 p-1 rounded hover:bg-white/10" title="Enviar por WhatsApp">
                                            <i class="ph ph-whatsapp-logo text-lg"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('');
                    }
                } catch (e) {
                    console.error('Error loading sales:', e);
                    const tbody = document.getElementById('sales-table');
                    if (tbody) {
                        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-red-400 py-8">Error al cargar ventas: ' + (e.message || 'Desconocido') + '</td></tr>';
                    }
                }
            },
            
            // Sales
            async loadProductsForSelect() {
                const data = await this.api(`/businesses/${this.business.id}/products`);
                this.products = data.products;
            },

            async loadCustomersForSelect() {
                const data = await this.api(`/businesses/${this.business.id}/customers`);
                this.customers = data.customers;
                
                // Update customers map
                if (!this.customersMap) this.customersMap = {};
                data.customers.forEach(c => this.customersMap[c.id] = c.name);
                
                const select = document.getElementById('sale-customer');
                if (select) {
                    select.innerHTML = '<option value="">Sin cliente (Venta rápida)</option>' + 
                        data.customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
                }
            },

            async showSaleModal() {
                if (!await this.checkFreeLimit('sales')) return;

                this.closeModal(); // Ensure other modals are closed
                this.editingSaleId = null;
                await this.loadProductsForSelect();
                await this.loadCustomersForSelect();
                document.getElementById('sale-date').value = new Date().toISOString().split('T')[0];
                document.getElementById('sale-method').value = 'cash';
                document.getElementById('sale-note').value = '';
                document.getElementById('sale-customer').value = '';
                
                const modal = document.getElementById('modal-sale');
                modal.querySelector('h3').innerText = 'Nueva Venta';
                const overlay = document.getElementById('modal-overlay');
                modal.classList.remove('hidden');
                modal.style.display = 'block';
                overlay.classList.remove('hidden');
                overlay.style.display = 'flex';
                this.saleItems = [];
                // Initialize with one empty item
                const itemsContainer = document.getElementById('sale-items');
                if (itemsContainer) itemsContainer.innerHTML = '';
                this.addSaleItem();
                this.updateSaleTotal();
            },

            // Sales Goals Logic
            async loadSalesGoals(status = 'active') {
                const container = document.getElementById('goals-list');
                const proLock = document.getElementById('goals-pro-lock');
                const content = document.getElementById('goals-content');
                
                // Reset UI
                if (container) container.innerHTML = '<div class="col-span-3 text-center py-8"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div></div>';
                
                // Update filters UI
                ['active', 'achieved', 'archived'].forEach(s => {
                    const btn = document.getElementById(`goal-filter-${s}`);
                    if (btn) {
                        if (s === status) {
                            btn.classList.remove('text-white/60', 'hover:bg-white/5');
                            btn.classList.add('bg-white/10', 'text-white');
                        } else {
                            btn.classList.add('text-white/60', 'hover:bg-white/5');
                            btn.classList.remove('bg-white/10', 'text-white');
                        }
                    }
                });

                try {
                    const data = await this.api(`/businesses/${this.business.id}/sales-goals?status=${status}`);
                    this.currentGoals = data.sales_goals; // Store for editing
                    
                    // PRO Check handled by backend 403, but also check locally to show nice UI
                    // If success, hide lock
                    if (proLock) proLock.classList.add('hidden');
                    if (content) content.classList.remove('hidden');

                    if (!data.sales_goals || data.sales_goals.length === 0) {
                        container.innerHTML = '<div class="col-span-3 text-center py-12 text-white/30">No hay metas en esta sección</div>';
                        return;
                    }

                    container.innerHTML = data.sales_goals.map(goal => {
                        const progress = Math.round(goal.progress_pct);
                        const isAchieved = goal.status === 'achieved';
                        const barColor = isAchieved ? 'bg-green-400' : 'bg-blue-500';
                        
                        // Check for congrats popup
                        if (goal.should_show_congrats) {
                            setTimeout(() => this.showCongrats(goal), 1000); // Small delay for effect
                        }

                        return `
                            <div class="glass rounded-xl p-5 relative group overflow-hidden">
                                <div class="absolute top-0 left-0 w-1 h-full ${isAchieved ? 'bg-green-400' : 'bg-blue-500'}"></div>
                                <div class="flex justify-between items-start mb-2">
                                    <h3 class="font-bold text-lg truncate pr-2">${this.escapeHtml(goal.title)}</h3>
                                    ${goal.status === 'active' ? 
                                        `<button onclick="app.showGoalModal(${goal.id})" class="text-white/40 hover:text-white p-1"><i class="ph ph-pencil-simple"></i></button>` : 
                                        (goal.status === 'achieved' ? `<span class="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-lg">Cumplida</span>` : '')
                                    }
                                </div>
                                <p class="text-sm text-white/60 mb-4 h-10 overflow-hidden text-ellipsis line-clamp-2">${this.escapeHtml(goal.description || '')}</p>
                                
                                <div class="mb-2 flex justify-between text-sm">
                                    <span class="text-white/80">${this.formatMoney(goal.current_amount)}</span>
                                    <span class="font-bold ${isAchieved ? 'text-green-400' : 'text-white'}">${progress}%</span>
                                </div>
                                <div class="w-full bg-white/10 rounded-full h-2 mb-4 overflow-hidden">
                                    <div class="${barColor} h-full transition-all duration-1000 ease-out" style="width: ${progress}%"></div>
                                </div>
                                
                                <div class="flex justify-between items-center mt-4 pt-4 border-t border-white/5">
                                    <div class="text-xs text-white/40">
                                        ${this.formatDate(goal.start_date)} - ${this.formatDate(goal.end_date)}
                                    </div>
                                    <div class="flex gap-2">
                                        ${goal.status === 'achieved' || goal.status === 'active' ? 
                                            `<button onclick="app.archiveSalesGoal(${goal.id})" class="text-xs bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 transition-colors">Archivar</button>` : ''
                                        }
                                        <div class="text-right text-xs text-white/40 flex items-center">
                                            Meta: ${this.formatMoney(goal.target_amount)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('');

                } catch (e) {
                    if (e.message.includes('PRO_REQUIRED') || e.status === 403) {
                        if (proLock) proLock.classList.remove('hidden');
                        if (content) content.classList.add('hidden');
                        if (container) container.innerHTML = '';
                    } else {
                        if (container) container.innerHTML = `<div class="col-span-3 text-center text-red-400 py-8">Error: ${e.message}</div>`;
                    }
                }
            },

            filterGoals(status) {
                this.loadSalesGoals(status);
            },

            async showGoalModal(goalId = null) {
                // Check PRO first
                if (this.user.plan === 'free') {
                    this.navigate('upgrade');
                    return;
                }

                const modal = document.getElementById('modal-goal');
                const overlay = document.getElementById('modal-overlay');
                const title = document.getElementById('goal-modal-title');
                const idInput = document.getElementById('goal-id');
                const titleInput = document.getElementById('goal-title');
                const descInput = document.getElementById('goal-description');
                const targetInput = document.getElementById('goal-target');
                const startInput = document.getElementById('goal-start');
                const endInput = document.getElementById('goal-end');

                // Reset form
                idInput.value = '';
                titleInput.value = '';
                descInput.value = '';
                targetInput.value = '';
                
                // Default dates (current month)
                this.setGoalPeriod('month');

                if (goalId) {
                    title.textContent = 'Editar Meta';
                    try {
                        if (this.currentGoals) {
                            const goal = this.currentGoals.find(g => g.id === goalId);
                            if (goal) {
                                idInput.value = goal.id;
                                titleInput.value = goal.title;
                                descInput.value = goal.description || '';
                                targetInput.value = goal.target_amount;
                                startInput.value = goal.start_date;
                                endInput.value = goal.end_date;
                            }
                        }
                    } catch(e) {}
                } else {
                    title.textContent = 'Nueva Meta';
                }

                if (modal) {
                    modal.classList.remove('hidden');
                    modal.style.display = 'block';
                    modal.style.zIndex = '100000'; // Ensure on top
                }
                if (overlay) {
                    overlay.classList.remove('hidden');
                    overlay.style.display = 'flex';
                    overlay.style.zIndex = '99999';
                }
            },

            setGoalPeriod(period) {
                const startInput = document.getElementById('goal-start');
                const endInput = document.getElementById('goal-end');
                const today = new Date();
                let start = new Date(today);
                let end = new Date(today);

                if (period === 'month') {
                    start.setDate(1);
                    end.setMonth(end.getMonth() + 1);
                    end.setDate(0);
                } else if (period === 'quarter') {
                    const quarter = Math.floor(today.getMonth() / 3);
                    start.setMonth(quarter * 3);
                    start.setDate(1);
                    end.setMonth(start.getMonth() + 3);
                    end.setDate(0);
                } else if (period === 'year') {
                    start.setMonth(0, 1);
                    end.setMonth(11, 31);
                }

                startInput.value = start.toISOString().split('T')[0];
                endInput.value = end.toISOString().split('T')[0];
            },

            async saveSalesGoal() {
                const id = document.getElementById('goal-id').value;
                const title = document.getElementById('goal-title').value;
                const description = document.getElementById('goal-description').value;
                const target_amount = document.getElementById('goal-target').value;
                const start_date = document.getElementById('goal-start').value;
                const end_date = document.getElementById('goal-end').value;

                if (!title || !target_amount || !start_date || !end_date) {
                    showCustomAlert('Completa los campos obligatorios', 'warning');
                    return;
                }

                const payload = {
                    title, description, target_amount, start_date, end_date
                };

                try {
                    if (id) {
                        await this.api(`/businesses/${this.business.id}/sales-goals/${id}`, {
                            method: 'PUT',
                            body: JSON.stringify(payload)
                        });
                    } else {
                        await this.api(`/businesses/${this.business.id}/sales-goals`, {
                            method: 'POST',
                            body: JSON.stringify(payload)
                        });
                    }
                    this.closeModal('modal-goal');
                    this.loadSalesGoals();
                    showCustomAlert('Meta guardada exitosamente', 'success');
                } catch (e) {
                    showCustomAlert(e.message, 'error');
                }
            },

            async archiveSalesGoal(id, fromCongrats = false) {
                if (!fromCongrats && !await showConfirm('¿Archivar esta meta? Ya no aparecerá en Activas.')) return;
                
                try {
                    await this.api(`/businesses/${this.business.id}/sales-goals/${id}/archive`, {
                        method: 'POST'
                    });
                    this.loadSalesGoals();
                    if (fromCongrats) {
                        document.getElementById('modal-congrats').classList.add('hidden');
                    }
                } catch (e) {
                    showCustomAlert(e.message, 'error');
                }
            },

            showCongrats(goal) {
                const modal = document.getElementById('modal-congrats');
                if (!modal) return;
                
                document.getElementById('congrats-title').textContent = goal.title;
                document.getElementById('congrats-current').textContent = this.formatMoney(goal.current_amount);
                document.getElementById('congrats-target').textContent = this.formatMoney(goal.target_amount);
                
                // Buttons
                const archiveBtn = document.getElementById('congrats-archive-btn');
                const closeBtn = document.getElementById('congrats-close-btn');
                
                archiveBtn.onclick = () => this.archiveSalesGoal(goal.id, true);
                closeBtn.onclick = async () => {
                    // Mark as seen
                    await this.api(`/businesses/${this.business.id}/sales-goals/${goal.id}/mark-congrats-seen`, {
                        method: 'POST'
                    });
                    modal.classList.add('hidden');
                };
                
                modal.classList.remove('hidden');
                // Trigger confetti if library available or just simple animation
            },
            
            addSaleItem(productId = '', quantity = 1, unitPrice = 0) {
                const itemsContainer = document.getElementById('sale-items');
                
                const productOptions = '<option value="">Seleccionar producto</option>' + 
                    this.products.map(p => `<option value="${p.id}" data-price="${p.price}" data-name="${p.name}" ${p.id == productId ? 'selected' : ''}>${p.name}</option>`).join('');

                const html = `
                    <div class="sale-item flex gap-2 items-center mb-2">
                        <select class="sale-item-product input flex-1 px-3 py-2 rounded-lg text-sm" onchange="app.onSaleProductChange(this)">
                            ${productOptions}
                        </select>
                        <input type="number" class="sale-item-qty input w-20 px-3 py-2 rounded-lg text-sm" value="${quantity}" min="1" onchange="app.calculateSaleItem(this)" oninput="app.calculateSaleItem(this)">
                        <input type="number" class="sale-item-price input w-24 px-3 py-2 rounded-lg text-sm" value="${unitPrice}" step="0.01" onchange="app.calculateSaleItem(this)" oninput="app.calculateSaleItem(this)">
                        <span class="sale-item-subtotal w-24 text-right font-mono text-sm">${this.formatMoney(quantity * unitPrice)}</span>
                        <button type="button" onclick="this.closest('.sale-item').remove(); app.updateSaleTotal();" class="text-red-400 hover:text-red-300 p-2">
                            <i class="ph ph-trash"></i>
                        </button>
                    </div>
                `;
                itemsContainer.insertAdjacentHTML('beforeend', html);
            },

            onSaleProductChange(select) {
                const option = select.selectedOptions[0];
                const price = parseFloat(option.dataset.price || 0);
                const itemRow = select.closest('.sale-item');
                const priceInput = itemRow.querySelector('.sale-item-price');
                priceInput.value = price;
                this.calculateSaleItem(select);
            },

            calculateSaleItem(element) {
                const itemRow = element.closest('.sale-item');
                const qty = parseFloat(itemRow.querySelector('.sale-item-qty').value) || 0;
                const price = parseFloat(itemRow.querySelector('.sale-item-price').value) || 0;
                const subtotal = qty * price;
                itemRow.querySelector('.sale-item-subtotal').textContent = this.formatMoney(subtotal);
                this.updateSaleTotal();
            },

            updateSaleTotal() {
                let total = 0;
                document.querySelectorAll('.sale-item').forEach(item => {
                    const qty = parseFloat(item.querySelector('.sale-item-qty').value) || 0;
                    const price = parseFloat(item.querySelector('.sale-item-price').value) || 0;
                    total += qty * price;
                });
                document.getElementById('sale-total').textContent = this.formatMoney(total).replace('$', '').trim();
            },
            
            async editSale(id) {
                try {
                    const data = await this.api(`/businesses/${this.business.id}/sales/${id}`);
                    const sale = data.sale;
                    
                    if (!sale) throw new Error('Venta no encontrada');
                    
                    this.editingSaleId = id;
                    await this.loadProductsForSelect();
                    await this.loadCustomersForSelect();
                    
                    document.getElementById('sale-date').value = sale.sale_date;
                    document.getElementById('sale-method').value = sale.payment_method;
                    document.getElementById('sale-note').value = sale.note || '';
                    document.getElementById('sale-customer').value = sale.customer_id || '';
                    
                    // Clear items
                    const itemsContainer = document.getElementById('sale-items');
                    itemsContainer.innerHTML = '';
                    
                    // Populate items
                    if (sale.items && sale.items.length > 0) {
                        sale.items.forEach(item => {
                            this.addSaleItem(item.product_id, item.qty, item.unit_price || item.price);
                        });
                        this.updateSaleTotal();
                    } else {
                        this.addSaleItem();
                    }
                    
                    const modal = document.getElementById('modal-sale');
                    modal.querySelector('h3').innerText = 'Editar Venta (Reemplazar)';
                    const overlay = document.getElementById('modal-overlay');
                    modal.classList.remove('hidden');
                    modal.style.display = 'block';
                    overlay.classList.remove('hidden');
                    overlay.style.display = 'flex';
                    
                } catch (e) {
                    showCustomAlert('Error al cargar venta: ' + e.message, 'error');
                }
            },
            
            async saveSale() {
                const customerId = document.getElementById('sale-customer').value;
                const saleDate = document.getElementById('sale-date').value;
                const paymentMethod = document.getElementById('sale-method').value;
                const note = document.getElementById('sale-note').value;
                
                // Build items
                const items = [];
                document.querySelectorAll('.sale-item').forEach(item => {
                    const select = item.querySelector('.sale-item-product');
                    const qty = parseFloat(item.querySelector('.sale-item-qty').value) || 0;
                    const price = parseFloat(item.querySelector('.sale-item-price').value) || 0;
                    
                    if (select.value && qty > 0) {
                         const option = select.selectedOptions[0];
                         items.push({
                            product_id: parseInt(select.value),
                            name: option.text, // or option.dataset.name
                            qty: qty,
                            unit_price: price,
                            total: price * qty
                        });
                    }
                });
                
                if (items.length === 0) {
                    showCustomAlert('Agrega al menos un producto', 'warning');
                    return;
                }
                
                const subtotal = items.reduce((sum, i) => sum + i.total, 0);
                
                // Disable button to prevent duplicates
                const saveBtn = document.querySelector('#modal-sale .bg-indigo-600');
                if (saveBtn) {
                    saveBtn.disabled = true;
                    saveBtn.innerHTML = '<i class="ph ph-spinner animate-spin"></i> Guardando...';
                }

                try {
                    // If editing, delete old first
                    if (this.editingSaleId) {
                        await this.api(`/businesses/${this.business.id}/sales/${this.editingSaleId}`, {
                            method: 'DELETE'
                        });
                    }

                    const response = await this.api(`/businesses/${this.business.id}/sales`, {
                        method: 'POST',
                        body: JSON.stringify({
                            customer_id: customerId || null,
                            sale_date: saleDate,
                            items: items,
                            subtotal: subtotal,
                            discount: 0,
                            total: subtotal,
                            payment_method: paymentMethod,
                            note: note
                        })
                    });
                    
                    this.closeModal('modal-sale');
                    this.loadSales();
                    this.loadDashboard();

                    // Only redirect to WhatsApp if it's a new sale (not editing) OR if the user wants it.
                    // For now, let's assume if they edit, they might want to share the new receipt too.
                    if (response.invoice_url) {
                        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                        
                        // Get Business Name
                        const businessName = this.business.name || 'Mi Negocio';
                        
                        const customerSelect = document.getElementById('sale-customer');
                        const customerName = customerSelect && customerSelect.options[customerSelect.selectedIndex] ? customerSelect.options[customerSelect.selectedIndex].text : '';
                        const cleanCustomerName = customerName === 'Sin cliente (Venta rápida)' ? '' : customerName;
                        
                        // Use unified builder
                        const message = this.buildWhatsappMessage(response.sale);
                        
                        // Success
                        this.closeModal();
                        this.loadSales();
                        this.loadDashboard();
                        
                        showCustomAlert('Venta registrada', 'success');
                        
                        // Optional: ask to share
                        setTimeout(() => {
                            if (confirm('¿Deseas enviar el comprobante por WhatsApp?')) {
                                this.shareOnWhatsApp(response.sale.id);
                            }
                        }, 500);
                    }
                } catch (e) {
                    console.error(e);
                    showCustomAlert('Error al guardar venta: ' + e.message, 'error');
                } finally {
                    // Re-enable button
                    if (saveBtn) {
                        saveBtn.disabled = false;
                        saveBtn.innerHTML = 'Guardar';
                    }
                }
            },

            async deleteSale(id) {
                const confirmed = await showCustomConfirm('¿Estás seguro de eliminar esta venta? Esta acción no se puede deshacer.', 'danger');
                if (!confirmed) return;
                
                try {
                    await this.api(`/businesses/${this.business.id}/sales/${id}`, 'DELETE');
                    this.loadSales();
                    this.loadDashboard();
                } catch (e) {
                    console.error(e);
                    showCustomAlert('Error al eliminar venta: ' + e.message, 'error');
                }
            },

            editSale(id) {
                alert('Para editar una venta, por favor elimínela y créela nuevamente para asegurar la integridad del inventario y caja.');
            },
            
            // Expenses
            async loadExpenses() {
                const search = document.getElementById('expenses-search')?.value || '';
                const start = document.getElementById('expenses-start')?.value || '';
                const end = document.getElementById('expenses-end')?.value || '';

                let url = `/businesses/${this.business.id}/expenses`;
                const params = [];
                if (start) params.push(`start_date=${start}`);
                if (end) params.push(`end_date=${end}`);
                if (search) params.push(`search=${encodeURIComponent(search)}`);
                if (params.length) url += '?' + params.join('&');

                const data = await this.api(url);
                
                const tbody = document.getElementById('expenses-table');
                if (data.expenses.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-8">Sin gastos registrados</td></tr>';
                } else {
                    tbody.innerHTML = data.expenses.map(e => `
                        <tr>
                            <td>${e.expense_date}</td>
                            <td>${e.category}</td>
                            <td class="money-negative font-bold">${this.formatMoney(e.amount)}</td>
                            <td>${e.description || '-'}</td>
                            <td>
                                <div class="flex gap-2">
                                    <button onclick="app.editExpense(${e.id})" class="text-blue-400 hover:text-blue-300 p-1 rounded hover:bg-white/10" title="Editar">
                                        <i class="ph ph-pencil-simple text-lg"></i>
                                    </button>
                                    <button onclick="app.deleteExpense(${e.id})" class="text-red-400 hover:text-red-300 p-1 rounded hover:bg-white/10" title="Eliminar">
                                        <i class="ph ph-x text-lg"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('');
                }
            },
            
            // Payments
            async loadPayments() {
                const search = document.getElementById('payments-search')?.value || '';
                const start = document.getElementById('payments-start')?.value || '';
                const end = document.getElementById('payments-end')?.value || '';

                let url = `/businesses/${this.business.id}/payments`;
                const params = [];
                if (start) params.push(`start_date=${start}`);
                if (end) params.push(`end_date=${end}`);
                if (search) params.push(`search=${encodeURIComponent(search)}`);
                if (params.length) url += '?' + params.join('&');

                const data = await this.api(url);
                
                // Get customers for lookup
                const customersData = await this.api(`/businesses/${this.business.id}/customers`);
                const customers = {};
                customersData.customers.forEach(c => customers[c.id] = c.name);
                
                const tbody = document.getElementById('payments-table');
                if (data.payments.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-8">Sin pagos registrados</td></tr>';
                } else {
                    tbody.innerHTML = data.payments.map(p => `
                        <tr>
                            <td>${p.payment_date}</td>
                            <td>${customers[p.customer_id] || '-'}</td>
                            <td class="money-positive font-bold">${this.formatMoney(p.amount)}</td>
                            <td>${p.method === 'cash' ? 'Efectivo' : 'Transferencia'}</td>
                            <td>${p.note || '-'}</td>
                            <td>
                                <div class="flex gap-2">
                                    <button onclick="app.editPayment(${p.id})" class="text-blue-400 hover:text-blue-300 p-1 rounded hover:bg-white/10" title="Editar">
                                        <i class="ph ph-pencil-simple text-lg"></i>
                                    </button>
                                    <button onclick="app.deletePayment(${p.id})" class="text-red-400 hover:text-red-300 p-1 rounded hover:bg-white/10" title="Eliminar">
                                        <i class="ph ph-x text-lg"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('');
                }
            },
            
            async showExpenseModal() {
                if (!await this.checkFreeLimit('expenses')) return;
                
                this.closeModal();
                this.editingExpenseId = null;
                document.getElementById('expense-date').value = new Date().toISOString().split('T')[0];
                document.getElementById('expense-amount').value = '';
                document.getElementById('expense-category').value = '';
                document.getElementById('expense-description').value = '';
                
                const modal = document.getElementById('modal-expense');
                modal.querySelector('h3').innerText = 'Nuevo Gasto';
                const overlay = document.getElementById('modal-overlay');
                modal.classList.remove('hidden');
                modal.style.display = 'block';
                overlay.classList.remove('hidden');
                overlay.style.display = 'flex';
            },
            
            async editExpense(id) {
                try {
                    const data = await this.api(`/businesses/${this.business.id}/expenses/${id}`);
                    const e = data.expense;
                    
                    this.editingExpenseId = id;
                    document.getElementById('expense-date').value = e.expense_date;
                    document.getElementById('expense-amount').value = e.amount;
                    document.getElementById('expense-category').value = e.category;
                    document.getElementById('expense-description').value = e.description || '';
                    
                    const modal = document.getElementById('modal-expense');
                    modal.querySelector('h3').innerText = 'Editar Gasto';
                    const overlay = document.getElementById('modal-overlay');
                    modal.classList.remove('hidden');
                    modal.style.display = 'block';
                    overlay.classList.remove('hidden');
                    overlay.style.display = 'flex';
                } catch (e) {
                    showCustomAlert('Error al cargar gasto: ' + e.message, 'error');
                }
            },
            
            async saveExpense() {
                const expense_date = document.getElementById('expense-date').value;
                const category = document.getElementById('expense-category').value;
                const amount = parseFloat(document.getElementById('expense-amount').value);
                const description = document.getElementById('expense-description').value;
                
                if (!category || !amount) {
                    showCustomAlert('Completa todos los campos', 'warning');
                    return;
                }
                
                const payload = {
                    expense_date,
                    category,
                    amount,
                    description
                };
                
                try {
                    if (this.editingExpenseId) {
                        await this.api(`/businesses/${this.business.id}/expenses/${this.editingExpenseId}`, {
                            method: 'PUT',
                            body: JSON.stringify(payload)
                        });
                        showCustomAlert('Gasto actualizado', 'success');
                    } else {
                        await this.api(`/businesses/${this.business.id}/expenses`, {
                            method: 'POST',
                            body: JSON.stringify(payload)
                        });
                        showCustomAlert('Gasto creado', 'success');
                    }
                    
                    this.closeModal();
                    this.loadExpenses();
                    this.loadDashboard();
                } catch (e) {
                    showCustomAlert('Error al guardar gasto: ' + e.message, 'error');
                }
            },
            
            async deleteExpense(id) {
                if (!await showConfirm('¿Eliminar gasto?')) return;
                
                await this.api(`/businesses/${this.business.id}/expenses/${id}`, {
                    method: 'DELETE'
                });
                
                this.loadExpenses();
                this.loadDashboard();
            },
            
            // Show Payment Modal
            showPaymentModal() {
                this.closeModal();
                this.editingPaymentId = null;
                this.loadCustomersForSelectPayment();
                document.getElementById('payment-date').value = new Date().toISOString().split('T')[0];
                document.getElementById('payment-customer').value = '';
                document.getElementById('payment-amount').value = '';
                document.getElementById('payment-method').value = 'cash';
                document.getElementById('payment-note').value = '';
                
                const modal = document.getElementById('modal-payment');
                modal.querySelector('h3').innerText = 'Registrar Pago / Abono';
                const overlay = document.getElementById('modal-overlay');
                modal.classList.remove('hidden');
                modal.style.display = 'block';
                overlay.classList.remove('hidden');
                overlay.style.display = 'flex';
            },
            
            async editPayment(id) {
                try {
                    const data = await this.api(`/businesses/${this.business.id}/payments/${id}`);
                    const p = data.payment;
                    
                    this.editingPaymentId = id;
                    await this.loadCustomersForSelectPayment();
                    
                    document.getElementById('payment-date').value = p.payment_date;
                    document.getElementById('payment-customer').value = p.customer_id;
                    document.getElementById('payment-amount').value = p.amount;
                    document.getElementById('payment-method').value = p.method;
                    document.getElementById('payment-note').value = p.note || '';
                    
                    const modal = document.getElementById('modal-payment');
                    modal.querySelector('h3').innerText = 'Editar Pago (Reemplazar)';
                    const overlay = document.getElementById('modal-overlay');
                    modal.classList.remove('hidden');
                    modal.style.display = 'block';
                    overlay.classList.remove('hidden');
                    overlay.style.display = 'flex';
                } catch (e) {
                    showCustomAlert('Error al cargar pago: ' + e.message, 'error');
                }
            },
            
            async loadCustomersForSelectPayment() {
                const data = await this.api(`/businesses/${this.business.id}/customers`);
                const select = document.getElementById('payment-customer');
                select.innerHTML = '<option value="">Seleccionar cliente</option>' + 
                    data.customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
            },
            
            async savePayment() {
                const customer_id = document.getElementById('payment-customer').value;
                const payment_date = document.getElementById('payment-date').value;
                const amount = parseFloat(document.getElementById('payment-amount').value);
                const method = document.getElementById('payment-method').value;
                const note = document.getElementById('payment-note').value;
                
                if (!customer_id || !amount) {
                    showCustomAlert('Cliente y monto son requeridos', 'warning');
                    return;
                }
                
                try {
                    if (this.editingPaymentId) {
                        await this.api(`/businesses/${this.business.id}/payments/${this.editingPaymentId}`, {
                            method: 'DELETE'
                        });
                    }

                    await this.api(`/businesses/${this.business.id}/payments`, {
                        method: 'POST',
                        body: JSON.stringify({
                            customer_id: parseInt(customer_id),
                            payment_date,
                            amount,
                            method,
                            note
                        })
                    });
                    
                    showCustomAlert(this.editingPaymentId ? 'Pago actualizado' : 'Pago registrado', 'success');
                    this.closeModal();
                    // Reload all relevant data
                    if (this.loadPayments) this.loadPayments();
                    this.loadSales();
                    this.loadDashboard();
                    this.loadCustomers();
                } catch (e) {
                    showCustomAlert('Error al guardar pago: ' + e.message, 'error');
                }
            },

            async deletePayment(id) {
                const confirmed = await showCustomConfirm('¿Eliminar pago? Esto revertirá el saldo del cliente.', 'danger');
                if (!confirmed) return;
                
                try {
                    await this.api(`/businesses/${this.business.id}/payments/${id}`, {
                        method: 'DELETE'
                    });
                    if (this.loadPayments) this.loadPayments();
                    this.loadSales();
                    this.loadDashboard();
                    this.loadCustomers();
                    showCustomAlert('Pago eliminado', 'success');
                } catch (e) {
                    showCustomAlert('Error al eliminar pago: ' + e.message, 'error');
                }
            },
            
            // Customers
            async loadCustomers() {
                // Get filter values
                const search = document.getElementById('customer-search')?.value || '';
                const statusFilter = document.getElementById('customer-status-filter')?.value || '';
                const balanceFilter = document.getElementById('customer-balance-filter')?.value || '';
                
                let url = `/businesses/${this.business.id}/customers`;
                if (search) url += `?search=${encodeURIComponent(search)}`;
                
                const data = await this.api(url);
                
                // Get balances
                const debtors = await this.api(`/businesses/${this.business.id}/customers/debtors`);
                const balances = {};
                debtors.debtors.forEach(d => balances[d.id] = d.balance);
                
                let customers = data.customers || [];
                
                // Apply client-side filters
                if (statusFilter) {
                    if (statusFilter === 'active') {
                        customers = customers.filter(c => c.active);
                    } else if (statusFilter === 'inactive') {
                        customers = customers.filter(c => !c.active);
                    }
                }
                
                if (balanceFilter) {
                    if (balanceFilter === 'positive') {
                        customers = customers.filter(c => (balances[c.id] || 0) > 0);
                    } else if (balanceFilter === 'negative') {
                        customers = customers.filter(c => (balances[c.id] || 0) < 0);
                    } else if (balanceFilter === 'zero') {
                        customers = customers.filter(c => (balances[c.id] || 0) === 0);
                    }
                }
                
                const tbody = document.getElementById('customers-table');
                if (customers.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-8">Sin clientes registrados</td></tr>';
                } else {
                    tbody.innerHTML = customers.map(c => `
                        <tr>
                            <td>${c.name}</td>
                            <td>${c.phone || '-'}</td>
                            <td class="${balances[c.id] > 0 ? 'money-negative' : 'money-positive'}">${this.formatMoney(balances[c.id] || 0)}</td>
                            <td>${c.active ? '<span class="text-green-400">Activo</span>' : '<span class="text-muted">Inactivo</span>'}</td>
                            <td>
                                <div class="flex gap-2">
                                    <button onclick="app.editCustomer(${c.id})" class="text-blue-400 hover:text-blue-300 p-1 rounded hover:bg-white/10" title="Editar">
                                        <i class="ph ph-pencil-simple text-lg"></i>
                                    </button>
                                    <button onclick="app.deleteCustomer(${c.id})" class="text-red-400 hover:text-red-300 p-1 rounded hover:bg-white/10" title="Eliminar">
                                        <i class="ph ph-x text-lg"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('');
                }
            },
            
            async filterCustomers() {
                await this.loadCustomers();
            },
            
            async showCustomerModal() {
                if (!await this.checkFreeLimit('customers')) return;
                
                this.editingCustomerId = null;
                document.getElementById('customer-name').value = '';
                document.getElementById('customer-phone').value = '';
                document.getElementById('customer-address').value = '';
                document.getElementById('customer-notes').value = '';
                
                const modal = document.getElementById('modal-customer');
                modal.querySelector('h3').innerText = 'Nuevo Cliente';
                const overlay = document.getElementById('modal-overlay');
                modal.classList.remove('hidden');
                modal.style.display = 'block';
                overlay.classList.remove('hidden');
                overlay.style.display = 'flex';
            },
            
            async editCustomer(id) {
                try {
                    const data = await this.api(`/businesses/${this.business.id}/customers/${id}`);
                    const c = data.customer;
                    
                    this.editingCustomerId = id;
                    document.getElementById('customer-name').value = c.name;
                    document.getElementById('customer-phone').value = c.phone || '';
                    document.getElementById('customer-address').value = c.address || '';
                    document.getElementById('customer-notes').value = c.notes || '';
                    
                    const modal = document.getElementById('modal-customer');
                    modal.querySelector('h3').innerText = 'Editar Cliente';
                    const overlay = document.getElementById('modal-overlay');
                    modal.classList.remove('hidden');
                    modal.style.display = 'block';
                    overlay.classList.remove('hidden');
                    overlay.style.display = 'flex';
                } catch (e) {
                    showCustomAlert('Error al cargar cliente: ' + e.message, 'error');
                }
            },
            
            async saveCustomer() {
                const name = document.getElementById('customer-name').value;
                const phone = document.getElementById('customer-phone').value;
                const address = document.getElementById('customer-address').value;
                const notes = document.getElementById('customer-notes').value;
                
                if (!name) {
                    showCustomAlert('El nombre es requerido', 'warning');
                    return;
                }
                
                try {
                    if (this.editingCustomerId) {
                        await this.api(`/businesses/${this.business.id}/customers/${this.editingCustomerId}`, {
                            method: 'PUT',
                            body: JSON.stringify({ name, phone, address, notes })
                        });
                        showCustomAlert('Cliente actualizado', 'success');
                    } else {
                        await this.api(`/businesses/${this.business.id}/customers`, {
                            method: 'POST',
                            body: JSON.stringify({ name, phone, address, notes })
                        });
                        showCustomAlert('Cliente creado', 'success');
                    }
                    
                    this.closeModal();
                    this.loadCustomers();
                } catch (e) {
                    showCustomAlert('Error al guardar cliente: ' + e.message, 'error');
                }
            },
            
            async deleteCustomer(id) {
                const confirmed = await showCustomConfirm('¿Eliminar cliente? Esta acción no se puede deshacer.', 'danger');
                if (!confirmed) return;
                
                try {
                    await this.api(`/businesses/${this.business.id}/customers/${id}`, {
                        method: 'DELETE'
                    });
                    this.loadCustomers();
                } catch (e) {
                    showCustomAlert('Error al eliminar cliente: ' + e.message, 'error');
                }
            },
            
            // Products
            async loadProducts() {
                try {
                    // Get filter values
                    const search = document.getElementById('product-search')?.value || '';
                    const category = document.getElementById('product-category-filter')?.value || '';
                    const stockFilter = document.getElementById('product-stock-filter')?.value || '';
                    
                    let url = `/businesses/${this.business.id}/products`;
                    const params = [];
                    if (search) params.push(`search=${encodeURIComponent(search)}`);
                    if (category) params.push(`category=${category}`);
                    if (params.length) url += '?' + params.join('&');
                    
                    const data = await this.api(url);
                    
                    let products = data.products || [];
                    
                    // Apply client-side stock filter
                    if (stockFilter) {
                        if (stockFilter === 'in_stock') {
                            products = products.filter(p => p.stock > 0);
                        } else if (stockFilter === 'out_of_stock') {
                            products = products.filter(p => p.stock <= 0);
                        } else if (stockFilter === 'low_stock') {
                            products = products.filter(p => p.stock > 0 && p.stock <= (p.low_stock_threshold || 5));
                        }
                    }
                    
                    const tbody = document.getElementById('products-table');
                    if (products.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-8">Sin productos registrados</td></tr>';
                    } else {
                        tbody.innerHTML = products.map(p => `
                            <tr>
                                <td>
                                    <div class="flex items-center gap-2">
                                        <span class="text-xl" title="${p.type === 'service' ? 'Servicio' : 'Producto'}">
                                            ${p.type === 'service' ? '🛠️' : '📦'}
                                        </span>
                                        <div>
                                            <div class="font-medium">${p.name}</div>
                                            <div class="text-xs text-muted">${p.type === 'service' ? 'Servicio' : 'Producto'}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>${p.sku || '-'}</td>
                                <td class="font-bold">${this.formatMoney(p.price)}</td>
                                <td>${p.cost ? this.formatMoney(p.cost) : '-'}</td>
                                <td>
                                    ${p.type === 'service' ? '<span class="text-muted">N/A</span>' : `
                                        <span class="${p.stock <= p.low_stock_threshold ? 'text-yellow-400' : ''}">${p.stock || 0}</span>
                                    `}
                                </td>
                                <td>
                                    <div class="flex gap-2">
                                        <button onclick="app.editProduct(${p.id})" class="text-blue-400 hover:text-blue-300 p-1 rounded hover:bg-white/10" title="Editar">
                                            <i class="ph ph-pencil-simple text-lg"></i>
                                        </button>
                                        <button onclick="app.deleteProduct(${p.id})" class="text-red-400 hover:text-red-300 p-1 rounded hover:bg-white/10" title="Eliminar">
                                            <i class="ph ph-x text-lg"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('');
                    }
                } catch (e) {
                    console.error('Error loading products:', e);
                    const tbody = document.getElementById('products-table');
                    if (tbody) {
                        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-red-400 py-8">Error al cargar productos: ' + (e.message || 'Desconocido') + '</td></tr>';
                    }
                }
            },
            
            async filterProducts() {
                await this.loadProducts();
            },
            
            editingProductId: null,

            setProductType(type) {
                document.getElementById('product-type').value = type;
                
                // UI Toggle
                const btnProduct = document.getElementById('type-product');
                const btnService = document.getElementById('type-service');
                const stockFields = document.getElementById('product-stock-fields');
                
                if (type === 'product') {
                    btnProduct.className = 'flex-1 py-2 rounded-xl bg-green-500/20 text-green-400 border border-green-500/50';
                    btnService.className = 'flex-1 py-2 rounded-xl bg-white/5 text-white/60 border border-white/10 hover:bg-white/10';
                    stockFields.style.display = 'block';
                } else {
                    btnProduct.className = 'flex-1 py-2 rounded-xl bg-white/5 text-white/60 border border-white/10 hover:bg-white/10';
                    btnService.className = 'flex-1 py-2 rounded-xl bg-green-500/20 text-green-400 border border-green-500/50';
                    stockFields.style.display = 'none';
                }
            },

            async showProductModal() {
                if (!await this.checkFreeLimit('products')) return;

                this.editingProductId = null;
                document.getElementById('product-modal-title').textContent = 'Nuevo Producto/Servicio';
                this.setProductType('product');
                document.getElementById('product-name').value = '';
                document.getElementById('product-description').value = '';
                document.getElementById('product-sku').value = '';
                document.getElementById('product-price').value = '';
                document.getElementById('product-cost').value = '';
                document.getElementById('product-unit').value = 'und';
                document.getElementById('product-stock').value = '0';
                document.getElementById('product-low-stock').value = '5';
                const modal = document.getElementById('modal-product');
                const overlay = document.getElementById('modal-overlay');
                modal.classList.remove('hidden');
                modal.style.display = 'block';
                overlay.classList.remove('hidden');
                overlay.style.display = 'flex';
            },
            
            async editProduct(id) {
                try {
                    const data = await this.api(`/businesses/${this.business.id}/products/${id}`);
                    if (data.product) {
                        this.editingProductId = id;
                        document.getElementById('product-modal-title').textContent = 'Editar Producto/Servicio';
                        this.setProductType(data.product.type || 'product');
                        document.getElementById('product-name').value = data.product.name;
                        document.getElementById('product-description').value = data.product.description || '';
                        document.getElementById('product-sku').value = data.product.sku || '';
                        document.getElementById('product-price').value = data.product.price;
                        document.getElementById('product-cost').value = data.product.cost || '';
                        document.getElementById('product-unit').value = data.product.unit || 'und';
                        document.getElementById('product-stock').value = data.product.stock || 0;
                        document.getElementById('product-low-stock').value = data.product.low_stock_threshold || 5;
                        const modal = document.getElementById('modal-product');
                        const overlay = document.getElementById('modal-overlay');
                        modal.classList.remove('hidden');
                        modal.style.display = 'block';
                        overlay.classList.remove('hidden');
                        overlay.style.display = 'flex';
                    }
                } catch (e) {
                    showCustomAlert('Error al cargar producto: ' + e.message, 'error');
                }
            },
            
            async saveProduct() {
                const type = document.getElementById('product-type').value;
                const name = document.getElementById('product-name').value;
                const description = document.getElementById('product-description').value;
                const sku = document.getElementById('product-sku').value;
                const price = parseFloat(document.getElementById('product-price').value);
                const cost = document.getElementById('product-cost').value ? parseFloat(document.getElementById('product-cost').value) : null;
                const unit = document.getElementById('product-unit').value;
                const stock = parseFloat(document.getElementById('product-stock').value) || 0;
                const low_stock_threshold = parseFloat(document.getElementById('product-low-stock').value) || 5;
                
                if (!name || !price) {
                    showCustomAlert('Nombre y precio son requeridos', 'warning');
                    return;
                }
                
                const payload = { 
                    type, 
                    name, 
                    description,
                    sku, 
                    price, 
                    cost, 
                    unit: type === 'product' ? unit : 'srv', 
                    stock: type === 'product' ? stock : 0, 
                    low_stock_threshold 
                };

                try {
                    if (this.editingProductId) {
                        // Update existing
                        await this.api(`/businesses/${this.business.id}/products/${this.editingProductId}`, {
                            method: 'PUT',
                            body: JSON.stringify(payload)
                        });
                        showCustomAlert('Producto actualizado', 'success');
                    } else {
                        // Create new
                        await this.api(`/businesses/${this.business.id}/products`, {
                            method: 'POST',
                            body: JSON.stringify(payload)
                        });
                        showCustomAlert('Producto creado', 'success');
                    }
                    
                    this.closeModal();
                    this.loadProducts();
                } catch (e) {
                    showCustomAlert('Error al guardar producto: ' + e.message, 'error');
                }
            },
            
            async deleteProduct(id) {
                const confirmed = await showCustomConfirm('¿Eliminar producto? Esta acción no se puede deshacer.', 'danger');
                if (!confirmed) return;
                
                try {
                    await this.api(`/businesses/${this.business.id}/products/${id}`, {
                        method: 'DELETE'
                    });
                    this.loadProducts();
                } catch (e) {
                    showCustomAlert('Error al eliminar producto: ' + e.message, 'error');
                }
            },
            
            // Reports
            async loadReports() {
                const topProducts = await this.api(`/businesses/${this.business.id}/reports/top-products`);
                const container = document.getElementById('top-products');
                
                if (topProducts.top_products.length === 0) {
                    container.innerHTML = '<p class="text-muted">Sin datos</p>';
                } else {
                    container.innerHTML = topProducts.top_products.map((p, i) => `
                        <div class="flex justify-between p-2 bg-white/5 rounded-lg">
                            <span>${i + 1}. ${p.name}</span>
                            <span>${this.formatMoney(p.total)} (${p.qty} und)</span>
                        </div>
                    `).join('');
                }
            },
            
            // Orders
            async loadOrders() {
                // Load filter values - match HTML IDs
                const searchFilter = document.getElementById('orders-search')?.value || '';
                const statusFilter = document.getElementById('orders-status-filter')?.value || '';
                const startDate = document.getElementById('orders-date-from')?.value || '';
                const endDate = document.getElementById('orders-date-to')?.value || '';
                const sortValue = document.getElementById('orders-sort')?.value || 'newest';
                
                // Map sort values to API params
                let sortBy = 'order_date';
                let sortOrder = 'desc';
                if (sortValue === 'oldest') {
                    sortOrder = 'asc';
                } else if (sortValue === 'highest') {
                    sortBy = 'total';
                } else if (sortValue === 'lowest') {
                    sortBy = 'total';
                    sortOrder = 'asc';
                }
                
                // Build query params
                const params = new URLSearchParams();
                if (statusFilter) params.append('status', statusFilter);
                if (searchFilter) params.append('search', searchFilter);
                if (startDate) params.append('start_date', startDate);
                if (endDate) params.append('end_date', endDate);
                params.append('sort', sortBy);
                params.append('order', sortOrder);
                
                const queryString = params.toString();
                const url = queryString ? `/businesses/${this.business.id}/orders?${queryString}` : `/businesses/${this.business.id}/orders`;
                
                const data = await this.api(url);
                const orders = data.orders || [];
                const statsData = await this.api(`/businesses/${this.business.id}/orders/stats`);
                const stats = statsData || {};
                
                // Update stats cards
                document.getElementById('orders-total').textContent = stats.total_orders || 0;
                document.getElementById('orders-pending').textContent = stats.pending || 0;
                document.getElementById('orders-completed').textContent = stats.completed || 0;
                document.getElementById('orders-cancelled').textContent = stats.cancelled || 0;
                
                // Render orders table - match HTML column order: Pedido, Cliente, Fecha, Estado, Total, Acciones
                const tbody = document.getElementById('orders-table');
                if (!orders.length) {
                    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">No hay pedidos</td></tr>';
                    return;
                }
                
                tbody.innerHTML = orders.map(order => `
                    <tr class="hover:bg-white/5">
                        <td class="py-2 px-3">${order.order_number}</td>
                        <td class="py-2 px-3">${order.customer_name || 'N/A'}</td>
                        <td class="py-2 px-3">${order.order_date ? new Date(order.order_date).toLocaleDateString() : 'N/A'}</td>
                        <td class="py-2 px-3">
                            <span class="px-2 py-1 rounded text-xs font-medium ${this.getOrderStatusClass(order.status)}">
                                ${this.getOrderStatusLabel(order.status)}
                            </span>
                        </td>
                        <td class="py-2 px-3">${this.formatMoney(order.total)}</td>
                        <td class="py-2 px-3">
                            <button onclick="app.editOrder(${order.id})" class="text-blue-400 hover:text-blue-300 mr-2" title="Editar">
                                <i class="ph ph-pencil"></i>
                            </button>
                            <button onclick="app.downloadOrderPDF(${order.id})" class="text-purple-400 hover:text-purple-300 mr-2" title="Descargar PDF">
                                <i class="ph ph-file-pdf"></i>
                            </button>
                            <button onclick="app.deleteOrder(${order.id})" class="text-red-400 hover:text-red-300" title="Eliminar">
                                <i class="ph ph-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('');
            },
            
            getOrderStatusClass(status) {
                const classes = {
                    'pending': 'bg-yellow-500/20 text-yellow-400',
                    'in_progress': 'bg-blue-500/20 text-blue-400',
                    'completed': 'bg-green-500/20 text-green-400',
                    'cancelled': 'bg-red-500/20 text-red-400'
                };
                return classes[status] || 'bg-gray-500/20 text-gray-400';
            },
            
            getOrderStatusLabel(status) {
                const labels = {
                    'pending': 'Pendiente',
                    'in_progress': 'En Proceso',
                    'completed': 'Completado',
                    'cancelled': 'Cancelado'
                };
                return labels[status] || status;
            },
            
            // Filter orders - called from filter inputs
            async filterOrders() {
                await this.loadOrders();
            },
            
            async showOrderModal(orderId = null) {
                const modal = document.getElementById('order-modal');
                const title = document.getElementById('order-modal-title');
                const form = document.getElementById('order-form');
                
                // Load customers for dropdown
                const customersResponse = await this.api(`/businesses/${this.business.id}/customers`);
                const customers = Array.isArray(customersResponse) ? customersResponse : (customersResponse.customers || []);
                const customerSelect = document.getElementById('order-customer');
                customerSelect.innerHTML = '<option value="">Seleccionar cliente...</option>' + 
                    customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
                
                // Load products and cache for order items
                const productsResponse = await this.api(`/businesses/${this.business.id}/products`);
                this._orderProducts = Array.isArray(productsResponse) ? productsResponse : (productsResponse.products || []);
                
                // Generate product options for inline selects
                const productOptions = '<option value="">Seleccionar...</option>' + 
                    this._orderProducts.map(p => `<option value="${p.id}" data-price="${p.price}" data-name="${p.name}">${p.name}</option>`).join('');
                this._orderProductOptions = productOptions;
                
                if (orderId) {
                    // Edit mode
                    const orderData = await this.api(`/businesses/${this.business.id}/orders/${orderId}`);
                    const order = orderData.order;
                    title.textContent = 'Editar Pedido';
                    document.getElementById('order-id').value = order.id;
                    document.getElementById('order-number').value = order.order_number;
                    document.getElementById('order-customer').value = order.customer_id || '';
                    document.getElementById('order-status').value = order.status;
                    document.getElementById('order-subtotal').value = order.subtotal;
                    document.getElementById('order-discount').value = order.discount || 0;
                    document.getElementById('order-total').value = order.total;
                    document.getElementById('order-notes').value = order.notes || '';
                    document.getElementById('order-date').value = order.order_date ? order.order_date.split('T')[0] : '';
                    
                    // Load existing items
                    const itemsContainer = document.getElementById('order-items-container');
                    itemsContainer.innerHTML = '';
                    if (order.items && order.items.length) {
                        order.items.forEach(item => this.addOrderItem(item.product_id, item.product_name, item.quantity, item.unit_price, item.subtotal));
                    }
                } else {
                    // Create mode
                    title.textContent = 'Nuevo Pedido';
                    form.reset();
                    document.getElementById('order-id').value = '';
                    document.getElementById('order-number').value = 'PED-' + Date.now();
                    document.getElementById('order-items-container').innerHTML = '';
                    document.getElementById('order-status').value = 'pending';
                    document.getElementById('order-date').value = new Date().toISOString().split('T')[0];
                }
                
                // Show modal with overlay
                const overlay = document.getElementById('modal-overlay');
                overlay.classList.remove('hidden');
                overlay.style.display = 'flex';
                modal.classList.remove('hidden');
                modal.style.display = 'block';
            },
            
            addOrderItem(productId = '', productName = '', quantity = 1, unitPrice = 0, subtotal = 0) {
                const container = document.getElementById('order-items-container');
                const itemId = Date.now();
                const productOptions = this._orderProductOptions || '<option value="">Seleccionar...</option>';
                const html = `
                    <div class="order-item flex gap-2 items-center mb-2" data-id="${itemId}">
                        <select class="order-item-product flex-1 bg-gray-700 rounded px-2 py-1 text-sm" onchange="app.onOrderProductChange(this)">
                            ${productOptions}
                        </select>
                        <input type="number" class="order-item-qty w-20 bg-gray-700 rounded px-2 py-1 text-sm" value="${quantity}" min="1" onchange="app.calculateOrderItem(this)">
                        <input type="number" class="order-item-price w-24 bg-gray-700 rounded px-2 py-1 text-sm" value="${unitPrice}" step="0.01" onchange="app.calculateOrderItem(this)">
                        <span class="order-item-subtotal w-24 text-right">${this.formatMoney(subtotal || quantity * unitPrice)}</span>
                        <button type="button" onclick="this.closest('.order-item').remove(); app.calculateOrderTotal();" class="text-red-400 hover:text-red-300">✕</button>
                    </div>
                `;
                container.insertAdjacentHTML('beforeend', html);
            },
            
            async onOrderProductChange(select) {
                const option = select.selectedOptions[0];
                const price = parseFloat(option.dataset.price || 0);
                const itemRow = select.closest('.order-item');
                itemRow.querySelector('.order-item-price').value = price;
                this.calculateOrderItem(select);
            },
            
            calculateOrderItem(element) {
                const itemRow = element.closest('.order-item');
                const qty = parseInt(itemRow.querySelector('.order-item-qty').value) || 0;
                const price = parseFloat(itemRow.querySelector('.order-item-price').value) || 0;
                const subtotal = qty * price;
                itemRow.querySelector('.order-item-subtotal').textContent = this.formatMoney(subtotal);
                this.calculateOrderTotal();
            },
            
            calculateOrderTotal() {
                let subtotal = 0;
                document.querySelectorAll('.order-item').forEach(item => {
                    const qty = parseInt(item.querySelector('.order-item-qty').value) || 0;
                    const price = parseFloat(item.querySelector('.order-item-price').value) || 0;
                    subtotal += qty * price;
                });
                const discount = parseFloat(document.getElementById('order-discount').value) || 0;
                const total = subtotal - discount;
                document.getElementById('order-subtotal').value = subtotal.toFixed(2);
                document.getElementById('order-total').value = total.toFixed(2);
            },
            
            async saveOrder() {
                const orderId = document.getElementById('order-id').value;
                const customerId = document.getElementById('order-customer').value;
                const orderNumber = document.getElementById('order-number').value;
                const status = document.getElementById('order-status').value;
                const subtotal = parseFloat(document.getElementById('order-subtotal').value) || 0;
                const discount = parseFloat(document.getElementById('order-discount').value) || 0;
                const total = parseFloat(document.getElementById('order-total').value) || 0;
                const notes = document.getElementById('order-notes').value;
                const orderDate = document.getElementById('order-date').value;
                
                // Collect items
                const items = [];
                document.querySelectorAll('.order-item').forEach(item => {
                    const productSelect = item.querySelector('.order-item-product');
                    const productId = productSelect.value;
                    if (productId) {
                        const option = productSelect.selectedOptions[0];
                        items.push({
                            product_id: parseInt(productId),
                            product_name: option.dataset.name || productSelect.selectedOptions[0].text,
                            quantity: parseInt(item.querySelector('.order-item-qty').value) || 1,
                            unit_price: parseFloat(item.querySelector('.order-item-price').value) || 0
                        });
                    }
                });
                
                const data = {
                    customer_id: customerId || null,
                    order_number: orderNumber,
                    status: status,
                    items: items,
                    subtotal: subtotal,
                    discount: discount,
                    total: total,
                    notes: notes,
                    order_date: orderDate
                };
                
                try {
                    if (orderId) {
                        await this.api(`/businesses/${this.business.id}/orders/${orderId}`, {
                            method: 'PUT',
                            body: JSON.stringify(data)
                        });
                    } else {
                        await this.api(`/businesses/${this.business.id}/orders`, {
                            method: 'POST',
                            body: JSON.stringify(data)
                        });
                    }
                    this.closeModal('order-modal');
                    await this.loadOrders();
                } catch (err) {
                    alert('Error al guardar pedido: ' + err.message);
                }
            },
            
            async editOrder(orderId) {
                await this.showOrderModal(orderId);
            },
            
            async deleteOrder(orderId) {
                if (!await showConfirm('¿Estás seguro de eliminar este pedido?')) return;
                try {
                    await this.api(`/businesses/${this.business.id}/orders/${orderId}`, { method: 'DELETE' });
                    await this.loadOrders();
                } catch (err) {
                    alert('Error al eliminar pedido: ' + err.message);
                }
            },
            
            async updateOrderStatus(orderId, newStatus) {
                try {
                    await this.api(`/businesses/${this.business.id}/orders/${orderId}/status`, {
                        method: 'PATCH',
                        body: JSON.stringify({ status: newStatus })
                    });
                    await this.loadOrders();
                } catch (err) {
                    alert('Error al actualizar estado: ' + err.message);
                }
            },
            
            async downloadOrderPDF(orderId) {
                if (!this.business || !this.business.id) return;
                
                try {
                    // Direct URL strategy - safer for mobile apps/webviews to avoid getting stuck
                    // We append the token as a query parameter since we updated the backend to support it
                    const url = `${API_BASE_URL}/api/businesses/${this.business.id}/orders/${orderId}/pdf?token=${this.token}`;
                    
                    // Try to open in system browser first (works for Android/iOS)
                    // If _system is not supported (desktop), it will open in a new tab
                    const win = window.open(url, '_system');
                    
                    // Fallback for desktop if window.open was blocked or we want to force download behavior
                    if (!win || win.closed || typeof win.closed === 'undefined') {
                        // Create a hidden link and click it - standard web download
                        const a = document.createElement('a');
                        a.href = url;
                        a.target = '_blank';
                        a.download = `Pedido_${orderId}.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                    }
                } catch (e) {
                    console.error('Error PDF:', e);
                    alert('Error al abrir el PDF. Por favor intenta de nuevo.');
                }
            },
            
            async exportSales() {
                const start = document.getElementById('export-sales-start').value;
                const end = document.getElementById('export-sales-end').value;
                if (!this.business || !this.business.id || isNaN(Number(this.business.id))) {
                    await this.loadBusinesses();
                    if (!this.business || !this.business.id || isNaN(Number(this.business.id))) {
                        alert('No hay negocio seleccionado');
                        return;
                    }
                }
                
                let url = `/businesses/${this.business.id}/export/sales`;
                const params = [];
                if (start) params.push(`start_date=${start}`);
                if (end) params.push(`end_date=${end}`);
                if (params.length) url += '?' + params.join('&');
                
                const data = await this.api(url);
                const dlUrl = data.download_url.startsWith('http') ? data.download_url : (API_BASE_URL + data.download_url);
                const fileRes = await fetch(dlUrl, {
                    headers: { 'Authorization': `Bearer ${this.token}` }
                });
                if (!fileRes.ok) {
                    const errText = await fileRes.text();
                    throw new Error(errText || 'Error descargando ventas');
                }
                const blob = await fileRes.blob();
                const blobUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                const cd = fileRes.headers.get('content-disposition') || '';
                const m = cd.match(/filename="?([^"]+)"?/i);
                a.download = m ? m[1] : `ventas_${new Date().toISOString().split('T')[0]}.xlsx`;
                a.href = blobUrl;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(blobUrl);
            },
            
            async exportExpenses() {
                const start = document.getElementById('export-expenses-start').value;
                const end = document.getElementById('export-expenses-end').value;
                if (!this.business || !this.business.id || isNaN(Number(this.business.id))) {
                    await this.loadBusinesses();
                    if (!this.business || !this.business.id || isNaN(Number(this.business.id))) {
                        alert('No hay negocio seleccionado');
                        return;
                    }
                }
                
                let url = `/businesses/${this.business.id}/export/expenses`;
                const params = [];
                if (start) params.push(`start_date=${start}`);
                if (end) params.push(`end_date=${end}`);
                if (params.length) url += '?' + params.join('&');
                
                const data = await this.api(url);
                const dlUrl = data.download_url.startsWith('http') ? data.download_url : (API_BASE_URL + data.download_url);
                const fileRes = await fetch(dlUrl, {
                    headers: { 'Authorization': `Bearer ${this.token}` }
                });
                if (!fileRes.ok) {
                    const errText = await fileRes.text();
                    throw new Error(errText || 'Error descargando gastos');
                }
                const blob = await fileRes.blob();
                const blobUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                const cd = fileRes.headers.get('content-disposition') || '';
                const m = cd.match(/filename="?([^"]+)"?/i);
                a.download = m ? m[1] : `gastos_${new Date().toISOString().split('T')[0]}.xlsx`;
                a.href = blobUrl;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(blobUrl);
            },
            
            // Upgrade to Pro
            async upgradeToPro(plan = 'pro_monthly') {
                if (!await showConfirm('¿Deseas ir a la pasarela de pago para adquirir el Plan PRO?')) {
                    return;
                }
                
                try {
                    const data = await this.api('/billing/checkout', {
                        method: 'POST',
                        body: JSON.stringify({ plan })
                    });
                    
                    if (data.checkout && data.checkout.init_point) {
                        window.location.href = data.checkout.init_point;
                    } else {
                        alert('No se pudo generar el enlace de pago. Por favor intenta más tarde o contacta soporte.');
                    }
                } catch (err) {
                    alert('Error al iniciar pago: ' + err.message);
                }
            },
            
            // Backup
            async downloadBackup() {
                if (!this.business || !this.business.id || isNaN(Number(this.business.id))) {
                    await this.loadBusinesses();
                    if (!this.business || !this.business.id || isNaN(Number(this.business.id))) {
                        alert('No hay negocio seleccionado');
                        return;
                    }
                }
                const data = await this.api(`/businesses/${this.business.id}/backup`);
                const dlUrl = data.download_url.startsWith('http') ? data.download_url : (API_BASE_URL + data.download_url);
                const fileRes = await fetch(dlUrl, {
                    headers: { 'Authorization': `Bearer ${this.token}` }
                });
                if (!fileRes.ok) {
                    const errText = await fileRes.text();
                    throw new Error(errText || 'Error descargando respaldo');
                }
                const blob = await fileRes.blob();
                const blobUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                const cd = fileRes.headers.get('content-disposition') || '';
                const m = cd.match(/filename="?([^"]+)"?/i);
                a.download = m ? m[1] : `respaldo_${new Date().toISOString().split('T')[0]}.json`;
                a.href = blobUrl;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(blobUrl);
            },
            
            async importBackup(input) {
                const file = input.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        await this.api(`/businesses/${this.business.id}/restore`, {
                            method: 'POST',
                            body: JSON.stringify({ data })
                        });
                        alert('Restaurado correctamente');
                        this.loadPageData(this.currentPage);
                    } catch (err) {
                        alert('Error al restaurar: ' + err.message);
                    }
                };
                reader.readAsText(file);
            },
            
            // Admin
            async loadAdmin() {
                if (!this.user.is_admin && !(this.user.permissions && this.user.permissions.admin)) {
                    alert('Acceso denegado');
                    this.navigate('dashboard');
                    return;
                }
                
                // Show stats tab by default
                this.showAdminTab('stats');
                
                // Load stats
                await this.loadAdminStats();
            },
            
            async loadAdminStats() {
                try {
                    const stats = await this.api('/admin/stats');
                    
                    // User stats
                    document.getElementById('admin-total-users').textContent = stats.total_users;
                    document.getElementById('admin-free-users').textContent = stats.free_users;
                    document.getElementById('admin-pro-users').textContent = stats.pro_users;
                    
                    // Calculate percentages for user distribution
                    const totalUsers = stats.total_users || 1;
                    document.getElementById('admin-free-bar').style.width = (stats.free_users / totalUsers * 100) + '%';
                    document.getElementById('admin-pro-bar').style.width = (stats.pro_users / totalUsers * 100) + '%';
                    document.getElementById('admin-free-users-bar').textContent = stats.free_users;
                    document.getElementById('admin-pro-users-bar').textContent = stats.pro_users;
                    
                    // Membership income
                    document.getElementById('admin-membership-income').textContent = this.formatMoney(stats.total_membership_income);
                    document.getElementById('admin-total-membership-income').textContent = this.formatMoney(stats.total_membership_income);
                    
                    // Payments by plan
                    const totalPayments = (stats.pro_monthly_payments || 0) + (stats.pro_quarterly_payments || 0) + (stats.pro_annual_payments || 0);
                    document.getElementById('admin-pro-monthly-count').textContent = stats.pro_monthly_payments || 0;
                    document.getElementById('admin-pro-quarterly-count').textContent = stats.pro_quarterly_payments || 0;
                    document.getElementById('admin-pro-annual-count').textContent = stats.pro_annual_payments || 0;
                    document.getElementById('admin-total-payments').textContent = stats.total_membership_payments || 0;
                    
                    // Calculate percentages for membership popularity
                    const totalPlans = totalPayments || 1;
                    document.getElementById('admin-pro-monthly-bar').style.width = ((stats.pro_monthly_payments || 0) / totalPlans * 100) + '%';
                    document.getElementById('admin-pro-quarterly-bar').style.width = ((stats.pro_quarterly_payments || 0) / totalPlans * 100) + '%';
                    document.getElementById('admin-pro-annual-bar').style.width = ((stats.pro_annual_payments || 0) / totalPlans * 100) + '%';
                    
                    // Revenue by plan
                    document.getElementById('admin-pro-monthly-income').textContent = this.formatMoney(stats.pro_monthly_income || 0);
                    document.getElementById('admin-pro-annual-income').textContent = this.formatMoney(stats.pro_annual_income || 0);
                    
                    // Recent payments table
                    const paymentsTable = document.getElementById('admin-recent-payments-table');
                    paymentsTable.innerHTML = '';
                    if (stats.recent_payments && stats.recent_payments.length > 0) {
                        for (const p of stats.recent_payments) {
                            const planName = p.plan === 'pro_monthly' ? 'Pro Mensual' : (p.plan === 'pro_quarterly' ? 'Pro Trimestral' : 'Pro Anual');
                            const planClass = p.plan === 'pro_monthly' ? 'bg-green-500/20 text-green-400' : (p.plan === 'pro_quarterly' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400');
                            paymentsTable.innerHTML += `
                                <tr>
                                    <td>Usuario #${p.user_id}</td>
                                    <td><span class="px-2 py-1 rounded text-xs ${planClass}">${planName}</span></td>
                                    <td class="money-positive">${this.formatMoney(p.amount)}</td>
                                    <td>${new Date(p.payment_date).toLocaleDateString()}</td>
                                    <td>${p.payment_method || 'N/A'}</td>
                                </tr>
                            `;
                        }
                    } else {
                        paymentsTable.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay pagos de membresías aún</td></tr>';
                    }
                } catch (e) {
                    console.error('Error loading admin stats:', e);
                }
            },
            
            showAdminTab(tab) {
                // Update tab buttons
                document.querySelectorAll('.admin-tab-btn').forEach(btn => {
                    btn.classList.remove('text-white', 'border-white');
                    btn.classList.add('text-white/80', 'border-transparent');
                });
                const activeBtn = document.getElementById('admin-tab-' + tab);
                if (activeBtn) {
                    activeBtn.classList.remove('text-white/80', 'border-transparent');
                    activeBtn.classList.add('text-white', 'border-white');
                }
                
                // Update content
                document.querySelectorAll('.admin-tab-content').forEach(content => {
                    content.classList.add('hidden');
                });
                const activeContent = document.getElementById('admin-content-' + tab);
                if (activeContent) {
                    activeContent.classList.remove('hidden');
                }
                
                // Load tab data
                switch(tab) {
                    case 'stats':
                        this.loadAdminStats();
                        break;
                    case 'users':
                        this.loadAdminUsers();
                        break;
                    case 'roles':
                        this.loadAdminRoles();
                        break;
                    case 'audit':
                        this.auditPage = 1;
                        this.loadAuditLogs();
                        break;
                }
            },
            
            async loadAdminUsers() {
                try {
                    const data = await this.api('/admin/users');
                    this.renderUsersTable(data);
                } catch (e) {
                    console.error('Error loading users:', e);
                }
            },
            
            renderUsersTable(data) {
                const tbody = document.getElementById('admin-users-table');
                if (!tbody) {
                    console.error('admin-users-table element not found!');
                    return;
                }
                
                tbody.innerHTML = '';
                
                if (!data.users || data.users.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No hay usuarios registrados</td></tr>';
                    return;
                }
                
                for (const u of data.users) {
                    const roles = u.roles && u.roles.length > 0 ? u.roles.map(r => r.name).join(', ') : 'Sin rol';
                    tbody.innerHTML += `
                            <tr>
                                <td>${u.name || 'Sin nombre'}</td>
                                <td>${u.email || 'Sin email'}</td>
                                <td><span class="px-2 py-1 rounded text-xs ${u.plan === 'pro' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'}">${u.plan.toUpperCase()}</span></td>
                                <td><span class="px-2 py-1 rounded text-xs ${u.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}">${u.is_active ? 'Activo' : 'Inactivo'}</span></td>
                                <td>${roles}</td>
                                <td>
                                    <button onclick="
                                        var overlay = document.getElementById('modal-overlay');
                                        var userModal = document.getElementById('user-modal');
                                        overlay.style.cssText = 'position:fixed !important; inset:0 !important; background:rgba(0,0,0,0.8) !important; z-index:99999 !important; display:flex !important; align-items:center !important; justify-content:center !important; padding:20px !important;';
                                        overlay.classList.remove('hidden');
                                        userModal.style.cssText = 'display:block !important; position:relative !important; z-index:100000 !important; background:#1e293b !important; color:white !important; border-radius:16px !important; padding:24px !important; max-width:500px !important; width:100% !important; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5) !important;';
                                        userModal.classList.remove('hidden');
                                        document.getElementById('user-modal-title').textContent = 'Editar Usuario';
                                        document.getElementById('user-id').value = '${u.id}';
                                        document.getElementById('user-name').value = '${u.name}';
                                        document.getElementById('user-email').value = '${u.email}';
                                        document.getElementById('user-password').value = '';
                                        document.getElementById('password-field').style.display = 'none';
                                        document.getElementById('user-plan').value = '${u.plan || "free"}';
                                        document.getElementById('user-active').value = '${u.is_active ? "true" : "false"}';
                                        " class="text-blue-400 hover:text-blue-300 mr-2">Editar</button>
                                    <button onclick="app.resetUserPassword(${u.id})" class="text-yellow-400 hover:text-yellow-300 mr-2">Reset</button>
                                    <button onclick="app.deleteUser(${u.id})" class="text-red-400 hover:text-red-300">Eliminar</button>
                                </td>
                            </tr>
                        `;
                }
            },
            
            async loadAdminRoles() {
                console.log('=== loadAdminRoles START ===');
                try {
                    const data = await this.api('/admin/roles');
                    console.log('=== loadAdminRoles RESPONSE ===', data);
                    
                    // Save roles globally for use in user form
                    this.adminRoles = data.roles || [];
                    
                    const tbody = document.getElementById('admin-roles-table');
                    if (!tbody) {
                        console.error('admin-roles-table not found');
                        return;
                    }
                    tbody.innerHTML = '';
                    
                    if (!data.roles || data.roles.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No hay roles registrados</td></tr>';
                        return;
                    }
                    
                    for (const r of data.roles) {
                        const permissions = r.permissions ? r.permissions.join(', ') : 'Sin permisos';
                        tbody.innerHTML += `
                            <tr>
                                <td><span class="font-semibold">${r.name}</span></td>
                                <td>${r.description || '-'}</td>
                                <td><span class="px-2 py-1 rounded text-xs ${r.is_system ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-500/20 text-gray-400'}">${r.is_system ? 'Sí' : 'No'}</span></td>
                                <td class="text-sm text-white/70">${permissions}</td>
                                <td>
                                    ${!r.is_system ? `<button onclick="
                                        var overlay = document.getElementById('modal-overlay');
                                        var roleModal = document.getElementById('role-modal');
                                        overlay.style.cssText = 'position:fixed !important; inset:0 !important; background:rgba(0,0,0,0.8) !important; z-index:99999 !important; display:flex !important; align-items:center !important; justify-content:center !important; padding:20px !important;';
                                        overlay.classList.remove('hidden');
                                        roleModal.style.cssText = 'display:block !important; position:relative !important; z-index:100000 !important; background:#1e293b !important; color:white !important; border-radius:16px !important; padding:24px !important; max-width:500px !important; width:100% !important; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5) !important;';
                                        roleModal.classList.remove('hidden');
                                        document.getElementById('role-modal-title').textContent = 'Editar Rol';
                                        document.getElementById('role-id').value = '${r.id}';
                                        document.getElementById('role-name').value = '${r.name}';
                                        document.getElementById('role-description').value = '${r.description || ""}';
                                        " class="text-blue-400 hover:text-blue-300 mr-2">Editar</button>` : ''}
                                    ${!r.is_system ? `<button onclick="app.deleteRole(${r.id})" class="text-red-400 hover:text-red-300">Eliminar</button>` : ''}
                                </td>
                            </tr>
                        `;
                    }
                } catch (e) {
                    console.error('Error loading roles:', e);
                }
            },

            // ========== ADMIN USER MANAGEMENT ==========
            // Aliases for button calls
            editUser(userId) { return this.showEditUserModal(userId); },
            createUser() { return this.showCreateUserModal(); },
            
            async showCreateUserModal() {
                // First, show the modal-overlay (parent container)
                const overlay = document.getElementById('modal-overlay');
                if (!overlay) {
                    console.error('ERROR: modal-overlay not found!');
                    return;
                }
                // Force show overlay
                overlay.classList.remove('hidden');
                overlay.style.cssText = 'position:fixed !important; inset:0 !important; background:rgba(0,0,0,0.8) !important; z-index:99999 !important; display:flex !important; align-items:center !important; justify-content:center !important; padding:20px !important;';
                
                // Reset user-modal
                document.getElementById('user-modal-title').textContent = 'Nuevo Usuario';
                document.getElementById('user-id').value = '';
                document.getElementById('user-name').value = '';
                document.getElementById('user-email').value = '';
                document.getElementById('user-password').value = '';
                document.getElementById('user-password').required = false;
                document.getElementById('password-field').style.display = 'block';
                document.getElementById('user-plan').value = 'free';
                document.getElementById('user-active').value = 'true';
                
                // Load roles into dropdown - use cached adminRoles if available
                const roleSelect = document.getElementById('user-role');
                roleSelect.innerHTML = '<option value="">Sin rol</option>';
                
                if (this.adminRoles && this.adminRoles.length > 0) {
                    this.adminRoles.forEach(role => {
                        const option = document.createElement('option');
                        option.value = role.id;
                        option.textContent = role.name;
                        roleSelect.appendChild(option);
                    });
                } else {
                    // Fallback: fetch from API if not cached
                    try {
                        const rolesData = await this.api('/admin/roles');
                        this.adminRoles = rolesData.roles || [];
                        if (this.adminRoles.length > 0) {
                            this.adminRoles.forEach(role => {
                                const option = document.createElement('option');
                                option.value = role.id;
                                option.textContent = role.name;
                                roleSelect.appendChild(option);
                            });
                        }
                    } catch (err) {
                        console.error('Error loading roles:', err);
                    }
                }
                
                // Force show user-modal with inline styles
                const userModal = document.getElementById('user-modal');
                userModal.classList.remove('hidden');
                userModal.style.cssText = 'display:block !important; position:relative !important; z-index:100000 !important; background:#1e293b !important; color:white !important; border-radius:16px !important; padding:24px !important; max-width:500px !important; width:100% !important; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5) !important;';
                
            },
            
            closeUserModal() {
                const overlay = document.getElementById('modal-overlay');
                if (overlay) {
                    overlay.classList.add('hidden');
                    overlay.style.display = 'none';
                    overlay.style.zIndex = '';
                }
                const userModal = document.getElementById('user-modal');
                if (userModal) {
                    userModal.classList.add('hidden');
                    userModal.style.display = 'none';
                    userModal.style.zIndex = '';
                }
            },

            async loadRecurringExpenses() {
                try {
                    const data = await this.api(`/businesses/${this.business.id}/recurring-expenses`);
                    const tbody = document.getElementById('recurring-expenses-table');
                    
                    if (data.recurring_expenses.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="6" class="text-muted text-center py-8">No hay gastos recurrentes configurados.</td></tr>';
                        return;
                    }
                    
                    const today = new Date();
                    const currentDay = today.getDate();
                    
                    tbody.innerHTML = data.recurring_expenses.map(exp => {
                        let statusColor = '';
                        let statusText = '';
                        let payButton = '';
                        
                        if (exp.is_active) {
                            // Check if next_due_date exists, otherwise construct from due_day
                            let dueDate;
                            if (exp.next_due_date) {
                                const parts = exp.next_due_date.split('-');
                                dueDate = new Date(parts[0], parts[1]-1, parts[2]);
                            } else {
                                dueDate = new Date(today.getFullYear(), today.getMonth(), exp.due_day);
                            }
                            
                            // Normalize today to start of day for comparison
                            const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                            
                            const diffTime = dueDate - todayDate;
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

                            if (diffDays < 0) {
                                // Overdue
                                statusColor = 'text-red-400 font-bold';
                                statusText = 'Vencido';
                                payButton = `<button onclick="app.payRecurringExpense(${exp.id}, '${exp.name}', ${exp.amount})" class="text-xs bg-green-500/20 text-green-400 border border-green-500/50 px-2 py-1 rounded hover:bg-green-500/30 ml-2" title="Marcar como pagado y renovar">Pagar</button>`;
                            } else if (diffDays <= 3) {
                                // Upcoming (within 3 days)
                                statusColor = 'text-yellow-400 font-bold';
                                statusText = 'Próximo';
                                payButton = `<button onclick="app.payRecurringExpense(${exp.id}, '${exp.name}', ${exp.amount})" class="text-xs bg-green-500/20 text-green-400 border border-green-500/50 px-2 py-1 rounded hover:bg-green-500/30 ml-2" title="Marcar como pagado y renovar">Pagar</button>`;
                            } else {
                                statusColor = 'text-white/60';
                                statusText = 'Pendiente';
                                // Optional: Allow paying early?
                                payButton = `<button onclick="app.payRecurringExpense(${exp.id}, '${exp.name}', ${exp.amount})" class="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2 py-1 rounded hover:bg-blue-500/20 ml-2" title="Pagar adelantado">Pagar</button>`;
                            }
                        }

                        return `
                        <tr class="${!exp.is_active ? 'opacity-50' : ''}">
                            <td class="font-medium">
                                <div class="flex items-center flex-wrap gap-1">
                                    ${exp.name}
                                    ${statusText && exp.is_active ? `<div class="text-xs ${statusColor}">(${statusText})</div>` : ''}
                                    ${payButton}
                                </div>
                            </td>
                            <td>${this.formatMoney(exp.amount)}</td>
                            <td>
                                <div class="flex flex-col">
                                    <span>${exp.next_due_date ? this.formatDate(exp.next_due_date) : 'Día ' + exp.due_day}</span>
                                    <span class="text-xs text-muted">${this.getFrequencyLabel(exp.frequency)}</span>
                                </div>
                            </td>
                            <td>${exp.category || '-'}</td>
                            <td class="text-center">
                                <span class="px-2 py-1 rounded-full text-xs ${exp.is_active ? 'bg-green-400/10 text-green-400' : 'bg-gray-700 text-gray-400'}">
                                    ${exp.is_active ? 'Activo' : 'Inactivo'}
                                </span>
                            </td>
                            <td class="text-right">
                                <button onclick="app.editRecurringExpense(${exp.id})" class="text-blue-400 hover:text-blue-300 mr-2" title="Editar">
                                    <i class="ph ph-pencil-simple"></i>
                                </button>
                                <button onclick="app.deleteRecurringExpense(${exp.id})" class="text-red-400 hover:text-red-300" title="Eliminar">
                                    <i class="ph ph-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `}).join('');
                } catch (e) {
                    console.error('Error loading recurring expenses:', e);
                }
            },
            
            getFrequencyLabel(freq) {
                const map = {
                    'weekly': 'Semanal',
                    'biweekly': 'Quincenal',
                    'monthly': 'Mensual',
                    'annual': 'Anual'
                };
                return map[freq] || 'Mensual';
            },

            formatDate(dateString) {
                if (!dateString) return '';
                // Handle YYYY-MM-DD manually to avoid timezone issues
                const parts = dateString.split('-');
                if (parts.length === 3) {
                    return `${parts[2]}/${parts[1]}/${parts[0]}`;
                }
                return dateString;
            },

            async payRecurringExpense(id, name, amount) {
                if (!await showConfirm(`¿Marcar "${name}" como pagado?\n\nSe registrará un gasto por ${this.formatMoney(amount)} y se actualizará la fecha de vencimiento.`)) return;

                try {
                    // Fetch full details first to get frequency and dates
                    const data = await this.api(`/businesses/${this.business.id}/recurring-expenses`);
                    const expense = data.recurring_expenses.find(e => e.id === id);
                    if (!expense) throw new Error('Gasto no encontrado');

                    // 1. Create the expense record
                    const today = new Date();
                    const todayStr = today.toISOString().split('T')[0];
                    
                    await this.api(`/businesses/${this.business.id}/expenses`, {
                        method: 'POST',
                        body: JSON.stringify({
                            expense_date: todayStr,
                            category: expense.category || 'Gasto Recurrente',
                            amount: amount,
                            description: `Pago recurrente: ${name}`
                        })
                    });

                    // 2. Calculate next due date
                    let nextDate = new Date();
                    if (expense.next_due_date) {
                        // Parse local date
                        const parts = expense.next_due_date.split('-');
                        nextDate = new Date(parts[0], parts[1]-1, parts[2]);
                    }
                    
                    // User request: Preserve original due date logic (e.g. always 1st of month)
                    // Do NOT reset to today if overdue.
                    // If it's way in the past, we should advance it by N periods until it's in the future?
                    // OR just advance 1 period from the current due date, even if that is still in the past (to catch up)?
                    // Usually users want: "I paid the January bill. Now show me the February bill."
                    // So we just add 1 period to the `nextDate`.
                    
                    const freq = expense.frequency || 'monthly';
                    if (freq === 'weekly') {
                        nextDate.setDate(nextDate.getDate() + 7);
                    } else if (freq === 'biweekly') {
                        nextDate.setDate(nextDate.getDate() + 15);
                    } else if (freq === 'monthly') {
                        // Special handling for months to avoid skipping days (e.g. Jan 31 -> Feb 28 -> Mar 28)
                        // Ideally we should stick to the original `due_day` if possible.
                        // But JS Date auto-corrects.
                        // Let's use simple month addition for now, which is standard.
                        // To keep the "day", we might need more complex logic, but let's stick to standard date math first.
                        // If we want to strictly respect `due_day` (e.g. always 15th):
                        if (expense.due_day) {
                             // Move to next month
                             let targetMonth = nextDate.getMonth() + 1;
                             let targetYear = nextDate.getFullYear();
                             if (targetMonth > 11) {
                                 targetMonth = 0;
                                 targetYear++;
                             }
                             // Validate day (e.g. Feb 30 -> Feb 28)
                             const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
                             const targetDay = Math.min(expense.due_day, daysInMonth);
                             nextDate = new Date(targetYear, targetMonth, targetDay);
                        } else {
                             nextDate.setMonth(nextDate.getMonth() + 1);
                        }
                    } else if (freq === 'annual') {
                        nextDate.setFullYear(nextDate.getFullYear() + 1);
                    }
                    
                    // If the calculated next date is still in the past (e.g. user forgot to pay for 3 months),
                    // should we jump to the CURRENT upcoming one?
                    // User said: "conserve la fecha del dia que se tiene que pagar"
                    // If I pay a bill from 3 months ago, I probably still owe the ones in between.
                    // So advancing just ONE period is the correct behavior for "paying off a specific bill".
                    // The user will see the next one immediately as "Overdue" or "Pending" if it's also passed.
                    
                    const nextDateStr = nextDate.toISOString().split('T')[0];

                    // 3. Update recurring expense
                    await this.api(`/businesses/${this.business.id}/recurring-expenses/${id}`, {
                        method: 'PUT',
                        body: JSON.stringify({
                            next_due_date: nextDateStr
                        })
                    });
                    
                    showCustomAlert('Pago registrado y renovado', 'success');
                    this.loadDashboard(); 
                    if (this.currentPage === 'recurring_expenses') {
                        this.loadRecurringExpenses();
                    }
                    
                } catch (e) {
                    showCustomAlert('Error al registrar pago: ' + e.message, 'error');
                }
            },
            
            showRecurringExpenseModal() {
                this.closeModal(); // Ensure others are closed
                const modal = document.getElementById('modal-recurring-expense');
                const overlay = document.getElementById('modal-overlay');
                
                // Reset form
                document.getElementById('recurring-expense-id').value = '';
                document.getElementById('recurring-expense-name').value = '';
                document.getElementById('recurring-expense-amount').value = '';
                document.getElementById('recurring-expense-day').value = '';
                document.getElementById('recurring-expense-category').value = '';
                document.getElementById('recurring-expense-frequency').value = 'monthly';
                const activeCheck = document.getElementById('recurring-expense-active');
                if(activeCheck) activeCheck.checked = true;
                
                const title = modal.querySelector('h3');
                if(title) title.textContent = 'Nuevo Gasto Recurrente';
                
                modal.classList.remove('hidden');
                modal.style.display = 'block';
                overlay.classList.remove('hidden');
                overlay.style.display = 'flex';
            },

            async editRecurringExpense(id) {
                try {
                    // Fetch directly from API to ensure fresh data
                    const data = await this.api(`/businesses/${this.business.id}/recurring-expenses`);
                    const expense = data.recurring_expenses.find(e => e.id === id);
                    if (!expense) return;

                    const modal = document.getElementById('modal-recurring-expense');
                    const overlay = document.getElementById('modal-overlay');

                    document.getElementById('recurring-expense-id').value = expense.id;
                    document.getElementById('recurring-expense-name').value = expense.name;
                    document.getElementById('recurring-expense-amount').value = expense.amount;
                    document.getElementById('recurring-expense-day').value = expense.due_day;
                    document.getElementById('recurring-expense-category').value = expense.category || '';
                    document.getElementById('recurring-expense-frequency').value = expense.frequency || 'monthly';
                    const activeCheck = document.getElementById('recurring-expense-active');
                    if(activeCheck) activeCheck.checked = expense.is_active;

                    const title = modal.querySelector('h3');
                    if(title) title.textContent = 'Editar Gasto Recurrente';
                    
                    modal.classList.remove('hidden');
                    modal.style.display = 'block';
                    overlay.classList.remove('hidden');
                    overlay.style.display = 'flex';
                } catch (e) {
                    console.error(e);
                    showCustomAlert('Error al cargar gasto para editar', 'error');
                }
            },

            async saveRecurringExpense() {
                const id = document.getElementById('recurring-expense-id').value;
                const name = document.getElementById('recurring-expense-name').value;
                const amount = document.getElementById('recurring-expense-amount').value;
                const due_day = document.getElementById('recurring-expense-day').value;
                const category = document.getElementById('recurring-expense-category').value;
                const frequency = document.getElementById('recurring-expense-frequency').value || 'monthly';
                const activeCheck = document.getElementById('recurring-expense-active');
                const is_active = activeCheck ? activeCheck.checked : true;
                
                if (!name || !amount || !due_day) {
                    showCustomAlert('Por favor completa los campos obligatorios', 'warning');
                    return;
                }

                const payload = { 
                    name, 
                    amount: parseFloat(amount), 
                    due_day: parseInt(due_day), 
                    category, 
                    is_active,
                    frequency
                };
                
                try {
                    if (id) {
                        await this.api(`/businesses/${this.business.id}/recurring-expenses/${id}`, {
                            method: 'PUT',
                            body: JSON.stringify(payload)
                        });
                        showCustomAlert('Gasto recurrente actualizado', 'success');
                    } else {
                        await this.api(`/businesses/${this.business.id}/recurring-expenses`, {
                            method: 'POST',
                            body: JSON.stringify(payload)
                        });
                        showCustomAlert('Gasto recurrente creado', 'success');
                    }
                    this.closeModal();
                    this.loadRecurringExpenses();
                    // Also refresh dashboard to update alerts
                    if (this.currentPage === 'dashboard') {
                        this.loadDashboard();
                    }
                } catch (e) {
                    showCustomAlert('Error al guardar: ' + e.message, 'error');
                }
            },

            async deleteRecurringExpense(id) {
                if (!await showConfirm('¿Estás seguro de eliminar este gasto recurrente?')) return;
                try {
                    await this.api(`/businesses/${this.business.id}/recurring-expenses/${id}`, {
                        method: 'DELETE'
                    });
                    showCustomAlert('Gasto recurrente eliminado', 'success');
                    this.loadRecurringExpenses();
                } catch (e) {
                    showCustomAlert('Error al eliminar: ' + e.message, 'error');
                }
            },

            async showEditUserModal(userId) {
                // Show the modal-overlay first
                const overlay = document.getElementById('modal-overlay');
                if (!overlay) {
                    console.error('ERROR: modal-overlay not found!');
                    return;
                }
                overlay.classList.remove('hidden');
                overlay.style.display = 'flex';
                overlay.style.zIndex = '99999';
                
                try {
                    const user = await this.api('/admin/users/' + userId);
                    document.getElementById('user-modal-title').textContent = 'Editar Usuario';
                    document.getElementById('user-id').value = user.id;
                    document.getElementById('user-name').value = user.name;
                    document.getElementById('user-email').value = user.email;
                    document.getElementById('user-password').value = '';
                    document.getElementById('user-password').required = false;
                    document.getElementById('password-field').style.display = 'none';
                    document.getElementById('user-plan').value = user.plan || 'free';
                    document.getElementById('user-active').value = user.is_active ? 'true' : 'false';
                    
                    // Load roles - use cached adminRoles if available
                    const select = document.getElementById('user-role');
                    select.innerHTML = '<option value="">Sin rol</option>';
                    
                    // Get roles from cache or fetch
                    let rolesToUse = this.adminRoles;
                    if (!rolesToUse || rolesToUse.length === 0) {
                        const data = await this.api('/admin/roles');
                        rolesToUse = data.roles || [];
                        this.adminRoles = rolesToUse;
                    }
                    
                    // Handle both single role_id and array of roles
                    const userRoleIds = user.role_id ? [user.role_id] : (user.roles ? user.roles.map(r => r.id) : []);
                    
                    for (const r of rolesToUse) {
                        const isSelected = userRoleIds.includes(r.id);
                        select.innerHTML += `<option value="${r.id}" ${isSelected ? 'selected' : ''}>${r.name}</option>`;
                    }
                    
                    // Show user-modal with forced styles
                    const userModal = document.getElementById('user-modal');
                    userModal.classList.remove('hidden');
                    userModal.style.display = 'block';
                    userModal.style.zIndex = '100000';
                    userModal.style.visibility = 'visible';
                    
                } catch (e) {
                    alert('Error al cargar usuario: ' + e.message);
                }
            },

            async saveUser(e) {
                if (e) {
                    e.preventDefault();
                }
                
                const userIdEl = document.getElementById('user-id');
                const userNameEl = document.getElementById('user-name');
                const userEmailEl = document.getElementById('user-email');
                const userPlanEl = document.getElementById('user-plan');
                const userActiveEl = document.getElementById('user-active');
                const userRoleEl = document.getElementById('user-role');
                const userPasswordEl = document.getElementById('user-password');
                
                const userId = userIdEl ? userIdEl.value : '';
                const isEdit = !!userId;
                
                console.log('=== ' + (isEdit ? 'updateAdminUser' : 'createAdminUser') + ' START ===', { userId, name: userNameEl?.value, email: userEmailEl?.value });
                
                const name = userNameEl ? userNameEl.value.trim() : '';
                const email = userEmailEl ? userEmailEl.value.trim() : '';
                const plan = userPlanEl ? userPlanEl.value : 'free';
                const isActive = userActiveEl ? (userActiveEl.value === 'true') : true;
                const roleIdVal = userRoleEl ? userRoleEl.value : '';
                
                // Validate name is required
                if (!name || name === '') {
                    alert('El nombre es requerido');
                    return;
                }
                // Validate email is required
                if (!email || email === '') {
                    alert('El email es requerido');
                    return;
                }
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    alert('Por favor ingresa un email válido');
                    return;
                }
                
                const data = { name, email: email.toLowerCase(), plan, is_active: isActive };
                
                // Add role_id if selected
                if (roleIdVal) {
                    data.role_id = parseInt(roleIdVal);
                }
                
                // Only include password for new users
                if (!isEdit) {
                    let password = userPasswordEl ? userPasswordEl.value : '';
                    if (!password) {
                        password = Math.random().toString(36).slice(-4) + Math.random().toString(36).slice(-4).toUpperCase();
                    }
                    data.password = password;
                }
                
                try {
                    if (isEdit) {
                        // Edit existing user
                        console.log('=== updateAdminUser REQUEST ===', data);
                        const response = await this.api('/admin/users/' + userId, 'PUT', data);
                        console.log('=== updateAdminUser RESPONSE ===', response);
                        this.closeUserModal();
                        this.loadAdminUsers();
                    } else {
                        // Create new user
                        const response = await fetch('/api/admin/users', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': 'Bearer ' + this.token
                            },
                            body: JSON.stringify(data)
                        });
                        
                        const text = await response.text();
                        console.log('=== createAdminUser RESPONSE ===', response.status, text);
                        
                        if (!response.ok) {
                            let errorMsg = 'Error al crear usuario';
                            try {
                                const errorData = JSON.parse(text);
                                errorMsg = errorData.error || errorMsg;
                            } catch(e) {}
                            alert(errorMsg);
                            return;
                        }
                        
                        this.closeUserModal();
                        this.loadAdminUsers();
                    }
                } catch (e) {
                    alert('Error al guardar usuario: ' + e.message);
                }
            },

            async deleteUser(userId) {
                console.log('=== deleteUser START ===', userId);
                if (!await showConfirm('¿Está seguro de eliminar este usuario?')) return;
                try {
                    const response = await this.api('/admin/users/' + userId, 'DELETE');
                    console.log('=== deleteUser RESPONSE ===', response);
                    this.loadAdminUsers();
                } catch (e) {
                    alert('Error al eliminar usuario: ' + e.message);
                }
            },

            async resetUserPassword(userId) {
                const newPassword = await showPrompt('Ingrese nueva contraseña:');
                if (!newPassword) return;
                try {
                    await this.api('/admin/users/' + userId + '/reset-password', 'POST', { password: newPassword });
                    alert('Contraseña reseteada correctamente');
                } catch (e) {
                    alert('Error al resetear contraseña: ' + e.message);
                }
            },

            // ========== ADMIN ROLE MANAGEMENT ==========
            // Aliases for button calls
            editRole(roleId) { return this.showEditRoleModal(roleId); },
            createRole() { return this.showCreateRoleModal(); },
            
            async showCreateRoleModal() {
                document.getElementById('role-modal-title').textContent = 'Nuevo Rol';
                document.getElementById('role-id').value = '';
                document.getElementById('role-name').value = '';
                document.getElementById('role-description').value = '';
                
                // Load permissions
                try {
                    const data = await this.api('/admin/permissions');
                    const container = document.getElementById('role-permissions');
                    container.innerHTML = '';
                    for (const p of data.permissions) {
                        container.innerHTML += `
                            <label class="flex items-center gap-2 mb-1">
                                <input type="checkbox" name="permission" value="${p.id}">
                                <span class="text-sm">${p.name}</span>
                            </label>
                        `;
                    }
                } catch (e) {
                    console.error('Error loading permissions:', e);
                }
                
                document.getElementById('role-modal').classList.remove('hidden');
            },

            async showCreateRoleModalWithOverlay() {
                // Show overlay
                const overlay = document.getElementById('modal-overlay');
                const roleModal = document.getElementById('role-modal');
                
                if (overlay) {
                    overlay.style.cssText = 'position:fixed !important; inset:0 !important; background:rgba(0,0,0,0.8) !important; z-index:99999 !important; display:flex !important; align-items:center !important; justify-content:center !important; padding:20px !important; visibility:visible !important; opacity:1 !important;';
                    overlay.classList.remove('hidden');
                }
                
                // Reset form
                document.getElementById('role-modal-title').textContent = 'Nuevo Rol';
                document.getElementById('role-id').value = '';
                document.getElementById('role-name').value = '';
                document.getElementById('role-description').value = '';
                
                // Load permissions
                try {
                    const data = await this.api('/admin/permissions');
                    const container = document.getElementById('role-permissions');
                    container.innerHTML = '';
                    for (const p of data.permissions) {
                        container.innerHTML += `
                            <label class="flex items-center gap-2 mb-1">
                                <input type="checkbox" name="permission" value="${p.id}">
                                <span class="text-sm">${p.name}</span>
                            </label>
                        `;
                    }
                } catch (e) {
                    console.error('Error loading permissions:', e);
                }
                
                // Show modal with forced styles
                if (roleModal) {
                    roleModal.style.cssText = 'display:flex !important; flex-direction:column !important; position:relative !important; z-index:100000 !important; background:#1e293b !important; color:white !important; border-radius:16px !important; padding:24px !important; max-width:500px !important; width:100% !important; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5) !important; visibility:visible !important; opacity:1 !important;';
                    roleModal.classList.remove('hidden');
                }
            },

            async showEditRoleModal(roleId) {
                try {
                    const role = await this.api('/admin/roles/' + roleId);
                    document.getElementById('role-modal-title').textContent = 'Editar Rol';
                    document.getElementById('role-id').value = role.id;
                    document.getElementById('role-name').value = role.name;
                    document.getElementById('role-description').value = role.description || '';
                    
                    // Load permissions
                    const data = await this.api('/admin/permissions');
                    const container = document.getElementById('role-permissions');
                    container.innerHTML = '';
                    for (const p of data.permissions) {
                        const isChecked = role.permissions && role.permissions.includes(p.name);
                        container.innerHTML += `
                            <label class="flex items-center gap-2 mb-1">
                                <input type="checkbox" name="permission" value="${p.id}" ${isChecked ? 'checked' : ''}>
                                <span class="text-sm">${p.name}</span>
                            </label>
                        `;
                    }
                    
                    document.getElementById('role-modal').classList.remove('hidden');
                } catch (e) {
                    alert('Error al cargar rol: ' + e.message);
                }
            },

            closeRoleModal() {
                document.getElementById('role-modal').classList.add('hidden');
            },

            async saveRole(e) {
                e.preventDefault();
                const roleId = document.getElementById('role-id').value;
                const isEdit = !!roleId;
                
                const data = {
                    name: document.getElementById('role-name').value,
                    description: document.getElementById('role-description').value
                };
                
                // Get selected permissions as array of IDs
                const permissions = [];
                document.querySelectorAll('#role-permissions input[type="checkbox"]:checked').forEach(cb => {
                    permissions.push(parseInt(cb.value));
                });
                
                console.log('=== ' + (isEdit ? 'updateRole' : 'createRole') + ' START ===', { roleId, data, permissions });
                
                try {
                    if (isEdit) {
                        // Update existing role
                        const updateResponse = await this.api('/admin/roles/' + roleId, 'PUT', data);
                        console.log('=== updateRole RESPONSE ===', updateResponse);
                        // Update permissions
                        await this.api('/admin/roles/' + roleId + '/permissions', 'POST', { permissions });
                    } else {
                        // Create new role
                        const response = await this.api('/admin/roles', 'POST', data);
                        console.log('=== createRole RESPONSE ===', response);
                        
                        // Then assign permissions to the new role
                        if (response && response.role && response.role.id && permissions.length > 0) {
                            await this.api('/admin/roles/' + response.role.id + '/permissions', 'POST', { permissions });
                        }
                    }
                    this.closeRoleModal();
                    this.loadAdminRoles();
                } catch (e) {
                    alert('Error al guardar rol: ' + e.message);
                }
            },

            async deleteRole(roleId) {
                console.log('=== deleteRole START ===', roleId);
                if (!await showConfirm('¿Está seguro de eliminar este rol?')) return;
                try {
                    const response = await this.api('/admin/roles/' + roleId, 'DELETE');
                    console.log('=== deleteRole RESPONSE ===', response);
                    this.loadAdminRoles();
                } catch (e) {
                    alert('Error al eliminar rol: ' + e.message);
                }
            },

            auditPage: 1,
            
            async loadAuditLogs() {
                try {
                    this.auditPage = 1;
                    const entity = document.getElementById('audit-entity-filter')?.value || '';
                    const params = new URLSearchParams({ page: 1, per_page: 20 });
                    if (entity) params.append('entity', entity);
                    
                    const data = await this.api('/admin/audit?' + params.toString());
                    this.renderAuditLogs(data.logs, data.total);
                } catch (e) {
                    console.error('Error loading audit logs:', e);
                }
            },
            
            async loadMoreAuditLogs() {
                try {
                    this.auditPage++;
                    const entity = document.getElementById('audit-entity-filter')?.value || '';
                    const params = new URLSearchParams({ page: this.auditPage, per_page: 20 });
                    if (entity) params.append('entity', entity);
                    
                    const data = await this.api('/admin/audit?' + params.toString());
                    this.appendAuditLogs(data.logs);
                } catch (e) {
                    console.error('Error loading more audit logs:', e);
                }
            },
            
            renderAuditLogs(logs, total) {
                const tbody = document.getElementById('admin-audit-table');
                tbody.innerHTML = '';
                for (const log of logs) {
                    const date = log.timestamp ? new Date(log.timestamp).toLocaleString('es-CO') : '-';
                    const details = log.new_value ? JSON.stringify(log.new_value).substring(0, 50) : (log.old_value ? JSON.stringify(log.old_value).substring(0, 50) : '-');
                    tbody.innerHTML += `
                        <tr>
                            <td class="text-sm">${date}</td>
                            <td>${log.user_email || 'Sistema'}</td>
                            <td><span class="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-400">${log.action}</span></td>
                            <td>${log.entity}</td>
                            <td>${log.entity_id || '-'}</td>
                            <td class="text-sm text-white/70">${details}</td>
                        </tr>
                    `;
                }
                
                // Show/hide load more button
                const loadMoreBtn = document.getElementById('audit-load-more');
                if (logs.length < total && this.auditPage * 20 < total) {
                    loadMoreBtn.classList.remove('hidden');
                } else {
                    loadMoreBtn.classList.add('hidden');
                }
            },
            
            appendAuditLogs(logs) {
                const tbody = document.getElementById('admin-audit-table');
                for (const log of logs) {
                    const date = log.timestamp ? new Date(log.timestamp).toLocaleString('es-CO') : '-';
                    const details = log.new_value ? JSON.stringify(log.new_value).substring(0, 50) : (log.old_value ? JSON.stringify(log.old_value).substring(0, 50) : '-');
                    tbody.innerHTML += `
                        <tr>
                            <td class="text-sm">${date}</td>
                            <td>${log.user_email || 'Sistema'}</td>
                            <td><span class="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-400">${log.action}</span></td>
                            <td>${log.entity}</td>
                            <td>${log.entity_id || '-'}</td>
                            <td class="text-sm text-white/70">${details}</td>
                        </tr>
                    `;
                }
            },
            
            // Modal helpers
            closeModal(modalId = null) {
                if (modalId) {
                    // Close specific modal
                    const modal = document.getElementById(modalId);
                    const overlay = document.getElementById('modal-overlay');
                    if (modal) {
                        modal.classList.add('hidden');
                        modal.style.display = 'none';
                    }
                    if (overlay) {
                        // Check if any other modals are visible
                        const visibleModals = document.querySelectorAll('#modal-overlay > div:not(.hidden)');
                        if (visibleModals.length === 0) {
                            overlay.classList.add('hidden');
                            overlay.style.display = 'none';
                        }
                    }
                } else {
                    // Close all modals
                    const overlay = document.getElementById('modal-overlay');
                    if (overlay) {
                        overlay.classList.add('hidden');
                        overlay.style.display = 'none';
                        
                        // Hide all children of overlay (divs, forms, etc)
                        Array.from(overlay.children).forEach(el => {
                            el.classList.add('hidden');
                            el.style.display = 'none';
                        });
                    }
                }
            },
            
            // Init
            async init() {
                // Check for Wompi transaction ID in URL
                const urlParams = new URLSearchParams(window.location.search);
                const wompiId = urlParams.get('id');

                // Check auth
                if (this.loadAuth()) {
                    try {
                        const userData = await this.api('/auth/me');
                        this.user = userData.user;

                        // Verify Wompi transaction if present
                        if (wompiId) {
                            try {
                                const verify = await this.api('/billing/confirm-wompi', {
                                    method: 'POST',
                                    body: JSON.stringify({ id: wompiId })
                                });
                                
                                if (verify.success) {
                                    this.user.plan = verify.plan;
                                    localStorage.setItem('user', JSON.stringify(this.user));
                                    alert(verify.message);
                                    // Remove id from URL
                                    window.history.replaceState({}, document.title, window.location.pathname);
                                }
                            } catch (e) {
                                alert('Error verificando pago: ' + e.message);
                            }
                        }

                        await this.afterLogin();
                        return;
                    } catch (e) {
                        this.logout();
                    }
                }       
                
                this.showAuth();
                const resetState = this.storage.get('password_reset_flow');
                if (resetState && resetState.email) {
                    this.showResetPassword();
                    const resetEmailInput = document.getElementById('reset-email');
                    if (resetEmailInput) resetEmailInput.value = resetState.email;
                } else {
                    this.showLogin();
                }
            }
        };
        
        // Make app globally accessible for onclick handlers
        window.app = app;

        window.addEventListener('click', (event) => {
            // Close settings menu
            const settingsMenu = document.getElementById('settings-menu');
            const settingsButton = document.getElementById('settings-menu-btn');
            if (settingsMenu && settingsButton) {
                if (!settingsMenu.contains(event.target) && !settingsButton.contains(event.target)) {
                    settingsMenu.classList.add('hidden');
                }
            }
            
            // Close business menu
            const businessMenu = document.getElementById('business-switch-dropdown');
            const businessButton = document.getElementById('app-header');
            if (businessMenu && businessButton) {
                if (!businessMenu.contains(event.target) && !businessButton.contains(event.target)) {
                    businessMenu.classList.add('hidden');
                }
            }
        });
        
        // Initialize app
        document.addEventListener('DOMContentLoaded', () => {
             if (window.app) {
                 window.app.init();
             }
        });
        
        // Close modal on overlay click
        document.getElementById('modal-overlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                app.closeModal();
            }
        });
        
        // Expose admin functions to window for debugging and global access
        window.adminCreateUser = function() { 
            console.log('adminCreateUser called'); 
            alert('Creando usuario...');
            if(app && app.showCreateUserModal) {
                app.showCreateUserModal();
            } else {
                alert('Error: app.showCreateUserModal no está disponible');
            }
        };
        window.adminEditUser = function(id) { console.log('adminEditUser called', id); if(app && app.showEditUserModal) app.showEditUserModal(id); };
        window.adminDeleteUser = function(id) { console.log('adminDeleteUser called', id); if(app && app.deleteUser) app.deleteUser(id); };
        window.adminCreateRole = function() { 
            console.log('adminCreateRole called'); 
            alert('Creando rol...');
            if(app && app.showCreateRoleModalWithOverlay) {
                app.showCreateRoleModalWithOverlay();
            } else {
                alert('Error: app.showCreateRoleModalWithOverlay no está disponible');
            }
        };
        window.adminEditRole = function(id) { console.log('adminEditRole called', id); if(app && app.showEditRoleModal) app.showEditRoleModal(id); };
        window.adminDeleteRole = function(id) { console.log('adminDeleteRole called', id); if(app && app.deleteRole) app.deleteRole(id); };
