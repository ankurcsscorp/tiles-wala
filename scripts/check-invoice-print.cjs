/* Browser regression: run `npm run build`, then `node scripts/check-invoice-print.cjs`.
   Uses local build assets and synthetic read-only API responses; no server or login needed.
   Set CHROME_BIN to override the Chrome executable (macOS default below). */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const os = require('node:os');

const build = path.resolve(__dirname, '../build');
assert(fs.existsSync(path.join(build, 'index.html')), 'Run npm run build first');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'tiles-invoice-print-'));
const browser = spawn(process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless', '--disable-gpu', '--no-sandbox', '--remote-debugging-pipe', `--user-data-dir=${path.join(output, 'profile')}`,
], { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] });
let sequence = 0, buffer = '';
const pending = new Map(), listeners = new Map();
const timeout = setTimeout(() => fail(new Error('Invoice print checks timed out')), 55000);
function fail(error) { console.error(error); clearTimeout(timeout); browser.kill(); process.exitCode = 1; }
function send(method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    browser.stdio[3].write(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }) + '\0');
  });
}
browser.on('error', fail);
browser.stdio[4].on('data', chunk => {
  buffer += chunk;
  let index;
  while ((index = buffer.indexOf('\0')) >= 0) {
    const raw = buffer.slice(0, index); buffer = buffer.slice(index + 1);
    if (!raw) continue;
    const message = JSON.parse(raw);
    if (message.id) {
      const request = pending.get(message.id);
      pending.delete(message.id);
      if (request) message.error ? request.reject(message.error) : request.resolve(message.result);
    } else listeners.get(`${message.sessionId}:${message.method}`)?.(message.params);
  }
});

const user = { id: '1', name: 'Print Tester', userType: 'admin' };
const line = { id: '1', product_name: 'Print Test Tile', sku: 'PRINT-TILE', unit_id: '1', unit_name: 'Box', quantity: '2.0000', unit_price: '100.00', discount_amount: '0.00', invoice_discount_amount: '0.00', taxable_value: '200.00', tax_amount: '0.00', line_total: '200.00', tax_rate: '0.0000', product_snapshot: { tileSize: '600 × 1200', hsnCode: '69072100' } };
const base = { id: '123', store_id: '1', status: 'posted', invoice_type: 'NON_GST', invoice_layout: 'SIMPLE_LAYOUT', document_type: 'NON_GST_COMMERCIAL', supplier_document_type: 'NON_GST_COMMERCIAL', invoice_number: 'PRINT-123', invoice_date: '2026-10-28', store_name_snapshot: 'Print Test Store', current_store_name: 'Print Test Store', store_name: 'Print Test Store', store_tax_id_snapshot: '10JNEPD0678B1ZL', customer_name_snapshot: 'Print Customer', supplier_name: 'Print Supplier', supplier_details_snapshot: { name: 'Print Supplier' }, subtotal: '200.00', taxable_total: '200.00', discount_total: '0.00', freight_amount: '0.00', additional_charges: '0.00', round_off: '0.00', tax_total: '0.00', cgst_total: '0.00', sgst_total: '0.00', igst_total: '0.00', total: '200.00', amount_received: '0.00', paid_amount: '0.00', outstanding_balance: '200.00', payment_status: 'unpaid', items: [line], receipts: [], payments: [] };
base.payment_details_snapshot={accountName:'Print Test Store',accountNumber:'001234567890',bankName:'Demo Bank',branch:'Main Branch',ifscCode:'ABCD0123456',upiId:'demo@bank'};
base.terms_snapshot='1. Check goods at delivery.\n2. Keep the original invoice for your records.\n3. Contact the store with any questions.';
const cases = [
  { name: 'sales-simple', route: 'sales', document: base },
  { name: 'purchase-simple', route: 'purchases', document: base },
  ...['sales', 'purchases'].map(route => ({ name: `${route}-gst`, route, document: { ...base, invoice_type: 'GST', invoice_layout: 'STANDARD_GST_LAYOUT', document_type: 'GST_TAX_INVOICE', supplier_document_type: 'GST_TAX_INVOICE', tax_total: '36.00', cgst_total: '18.00', sgst_total: '18.00', total: '236.00', outstanding_balance: '236.00', items: [{ ...line, tax_rate: '18.0000', tax_amount: '36.00', cgst_amount: '18.00', sgst_amount: '18.00', igst_amount: '0.00', line_total: '236.00' }] } })),
  ...['sales', 'purchases'].map(route => ({ name: `${route}-long`, route, long: true, document: { ...base, subtotal: '8000.00', taxable_total: '8000.00', total: '8000.00', outstanding_balance: '8000.00', items: Array.from({ length: 40 }, (_, i) => ({ ...line, id: String(i + 1), product_name: `Print Test Tile ${i + 1}` })) } })),
];

async function serve(sessionId, paused, invoice) {
  const url = new URL(paused.request.url);
  assert.equal(paused.request.method, 'GET', 'Fixture browser must only read data');
  let body, type = 'application/json';
  if (url.pathname.startsWith('/api/tiles/')) {
    const api = url.pathname.replace('/api/tiles', '');
    if (api === '/users/me') body = { user };
    else if (api === '/stores') body = [{ id: '1', name: 'Print Test Store', is_active: true }];
    else if (api === '/sales/123' || api === '/purchases/123') body = invoice;
    else if (api.includes('units') || api.includes('methods')) body = [];
    else body = { items: [] };
    body = JSON.stringify(body);
  } else if (url.pathname.startsWith('/static/')) {
    const asset = path.resolve(build, '.' + url.pathname);
    assert(asset.startsWith(build + path.sep));
    body = fs.readFileSync(asset);
    type = asset.endsWith('.css') ? 'text/css' : asset.endsWith('.js') ? 'text/javascript' : 'application/octet-stream';
  } else if (/^\/(sales|purchases)\/123$/.test(url.pathname)) {
    body = fs.readFileSync(path.join(build, 'index.html')); type = 'text/html';
  } else { body = ''; type = 'text/plain'; }
  await send('Fetch.fulfillRequest', { requestId: paused.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: type }], body: Buffer.from(body).toString('base64') }, sessionId);
}

(async () => {
  for (const sample of cases) {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    listeners.set(`${sessionId}:Fetch.requestPaused`, paused => serve(sessionId, paused, sample.document).catch(fail));
    await send('Page.enable', {}, sessionId);
    await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] }, sessionId);
    await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('tilesWalaAuth',${JSON.stringify(JSON.stringify({ user, token: 'fixture-only' }))});` }, sessionId);
    await send('Page.navigate', { url: `http://tiles-invoice.test/${sample.route}/123` }, sessionId);
    const ready = await send('Runtime.evaluate', { expression: `new Promise((resolve,reject)=>{let tries=0;const timer=setInterval(()=>{if(document.querySelector('.invoice-document')){clearInterval(timer);resolve(true);}else if(++tries>150){clearInterval(timer);reject(document.body.innerText);}},50);})`, awaitPromise: true, returnByValue: true }, sessionId);
    assert(!ready.exceptionDetails, `${sample.name}: invoice did not load`);
    // A trailing anonymous box after a nested named-page sheet used to create a
    // blank second page. Include viewport sizing and generated content as well.
    await send('Runtime.evaluate', { expression: `(()=>{const style=document.createElement('style');style.textContent='@media print { html, body { min-height:100vh; } #root::after { content:""; display:block; height:1px; } }';document.head.appendChild(style);})()` }, sessionId);
    await send('Emulation.setEmulatedMedia', { media: 'print' }, sessionId);
    const details=await send('Runtime.evaluate',{expression:`({bank:!!document.querySelector('.invoice-document-payment-details'),text:document.querySelector('.invoice-document').innerText,top:document.querySelector('.invoice-document').getBoundingClientRect().top})`,returnByValue:true},sessionId);
    assert.equal(details.result.value.top,0,`${sample.name}: invoice must start at the top`);
    assert.equal(details.result.value.bank,sample.route==='sales',`${sample.name}: store receiving details belong on sales only`);
    if(sample.route==='sales')for(const expected of ['001234567890','demo@bank','Check goods at delivery'])assert(details.result.value.text.includes(expected),`${sample.name}: missing saved payment details or terms`);
    // Keep browser headers enabled to exercise their suppression by the zero top margin.
    const pdf = await send('Page.printToPDF', { preferCSSPageSize: true, printBackground: true, displayHeaderFooter: true }, sessionId);
    const data = Buffer.from(pdf.data, 'base64');
    fs.writeFileSync(path.join(output, `${sample.name}.pdf`), data);
    const pages = (data.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length;
    if (sample.long) assert(pages > 1, `${sample.name}: real content must continue onto more pages`);
    else assert.equal(pages, 1, `${sample.name}: extra blank page`);
    console.log(`${sample.name}: ${pages} page(s)`);
    await send('Target.closeTarget', { targetId });
    listeners.delete(`${sessionId}:Fetch.requestPaused`);
  }
  console.log(`PDFs: ${output}`);
  await send('Browser.close'); clearTimeout(timeout);
})().catch(fail);
