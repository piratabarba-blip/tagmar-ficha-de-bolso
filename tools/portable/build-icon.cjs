const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.argv[3] || 'playwright');

async function buildIcon(output) {
  const svg = fs.readFileSync(path.join(__dirname, 'd20-tagmar.svg'), 'utf8');
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const header = Buffer.alloc(6 + sizes.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const pngs = [];
  let offset = header.length;
  try {
    const page = await browser.newPage();
    for (const [index, size] of sizes.entries()) {
      await page.setViewportSize({ width: size, height: size });
      await page.setContent('<style>body{margin:0}svg{display:block;width:100vw;height:100vh}</style>' + svg);
      const png = await page.screenshot({ omitBackground: true });
      const entry = 6 + index * 16;
      header[entry] = header[entry + 1] = size === 256 ? 0 : size;
      header.writeUInt16LE(1, entry + 4);
      header.writeUInt16LE(32, entry + 6);
      header.writeUInt32LE(png.length, entry + 8);
      header.writeUInt32LE(offset, entry + 12);
      pngs.push(png);
      offset += png.length;
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(output, Buffer.concat([header, ...pngs]));
}

buildIcon(process.argv[2]).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
