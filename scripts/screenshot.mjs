// One-shot screenshot script using Puppeteer.
// Run: node scripts/screenshot.mjs
// Saves screenshots to: screenshots/

import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dir, '..', process.env.OUT_DIR || 'docs/verification');
mkdirSync(outDir, { recursive: true });

const BASE = process.env.TARGET_URL || 'http://localhost:5173';

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet',  width: 768,  height: 1024 },
  { name: 'mobile',  width: 390,  height: 844 },
];

const PAGES = [
  { route: '/',           nav: null,       slug: 'dashboard' },
  { route: '/',           nav: 'income',   slug: 'income' },
  { route: '/',           nav: 'expenses', slug: 'expenses' },
  { route: '/',           nav: 'tax',      slug: 'tax-estimate' },
  { route: '/',           nav: 'settings', slug: 'settings' },
];

async function clickNav(page, navId) {
  // Nav buttons are keyed by data-nav or aria-label; they may be role=button.
  // Find the li/button containing the label text.
  const navLabels = { income: 'Income', expenses: 'Expenses', tax: 'Tax estimate', settings: 'Settings' };
  const label = navLabels[navId];
  if (!label) return;
  await page.evaluate((lbl) => {
    const btns = [...document.querySelectorAll('button, [role="button"]')];
    const btn = btns.find(b => b.textContent.trim().includes(lbl));
    if (btn) btn.click();
  }, label);
  await new Promise(r => setTimeout(r, 400));
}

async function seedDemoData(page) {
  // Click Settings → Load demo data (if available and not already loaded).
  await clickNav(page, 'settings');
  await new Promise(r => setTimeout(r, 300));
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const btn = btns.find(b => b.textContent.includes('Load demo data'));
    if (btn && !btn.disabled) btn.click();
  });
  await new Promise(r => setTimeout(r, 800));
}

async function run() {
  const browser = await puppeteer.launch({ headless: 'new' });

  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 2 });

    // Seed demo data once per viewport at dashboard.
    await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise(r => setTimeout(r, 500));
    await seedDemoData(page);

    for (const pg of PAGES) {
      await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 10000 });
      await new Promise(r => setTimeout(r, 300));
      if (pg.nav) await clickNav(page, pg.nav);
      await new Promise(r => setTimeout(r, 400));

      const filename = join(outDir, `${vp.name}-${pg.slug}.png`);
      await page.screenshot({ path: filename, fullPage: true });
      console.log('Saved:', filename);
    }

    await page.close();
  }

  await browser.close();
  console.log('\nAll screenshots complete.');
}

run().catch(e => { console.error(e); process.exit(1); });
