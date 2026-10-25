const FEET_PER_METER = 1 / 0.3048;
const room = (label, width, depth, height = 3.2) => ({
  label,
  width: width * FEET_PER_METER,
  depth: depth * FEET_PER_METER,
  height: height * FEET_PER_METER,
});

// Define architectural dimensions in metres; the existing scene uses feet.
export const ROOM_TEMPLATES = {
  living: room('Living Room', 9, 11),
  bedroom: room('Bedroom', 7, 8.5),
  bathroom: room('Bathroom', 4.5, 5.5),
  kitchen: room('Kitchen', 7, 8.5),
};

export function getCameraView(room, preset, aspect = 1.5) {
  const { width, depth, height } = room;
  const portrait = aspect < 1;
  const views = {
    floor: {
      position: [width * 0.1, Math.min(1.85 * FEET_PER_METER, height * 0.65), depth * (portrait ? 0.36 : 0.31)],
      target: [0, 0, -depth * 0.04],
    },
    room: {
      position: [width * 0.18, height * 0.57, depth * 0.44],
      target: [0, height * 0.24, -depth * 0.28],
    },
    close: { position: [2, 2.6, 4], target: [0, 0, 0] },
    top: { position: [0, height - 0.5, 0.01], target: [0, 0, 0] },
  };
  return views[preset] || views.floor;
}
