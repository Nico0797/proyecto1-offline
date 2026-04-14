import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, execFileSync } from 'node:child_process';
import process from 'node:process';
import { chromium } from 'playwright-core';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const evidenceDir = path.join(rootDir, 'offline-evidence', 'mobile-module-review');
const exePath = path.join(rootDir, 'src-tauri', 'target', 'release', 'encaja_desktop.exe');
const localAppData = process.env.LOCALAPPDATA || '';
const localDataRoot = path.join(localAppData, 'com.encaja.desktop');
const remoteDebugPort = 9223;
const remoteDebugUrl = `http://127.0.0.1:${remoteDebugPort}`;
const businessName = 'Negocio Mobile QA';

const modules = [
  { key: 'inicio', path: '/dashboard', expected: /Inicio|A.tenci.n primero|A.u?n no tienes un negocio/i },
  { key: 'ventas', path: '/sales', expected: /Ventas|Registrar venta|Vender/i },
  { key: 'productos', path: '/products', expected: /Productos|Nuevo|Crear/i },
  { key: 'clientes', path: '/customers', expected: /Clientes|Nuevo cliente|Crear cliente/i },
  { key: 'compras', path: '/raw-purchases', expected: /Compras|Nueva compra|Registrar compra/i },
  { key: 'bodega', path: '/raw-inventory', expected: /Bodega|Materia|Insumo|Inventario/i },
  { key: 'recetas', path: '/recipes', expected: /Recetas|Nueva receta|Crear receta/i },
  { key: 'cobros', path: '/payments', expected: /Cobros|saldos|Registrar pago|Clientes/i },
  { key: 'tesoreria', path: '/treasury', expected: /Tesorer.a|Caja|bancos|Nueva cuenta|Registrar/i },
  { key: 'reportes', path: '/reports', expected: /Reportes|Descarga|analisis|An.lisis/i },
  { key: 'facturas', path: '/invoices', expected: /Facturas|Nueva factura|factura/i },
  { key: 'pedidos', path: '/orders', expected: /Pedidos|Nuevo pedido|Crear pedido/i },
  { key: 'gastos', path: '/expenses', expected: /Gastos|Nuevo gasto|Registrar gasto/i },
  { key: 'metas', path: '/sales-goals', expected: /Metas|objetivo|Nueva meta/i },
  { key: 'configuracion', path: '/settings', expected: /Configuraci.n|Negocio|Plantillas/i },
];

const results = {
  generatedAt: new Date().toISOString(),
  window: null,
  screenshots: {},
  modules: [],
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
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

function sanitizePowerShellLiteral(value) {
  return String(value).replace(/'/g, "''");
}

function taskKill(args) {
  try {
    execFileSync('taskkill', args, { stdio: 'ignore' });
  } catch {
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
  if (!localDataRoot) return;
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
  }
  await killDesktopProcess(session.child?.pid);
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
[void][Win32DesktopMove]::MoveWindow($process.MainWindowHandle, 120, 40, ${width}, ${height}, $true);
`);
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

async function waitForUrl(page, expectedPath) {
  await page.waitForFunction(
    (pathName) => window.location.pathname === pathName,
    expectedPath,
    { timeout: 30000 }
  );
}

async function clickButton(page, name) {
  const button = page.getByRole('button', { name }).first();
  await button.waitFor({ state: 'visible', timeout: 20000 });
  await button.click({ force: true });
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

async function runBusinessWizard(page) {
  await clickButton(page, 'Crear negocio');
  await page.getByText('Configura tu negocio', { exact: false }).first().waitFor({ state: 'visible', timeout: 30000 });
  await fillControlByLabel(page, /Nombre del negocio/i, businessName);

  for (let step = 0; step < 20; step += 1) {
    const enterButton = page.getByRole('button', { name: /Entrar a mi negocio/i }).first();
    if (await enterButton.isVisible().catch(() => false)) {
      await enterButton.click({ force: true });
      await waitForUrl(page, '/dashboard');
      return;
    }

    const continueButton = page.getByRole('button', { name: /^Continuar$/i }).first();
    if (!(await continueButton.isVisible().catch(() => false))) {
      await page.waitForTimeout(200);
      continue;
    }

    if (await continueButton.isDisabled()) {
      const optionCard = page.locator('button').filter({ hasText: /Disponible|Elegido/i }).first();
      await optionCard.waitFor({ state: 'visible', timeout: 10000 });
      await optionCard.click({ force: true });
      await page.waitForTimeout(200);
    }

    await continueButton.click({ force: true });
    await page.waitForTimeout(250);
  }

  throw new Error('No fue posible completar el onboarding local del negocio.');
}

async function ensureBusiness(page) {
  const noBusinessVisible = await page.getByText(/A.u?n no tienes un negocio|Aun no tienes un negocio/i, { exact: false }).first().isVisible().catch(() => false);
  if (noBusinessVisible) {
    await runBusinessWizard(page);
    await page.getByText(businessName, { exact: false }).first().waitFor({ state: 'visible', timeout: 30000 });
  }
}

async function navigateToPath(page, targetPath) {
  const current = new URL(page.url());
  await page.goto(`${current.origin}${targetPath}`);
  await waitForUrl(page, targetPath);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1400);
}

async function saveScreenshot(page, name) {
  const filePath = path.join(evidenceDir, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  results.screenshots[name] = filePath;
}

async function inspectModule(page, module) {
  await navigateToPath(page, module.path);
  await page.getByText(module.expected, { exact: false }).first().waitFor({ state: 'visible', timeout: 30000 });

  const facts = await page.evaluate(() => {
    const bodyText = document.body.innerText || '';
    const buttonTexts = Array.from(document.querySelectorAll('button'))
      .map((button) => (button.textContent || '').trim())
      .filter(Boolean)
      .slice(0, 18);
    const appSurfaces = document.querySelectorAll('.app-surface, .app-section-card, .app-summary-shell, .app-toolbar').length;
    const utilityButtons = document.querySelectorAll('.app-mobile-utility-bar button').length;
    const header = document.querySelector('.app-page-header');
    return {
      title: document.querySelector('h1')?.textContent?.trim() || null,
      headerText: header?.textContent?.trim() || null,
      buttonTexts,
      appSurfaces,
      utilityButtons,
      hasMoreButton: /M[aá]s/i.test(bodyText),
      hasFilterButton: /Filtros/i.test(bodyText),
      hasDesktopWording: /dashboard|sidebar|panel/i.test(bodyText),
      bodyTextSnippet: bodyText.slice(0, 500),
    };
  });

  await saveScreenshot(page, `mobile-${module.key}`);
  results.modules.push({
    key: module.key,
    path: module.path,
    ...facts,
  });
}

async function writeResults() {
  await fs.writeFile(path.join(evidenceDir, 'mobile-module-review.json'), JSON.stringify(results, null, 2), 'utf8');
}

async function main() {
  if (!localAppData) {
    throw new Error('LOCALAPPDATA no esta disponible en el entorno actual.');
  }

  await ensureDir(evidenceDir);
  await killDesktopProcess(null);
  await clearLocalData();

  let session;
  try {
    session = await launchDesktop();
    resizeWindow(session.child.pid, 430, 932);
    await session.page.waitForTimeout(1200);
    results.window = getWindowInfo(session.child.pid);

    await waitForUrl(session.page, '/dashboard');
    await ensureBusiness(session.page);

    for (const module of modules) {
      await inspectModule(session.page, module);
    }

    await writeResults();
  } finally {
    await closeSession(session);
  }
}

main().catch(async (error) => {
  console.error(error);
  try {
    await writeResults();
  } catch {
  }
  process.exitCode = 1;
});
