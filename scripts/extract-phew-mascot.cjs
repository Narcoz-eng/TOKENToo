const path = require("path");
const sharp = require("sharp");

async function main() {
  const src = path.join("frontend", "public", "banner.png");
  const out = path.join("frontend", "public", "brand", "phew-mascot.png");
  const crop = { left: 900, top: 20, width: 930, height: 750 };
  const { data, info } = await sharp(src)
    .extract(crop)
    .resize({ width: 520, withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let minX = info.width;
  let minY = info.height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const index = (y * info.width + x) * info.channels;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const limeBackground = g > 145 && r > 80 && b < 110 && g > r * 1.1 && g > b * 1.65;
      const greenShadow = g > 70 && r < 82 && b < 78 && g > r * 1.2;
      const edgeSpeckle = (x < info.width * 0.08 || x > info.width * 0.9 || y < info.height * 0.08 || y > info.height * 0.9) && g > 90 && r > 45 && b < 120;

      if (limeBackground || greenShadow || edgeSpeckle) {
        data[index + 3] = 0;
      } else if (data[index + 3] > 0) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  keepLargestOpaqueComponent(data, info);
  minX = info.width;
  minY = info.height;
  maxX = 0;
  maxY = 0;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const index = (y * info.width + x) * info.channels;
      if (data[index + 3] > 0) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  const pad = 8;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(info.width - 1, maxX + pad);
  maxY = Math.min(info.height - 1, maxY + pad);

  await sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .extract({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 })
    .png()
    .toFile(out);

  const meta = await sharp(out).metadata();
  console.log(`saved ${out} ${meta.width}x${meta.height}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

function keepLargestOpaqueComponent(data, info) {
  const total = info.width * info.height;
  const seen = new Uint8Array(total);
  const keep = new Uint8Array(total);
  const queue = new Int32Array(total);
  let best = [];

  for (let start = 0; start < total; start += 1) {
    if (seen[start] || data[start * info.channels + 3] === 0) continue;
    let head = 0;
    let tail = 0;
    const component = [];
    seen[start] = 1;
    queue[tail++] = start;

    while (head < tail) {
      const current = queue[head++];
      component.push(current);
      const x = current % info.width;
      const y = Math.floor(current / info.width);
      const neighbors = [
        x > 0 ? current - 1 : -1,
        x < info.width - 1 ? current + 1 : -1,
        y > 0 ? current - info.width : -1,
        y < info.height - 1 ? current + info.width : -1
      ];

      for (const next of neighbors) {
        if (next < 0 || seen[next] || data[next * info.channels + 3] === 0) continue;
        seen[next] = 1;
        queue[tail++] = next;
      }
    }

    if (component.length > best.length) best = component;
  }

  for (const pixel of best) keep[pixel] = 1;
  for (let pixel = 0; pixel < total; pixel += 1) {
    if (!keep[pixel]) data[pixel * info.channels + 3] = 0;
  }
}
