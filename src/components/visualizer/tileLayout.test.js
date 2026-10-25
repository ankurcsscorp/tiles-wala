import { buildTileLayout, getProductFinish, getTileDimensions, MM_PER_FOOT } from './tileLayout';

test.each([
  ['2×2 ft', 2, 2], ['2 x 4 feet', 2, 4], ['12×18 inches', 1, 1.5],
  ['24" x 24"', 2, 2], ['600×1200 mm', 600 / MM_PER_FOOT, 1200 / MM_PER_FOOT],
  ['600x1200', 600 / MM_PER_FOOT, 1200 / MM_PER_FOOT], ['60 cm x 1.2 m', 600 / MM_PER_FOOT, 1200 / MM_PER_FOOT],
])('converts %s into scene feet', (size, width, height) => {
  const result = getTileDimensions(size);
  expect(result.width).toBeCloseTo(width);
  expect(result.height).toBeCloseTo(height);
  expect(result.fallback).toBe(false);
});

test.each(['', null, 'unknown', '0 x 0 mm', '0.01 x 1 mm'])('uses a declared fallback for %s', (size) => {
  expect(getTileDimensions(size)).toEqual({ width: 2, height: 4, fallback: true });
});

test('makes joints in millimetres and clips edge UVs without stretching', () => {
  const tiles = buildTileLayout(5, 5, 2, 2, 2, 'straight', 0);
  expect(tiles).toHaveLength(9);
  expect((tiles[1].left - tiles[0].right) * MM_PER_FOOT).toBeCloseTo(2);
  expect(tiles[2].right).toBe(2.5);
  expect(tiles[0].u0).toBeCloseTo(0.25);
  expect(tiles[2].u1).toBeCloseTo(0.75);
  expect(tiles[0].right - tiles[0].left).toBeCloseTo(tiles[2].right - tiles[2].left);
  for (const tile of tiles) {
    expect(tile.left).toBeGreaterThanOrEqual(-2.5);
    expect(tile.top).toBeLessThanOrEqual(2.5);
    expect(tile.u0).toBeGreaterThanOrEqual(0);
    expect(tile.u1).toBeLessThanOrEqual(1);
  }
});

test('changes tile count with physical size, offsets alternate brick rows and rotates rectangular tiles', () => {
  expect(buildTileLayout(8, 8, 2, 2, 2, 'straight', 0)).toHaveLength(16);
  expect(buildTileLayout(8, 8, 2, 4, 2, 'straight', 0)).toHaveLength(8);
  const brick = buildTileLayout(8, 8, 2, 4, 2, 'brick', 0);
  expect(brick).toHaveLength(9);
  expect(brick[4].u0).toBeCloseTo(0.5);
  const rotated = buildTileLayout(8, 8, 2, 4, 2, 'straight', 90);
  expect(rotated[0].right - rotated[0].left).toBeCloseTo(4 - 2 / MM_PER_FOOT);
  expect(rotated[0].rotated).toBe(true);
});

test('keeps satin, matte and polished product finishes distinct', () => {
  expect(getProductFinish({ finish: 'Satin' })).toBe('satin');
  expect(getProductFinish({ finish: 'Matte' })).toBe('matte');
  expect(getProductFinish({ finish: 'Polished' })).toBe('high-gloss');
});

test('keeps balanced edge cuts at least half a tile, including a nearly exact fit', () => {
  for (const width of [4.01, 5, 5.99, 6.1]) {
    const row = buildTileLayout(width, 2, 2, 2, 2, 'straight', 0);
    const first = row[0], last = row[row.length - 1];
    expect(first.right - first.left).toBeGreaterThan(0.99);
    expect(first.right - first.left).toBeCloseTo(last.right - last.left);
    expect((row[1].left - first.right) * MM_PER_FOOT).toBeCloseTo(2);
  }
});
