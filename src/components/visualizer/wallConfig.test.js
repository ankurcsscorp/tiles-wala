import { ROOM_TEMPLATES, getCameraView } from './sceneConfig';
import { buildWallGrid, clipWallLayout, getKitchenLayout, getWallCameraView, getWallRotation } from './wallConfig';
import { buildTileLayout, getTileDimensions, MM_PER_FOOT } from './tileLayout';

test.each(['600x1200 mm', '1200x600 mm'])('installs %s with a vertical or horizontal long edge and real joints', (size) => {
  const dimensions = getTileDimensions(size);
  for (const orientation of ['vertical', 'horizontal']) {
    const rotation = getWallRotation(dimensions, orientation);
    const tiles = buildWallGrid(18, 10, dimensions.width, dimensions.height, 2, 'straight', rotation);
    const full = tiles.find(t => t.u0 < 0.01 && t.u1 > 0.99 && t.v0 < 0.01 && t.v1 > 0.99);
    const width = (full.right - full.left) * MM_PER_FOOT;
    const height = (full.top - full.bottom) * MM_PER_FOOT;
    expect(width).toBeCloseTo(orientation === 'vertical' ? 600 : 1200);
    expect(height).toBeCloseTo(orientation === 'vertical' ? 1200 : 600);
  }
});

test('wall orientation does not mutate the product or alter the floor grid', () => {
  const dimensions = Object.freeze(getTileDimensions('600x1200'));
  const floorBefore = buildTileLayout(12, 12, dimensions.width, dimensions.height, 2, 'straight', 0);
  getWallRotation(dimensions, 'horizontal');
  expect(buildTileLayout(12, 12, dimensions.width, dimensions.height, 2, 'straight', 0)).toEqual(floorBefore);
});

test('backsplash starts at the slab top and ends exactly below the upper cabinets', () => {
  const kitchen = getKitchenLayout(ROOM_TEMPLATES.kitchen);
  expect(kitchen.backsplash.bottom).toBe(kitchen.slabTop);
  expect(kitchen.backsplash.bottom + kitchen.backsplash.height).toBe(kitchen.upperBottom);
  expect(kitchen.backsplash.width).toBe(kitchen.counterWidth);
  expect(kitchen.slabThickness * 304.8).toBeCloseTo(39.624);
  expect(kitchen.counterWidth).toBeLessThan(ROOM_TEMPLATES.kitchen.width);
});

test.each(Object.keys(ROOM_TEMPLATES))('wall cameras stay inside %s, face the wall and keep the floor camera intact', (key) => {
  const room = ROOM_TEMPLATES[key];
  const floor = getCameraView(room, 'close');
  for (const preset of ['front', 'left', 'right', 'backsplash', 'wall-close', 'inspect', 'balanced', 'room']) {
    for (const aspect of [0.46, 1.5, 2]) {
      const { position: [x, y, z], fov } = getWallCameraView(room, preset, aspect);
      expect(Math.abs(x)).toBeLessThan(room.width / 2 - 0.39);
      expect(Math.abs(z)).toBeLessThan(room.depth / 2 - 0.39);
      expect(y).toBeGreaterThan(3.4);
      expect(y).toBeLessThan(room.height - 0.3);
      expect(fov).toBeLessThanOrEqual(55);
    }
  }
  expect(getCameraView(room, 'close')).toEqual(floor);
  const front = getWallCameraView(room, 'front');
  expect(front.target[2]).toBeCloseTo(-room.depth / 2 + 0.02);
  expect(front.target[1]).toBeGreaterThan(4);
  // At the primary wall, its projected height fills roughly 80–95% of the view.
  const distance = front.position[2] - front.target[2];
  const visibleHeight = 2 * distance * Math.tan(front.fov * Math.PI / 360);
  expect(room.height / visibleHeight).toBeGreaterThan(0.8);
});


test('clipped wall sections keep UVs and face variants aligned on a shared installation grid', () => {
  const grid = buildTileLayout(10, 8, 2, 4, 2, 'straight', 0);
  const left = clipWallLayout(grid, { width: 5, height: 8, centerX: -2.5 });
  const right = clipWallLayout(grid, { width: 5, height: 8, centerX: 2.5 });
  const l = left.find(tile => Math.abs(tile.right - 2.5) < 1e-8);
  const r = right.find(tile => tile.faceIndex === l.faceIndex);
  expect(l.u1).toBeCloseTo(r.u0);
  expect(l.v0).toBeCloseTo(r.v0);
  expect(l.v1).toBeCloseTo(r.v1);
  expect(l.faceIndex).toBe(r.faceIndex);
  for (const tile of left) {
    expect(tile.left).toBeGreaterThanOrEqual(-2.5);
    expect(tile.right).toBeLessThanOrEqual(2.5);
    expect(tile.top).toBeLessThanOrEqual(4);
  }
});


test('a complete wall tile uses its entire image and keeps the specified ceramic face and joint dimensions', () => {
  const dimensions = getTileDimensions('600x1200');
  const grid = buildWallGrid(18, 10, dimensions.width, dimensions.height, 2, 'straight', 0);
  const index = grid.findIndex(t => t.u0 < 1e-8 && t.u1 > 1 - 1e-8 && t.v0 < 1e-8 && t.v1 > 1 - 1e-8);
  const tile = grid[index], next = grid[index + 1];
  expect((tile.right - tile.left) * MM_PER_FOOT).toBeCloseTo(600);
  expect((tile.top - tile.bottom) * MM_PER_FOOT).toBeCloseTo(1200);
  expect((next.left - tile.right) * MM_PER_FOOT).toBeCloseTo(2);
  expect(tile.u0).toBeCloseTo(0);
  expect(tile.u1).toBeCloseTo(1);
});
