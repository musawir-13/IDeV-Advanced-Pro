const { app, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

function buildIco(pngBuffers) {
  // pngBuffers: array of { width, height, buffer }
  const count = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  let currentOffset = headerSize + count * dirEntrySize;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // ICO type (1 = icon)
  header.writeUInt16LE(count, 4); // number of images

  const entries = [];
  for (const item of pngBuffers) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(item.width >= 256 ? 0 : item.width, 0);
    entry.writeUInt8(item.height >= 256 ? 0 : item.height, 1);
    entry.writeUInt8(0, 2); // color palette count (0 for >= 8bpp)
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(item.buffer.length, 8); // image size
    entry.writeUInt32LE(currentOffset, 12); // image offset
    entries.push(entry);
    currentOffset += item.buffer.length;
  }

  return Buffer.concat([header, ...entries, ...pngBuffers.map(p => p.buffer)]);
}

app.whenReady().then(() => {
  console.log('1. Loading master logo (public/logo.png)...');
  const masterPath = path.join(__dirname, '..', 'public', 'logo.png');
  const masterBuf = fs.readFileSync(masterPath);
  const masterImg = nativeImage.createFromBuffer(masterBuf);
  const size = masterImg.getSize();
  const bitmap = Buffer.from(masterImg.toBitmap()); // BGRA 1024x1024

  console.log('2. Transforming "ADVANCED" text to pure white (#FFFFFF)...');
  // ADVANCED text row bounds in 1024x1024:
  // x: 170 to 710
  // y: 742 to 788
  let transformedPixels = 0;
  let clearedHolePixels = 0;

  for (let y = 742; y <= 788; y++) {
    for (let x = 170; x < 710; x++) {
      const idx = (y * size.width + x) * 4;
      const b = bitmap[idx];
      const g = bitmap[idx + 1];
      const r = bitmap[idx + 2];
      const a = bitmap[idx + 3];

      if (a < 10) continue;

      if (r > 140 && g > 140 && b > 140) {
        // Inner counter hole of A or D -> transparent
        bitmap[idx] = 0;
        bitmap[idx + 1] = 0;
        bitmap[idx + 2] = 0;
        bitmap[idx + 3] = 0;
        clearedHolePixels++;
      } else {
        // Letter stroke pixel -> pure white (#FFFFFF), preserving exact antialiased alpha
        bitmap[idx] = 255;
        bitmap[idx + 1] = 255;
        bitmap[idx + 2] = 255;
        // keep bitmap[idx + 3]
        transformedPixels++;
      }
    }
  }

  console.log(`Transformed ${transformedPixels} stroke pixels to pure white (#FFFFFF).`);
  console.log(`Cleared ${clearedHolePixels} inner hole pixels to transparent.`);

  const corrected1024 = nativeImage.createFromBitmap(bitmap, { width: 1024, height: 1024 });
  const png1024 = corrected1024.toPNG();

  // Save 1024x1024 master assets
  const masterTargets = [
    path.join(__dirname, '..', 'public', 'logo.png'),
    path.join(__dirname, '..', 'favicon.png'),
    path.join(__dirname, '..', 'github-release', 'assets', 'logo.png')
  ];
  masterTargets.forEach(t => {
    fs.writeFileSync(t, png1024);
    console.log(`Saved 1024x1024: ${path.relative(path.join(__dirname, '..'), t)} (${png1024.length} bytes)`);
  });

  // Generate 256x256 high-quality downscaled logo
  console.log('3. Generating high-quality 256x256 assets with lanczos filtering...');
  const corrected256 = corrected1024.resize({ width: 256, height: 256, quality: 'best' });
  const png256 = corrected256.toPNG();

  const logo256Targets = [
    path.join(__dirname, '..', 'assets', 'product-logo.png'),
    path.join(__dirname, '..', 'assets', 'logo.png'),
    path.join(__dirname, '..', 'assets', 'icon.png'),
    path.join(__dirname, '..', 'assets', 'product-icon.png'),
    path.join(__dirname, '..', 'public', 'favicon.png'),
    path.join(__dirname, '..', 'github-release', 'assets', 'product-logo.png'),
    path.join(__dirname, '..', 'github-release', 'assets', 'product-icon.png')
  ];
  logo256Targets.forEach(t => {
    fs.writeFileSync(t, png256);
    console.log(`Saved 256x256: ${path.relative(path.join(__dirname, '..'), t)} (${png256.length} bytes)`);
  });

  // Generate multi-frame ICO buffers
  console.log('4. Generating Windows multi-resolution ICO files...');
  const sizes = [256, 128, 64, 48, 32, 16];
  const icoFrames = sizes.map(s => {
    const resized = s === 256 ? corrected256 : corrected1024.resize({ width: s, height: s, quality: 'best' });
    return { width: s, height: s, buffer: resized.toPNG() };
  });

  const icoBuffer = buildIco(icoFrames);
  const icoTargets = [
    path.join(__dirname, '..', 'assets', 'icon.ico'),
    path.join(__dirname, '..', 'assets', 'installerIcon.ico'),
    path.join(__dirname, '..', 'assets', 'uninstallerIcon.ico'),
    path.join(__dirname, '..', 'public', 'app.ico')
  ];
  icoTargets.forEach(t => {
    fs.writeFileSync(t, icoBuffer);
    console.log(`Saved ICO: ${path.relative(path.join(__dirname, '..'), t)} (${icoBuffer.length} bytes)`);
  });

  console.log('All branding assets updated successfully!');
  app.quit();
});
