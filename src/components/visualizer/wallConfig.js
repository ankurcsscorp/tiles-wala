import { buildTileLayout, MM_PER_FOOT } from './tileLayout';

// Architectural measurements are in the existing scene's feet.
export const WALL_CAMERA_PRESETS = {
  front: 'Front Wall', left: 'Left Wall', right: 'Right Wall',
  backsplash: 'Backsplash Focus', 'wall-close': 'Wall Close-up', room: 'Full Room',
};

export function getKitchenLayout(room) {
  const counterWidth = Math.min(room.width * 0.72, 17);
  const slabTop = 3.05; // 930 mm counter height, including a 40 mm slab.
  const slabThickness = 0.13;
  const upperBottom = 5.15;
  return {
    backZ: -room.depth / 2,
    counterWidth, counterDepth: 2.15, slabTop, slabThickness, upperBottom,
    backsplash: { width: counterWidth, height: upperBottom - slabTop, bottom: slabTop },
    upperWidth: Math.min(3.3, counterWidth * 0.22), upperHeight: 2.6,
  };
}

export function getWallRotation(dimensions, orientation) {
  const longEdgeIsVertical = dimensions.height >= dimensions.width;
  return (orientation === 'vertical') === longEdgeIsVertical ? 0 : 90;
}

export function getWallCameraView(room, preset = 'front', aspect = 1.5) {
  const { width, depth, height } = room;
  const backZ = -depth / 2;
  const eye = 5.55; // 1.69 m standing eye level.
  // Fit the wall height; portrait screens inspect fewer columns without distorting them.
  const distance = Math.min(depth - 1, height * 1.08 / (2 * Math.tan(22 * Math.PI / 180)));
  const sideDistance = Math.min(width - 1, distance);
  const kitchen = getKitchenLayout(room);
  const views = {
    front: { position: [0, eye, backZ + distance], target: [0, height * 0.43, backZ + 0.02], fov: 44 },
    left: { position: [-width / 2 + sideDistance, eye, -depth * 0.35], target: [-width / 2 + 0.02, height * 0.49, -depth * 0.35], fov: 44 },
    right: { position: [width / 2 - sideDistance, eye, -depth * 0.22], target: [width / 2 - 0.02, height * 0.49, -depth * 0.22], fov: 44 },
    backsplash: { position: [0, 4.3, backZ + 4.8], target: [0, kitchen.slabTop + kitchen.backsplash.height / 2, backZ + 0.02], fov: 40 },
    'wall-close': { position: [0, eye, backZ + 4.6], target: [0, eye, backZ + 0.02], fov: 44 },
    inspect: { position: [0, eye, backZ + distance * 0.85], target: [0, height * 0.5, backZ + 0.02], fov: 44 },
    balanced: { position: [width * 0.12, Math.min(7, height - 0.5), depth * (aspect < 1 ? 0.23 : 0.16)], target: [0, 3.2, backZ + 0.02], fov: 55 },
    room: { position: [width * 0.2, eye, depth * 0.2], target: [0, height * 0.45, backZ + 0.02], fov: 50 },
  };
  return views[preset] || views.front;
}

// Keep one installation grid across wall sections and window openings.
// Crop tiles into a region without changing their texture scale or face variant.
export function clipWallLayout(tiles, region) {
  const { width, height, centerX = 0, centerY = 0 } = region;
  const minX = centerX - width / 2, maxX = centerX + width / 2;
  const minY = centerY - height / 2, maxY = centerY + height / 2;
  return tiles.flatMap((tile, faceIndex) => {
    const left = Math.max(tile.left, minX), right = Math.min(tile.right, maxX);
    const bottom = Math.max(tile.bottom, minY), top = Math.min(tile.top, maxY);
    if (right - left < 1e-8 || top - bottom < 1e-8) return [];
    const u = (x) => tile.u0 + (x - tile.left) / (tile.right - tile.left) * (tile.u1 - tile.u0);
    const v = (y) => tile.v0 + (y - tile.bottom) / (tile.top - tile.bottom) * (tile.v1 - tile.v0);
    return [{ ...tile, faceIndex, left: left - centerX, right: right - centerX,
      bottom: bottom - centerY, top: top - centerY, u0: u(left), u1: u(right), v0: v(bottom), v1: v(top) }];
  });
}


// Product sizes describe the ceramic face. Add the joint to the wall grid pitch,
// then restore full-face UVs; a 600 mm tile remains 600 mm beside a 2 mm joint.
export function buildWallGrid(width, height, tileWidth, tileHeight, jointMm, pattern, rotation) {
  const gap = jointMm / MM_PER_FOOT;
  const tiles = buildTileLayout(width, height, tileWidth + gap, tileHeight + gap, jointMm, pattern, rotation);
  const clampUV = (value) => Math.max(0, Math.min(1, value));
  return tiles.map(tile => {
    const faceWidth = tile.rotated ? tileHeight : tileWidth;
    const faceHeight = tile.rotated ? tileWidth : tileHeight;
    const u = value => clampUV((value * (faceWidth + gap) - gap / 2) / faceWidth);
    const v = value => clampUV((value * (faceHeight + gap) - gap / 2) / faceHeight);
    return { ...tile, u0: u(tile.u0), u1: u(tile.u1), v0: v(tile.v0), v1: v(tile.v1) };
  });
}
