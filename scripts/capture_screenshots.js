#!/usr/bin/env node
/**
 * Screenshot capture script for FNA review pack
 * Captures all major UI states
 */

const puppeteer = require('puppeteer');
const path = require('path');

const BASE_URL = 'https://nutrition.dev-home-mini.me';
const OUTPUT_DIR = path.join(__dirname, '..', 'review_pack', 'SCREENSHOTS');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function captureScreenshots() {
  console.log('Launching browser...');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Set mobile viewport
  await page.setViewport({
    width: 390,
    height: 844,
    deviceScaleFactor: 2
  });

  try {
    // 1. Today Tab (with data from seed)
    console.log('1. Capturing Today tab...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    await delay(1000);
    await page.screenshot({
      path: path.join(OUTPUT_DIR, '01-today-tab.png'),
      fullPage: true
    });
    console.log('   ✓ 01-today-tab.png');

    // 2. Charts Tab
    console.log('2. Capturing Charts tab...');
    await page.click('[data-tab="charts"]');
    await delay(1500); // Wait for chart to render
    await page.screenshot({
      path: path.join(OUTPUT_DIR, '02-charts-tab.png'),
      fullPage: true
    });
    console.log('   ✓ 02-charts-tab.png');

    // 3. History Day Detail
    console.log('3. Capturing History drill-down...');
    const historyDays = await page.$$('.history-day');
    if (historyDays.length > 0) {
      await historyDays[0].click();
      await delay(1000);
      await page.screenshot({
        path: path.join(OUTPUT_DIR, '03-history-detail.png'),
        fullPage: true
      });
      console.log('   ✓ 03-history-detail.png');

      // Go back
      await page.click('.back-btn');
      await delay(500);
    }

    // 4. Summary Tab
    console.log('4. Capturing Summary tab...');
    await page.click('[data-tab="summary"]');
    await delay(500);
    await page.screenshot({
      path: path.join(OUTPUT_DIR, '04-summary-initial.png'),
      fullPage: true
    });
    console.log('   ✓ 04-summary-initial.png');

    // 5. Summary Tab - Generate (this calls AI, may take time)
    console.log('5. Generating AI Summary...');
    try {
      await page.click('.refresh-btn');
      await delay(5000); // Wait for AI response
      await page.screenshot({
        path: path.join(OUTPUT_DIR, '05-summary-generated.png'),
        fullPage: true
      });
      console.log('   ✓ 05-summary-generated.png');
    } catch (e) {
      console.log('   ⚠ Summary generation skipped (button not found or error)');
    }

    // 6. Profile Tab
    console.log('6. Capturing Profile tab...');
    await page.click('[data-tab="profile"]');
    await delay(1000);
    await page.screenshot({
      path: path.join(OUTPUT_DIR, '06-profile-tab.png'),
      fullPage: true
    });
    console.log('   ✓ 06-profile-tab.png');

    // 7. Back to Today - try to capture edit state
    console.log('7. Capturing Edit item state...');
    await page.click('[data-tab="today"]');
    await delay(500);

    const itemRows = await page.$$('.item-row');
    if (itemRows.length > 0) {
      await itemRows[0].click();
      await delay(500);
      await page.screenshot({
        path: path.join(OUTPUT_DIR, '07-edit-item.png'),
        fullPage: true
      });
      console.log('   ✓ 07-edit-item.png');
    } else {
      console.log('   ⚠ No items to edit');
    }

    console.log('\n✅ Screenshots captured successfully!');
    console.log(`   Location: ${OUTPUT_DIR}`);

  } catch (error) {
    console.error('Screenshot error:', error);
  } finally {
    await browser.close();
  }
}

captureScreenshots().catch(console.error);
