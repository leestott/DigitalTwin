// Screenshot script using Playwright
const { chromium } = require('@playwright/test');

async function takeScreenshot() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ 
    headless: true,
    channel: 'msedge' // Use installed Edge
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Wait for canvas to render
    console.log('Waiting for 3D scene to render...');
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForTimeout(3000); // Extra time for Three.js to render
    
    // Take screenshot
    const screenshotPath = '../docs/screenshot.png';
    await page.screenshot({ 
      path: screenshotPath,
      fullPage: false 
    });
    
    console.log(`Screenshot saved to ${screenshotPath}`);
    
  } finally {
    await browser.close();
  }
}

takeScreenshot().catch(console.error);
