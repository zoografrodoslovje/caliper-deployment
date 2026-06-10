import { chromium, Browser, Page, BrowserContext } from 'playwright';

export class CaliperAutomation {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  async init() {
    this.browser = await chromium.launch({
      headless: true,
    });
    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    this.page = await this.context.newPage();
  }

  async navigateToDashboard() {
    await this.page?.goto('http://localhost:3000');
  }

  async switchTab(tabName: string) {
    const tabs = [
      'scraper', 'leads', 'finder', 'validate',
      'campaigns', 'charts', 'import', 'scoring', 'duplicates', 'tools'
    ];
    const tabIndex = tabs.indexOf(tabName);
    if (tabIndex >= 0) {
      await this.page?.locator('.tabs-list button').nth(tabIndex).click();
    }
  }

  async waitForTableLoad() {
    await this.page?.waitForSelector('table', { state: 'attached', timeout: 5000 });
  }

  async getTableHeaders() {
    const headers = await this.page?.$$eval('table thead th', ths =>
      ths.map(th => th.textContent?.trim())
    );
    return headers;
  }

  async getTableRowCount() {
    const rows = await this.page?.$$eval('table tbody tr', trs => trs.length);
    return rows;
  }

  async takeScreenshot(path: string) {
    await this.page?.screenshot({ path });
  }

  async close() {
    await this.page?.close();
    await this.context?.close();
    await this.browser?.close();
  }
}
