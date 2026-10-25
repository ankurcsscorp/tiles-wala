// Scene units are feet; product dimensions and joints are converted at the boundary.
export const MM_PER_FOOT = 304.8;
export const FALLBACK_TILE = { width: 2, height: 4, fallback: true };

export function getTileDimensions(size) {
  const tokens = [...String(size ?? '').matchAll(/(\d+(?:\.\d+)?)\s*(mm|cm|m|ft|feet|foot|inches|inch|in|[′'″"])?/gi)];
  if (tokens.length !== 2) return { ...FALLBACK_TILE };
  const defaultUnit = tokens.find((token) => token[2])?.[2]?.toLowerCase() || 'mm';
  const convert = ([, value, unit = defaultUnit]) => {
    const factors = { mm: 1 / MM_PER_FOOT, cm: 1 / 30.48, m: 1 / 0.3048, in: 1 / 12, inch: 1 / 12, inches: 1 / 12, '"': 1 / 12, '″': 1 / 12 };
    return Number(value) * (factors[unit.toLowerCase()] ?? 1);
  };
  const [width, height] = tokens.map(convert);
  // Reject malformed data instead of allocating millions of tiny tiles.
  if (![width, height].every((value) => Number.isFinite(value) && value >= 0.2 && value <= 16)) return { ...FALLBACK_TILE };
  return { width, height, fallback: false };
}

export const FINISHES = {
  glossy: { label: 'Glossy', roughness: 0.23, clearcoat: 0.65, clearcoatRoughness: 0.18 },
  'high-gloss': { label: 'High Gloss', roughness: 0.12, clearcoat: 0.9, clearcoatRoughness: 0.1 },
  matte: { label: 'Matte', roughness: 0.82, clearcoat: 0, clearcoatRoughness: 0.6 },
  satin: { label: 'Satin', roughness: 0.46, clearcoat: 0.2, clearcoatRoughness: 0.35 },
};
export function getProductFinish(tile) {
  const description = `${tile?.finish ?? ''} ${tile?.description ?? ''}`;
  if (/high[ -]?gloss|polished/i.test(description)) return 'high-gloss';
  if (/matte|matt\b/i.test(description)) return 'matte';
  if (/satin/i.test(description)) return 'satin';
  return 'glossy';
}

// Balance perimeter cuts so opposite edges match and avoid narrow sliver tiles.
function gridStart(span, tileSize) {
  const count = Math.ceil(span / tileSize - 1e-9);
  if (count <= 1) return -tileSize / 2;
  if (Math.abs(span - count * tileSize) < 1e-8) return -span / 2;
  const edgeSize = (span - (count - 2) * tileSize) / 2;
  return -span / 2 - (tileSize - edgeSize);
}

// Clip perimeter tiles, retaining the original UVs so cuts never stretch an image.
export function buildTileLayout(width, height, tileWidth, tileHeight, jointMm, pattern, rotation) {
  const rotated = (rotation === 90) !== (pattern === 'horizontal');
  const w = rotated ? tileHeight : tileWidth;
  const h = rotated ? tileWidth : tileHeight;
  const gap = jointMm / MM_PER_FOOT;
  const tiles = [];
  const startX = gridStart(width, w);
  const startY = gridStart(height, h);
  for (let row = 0, y = startY; y < height / 2; row++, y += h) {
    const offset = pattern === 'brick' && row % 2 ? -w / 2 : 0;
    for (let x = startX + offset; x < width / 2; x += w) {
      const left = Math.max(-width / 2, x + gap / 2);
      const right = Math.min(width / 2, x + w - gap / 2);
      const bottom = Math.max(-height / 2, y + gap / 2);
      const top = Math.min(height / 2, y + h - gap / 2);
      if (right - left < 1e-8 || top - bottom < 1e-8) continue;
      tiles.push({ left, right, bottom, top, u0: (left - x) / w, u1: (right - x) / w, v0: (bottom - y) / h, v1: (top - y) / h, rotated });
    }
  }
  return tiles;
}
