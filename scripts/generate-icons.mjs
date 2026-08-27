import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const iconsDir = join(rootDir, 'public', 'icons');
mkdirSync(iconsDir, { recursive: true });

const COLORS = {
  bgTop: [29, 78, 216],
  bgBottom: [37, 99, 235],
  white: [255, 255, 255],
  whiteSoft: [219, 234, 254],
  accent: [96, 165, 250],
};

for (const size of [16, 48, 128]) {
  const canvas = createCanvas(size, size);
  drawIcon(canvas, size);
  writeFileSync(join(iconsDir, `icon${size}.png`), canvas.toPng());
}

function createCanvas(width, height) {
  const pixels = new Uint8Array(width * height * 4);

  return {
    width,
    height,
    setPixel(x, y, [r, g, b, a = 255]) {
      if (x < 0 || y < 0 || x >= width || y >= height) {
        return;
      }
      const index = (y * width + x) * 4;
      const alpha = a / 255;
      pixels[index] = Math.round(r * alpha + pixels[index] * (1 - alpha));
      pixels[index + 1] = Math.round(g * alpha + pixels[index + 1] * (1 - alpha));
      pixels[index + 2] = Math.round(b * alpha + pixels[index + 2] * (1 - alpha));
      pixels[index + 3] = Math.max(pixels[index + 3], a);
    },
    fillRect(x, y, w, h, color) {
      for (let py = y; py < y + h; py += 1) {
        for (let px = x; px < x + w; px += 1) {
          this.setPixel(px, py, color);
        }
      }
    },
    fillCircle(cx, cy, radius, color) {
      for (let y = cy - radius; y <= cy + radius; y += 1) {
        for (let x = cx - radius; x <= cx + radius; x += 1) {
          const dx = x - cx;
          const dy = y - cy;
          if (dx * dx + dy * dy <= radius * radius) {
            this.setPixel(x, y, color);
          }
        }
      }
    },
    toPng() {
      const rows = [];
      for (let y = 0; y < height; y += 1) {
        const row = Buffer.alloc(1 + width * 3);
        row[0] = 0;
        for (let x = 0; x < width; x += 1) {
          const index = (y * width + x) * 4;
          const offset = 1 + x * 3;
          row[offset] = pixels[index];
          row[offset + 1] = pixels[index + 1];
          row[offset + 2] = pixels[index + 2];
        }
        rows.push(row);
      }

      const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
      const ihdr = createChunk('IHDR', encodeIHDR(width, height));
      const idat = createChunk('IDAT', deflateSync(Buffer.concat(rows)));
      const iend = createChunk('IEND', Buffer.alloc(0));
      return Buffer.concat([signature, ihdr, idat, iend]);
    },
  };
}

function drawIcon(canvas, size) {
  drawBackground(canvas, size);

  const unit = size / 16;
  const doc = {
    x: Math.round(1.5 * unit),
    y: Math.round(3 * unit),
    w: Math.round(4.5 * unit),
    h: Math.round(6 * unit),
    radius: Math.max(1, Math.round(0.8 * unit)),
  };
  const field = {
    x: Math.round(10 * unit),
    y: Math.round(4.5 * unit),
    w: Math.round(4.5 * unit),
    h: Math.round(3.5 * unit),
    radius: Math.max(1, Math.round(0.7 * unit)),
  };

  drawDocument(canvas, doc);
  drawArrow(canvas, size);
  drawFormField(canvas, field, unit);
}

function drawBackground(canvas, size) {
  for (let y = 0; y < size; y += 1) {
    const t = y / Math.max(size - 1, 1);
    const color = mix(COLORS.bgTop, COLORS.bgBottom, t);
    for (let x = 0; x < size; x += 1) {
      const cornerRadius = size * 0.18;
      if (!isInsideRoundedRect(x, y, size, size, cornerRadius)) {
        continue;
      }
      canvas.setPixel(x, y, color);
    }
  }
}

function drawDocument(canvas, rect) {
  fillRoundedRect(canvas, rect.x, rect.y, rect.w, rect.h, rect.radius, COLORS.white);

  const lineHeight = Math.max(1, Math.round(rect.h * 0.12));
  const lineGap = Math.max(1, Math.round(rect.h * 0.1));
  const lineX = rect.x + Math.round(rect.w * 0.18);
  const lineW = Math.round(rect.w * 0.64);
  let lineY = rect.y + Math.round(rect.h * 0.22);

  for (let i = 0; i < 3; i += 1) {
    const width = i === 2 ? Math.round(lineW * 0.65) : lineW;
    canvas.fillRect(lineX, lineY, width, lineHeight, COLORS.accent);
    lineY += lineHeight + lineGap;
  }

  const fold = Math.max(1, Math.round(rect.w * 0.22));
  for (let i = 0; i < fold; i += 1) {
    canvas.setPixel(rect.x + rect.w - fold + i, rect.y + i, COLORS.whiteSoft);
    for (let j = 0; j <= i; j += 1) {
      canvas.setPixel(rect.x + rect.w - fold + i, rect.y + j, COLORS.whiteSoft);
    }
  }
}

function drawFormField(canvas, rect, unit) {
  fillRoundedRect(canvas, rect.x, rect.y, rect.w, rect.h, rect.radius, COLORS.white);

  const inputY = rect.y + Math.round(rect.h * 0.42);
  const inputH = Math.max(1, Math.round(rect.h * 0.22));
  fillRoundedRect(
    canvas,
    rect.x + Math.round(rect.w * 0.14),
    inputY,
    Math.round(rect.w * 0.72),
    inputH,
    Math.max(1, Math.round(inputH * 0.35)),
    COLORS.whiteSoft,
  );

  const checkSize = Math.max(1, Math.round(unit * 0.9));
  const checkX = rect.x + Math.round(rect.w * 0.16);
  const checkY = rect.y + Math.round(rect.h * 0.18);
  fillRoundedRect(canvas, checkX, checkY, checkSize, checkSize, 1, COLORS.accent);

  const labelX = checkX + checkSize + Math.max(1, Math.round(unit * 0.35));
  canvas.fillRect(labelX, checkY + Math.floor(checkSize / 3), Math.round(rect.w * 0.42), Math.max(1, Math.round(unit * 0.35)), COLORS.accent);
}

function drawArrow(canvas, size) {
  const unit = size / 16;
  const centerY = Math.round(size / 2);
  const startX = Math.round(6.2 * unit);
  const endX = Math.round(10.2 * unit);
  const thickness = Math.max(1, Math.round(0.9 * unit));
  const head = Math.max(2, Math.round(1.8 * unit));

  for (let x = startX; x <= endX - head; x += 1) {
    for (let dy = -Math.floor(thickness / 2); dy <= Math.ceil(thickness / 2); dy += 1) {
      canvas.setPixel(x, centerY + dy, COLORS.white);
    }
  }

  for (let i = 0; i < head; i += 1) {
    const rowWidth = head - i;
    for (let dy = -rowWidth; dy <= rowWidth; dy += 1) {
      canvas.setPixel(endX - i, centerY + dy, COLORS.white);
    }
  }

  canvas.fillCircle(Math.round(7.2 * unit), centerY, Math.max(1, Math.round(0.55 * unit)), COLORS.whiteSoft);
  canvas.fillCircle(Math.round(9.1 * unit), centerY, Math.max(1, Math.round(0.45 * unit)), COLORS.accent);
}

function fillRoundedRect(canvas, x, y, width, height, radius, color) {
  for (let py = y; py < y + height; py += 1) {
    for (let px = x; px < x + width; px += 1) {
      if (isInsideRoundedRect(px, py, width, height, radius, x, y)) {
        canvas.setPixel(px, py, color);
      }
    }
  }
}

function isInsideRoundedRect(x, y, width, height, radius, offsetX = 0, offsetY = 0) {
  const left = offsetX;
  const top = offsetY;
  const right = offsetX + width - 1;
  const bottom = offsetY + height - 1;

  if (x < left || y < top || x > right || y > bottom) {
    return false;
  }

  const corners = [
    [left + radius, top + radius, left, top],
    [right - radius, top + radius, right, top],
    [left + radius, bottom - radius, left, bottom],
    [right - radius, bottom - radius, right, bottom],
  ];

  for (const [cx, cy, cornerX, cornerY] of corners) {
    const inCornerZone =
      (cornerX === left && x < left + radius && y < top + radius) ||
      (cornerX === right && x > right - radius && y < top + radius) ||
      (cornerX === left && x < left + radius && y > bottom - radius) ||
      (cornerX === right && x > right - radius && y > bottom - radius);

    if (inCornerZone) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy > radius * radius) {
        return false;
      }
    }
  }

  return true;
}

function mix(from, to, t) {
  return [
    Math.round(from[0] + (to[0] - from[0]) * t),
    Math.round(from[1] + (to[1] - from[1]) * t),
    Math.round(from[2] + (to[2] - from[2]) * t),
  ];
}

function encodeIHDR(width, height) {
  const buffer = Buffer.alloc(13);
  buffer.writeUInt32BE(width, 0);
  buffer.writeUInt32BE(height, 4);
  buffer[8] = 8;
  buffer[9] = 2;
  buffer[10] = 0;
  buffer[11] = 0;
  buffer[12] = 0;
  return buffer;
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, 'ascii');
  const crc = crc32(Buffer.concat([typeBuffer, data]));
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc >>> 0, 0);
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
