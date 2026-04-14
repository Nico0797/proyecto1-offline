import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, execFileSync } from 'node:child_process';
import process from 'node:process';
import { chromium } from 'playwright-core';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const evidenceDir = path.join(rootDir, 'offline-evidence', 'desktop-slice1');
const exePath = path.join(rootDir, 'src-tauri', 'target', 'release', 'encaja_desktop.exe');
const localAppData = process.env.LOCALAPPDATA || '';
const localDataRoot = path.join(localAppData, 'com.encaja.desktop');
const remoteDebugPort = 9222;
const remoteDebugUrl = `http://127.0.0.1:${remoteDebugPort}`;
const businessName = 'Negocio Slice 1';
const productName = 'Producto Slice 1';
const productEditedName = 'Producto Slice 1 Editado';
const productTemporaryName = 'Producto Temporal Slice 1';
const customerName = 'Cliente Slice 1';
const customerEditedName = 'Cliente Slice 1 Editado';
const customerTemporaryName = 'Cliente Temporal Slice 1';
const saleNote = 'Venta local Tauri slice 1';

const results = {
  generatedAt: new Date().toISOString(),
  environment: {
    exePath,
    localDataRoot,
    remoteDebugUrl,
  },
  scenarios: [],
  remoteRequests: [],
  bugsFound: [],
  bugsCorrected: [],
  bugsDeferred: [],
};

const screenshotPaths = {};

async function readIndexedDbSnapshot(page) {
  return page.evaluate(async () => {
    const openDb = () => new Promise((resolve, reject) => {
      const request = indexedDB.open('encaja-offline-db', 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('No se pudo abrir IndexedDB'));
    });

    const getAll = (db, storeName) => new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const request = transaction.objectStore(storeName).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error(`No se pudo leer ${storeName}`));
    });

    const db = await openDb();
    const [businesses, customers, products, sales] = await Promise.all([
      getAll(db, 'businesses'),
      getAll(db, 'customers'),
      getAll(db, 'products'),
      getAll(db, 'sales'),
    ]);

    return {
      businesses: businesses.map((item) => item.record),
      customers: customers.map((item) => item.record),
      products: products.map((item) => item.record),
      sales: sales.map((item) => item.record),
    };
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

function logScenario(name, details) {
  results.scenarios.push({
    name,
    ...details,
  });
}

function sanitizePowerShellLiteral(value) {
  return String(value).replace(/'/g, "''");
}

function runPowerShell(script) {
  return execFileSync(
    'powershell',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script],
    {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  ).trim();
}

function tryPowerShell(script) {
  try {
    return runPowerShell(script);
  } catch (error) {
    return '';
  }
}

function taskKill(args) {
  try {
    execFileSync('taskkill', args, { stdio: 'ignore' });
  } catch {
    // Ignore if the process is already gone.
  }
}

async function killDesktopProcess(pid) {
  if (pid) {
    taskKill(['/PID', String(pid), '/T', '/F']);
    await sleep(1200);
  }
  taskKill(['/IM', 'encaja_desktop.exe', '/T', '/F']);
  await sleep(1200);
}

async function clearLocalData() {
  await fs.rm(localDataRoot, { recursive: true, force: true });
  await sleep(500);
}

async function waitForDebugger() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${remoteDebugUrl}/json/list`);
      if (response.ok) {
        const targets = await response.json();
        if (Array.isArray(targets) && targets.length > 0) {
          return targets;
        }
      }
    } catch {
      // Keep polling.
    }
    await sleep(500);
  }

  throw new Error('No fue posible conectar al puerto de depuracion de WebView2.');
}

async function launchDesktop() {
  const child = spawn(exePath, [], {
    cwd: rootDir,
    env: {
      ...process.env,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${remoteDebugPort}`,
    },
    stdio: 'ignore',
    detached: false,
  });

  await waitForDebugger();
  const browser = await chromium.connectOverCDP(remoteDebugUrl);
  const context = browser.contexts()[0];

  let page = context.pages().find((candidate) => candidate.url().includes('tauri.localhost'));
  for (let attempt = 0; !page && attempt < 20; attempt += 1) {
    await sleep(500);
    page = context.pages().find((candidate) => candidate.url().includes('tauri.localhost'));
  }
  if (!page) {
    throw new Error('No se encontro la pagina principal de Tauri.');
  }

  context.on('request', (request) => {
    const url = request.url();
    if (!url.includes('tauri.localhost')) {
      results.remoteRequests.push({
        url,
        method: request.method(),
        resourceType: request.resourceType(),
      });
    }
  });

  page.on('dialog', async (dialog) => {
    await dialog.accept();
  });

  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1200);

  return { child, browser, context, page };
}

async function closeSession(session) {
  if (!session) return;
  try {
    await session.browser.close();
  } catch {
    // Ignore close errors; the process kill below is authoritative.
  }
  await killDesktopProcess(session.child?.pid);
}

async function waitForUrl(page, expectedPath) {
  await page.waitForFunction(
    (pathName) => window.location.pathname === pathName,
    expectedPath,
    { timeout: 30000 }
  );
}

async function expectText(page, text) {
  await page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout: 30000 });
}

async function expectVisibleProductCard(page, name) {
  const locator = page.locator(`[title="${name}"]`).last();
  await locator.waitFor({ state: 'visible', timeout: 30000 });
}

async function expectVisibleCustomerItem(page, name) {
  const locator = page.locator('[data-tour="customers.listItem"]').filter({ hasText: name }).first();
  await locator.waitFor({ state: 'visible', timeout: 30000 });
}

async function expectVisibleSalesEntry(page, text) {
  const desktopRow = page.locator('[data-tour="sales.table.desktop"] tr').filter({ hasText: text }).first();
  const mobileCard = page.locator('[data-tour="sales.list.mobile"] > div').filter({ hasText: text }).first();
  try {
    await desktopRow.waitFor({ state: 'visible', timeout: 8000 });
    return;
  } catch {}

  await mobileCard.waitFor({ state: 'visible', timeout: 30000 });
}

async function fillControlByLabel(page, labelText, value) {
  const control = page.locator('label').filter({ hasText: labelText }).first().locator('..').locator('input, textarea, select').first();
  await control.waitFor({ state: 'visible', timeout: 15000 });
  const tagName = await control.evaluate((element) => element.tagName.toLowerCase());
  if (tagName === 'select') {
    await control.selectOption(String(value));
    return;
  }
  await control.fill('');
  await control.fill(String(value));
}

async function fillControlInPanel(page, panelText, value) {
  const control = page.locator('div').filter({ hasText: panelText }).first().locator('input, textarea, select').first();
  await control.waitFor({ state: 'visible', timeout: 15000 });
  await control.fill('');
  await control.fill(String(value));
}

async function clickButton(page, name) {
  const button = page.getByRole('button', { name }).first();
  await button.waitFor({ state: 'visible', timeout: 15000 });
  await button.click({ force: true });
}

async function waitForModalToClose(page, selector, fallbackText = null) {
  const modal = page.locator(selector).last();
  if (await modal.isVisible().catch(() => false)) {
    await modal.waitFor({ state: 'hidden', timeout: 30000 });
    return;
  }

  if (fallbackText) {
    const fallback = page.getByText(fallbackText, { exact: false }).first();
    if (await fallback.isVisible().catch(() => false)) {
      await fallback.waitFor({ state: 'hidden', timeout: 30000 });
    }
  }
}

async function runBusinessWizard(page) {
  await clickButton(page, 'Crear negocio');
  await expectText(page, 'Configura tu negocio');
  await fillControlByLabel(page, /Nombre del negocio/i, businessName);

  for (let step = 0; step < 20; step += 1) {
    const enterButton = page.getByRole('button', { name: /Entrar a mi negocio/i }).first();
    if (await enterButton.isVisible().catch(() => false)) {
      await enterButton.click();
      await waitForUrl(page, '/dashboard');
      return;
    }

    const continueButton = page.getByRole('button', { name: /^Continuar$/i }).first();
    if (!(await continueButton.isVisible().catch(() => false))) {
      continue;
    }

    if (await continueButton.isDisabled()) {
      const optionCard = page.locator('button').filter({ hasText: /Disponible|Elegido/i }).first();
      await optionCard.waitFor({ state: 'visible', timeout: 10000 });
      await optionCard.click();
      await page.waitForTimeout(200);
    }

    await continueButton.click();
    await page.waitForTimeout(250);
  }

  throw new Error('No fue posible completar el onboarding local del negocio.');
}

async function saveScreenshots(page, prefix, { nativePid, fullPage = true } = {}) {
  const pagePath = path.join(evidenceDir, `${prefix}.png`);
  await page.screenshot({ path: pagePath, fullPage });
  screenshotPaths[prefix] = pagePath;

  if (nativePid) {
    const nativePath = path.join(evidenceDir, `${prefix}-window.png`);
    captureNativeWindow(nativePid, nativePath);
    screenshotPaths[`${prefix}-window`] = nativePath;
  }
}

function getWindowInfo(pid) {
  const json = runPowerShell(`
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class Win32DesktopInfo {
  [StructLayout(LayoutKind.Sequential)]
  public struct RECT {
    public int Left;
    public int Top;
    public int Right;
    public int Bottom;
  }
  [DllImport("user32.dll")]
  public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
}
"@;
$process = Get-Process -Id ${pid} -ErrorAction Stop;
$rect = New-Object Win32DesktopInfo+RECT;
[void][Win32DesktopInfo]::GetWindowRect($process.MainWindowHandle, [ref]$rect);
[pscustomobject]@{
  pid = $process.Id;
  title = $process.MainWindowTitle;
  width = [Math]::Max(0, $rect.Right - $rect.Left);
  height = [Math]::Max(0, $rect.Bottom - $rect.Top);
  left = $rect.Left;
  top = $rect.Top;
} | ConvertTo-Json -Compress
`);

  return JSON.parse(json);
}

function resizeWindow(pid, width, height) {
  runPowerShell(`
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class Win32DesktopMove {
  [DllImport("user32.dll")]
  public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);
  [DllImport("user32.dll")]
  public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@;
$process = Get-Process -Id ${pid} -ErrorAction Stop;
[void][Win32DesktopMove]::SetForegroundWindow($process.MainWindowHandle);
[void][Win32DesktopMove]::MoveWindow($process.MainWindowHandle, 120, 80, ${width}, ${height}, $true);
`);
}

function captureNativeWindow(pid, outputPath) {
  runPowerShell(`
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class Win32DesktopShot {
  [StructLayout(LayoutKind.Sequential)]
  public struct RECT {
    public int Left;
    public int Top;
    public int Right;
    public int Bottom;
  }
  [DllImport("user32.dll")]
  public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")]
  public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@;
Add-Type -AssemblyName System.Drawing;
$process = Get-Process -Id ${pid} -ErrorAction Stop;
[void][Win32DesktopShot]::SetForegroundWindow($process.MainWindowHandle);
Start-Sleep -Milliseconds 350;
$rect = New-Object Win32DesktopShot+RECT;
[void][Win32DesktopShot]::GetWindowRect($process.MainWindowHandle, [ref]$rect);
$width = [Math]::Max(1, $rect.Right - $rect.Left);
$height = [Math]::Max(1, $rect.Bottom - $rect.Top);
$bitmap = New-Object System.Drawing.Bitmap $width, $height;
$graphics = [System.Drawing.Graphics]::FromImage($bitmap);
$graphics.CopyFromScreen($rect.Left, $rect.Top, 0, 0, $bitmap.Size);
$bitmap.Save('${sanitizePowerShellLiteral(outputPath)}', [System.Drawing.Imaging.ImageFormat]::Png);
$graphics.Dispose();
$bitmap.Dispose();
`);
}

async function navigateToModule(page, label, expectedPath) {
  const sidebarButton = page.locator('.app-sidebar nav button').filter({ hasText: new RegExp(`^\\s*${label}\\s*$`, 'i') }).first();
  await sidebarButton.waitFor({ state: 'visible', timeout: 15000 });
  await sidebarButton.click({ force: true });
  await waitForUrl(page, expectedPath);
}

async function forceDesktopOffline(context) {
  try {
    await context.setOffline(true);
    await sleep(300);
  } catch (error) {
    results.bugsDeferred.push({
      severity: 'minor',
      description: 'No fue posible forzar el modo offline desde CDP; se continuo validando con backend remoto ausente.',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

async function verifyNoLogin(page) {
  const loginVisible = await page.getByText(/Inicia sesi.n para continuar/i, { exact: false }).first().isVisible().catch(() => false);
  if (loginVisible) {
    throw new Error('Login.tsx aparecio dentro del contenedor desktop offline.');
  }
}

async function createProduct(page, name, { price, cost, stock }) {
  void stock;
  await clickButton(page, /Nuevo|Crear/i);
  await expectText(page, 'Nuevo Producto');
  const basicTab = page.getByRole('button', { name: /Informaci[oó]n B[aá]sica|Basica/i }).first();
  if (await basicTab.isVisible().catch(() => false)) {
    await basicTab.click();
  }
  await fillControlByLabel(page, /Nombre del Producto/i, name);
  await fillControlByLabel(page, /SKU/i, name.replace(/\s+/g, '-').toUpperCase());
  await clickButton(page, /Precios y Costos/i);
  await fillControlByLabel(page, /Precio de Venta/i, price);
  await fillControlByLabel(page, /Costo de Adquis/i, cost);
  await clickButton(page, /Crear Producto/i);
  await page.waitForTimeout(1800);
  const falseRemoteErrorVisible = await page.getByText(/No fue posible guardar el producto|solo qued[oÃ³] local y no se confirm[oÃ³] en backend/i, { exact: false }).first().isVisible().catch(() => false);
  if (falseRemoteErrorVisible) {
    throw new Error('ProductModal siguiÃ³ comunicando error remoto falso despuÃ©s de un guardado offline local.');
  }
  await waitForModalToClose(page, '[data-tour="products.modal.form"]', 'Nuevo Producto');
  await expectVisibleProductCard(page, name);
  return;
  await page.waitForTimeout(2500);
  const productAlreadyVisible = await page.locator(`[title="${name}"]`).last().isVisible().catch(() => false);
  const offlineWarningVisible = await page.getByText(/solo qued[oó] local|sin conexi[oó]n/i, { exact: false }).first().isVisible().catch(() => false);
  if (productAlreadyVisible && offlineWarningVisible) {
    results.bugsDeferred.push({
      severity: 'high',
      description: 'El modal real de producto muestra advertencia de persistencia remota en desktop offline aunque el guardado local sí se completa.',
    });
    const cancelButton = page.getByRole('button', { name: /Cancelar/i }).first();
    if (await cancelButton.isVisible().catch(() => false)) {
      await cancelButton.click();
    }
  } else if (!productAlreadyVisible) {
    await page.getByText('Nuevo Producto', { exact: false }).first().waitFor({ state: 'hidden', timeout: 30000 });
  }
  await expectVisibleProductCard(page, name);
}

async function editProduct(page, currentName, nextName) {
  await page.locator(`[title="${currentName}"]`).last().click();
  await expectText(page, 'Editar Producto');
  const basicTab = page.getByRole('button', { name: /Informaci[oó]n B[aá]sica|Basica/i }).first();
  if (await basicTab.isVisible().catch(() => false)) {
    await basicTab.click();
  }
  await fillControlByLabel(page, /Nombre del Producto/i, nextName);
  await clickButton(page, /Guardar Cambios/i);
  await page.waitForTimeout(1800);
  const falseRemoteErrorVisible = await page.getByText(/No fue posible guardar el producto|solo qued[oÃ³] local y no se confirm[oÃ³] en backend/i, { exact: false }).first().isVisible().catch(() => false);
  if (falseRemoteErrorVisible) {
    throw new Error('ProductModal siguiÃ³ comunicando error remoto falso despuÃ©s de actualizar offline.');
  }
  await waitForModalToClose(page, '[data-tour="products.modal.form"]', 'Editar Producto');
  await expectVisibleProductCard(page, nextName);
  return;
  await page.waitForTimeout(2500);
  const updatedProductVisible = await page.locator(`[title="${nextName}"]`).last().isVisible().catch(() => false);
  const offlineWarningVisible = await page.getByText(/solo qued[oó] local|sin conexi[oó]n/i, { exact: false }).first().isVisible().catch(() => false);
  if (updatedProductVisible && offlineWarningVisible) {
    const cancelButton = page.getByRole('button', { name: /Cancelar/i }).first();
    if (await cancelButton.isVisible().catch(() => false)) {
      await cancelButton.click();
    }
  } else if (!updatedProductVisible) {
    await page.getByText('Editar Producto', { exact: false }).first().waitFor({ state: 'hidden', timeout: 30000 });
  }
  await expectVisibleProductCard(page, nextName);
}

async function archiveAndDeleteTemporaryProduct(page, name) {
  const statusSelect = page.locator('.app-toolbar select').nth(1);
  const productCard = page.locator(`[title="${name}"]`).last();

  await productCard.waitFor({ state: 'visible', timeout: 30000 });
  await productCard.click();
  await page.getByTitle('Archivar/Eliminar').last().click({ force: true });
  await page.waitForTimeout(800);

  await statusSelect.selectOption('archived');
  const archivedCard = page.locator(`[title="${name}"]`).last();
  await archivedCard.waitFor({ state: 'visible', timeout: 30000 });
  await archivedCard.click();
  await page.getByTitle('Archivar/Eliminar').last().click({ force: true });
  await archivedCard.waitFor({ state: 'hidden', timeout: 30000 });

  const snapshot = await readIndexedDbSnapshot(page);
  const stillExists = snapshot.products.some((product) => product?.name === name);
  if (stillExists) {
    throw new Error(`El producto temporal ${name} quedo residual en IndexedDB despues de archivar/eliminar.`);
  }

  await statusSelect.selectOption('active');
  return;
  void page;
  void name;
  results.bugsDeferred.push({
    severity: 'medium',
    description: 'La eliminación/archivo de productos en desktop usa controles hover y filtrado no robustos para validación automática nativa; se difiere su cierre para un PR de interacción desktop.',
  });
}

async function createCustomer(page, name, { phone, email, address }) {
  await page.locator('[data-tour="customers.primaryAction.desktop"]').click({ force: true });
  await page.locator('[data-tour="customers.modal.form"]').waitFor({ state: 'visible', timeout: 30000 });
  await fillControlByLabel(page, /Nombre Completo/i, name);
  await fillControlByLabel(page, /Tel/i, phone);
  await fillControlByLabel(page, /Email/i, email);
  await fillControlByLabel(page, /Direcci/i, address);
  await page.locator('[data-tour="customers.modal.create"]').click({ force: true });
  await waitForModalToClose(page, '[data-tour="customers.modal.form"]');
  await expectVisibleCustomerItem(page, name);
}

async function editCustomer(page, currentName, nextName) {
  const item = page.locator('[data-tour="customers.listItem"]').filter({ hasText: currentName }).first();
  await item.waitFor({ state: 'visible', timeout: 15000 });
  await item.hover();
  await item.getByTitle('Editar').evaluate((element) => {
    element.click();
  });
  await page.locator('[data-tour="customers.modal.form"]').waitFor({ state: 'visible', timeout: 30000 });
  await fillControlByLabel(page, /Nombre Completo/i, nextName);
  await page.locator('[data-tour="customers.modal.update"]').click({ force: true });
  await waitForModalToClose(page, '[data-tour="customers.modal.form"]');
  await expectVisibleCustomerItem(page, nextName);
}

async function deleteCustomer(page, name) {
  const item = page.locator('[data-tour="customers.listItem"]').filter({ hasText: name }).first();
  await item.waitFor({ state: 'visible', timeout: 15000 });
  await item.hover();
  await item.getByTitle('Eliminar').click({ force: true });
  await item.waitFor({ state: 'hidden', timeout: 30000 });
}

async function createSale(page) {
  await clickButton(page, /Registrar venta|Vender/i);
  await page.locator('[data-tour="sales.modal.body"]').waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('[data-tour="sales.modal.products"]').getByText(productEditedName, { exact: false }).first().click();
  await page.locator('[data-tour="sales.modal.nextToClient"]').click();
  const clientSelect = page.locator('[data-tour="sales.modal.clientSelect"] select').first();
  const customerValue = await clientSelect.locator('option').filter({ hasText: customerEditedName }).first().evaluate((option) => option.value);
  await clientSelect.selectOption(customerValue);
  await page.locator('[data-tour="sales.modal.nextToPayment"]').click();
  await page.locator('[data-tour="sales.modal.paymentMethods"]').getByRole('button', { name: /Pago total hoy/i }).click();
  await fillControlByLabel(page, /Nota interna/i, saleNote);
  await page.locator('[data-tour="sales.modal.confirm"]').click();
  await waitForModalToClose(page, '[data-tour="sales.modal.body"]');
  await expectVisibleSalesEntry(page, customerEditedName);
}

async function verifyDashboardState(page) {
  await navigateToModule(page, 'Inicio', '/dashboard');
  await expectText(page, businessName);
  await expectText(page, customerEditedName);
  await expectText(page, 'Ultimas ventas');
  const emptyStateVisible = await page.getByText('Todavia no hay ventas hoy', { exact: false }).first().isVisible().catch(() => false);
  if (emptyStateVisible) {
    throw new Error('El dashboard siguio mostrando el placeholder de ventas vacio despues de crear la venta local.');
  }
}

async function verifyProductsAfterRestart(page) {
  await navigateToModule(page, 'Productos', '/products');
  await expectVisibleProductCard(page, productEditedName);
  return true;
}

async function verifyCustomersAfterRestart(page) {
  await navigateToModule(page, 'Clientes', '/customers');
  await expectVisibleCustomerItem(page, customerEditedName);
  return true;
}

async function verifySalesAfterRestart(page) {
  await navigateToModule(page, 'Ventas', '/sales');
  const indexedDbSnapshot = await readIndexedDbSnapshot(page);
  const salePersistedInIndexedDb = indexedDbSnapshot.sales.some(
    (sale) => sale?.customer_name === customerEditedName && sale?.note === saleNote,
  );
  const visibleDesktopRows = await page.locator('[data-tour="sales.table.desktop"] tbody tr').count();
  const visibleMobileCards = await page.locator('[data-tour="sales.list.mobile"] > div').count();
  const emptyStateVisible = await page.getByText(/No hay ventas registradas/i, { exact: false }).first().isVisible().catch(() => false);

  if (!salePersistedInIndexedDb) {
    throw new Error('La venta local no persistio en IndexedDB tras reiniciar el ejecutable.');
  }

  if (emptyStateVisible || (visibleDesktopRows === 0 && visibleMobileCards === 0)) {
    throw new Error('El modulo de Ventas no mostro estado visible consistente tras reiniciar el ejecutable.');
  }

  return {
    salePersistedInIndexedDb,
    visibleDesktopRows,
    visibleMobileCards,
  };
}

async function writeResults() {
  await fs.writeFile(
    path.join(evidenceDir, 'desktop-slice1-validation.json'),
    JSON.stringify({ ...results, screenshots: screenshotPaths }, null, 2),
    'utf8'
  );
}

async function main() {
  try {
    if (!localAppData) {
      throw new Error('LOCALAPPDATA no esta disponible en el entorno actual.');
    }

    await ensureDir(evidenceDir);

    try {
      await fs.access(exePath);
    } catch {
      throw new Error(`No existe el ejecutable esperado de Tauri: ${exePath}`);
    }

    await killDesktopProcess(null);
    await clearLocalData();

    console.log('A. Primera apertura');
    let session = await launchDesktop();
    let windowInfo = getWindowInfo(session.child.pid);

    await waitForUrl(session.page, '/dashboard');
    await verifyNoLogin(session.page);
    await expectText(session.page, /no tienes un negocio/i);

  logScenario('A. Primera apertura', {
    url: await session.page.evaluate(() => window.location.pathname),
    loginVisible: false,
    emptyStateVisible: true,
    window: windowInfo,
  });

    await saveScreenshots(session.page, 'desktop-first-open-dashboard', { nativePid: session.child.pid });

    console.log('A1. Creando negocio local');
    await runBusinessWizard(session.page);
    await expectText(session.page, businessName);
    await saveScreenshots(session.page, 'desktop-after-business-create', { nativePid: session.child.pid });

    console.log('B. Reapertura y persistencia de negocio');
    await closeSession(session);
    session = await launchDesktop();
    windowInfo = getWindowInfo(session.child.pid);

  await waitForUrl(session.page, '/dashboard');
  await verifyNoLogin(session.page);
  await expectText(session.page, businessName);

  logScenario('B. Persistencia de negocio', {
    url: await session.page.evaluate(() => window.location.pathname),
    loginVisible: false,
    businessRestored: true,
    window: windowInfo,
  });

    console.log('B1. Validando UX desktop y modo offline');
    const viewportBeforeResize = await session.page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }));
    resizeWindow(session.child.pid, 1280, 840);
    await session.page.waitForTimeout(1000);
    const viewportAfterResize = await session.page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }));

    await forceDesktopOffline(session.context);
    const navigatorOnline = await session.page.evaluate(() => navigator.onLine);

  logScenario('Desktop UX', {
    initialWindow: windowInfo,
    viewportBeforeResize,
    viewportAfterResize,
    navigatorOnline,
    sidebarVisible: await session.page.locator('.app-sidebar nav button').filter({ hasText: /^Inicio$/i }).first().isVisible(),
    title: windowInfo.title,
  });

    console.log('C. Productos');
    await navigateToModule(session.page, 'Productos', '/products');
    await saveScreenshots(session.page, 'desktop-products-empty-or-list', { nativePid: session.child.pid });
    await createProduct(session.page, productName, { price: 120000, cost: 70000, stock: 8 });
    await editProduct(session.page, productName, productEditedName);
    await createProduct(session.page, productTemporaryName, { price: 50000, cost: 25000, stock: 3 });
    await archiveAndDeleteTemporaryProduct(session.page, productTemporaryName);
    await saveScreenshots(session.page, 'desktop-products-final', { nativePid: session.child.pid });

  logScenario('C. Productos', {
    created: productName,
    editedTo: productEditedName,
    deleted: productTemporaryName,
  });

    console.log('D. Clientes');
    await navigateToModule(session.page, 'Clientes', '/customers');
    await saveScreenshots(session.page, 'desktop-customers-before', { nativePid: session.child.pid });
    await createCustomer(session.page, customerName, {
      phone: '3001234567',
      email: 'cliente.slice1@example.com',
      address: 'Calle 1 # 2-3',
    });
    await editCustomer(session.page, customerName, customerEditedName);
    await createCustomer(session.page, customerTemporaryName, {
      phone: '3000000000',
      email: 'temporal.slice1@example.com',
      address: 'Carrera 4 # 5-6',
    });
    await deleteCustomer(session.page, customerTemporaryName);
    await saveScreenshots(session.page, 'desktop-customers-final', { nativePid: session.child.pid });

  logScenario('D. Clientes', {
    created: customerName,
    editedTo: customerEditedName,
    deleted: customerTemporaryName,
  });

    console.log('E. Ventas');
    await navigateToModule(session.page, 'Ventas', '/sales');
    await createSale(session.page);
    await saveScreenshots(session.page, 'desktop-sales-final', { nativePid: session.child.pid });

  logScenario('E. Ventas', {
    createdWithProduct: productEditedName,
    createdWithCustomer: customerEditedName,
    note: saleNote,
  });

    console.log('F. Dashboard');
    await verifyDashboardState(session.page);
    await saveScreenshots(session.page, 'desktop-dashboard-final', { nativePid: session.child.pid });

  logScenario('F. Dashboard', {
    reflectsBusiness: true,
    reflectsCustomerAndSale: true,
    noPlaceholder: true,
  });

    console.log('G. Persistencia tras reinicio completo');
    await closeSession(session);
    session = await launchDesktop();
    await waitForUrl(session.page, '/dashboard');
    await verifyNoLogin(session.page);

  const productsPersisted = await verifyProductsAfterRestart(session.page);
  const customersPersisted = await verifyCustomersAfterRestart(session.page);
  const salesPersistence = await verifySalesAfterRestart(session.page);
  await verifyDashboardState(session.page);
  const indexedDbSnapshot = await readIndexedDbSnapshot(session.page);
  await fs.writeFile(
    path.join(evidenceDir, 'desktop-indexeddb-persistence.json'),
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      url: await session.page.evaluate(() => window.location.pathname),
      indexedDb: {
        businesses: indexedDbSnapshot.businesses.map((business) => business?.name || business?.id),
        customers: indexedDbSnapshot.customers.map((customer) => customer?.name),
        products: indexedDbSnapshot.products.map((product) => product?.name),
        sales: indexedDbSnapshot.sales.map((sale) => ({
          id: sale?.id,
          customer_name: sale?.customer_name,
          note: sale?.note,
        })),
      },
    }, null, 2),
    'utf8'
  );

  const storageProbe = tryPowerShell(`
$root = Join-Path $env:LOCALAPPDATA 'com.encaja.desktop';
$profile = Join-Path $root 'EBWebView';
[pscustomobject]@{
  root = $root;
  rootExists = Test-Path $root;
  profile = $profile;
  profileExists = Test-Path $profile;
} | ConvertTo-Json -Compress
`);

  logScenario('Persistencia post-restart', {
    productsPersisted,
    customersPersisted,
    salesPersisted: salesPersistence.salePersistedInIndexedDb,
    salesVisibleDesktopRows: salesPersistence.visibleDesktopRows,
    salesVisibleMobileCards: salesPersistence.visibleMobileCards,
    storage: storageProbe ? JSON.parse(storageProbe) : null,
  });

  await saveScreenshots(session.page, 'desktop-post-restart-dashboard', { nativePid: session.child.pid });
    results.bugsCorrected.push({
      severity: 'fixed',
      description: 'Ventas post-restart ahora se valida con confirmacion cruzada de UI real e IndexedDB, sin matcher visual fragil.',
    });
    results.bugsCorrected.push({
      severity: 'fixed',
      description: 'Producto temporal archivado y eliminado en el flujo real del catalogo sin residuo en IndexedDB.',
    });
    results.bugsCorrected.push({
      severity: 'fixed',
      description: 'La corrida desktop offline del slice 1 ya no intenta capturar cuentas de tesoreria durante el snapshot local.',
    });
    await closeSession(session);
    await writeResults();
  } catch (error) {
    results.bugsFound.push({
      severity: 'blocking',
      description: error instanceof Error ? error.message : String(error),
    });
    await writeResults();
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
