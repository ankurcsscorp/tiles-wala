import { getCameraView, ROOM_TEMPLATES } from './sceneConfig';

test('uses the requested living-room proportions in scene units', () => {
  const room = ROOM_TEMPLATES.living;
  expect(room.width * 0.3048).toBeCloseTo(9);
  expect(room.depth * 0.3048).toBeCloseTo(11);
  expect(room.height * 0.3048).toBeCloseTo(3.2);
});

test.each(Object.keys(ROOM_TEMPLATES))('keeps camera presets inside the %s room', (key) => {
  const room = ROOM_TEMPLATES[key];
  for (const aspect of [0.46, 1.5, 2.2]) {
    for (const preset of ['floor', 'room', 'close', 'top']) {
      const { position: [x, y, z] } = getCameraView(room, preset, aspect);
      expect(Math.abs(x)).toBeLessThan(room.width / 2 - 0.4);
      expect(Math.abs(z)).toBeLessThan(room.depth / 2 - 0.4);
      expect(y).toBeGreaterThan(0.65);
      expect(y).toBeLessThan(room.height - 0.3);
    }
  }
});

test('frames floor tiles from a realistic eye height and adapts to portrait screens', () => {
  const room = ROOM_TEMPLATES.living;
  const desktop = getCameraView(room, 'floor', 1.5);
  const mobile = getCameraView(room, 'floor', 0.46);
  expect(desktop.position[1] * 0.3048).toBeCloseTo(1.85);
  expect(desktop.target[1]).toBe(0);
  expect(mobile.position[2]).toBeGreaterThan(desktop.position[2]);
});
