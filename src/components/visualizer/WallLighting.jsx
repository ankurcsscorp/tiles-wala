import React, { useLayoutEffect } from 'react';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { getKitchenLayout } from './wallConfig';

let initialized = false;

export default function WallLighting({ room, kitchen, quality, furniture, upperCabinets, inspection, view }) {
  useLayoutEffect(() => {
    if (!initialized) {
      RectAreaLightUniformsLib.init();
      initialized = true;
    }
  }, []);
  const { backZ, counterWidth, upperWidth, upperBottom } = getKitchenLayout(room);
  const sideView = view === 'left' || view === 'right';
  const keyPosition = view === 'left' ? [-room.width / 2 + 6, 7, -room.depth * 0.35]
    : view === 'right' ? [room.width / 2 - 6, 7, -room.depth * 0.22] : [0, 7, backZ + 6];
  const keyRotation = [0, view === 'left' ? Math.PI / 2 : view === 'right' ? -Math.PI / 2 : 0, 0];
  return <group>
    <rectAreaLight position={keyPosition} rotation={keyRotation} intensity={sideView ? 2.3 : 1.1} width={7} height={4} color='#f3f4f0' />
    {kitchen && furniture && upperCabinets && !inspection && quality !== 'performance' && [-1, 1].map((side) => (
      <rectAreaLight key={side} position={[side * (counterWidth - upperWidth) / 2, upperBottom - 0.06, backZ + 0.85]} intensity={2} width={upperWidth - 0.14} height={0.12} color='#ffe1b2' />
    ))}
  </group>;
}
