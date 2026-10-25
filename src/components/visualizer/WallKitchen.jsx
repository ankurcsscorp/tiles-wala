import React, { useEffect, useMemo } from 'react';
import { RoundedBox } from '@react-three/drei/core/RoundedBox';
import * as THREE from 'three';
import { getKitchenLayout } from './wallConfig';

// Restrained stone variation belongs only to the slab, never the product image.
export function useSlabMaterial(color = 'white') {
  const material = useMemo(() => {
    if (!color) return null;
    const pixels = new Uint8Array(128 * 128 * 4);
    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 128; x++) {
        const vein = Math.exp(-Math.pow(Math.sin(x * 0.018 + y * 0.035 + Math.sin(y * 0.04) * 0.4) * 12, 2));
        const value = Math.round(248 - vein * 7 - ((x * 17 + y * 31) % 5));
        const index = (y * 128 + x) * 4;
        pixels.set([value, value, value, 255], index);
      }
    }
    const map = new THREE.DataTexture(pixels, 128, 128);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(3, 1);
    map.magFilter = THREE.LinearFilter;
    map.needsUpdate = true;
    return new THREE.MeshPhysicalMaterial({
      color: color === 'black' ? '#292b2c' : '#f1eee8', map,
      roughness: color === 'black' ? 0.24 : 0.29,
      metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.22,
    });
  }, [color]);
  useEffect(() => () => { material?.map.dispose(); material?.dispose(); }, [material]);
  return material;
}

const Cabinet = ({ position, width, height, depth, upper = false }) => (
  <group position={position}>
    <RoundedBox args={[width, height, depth]} radius={0.025} smoothness={3} castShadow receiveShadow>
      <meshStandardMaterial color={upper ? '#ebe6dd' : '#737c72'} roughness={0.66} />
    </RoundedBox>
    {[-1, 1].map((side) => <group key={side}>
      <mesh position={[side * width / 4, 0, depth / 2 + 0.018]} receiveShadow>
        <boxGeometry args={[width / 2 - 0.035, height - 0.045, 0.035]} />
        <meshStandardMaterial color={upper ? '#f0ece4' : '#81897e'} roughness={0.58} />
      </mesh>
      <mesh position={[side * 0.12, upper ? -height * 0.3 : height * 0.32, depth / 2 + 0.055]} castShadow>
        <boxGeometry args={[0.035, 0.28, 0.055]} />
        <meshStandardMaterial color='#a78b62' metalness={0.72} roughness={0.3} />
      </mesh>
    </group>)}
  </group>
);

export default function WallKitchen({ room, slabColor, upperCabinets, inspection }) {
  const { backZ, counterWidth, counterDepth, slabTop, slabThickness, upperBottom, upperWidth, upperHeight } = getKitchenLayout(room);
  const slab = useSlabMaterial(slabColor || 'white');
  const counterZ = backZ + counterDepth / 2 + 0.04;
  const baseHeight = slabTop - slabThickness - 0.22;
  const moduleWidth = counterWidth / 6;
  const showUpper = upperCabinets && !inspection;
  return <group>
    {Array.from({ length: 6 }, (_, i) => <Cabinet key={i} position={[(i - 2.5) * moduleWidth, 0.22 + baseHeight / 2, counterZ]} width={moduleWidth - 0.035} height={baseHeight} depth={counterDepth - 0.12} />)}
    <mesh position={[0, 0.16, counterZ - 0.12]} receiveShadow><boxGeometry args={[counterWidth - 0.25, 0.32, counterDepth - 0.3]} /><meshStandardMaterial color='#464a43' roughness={0.8} /></mesh>
    <RoundedBox position={[0, slabTop - slabThickness / 2, counterZ]} args={[counterWidth + 0.12, slabThickness, counterDepth]} radius={0.025} smoothness={3} material={slab} castShadow receiveShadow />
    {/* Two compact end cabinets leave the feature wall's center unobstructed. */}
    {showUpper && [-1, 1].map((side) => <group key={side}>
      <Cabinet position={[side * (counterWidth - upperWidth) / 2, upperBottom + upperHeight / 2, backZ + 0.56]} width={upperWidth} height={upperHeight} depth={1.05} upper />
      <mesh position={[side * (counterWidth - upperWidth) / 2, upperBottom - 0.025, backZ + 0.7]}>
        <boxGeometry args={[upperWidth - 0.14, 0.025, 0.08]} /><meshStandardMaterial color='#fff0d1' emissive='#ffe1a2' emissiveIntensity={1.1} />
      </mesh>
    </group>)}
    {/* A compact cooktop and flush sink add scale without hiding wall tiles. */}
    <mesh position={[-counterWidth * 0.2, slabTop + 0.015, counterZ]} receiveShadow>
      <boxGeometry args={[2.35, 0.03, 1.5]} /><meshPhysicalMaterial color='#242829' roughness={0.2} clearcoat={0.4} />
    </mesh>
    {[-0.55, 0.55].map((x) => <mesh key={x} position={[-counterWidth * 0.2 + x, slabTop + 0.035, counterZ]} rotation={[-Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.32, 0.013, 8, 32]} /><meshStandardMaterial color='#8d9290' metalness={0.65} roughness={0.3} />
    </mesh>)}
    <mesh position={[counterWidth * 0.25, slabTop + 0.014, counterZ]} receiveShadow><boxGeometry args={[1.75, 0.025, 1.3]} /><meshStandardMaterial color='#777f7e' metalness={0.7} roughness={0.3} /></mesh>
    <mesh position={[counterWidth * 0.25, slabTop + 0.03, counterZ]}><boxGeometry args={[1.5, 0.015, 1.05]} /><meshStandardMaterial color='#343e3e' roughness={0.42} /></mesh>
    {!inspection && <group position={[counterWidth * 0.25, slabTop, backZ + 0.4]}>
      <mesh position={[0, 0.45, 0]} castShadow><cylinderGeometry args={[0.035, 0.035, 0.9, 16]} /><meshStandardMaterial color='#a4a6a0' metalness={0.82} roughness={0.24} /></mesh>
      <mesh position={[0, 0.89, 0.16]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.035, 0.035, 0.38, 16]} /><meshStandardMaterial color='#a4a6a0' metalness={0.82} roughness={0.24} /></mesh>
    </group>}
  </group>;
}
