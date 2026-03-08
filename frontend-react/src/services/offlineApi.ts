type AxiosLikeConfig = {
  url?: string;
  method?: string;
  baseURL?: string;
  params?: Record<string, any>;
  data?: any;
};

const key = (bizId: number, coll: string) => `offline:${bizId}:${coll}`;

const read = <T>(bizId: number, coll: string): T[] => {
  try {
    const raw = localStorage.getItem(key(bizId, coll));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const write = (bizId: number, coll: string, arr: any[]) => {
  localStorage.setItem(key(bizId, coll), JSON.stringify(arr));
};

const ensureBusiness = () => {
  const raw = localStorage.getItem('offline:businesses');
  if (!raw) {
    const def = [{ id: 1, name: 'Negocio Demo' }];
    localStorage.setItem('offline:businesses', JSON.stringify(def));
  }
};

const parseId = (s?: string) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

const nextId = (arr: any[]) => {
  const max = arr.reduce((m, it) => (it.id && it.id > m ? it.id : m), 0);
  return max + 1 || Date.now();
};

const toISODate = (d?: string) => {
  if (!d) return new Date().toISOString().split('T')[0];
  return d;
};

const handleBusinesses = (cfg: AxiosLikeConfig) => {
  ensureBusiness();
  const businesses = JSON.parse(localStorage.getItem('offline:businesses') || '[]');
  return { data: { businesses }, status: 200, statusText: 'OK', headers: {}, config: cfg as any };
};

const handleCollectionGet = (bizId: number, coll: string, cfg: AxiosLikeConfig) => {
  const all = read<any>(bizId, coll);
  if (coll === 'expenses') {
    const { category, start_date, end_date } = cfg.params || {};
    let arr = all;
    if (category) arr = arr.filter((e: any) => e.category === category);
    if (start_date) arr = arr.filter((e: any) => new Date(e.date) >= new Date(start_date));
    if (end_date) {
      const end = new Date(end_date);
      end.setHours(23, 59, 59, 999);
      arr = arr.filter((e: any) => new Date(e.date) <= end);
    }
    return { data: { expenses: arr }, status: 200, statusText: 'OK', headers: {}, config: cfg as any };
  }
  if (coll === 'sales') {
    return { data: { sales: all }, status: 200, statusText: 'OK', headers: {}, config: cfg as any };
  }
  if (coll === 'payments') {
    return { data: { payments: all }, status: 200, statusText: 'OK', headers: {}, config: cfg as any };
  }
  if (coll === 'products') {
    return { data: { products: all }, status: 200, statusText: 'OK', headers: {}, config: cfg as any };
  }
  if (coll === 'orders') {
    return { data: { orders: all }, status: 200, statusText: 'OK', headers: {}, config: cfg as any };
  }
  if (coll === 'customers') {
    return { data: { customers: all }, status: 200, statusText: 'OK', headers: {}, config: cfg as any };
  }
  if (coll === 'customers_debtors') {
      return { data: { debtors: [] }, status: 200, statusText: 'OK', headers: {}, config: cfg as any };
    }
    if (coll === 'recurring_expenses') {
      return { data: { recurring_expenses: all }, status: 200, statusText: 'OK', headers: {}, config: cfg as any };
    }
    return { data: {}, status: 200, statusText: 'OK', headers: {}, config: cfg as any };
  };

  const handleCollectionPost = (bizId: number, coll: string, body: any, cfg: AxiosLikeConfig) => {
    const all = read<any>(bizId, coll);
    const id = nextId(all);
    if (coll === 'expenses') {
      const item = { id, business_id: bizId, description: body.description || '', amount: Number(body.amount || 0), category: body.category || 'general', date: toISODate(body.date), created_at: new Date().toISOString() };
      const arr = [item, ...all];
      write(bizId, coll, arr);
      return { data: { expense: item }, status: 201, statusText: 'Created', headers: {}, config: cfg as any };
    }
    if (coll === 'recurring_expenses') {
        const item = { 
            id, 
            business_id: bizId, 
            name: body.name || 'Gasto Recurrente', 
            amount: Number(body.amount || 0), 
            category: body.category || 'general', 
            frequency: body.frequency || 'monthly',
            next_due_date: toISODate(body.next_due_date),
            is_active: body.is_active ?? true,
            created_at: new Date().toISOString() 
        };
        const arr = [item, ...all];
        write(bizId, coll, arr);
        return { data: { recurring_expense: item }, status: 201, statusText: 'Created', headers: {}, config: cfg as any };
    }
  if (coll === 'sales') {
    const item = { id, business_id: bizId, customer_id: body.customer_id || null, items: body.items || [], total: Number(body.total || 0), sale_date: toISODate(body.sale_date), created_at: new Date().toISOString(), customer_name: body.customer_name || 'Cliente' };
    const arr = [item, ...all];
    write(bizId, coll, arr);
    return { data: { sale: item }, status: 201, statusText: 'Created', headers: {}, config: cfg as any };
  }
  if (coll === 'payments') {
    const item = { id, business_id: bizId, customer_id: body.customer_id || null, amount: Number(body.amount || 0), method: body.method || 'cash', payment_date: toISODate(body.payment_date), note: body.note || '', created_at: new Date().toISOString(), customer_name: body.customer_name || 'Cliente' };
    const arr = [item, ...all];
    write(bizId, coll, arr);
    return { data: { payment: item }, status: 201, statusText: 'Created', headers: {}, config: cfg as any };
  }
  if (coll === 'products') {
    const item = { id, business_id: bizId, name: body.name || 'Producto', price: Number(body.price || 0), stock: Number(body.stock || 0), created_at: new Date().toISOString() };
    const arr = [...all, item];
    write(bizId, coll, arr);
    return { data: { product: item }, status: 201, statusText: 'Created', headers: {}, config: cfg as any };
  }
  if (coll === 'orders') {
    const item = { id, business_id: bizId, customer_id: body.customer_id || null, customer_name: body.customer_name || 'Cliente', status: body.status || 'pending', items: body.items || [], total: Number(body.total || 0), order_date: toISODate(body.order_date), created_at: new Date().toISOString() };
    const arr = [item, ...all];
    write(bizId, coll, arr);
    return { data: { order: item }, status: 201, statusText: 'Created', headers: {}, config: cfg as any };
  }
  if (coll === 'customers') {
    const item = { id, business_id: bizId, name: body.name || 'Cliente', phone: body.phone || '', address: body.address || '', created_at: new Date().toISOString(), balance: 0 };
    const arr = [...all, item];
    write(bizId, coll, arr);
    return { data: { customer: item }, status: 201, statusText: 'Created', headers: {}, config: cfg as any };
  }
  return { data: {}, status: 201, statusText: 'Created', headers: {}, config: cfg as any };
};

const handleCollectionPut = (bizId: number, coll: string, id: number, body: any, cfg: AxiosLikeConfig) => {
  const all = read<any>(bizId, coll);
  const idx = all.findIndex((it: any) => it.id === id);
  if (idx >= 0) {
    const updated = { ...all[idx], ...body };
    all[idx] = updated;
    write(bizId, coll, all);
    const wrapperKey = coll === 'products' ? 'product' : 
                       coll === 'payments' ? 'payment' : 
                       coll === 'orders' ? 'order' : 
                       coll === 'sales' ? 'sale' : 
                       coll === 'expenses' ? 'expense' : 
                       coll === 'recurring_expenses' ? 'recurring_expense' :
                       'customer';
    return { data: { [wrapperKey]: updated }, status: 200, statusText: 'OK', headers: {}, config: cfg as any };
  }
  return { data: {}, status: 404, statusText: 'Not Found', headers: {}, config: cfg as any };
};

const handleCollectionDelete = (bizId: number, coll: string, id: number, cfg: AxiosLikeConfig) => {
  const all = read<any>(bizId, coll);
  const filtered = all.filter((it: any) => it.id !== id);
  write(bizId, coll, filtered);
  return { data: {}, status: 204, statusText: 'No Content', headers: {}, config: cfg as any };
};

const handleDashboard = (bizId: number, cfg: AxiosLikeConfig) => {
  const sales = read<any>(bizId, 'sales');
  const expenses = read<any>(bizId, 'expenses');
  const customers = read<any>(bizId, 'customers');
  
  const today = new Date().toISOString().split('T')[0];
  
  const todaysSales = sales.filter((s: any) => (s.sale_date || '').startsWith(today));
  const todaysExpenses = expenses.filter((e: any) => (e.date || '').startsWith(today));
  
  const totalSales = todaysSales.reduce((sum: number, s: any) => sum + (Number(s.total) || 0), 0);
  const totalExpenses = todaysExpenses.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
  const receivables = customers.reduce((sum: number, c: any) => sum + (Number(c.balance) || 0), 0);
  
  const recentSales = [...sales]
    .sort((a: any, b: any) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime())
    .slice(0, 10);

  const data = {
    summary: {
      sales: { total: totalSales, count: todaysSales.length },
      expenses: { total: totalExpenses, count: todaysExpenses.length },
      cash_flow: { in: totalSales, out: totalExpenses },
      accounts_receivable: receivables
    },
    dashboard: {
      recent_sales: recentSales,
      projections: { daily_average: 0 },
      fiados_alerts: { count: 0 }
    }
  };

  return { data, status: 200, statusText: 'OK', headers: {}, config: cfg as any };
};

export const offlineApi = {
  handle: async (cfg: AxiosLikeConfig) => {
    // Robust URL construction
    let url = (cfg.url || '');
    if (!url.startsWith('http')) {
       // If URL is relative, prepend baseURL or just ensure it starts with /
       const base = cfg.baseURL || '';
       url = base + url;
    }
    
    // Normalize: ensure it looks like a path we expect
    // If it contains "http", strip protocol/domain to just get path
    try {
        if (url.startsWith('http')) {
            const urlObj = new URL(url);
            url = urlObj.pathname + urlObj.search;
        }
    } catch {}

    const method = (cfg.method || 'get').toLowerCase();
    // Public banners
    if (url.endsWith('/banners') && !url.includes('/admin/banners') && method === 'get') {
      try {
        const raw = localStorage.getItem('offline:banners');
        if (!raw) {
          const defaults = [
            { id: 1, title: 'Bienvenido a EnCaja', image_url: 'https://via.placeholder.com/1200x400?text=EnCaja', link: '', active: true, order: 1 },
          ];
          localStorage.setItem('offline:banners', JSON.stringify(defaults));
          return { data: { banners: defaults }, status: 200, statusText: 'OK', headers: {}, config: cfg as any };
        }
        const banners = JSON.parse(raw);
        return { data: { banners }, status: 200, statusText: 'OK', headers: {}, config: cfg as any };
      } catch {
        return { data: { banners: [] }, status: 200, statusText: 'OK', headers: {}, config: cfg as any };
      }
    }
    // Admin banners
    if (url.includes('/admin/banners')) {
      const raw = localStorage.getItem('offline:banners');
      const arr = raw ? JSON.parse(raw) : [];
      if (method === 'get') {
        return { data: { banners: arr }, status: 200, statusText: 'OK', headers: {}, config: cfg as any };
      }
      if (method === 'post') {
        const body = cfg.data && typeof cfg.data === 'string' ? JSON.parse(cfg.data) : cfg.data;
        const id = nextId(arr);
        const banner = { id, title: body?.title || 'Nuevo Banner', image_url: body?.image_url || 'https://via.placeholder.com/1200x400?text=Banner', link: body?.link || '', active: body?.active ?? true, order: body?.order ?? (arr.length + 1) };
        const out = [...arr, banner];
        localStorage.setItem('offline:banners', JSON.stringify(out));
        return { data: { banner }, status: 201, statusText: 'Created', headers: {}, config: cfg as any };
      }
      const idm = url.match(/\/admin\/banners\/(\d+)/);
      if (idm) {
        const id = parseId(idm[1]);
        const idx = arr.findIndex((b: any) => b.id === id);
        if (idx >= 0) {
          if (method === 'put') {
            const body = cfg.data && typeof cfg.data === 'string' ? JSON.parse(cfg.data) : cfg.data;
            const updated = { ...arr[idx], ...body };
            arr[idx] = updated;
            localStorage.setItem('offline:banners', JSON.stringify(arr));
            return { data: { banner: updated }, status: 200, statusText: 'OK', headers: {}, config: cfg as any };
          }
          if (method === 'delete') {
            const out = arr.filter((b: any) => b.id !== id);
            localStorage.setItem('offline:banners', JSON.stringify(out));
            return { data: {}, status: 204, statusText: 'No Content', headers: {}, config: cfg as any };
          }
        }
      }
    }
    if (url.endsWith('/businesses') && method === 'get') {
      return handleBusinesses(cfg);
    }
    const m = url.match(/\/businesses\/(\d+)(.*)$/);
    if (!m) return null;
    const bizId = parseId(m[1]);
    const rest = m[2] || '';

    if (rest === '/dashboard' && method === 'get') {
      return handleDashboard(bizId, cfg);
    }

    if (rest.startsWith('/customers/debtors') && method === 'get') {
      return handleCollectionGet(bizId, 'customers_debtors', cfg);
    }
    if (rest.startsWith('/customers')) {
      if (method === 'get') return handleCollectionGet(bizId, 'customers', cfg);
      if (method === 'post') return handleCollectionPost(bizId, 'customers', cfg.data && typeof cfg.data === 'string' ? JSON.parse(cfg.data) : cfg.data, cfg);
      const idm = rest.match(/\/customers\/(\d+)/);
      if (idm) {
        const id = parseId(idm[1]);
        if (method === 'put') return handleCollectionPut(bizId, 'customers', id, cfg.data && typeof cfg.data === 'string' ? JSON.parse(cfg.data) : cfg.data, cfg);
        if (method === 'delete') return handleCollectionDelete(bizId, 'customers', id, cfg);
      }
    }
    if (rest.startsWith('/products')) {
      if (method === 'get') return handleCollectionGet(bizId, 'products', cfg);
      if (method === 'post') return handleCollectionPost(bizId, 'products', cfg.data && typeof cfg.data === 'string' ? JSON.parse(cfg.data) : cfg.data, cfg);
      const idm = rest.match(/\/products\/(\d+)/);
      if (idm) {
        const id = parseId(idm[1]);
        if (method === 'put') return handleCollectionPut(bizId, 'products', id, cfg.data && typeof cfg.data === 'string' ? JSON.parse(cfg.data) : cfg.data, cfg);
        if (method === 'delete') return handleCollectionDelete(bizId, 'products', id, cfg);
      }
    }
    if (rest.startsWith('/expenses')) {
      if (method === 'get') return handleCollectionGet(bizId, 'expenses', cfg);
      if (method === 'post') return handleCollectionPost(bizId, 'expenses', cfg.data && typeof cfg.data === 'string' ? JSON.parse(cfg.data) : cfg.data, cfg);
      const idm = rest.match(/\/expenses\/(\d+)/);
      if (idm) {
        const id = parseId(idm[1]);
        if (method === 'delete') return handleCollectionDelete(bizId, 'expenses', id, cfg);
      }
    }
    if (rest.startsWith('/recurring-expenses')) {
      if (method === 'get') return handleCollectionGet(bizId, 'recurring_expenses', cfg);
      if (method === 'post') return handleCollectionPost(bizId, 'recurring_expenses', cfg.data && typeof cfg.data === 'string' ? JSON.parse(cfg.data) : cfg.data, cfg);
      const idm = rest.match(/\/recurring-expenses\/(\d+)/);
      if (idm) {
        const id = parseId(idm[1]);
        if (method === 'put') return handleCollectionPut(bizId, 'recurring_expenses', id, cfg.data && typeof cfg.data === 'string' ? JSON.parse(cfg.data) : cfg.data, cfg);
        if (method === 'delete') return handleCollectionDelete(bizId, 'recurring_expenses', id, cfg);
      }
    }
    if (rest.startsWith('/sales')) {
      if (method === 'get') return handleCollectionGet(bizId, 'sales', cfg);
      if (method === 'post') return handleCollectionPost(bizId, 'sales', cfg.data && typeof cfg.data === 'string' ? JSON.parse(cfg.data) : cfg.data, cfg);
      const idm = rest.match(/\/sales\/(\d+)/);
      if (idm) {
        const id = parseId(idm[1]);
        if (method === 'delete') return handleCollectionDelete(bizId, 'sales', id, cfg);
      }
    }
    if (rest.startsWith('/payments')) {
      if (method === 'get') return handleCollectionGet(bizId, 'payments', cfg);
      if (method === 'post') return handleCollectionPost(bizId, 'payments', cfg.data && typeof cfg.data === 'string' ? JSON.parse(cfg.data) : cfg.data, cfg);
      const idm = rest.match(/\/payments\/(\d+)/);
      if (idm) {
        const id = parseId(idm[1]);
        if (method === 'put') return handleCollectionPut(bizId, 'payments', id, cfg.data && typeof cfg.data === 'string' ? JSON.parse(cfg.data) : cfg.data, cfg);
        if (method === 'delete') return handleCollectionDelete(bizId, 'payments', id, cfg);
      }
    }
    if (rest.startsWith('/orders')) {
      if (method === 'get') return handleCollectionGet(bizId, 'orders', cfg);
      if (method === 'post') return handleCollectionPost(bizId, 'orders', cfg.data && typeof cfg.data === 'string' ? JSON.parse(cfg.data) : cfg.data, cfg);
      const idm = rest.match(/\/orders\/(\d+)/);
      if (idm) {
        const id = parseId(idm[1]);
        if (method === 'put') return handleCollectionPut(bizId, 'orders', id, cfg.data && typeof cfg.data === 'string' ? JSON.parse(cfg.data) : cfg.data, cfg);
        if (method === 'delete') return handleCollectionDelete(bizId, 'orders', id, cfg);
      }
    }
    return null;
  }
};
