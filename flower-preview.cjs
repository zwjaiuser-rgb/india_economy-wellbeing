const { chromium } = require('C:/Users/10679/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(pathToFileURL(path.resolve('india-flower-echarts.html')).href);
  await page.waitForTimeout(500);
  const dataCheck = await page.evaluate(() => ({
    records, normalized, indexed, keys: metrics.map(m => m.key),
    series: chart.getOption().series.map(s => ({ encode: s.encode, type: s.type, area: s.areaStyle, gaps: s.connectNulls, data: s.data })),
    geometry,
    positions: records.map((r, i) => chart.getModel().getSeriesByIndex(2).coordinateSystem.dataToPoint([1, i * 360 / records.length]))
  }));
  const csvLines = fs.readFileSync('印度_年度分析宽表_2011-2025.csv', 'utf8').replace(/^\uFEFF/, '').trim().split(/\r?\n/);
  const headers = csvLines.shift().split(',');
  for (const line of csvLines) {
    const fields = line.split(',');
    const source = Object.fromEntries(headers.map((h, i) => [h, fields[i]]));
    if (Number(source.year) === 2013) continue;
    const row = dataCheck.records.find(r => r.year === Number(source.year));
    assert.ok(row, 'Source year must be plotted');
    dataCheck.keys.forEach((key, i) => assert.equal(row.raw[i], source[key] === '' ? null : Number(source[key]), `${source.year}: ${key}`));
  }
  assert.equal(dataCheck.records.length, 14);
  assert.ok(!dataCheck.records.some(row => row.year === 2013));
  assert.deepEqual(await page.locator('#inspectYear option').allTextContents(), ['2011 年', '2012 年', '2014 年', '2015 年', '2016 年', '2017 年', '2018 年', '2019 年', '2020 年', '2021 年', '2022 年', '2023 年', '2024 年', '2025 年']);
  assert.ok(dataCheck.indexed[0].slice(0, 5).every(value => value === 100), 'Each metric starts at its first available year');
  assert.equal(dataCheck.series.length, 8);
  for (const s of dataCheck.series) {
    assert.equal(s.type, 'line');
    assert.equal(s.encode.radius, 0);
    assert.equal(s.encode.angle, 1);
    assert.equal(s.data.length, 15);
    assert.equal(s.gaps, false);
    assert.ok(s.area.opacity > 0);
  }
  const { center, radius } = dataCheck.geometry;
  dataCheck.positions.forEach((p, i) => {
    const angle = i * 360 / dataCheck.records.length * Math.PI / 180;
    assert.ok(Math.abs(p[0] - center[0] - radius * Math.sin(angle)) < 0.01, 'Equal angular spacing X');
    assert.ok(Math.abs(p[1] - center[1] + radius * Math.cos(angle)) < 0.01, 'Equal angular spacing Y');
  });
  await page.getByLabel('显示幸福度', { exact: true }).uncheck();
  assert.equal(await page.evaluate(() => chart.getOption().legend[0].selected['幸福度']), false);
  await page.getByLabel('显示幸福度', { exact: true }).check();
  await page.locator('#inspectYear').selectOption('2011');
  assert.equal(await page.locator('#metric-value-0').textContent(), '100.0');
  assert.equal(await page.locator('#metric-value-1').textContent(), '100.0');
  assert.ok((await page.locator('#metric-value-1').getAttribute('title')).includes('5,098.675'));
  assert.equal(await page.locator('#metric-value-5').textContent(), '缺失');
  await page.locator('#inspectYear').selectOption('2014');
  assert.equal(await page.locator('#metric-value-5').textContent(), '100.0', 'CPI starts at its first plotted year');
  await page.locator('#inspectYear').selectOption('2025');
  const box = await page.locator('#flowerChart').boundingBox();
  const hover = await page.evaluate(() => chart.getModel().getSeriesByIndex(2).coordinateSystem.dataToPoint([.7, 6 * 360 / records.length]));
  await page.mouse.move(box.x + hover[0], box.y + hover[1]);
  await page.waitForTimeout(300);
  const tooltip = await page.locator('#flowerChart').innerText();
  assert.ok(tooltip.includes('2018 年'), 'Tooltip should report the year at the angular spoke');
  assert.ok(tooltip.includes('CPI 城市') && tooltip.includes('青年失业率'), 'Overlapping series must share a complete tooltip');
  await page.mouse.move(1, 1);
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'india-flower-preview.png', fullPage: true });
  await page.setViewportSize({ width: 320, height: 900 });
  await page.waitForTimeout(350);
  await page.screenshot({ path: 'india-flower-mobile.png', fullPage: true });
  const mobileWidth = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, overflowing: [...document.querySelectorAll('main, header, .composition, #flowerChart, aside, .legend, footer')].map(el => ({ name: el.tagName + '.' + el.className, width: el.getBoundingClientRect().width, right: el.getBoundingClientRect().right })) }));
  const title = await page.title();
  await browser.close();
  assert.ok(mobileWidth.width <= 320, 'Mobile page must not overflow');
  assert.equal(errors.length, 0);
  const unemployment = dataCheck.records.filter(row => [2022, 2023, 2024].includes(row.year)).map(row => row.raw[2]);
  assert.deepEqual(unemployment, [17.732, 15.595, 15.746]);
  console.log(JSON.stringify({ errors, title, years: 14, omittedYear: 2013, metrics: 8, dataMatchesSource: true, unemployment2022to2024: unemployment, geometry: '14 equally spaced angles', legendToggle: 'passed', missingData: 'preserved', groupedTooltip: 'passed', mobile320: 'no horizontal overflow' }));
})().catch(error => { console.error(error); process.exitCode = 1; });
