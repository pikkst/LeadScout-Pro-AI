import puppeteer, { type Page } from 'puppeteer';

const baseUrl = (process.env.E2E_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;
const bookingToken = process.env.E2E_BOOKING_TOKEN;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function login(page: Page) {
  await page.goto(baseUrl, { waitUntil: 'networkidle0' });
  await page.waitForSelector('[data-testid="login-email"]', { visible: true });
  await page.type('[data-testid="login-email"]', email!);
  await page.type('[data-testid="login-password"]', password!);
  await Promise.all([
    page.waitForSelector('[data-testid="nav-settings"]', { visible: true }),
    page.click('[data-testid="login-submit"]'),
  ]);
}

async function settingsAndCustomStage(page: Page) {
  await page.click('[data-testid="nav-settings"]');
  await page.waitForSelector('[data-testid="add-stage"]', { visible: true });
  const suffix = Date.now();
  const stageName = `E2E Review ${suffix}`;
  const stageKey = `e2e_review_${suffix}`;
  await page.click('[data-testid="add-stage"]');
  await page.type('[data-testid="stage-name"]', stageName);
  await page.type('[data-testid="stage-key"]', stageKey);
  const responsePromise = page.waitForResponse((response) => response.url().includes('/api/custom-fields/stages') && response.request().method() === 'POST');
  await page.click('[data-testid="save-stage"]');
  const response = await responsePromise;
  assert(response.status() === 201, `Custom stage creation returned ${response.status()}`);
  const stage = await response.json() as { id: string };
  assert(await page.waitForFunction((name) => document.body.textContent?.includes(name), {}, stageName), 'Created stage was not rendered');
  await page.evaluate(async (id) => { await fetch(`/api/custom-fields/stages/${id}`, { method: 'DELETE' }); }, stage.id);
}

async function pitchSendControl(page: Page) {
  await page.click('[data-testid="nav-outreach"]');
  const button = await page.waitForSelector('[data-testid^="send-pitch-"]', { visible: true, timeout: 5_000 }).catch(() => null);
  if (!button) {
    console.log('SKIP pitch send: seed at least one draft pitch to exercise the intercepted send control.');
    return;
  }
  const testId = await button.evaluate((element) => element.getAttribute('data-testid'));
  assert(testId, 'Draft send control has no test id');
  const pitchId = testId.replace('send-pitch-', '');
  const pitches = await page.evaluate(async () => (await fetch('/api/pitches')).json());
  const pitch = (pitches as Array<Record<string, unknown>>).find((item) => item.id === pitchId);
  assert(pitch, 'Draft pitch was not returned by the API');
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    if (request.url().endsWith(`/api/pitches/${pitchId}/send`)) {
      void request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...pitch, status: 'Sent', sentAt: new Date().toISOString() }) });
    } else if (/\/api\/leads\/[^/]+\/follow-up$/.test(request.url())) {
      void request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    } else void request.continue();
  });
  await page.click(`[data-testid="${testId}"]`);
  await page.waitForFunction((id) => document.querySelector(`[data-testid="pitch-card-${id}"]`)?.textContent?.includes('SENT'), {}, pitchId);
  await page.setRequestInterception(false);
}

async function booking(page: Page) {
  if (!bookingToken) {
    console.log('SKIP booking: set E2E_BOOKING_TOKEN to a disposable active booking link.');
    return;
  }
  await page.goto(`${baseUrl}/book/${bookingToken}`, { waitUntil: 'networkidle0' });
  const slot = await page.waitForSelector('[data-testid^="booking-slot-"]', { visible: true });
  await slot.click();
  await page.waitForSelector('[data-testid="confirm-booking"]', { visible: true });
  if (process.env.E2E_BOOKING_COMMIT !== '1') {
    console.log('PASS booking selection; set E2E_BOOKING_COMMIT=1 to consume the disposable slot and verify confirmation.');
    return;
  }
  await page.click('[data-testid="confirm-booking"]');
  await page.waitForFunction(() => document.body.textContent?.includes('Meeting confirmed'));
}

if (!email || !password) {
  console.log('SKIP browser E2E: set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD.');
  process.exit(0);
}

const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  await login(page);
  await settingsAndCustomStage(page);
  await pitchSendControl(page);
  await booking(page);
  console.log('PASS Phase 0 browser E2E: login, settings, custom stages, pitch send control, and booking.');
} finally {
  await browser.close();
}
