import React, {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei/core/Environment";
import { Lightformer } from "@react-three/drei/core/Lightformer";
import { OrthographicCamera } from "@react-three/drei/core/OrthographicCamera";
import { RoundedBox } from "@react-three/drei/core/RoundedBox";
import { OrbitControls } from "@react-three/drei/core/OrbitControls";
import { buildTileLayout, FINISHES, getProductFinish, getTileDimensions } from "./visualizer/tileLayout";
import { ContactShadows } from "@react-three/drei/core/ContactShadows";
import * as THREE from "three";
import { useLocation, useNavigate } from "react-router-dom";
import { getCameraView, ROOM_TEMPLATES } from "./visualizer/sceneConfig";
import WallKitchen, { useSlabMaterial } from "./visualizer/WallKitchen";
import { buildWallGrid, clipWallLayout, getKitchenLayout, getWallCameraView, getWallRotation, WALL_CAMERA_PRESETS } from "./visualizer/wallConfig";
import "./TileVisualizer.css";

const WallLighting = React.lazy(() => import("./visualizer/WallLighting"));
const COLLECTION_PATH = "/";

// Keep Canvas camera configuration stable; controls handle room changes and presets.
const DEFAULT_CAMERA = { position: getCameraView(ROOM_TEMPLATES.living, "close").position, fov: 58, near: 0.05, far: 120 };
const CAMERA_PRESETS = { floor: "Floor Focus", room: "Full Room", close: "Close-up", top: "Top View" };
const QUALITY = { performance: { dpr: 1, shadow: 512 }, balanced: { dpr: 1.5, shadow: 1024 }, high: { dpr: 2, shadow: 2048 } };

const LayoutCamera = ({ room }) => {
  const { size } = useThree();
  const { width, depth, height } = ROOM_TEMPLATES[room];
  const zoom = Math.min(size.width / (width * 1.08), size.height / (depth * 1.08));
  return <OrthographicCamera makeDefault position={[0, height - 0.5, 0.01]} zoom={zoom} near={0.05} far={120} />;
};

const RoomOrbitControls = ({ room, surface, preset, reset, autoRotate, autoZoom, upperCabinets, coverage }) => {
  const { camera, size } = useThree();
  const controls = useRef();
  const destination = useRef(null);
  const interacting = useRef(false);
  const elapsed = useRef(0);
  const wallMotion = useRef(null);
  const wallMode = surface !== "floor";
  const viewPreset = room === "kitchen" && coverage === "backsplash" && ["wall-close", "inspect"].includes(preset) ? "backsplash" : preset;
  const { width, depth, height } = ROOM_TEMPLATES[room];

  useEffect(() => {
    const aspect = size.width / size.height;
    const view = wallMode ? getWallCameraView(ROOM_TEMPLATES[room], viewPreset, aspect) : getCameraView(ROOM_TEMPLATES[room], preset, aspect);
    destination.current = view;
    wallMotion.current = null;
    elapsed.current = 0;
  }, [camera, room, wallMode, viewPreset, preset, reset, size.width, size.height]);

  useFrame((_, delta) => {
    if (!controls.current) return;
    const orbit = controls.current;
    if (destination.current && !interacting.current) {
      const view = destination.current;
      const factor = 1 - Math.exp(-delta * 6);
      const position = new THREE.Vector3(...destination.current.position);
      const target = new THREE.Vector3(...destination.current.target);
      camera.position.lerp(position, factor);
      orbit.target.lerp(target, factor);
      const arrived = camera.position.distanceTo(position) < 0.015 && (!wallMode || orbit.target.distanceTo(target) < 0.015);
      if (camera.isPerspectiveCamera) {
        camera.fov = THREE.MathUtils.lerp(camera.fov, view.fov || 58, factor);
        if (arrived) camera.fov = view.fov || 58;
        camera.updateProjectionMatrix();
      }
      if (arrived) destination.current = null;
    } else if (wallMode && !interacting.current && (autoRotate || autoZoom)) {
      if (!wallMotion.current) {
        wallMotion.current = { position: camera.position.clone(), target: orbit.target.clone(), yaw: new THREE.Vector3(0, 1, 0) };
        elapsed.current = 0;
      }
      elapsed.current += delta;
      const motion = wallMotion.current;
      const offset = motion.position.clone().sub(motion.target);
      // A small showroom sweep keeps the chosen wall in frame instead of orbiting away.
      if (autoRotate) offset.applyAxisAngle(motion.yaw, Math.sin(elapsed.current * 0.22) * 0.045);
      if (autoZoom) offset.multiplyScalar(1 + Math.sin(elapsed.current * 0.3) * 0.035);
      camera.position.copy(motion.target).add(offset);
    } else if (autoZoom && !interacting.current) {
      elapsed.current += delta;
      if (camera.isOrthographicCamera) {
        camera.zoom = THREE.MathUtils.clamp(camera.zoom * Math.exp(Math.cos(elapsed.current * 0.4) * delta * 0.025), 1, 200);
        camera.updateProjectionMatrix();
      } else {
        camera.position.addScaledVector(camera.position.clone().sub(orbit.target).normalize(), Math.cos(elapsed.current * 0.4) * delta * 0.22);
      }
    }
    // Clamp both the eye and pan target to the interior, including on touch input.
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -width / 2 + 0.4, width / 2 - 0.4);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -depth / 2 + 0.4, depth / 2 - 0.4);
    camera.position.y = THREE.MathUtils.clamp(camera.position.y, wallMode ? 3.4 : 0.65, height - 0.3);
    orbit.target.x = THREE.MathUtils.clamp(orbit.target.x, -width / 2 + (wallMode ? 0.02 : 1), width / 2 - (wallMode ? 0.02 : 1));
    orbit.target.z = THREE.MathUtils.clamp(orbit.target.z, -depth / 2 + (wallMode ? 0.02 : 1), depth / 2 - (wallMode ? 0.02 : 1));
    orbit.target.y = THREE.MathUtils.clamp(orbit.target.y, 0, wallMode ? height - 0.4 : height / 2);
    if (wallMode && room === "kitchen" && upperCabinets) {
      const layout = getKitchenLayout(ROOM_TEMPLATES[room]);
      const nearUpper = Math.abs(camera.position.x) > layout.counterWidth / 2 - layout.upperWidth - 0.2 && Math.abs(camera.position.x) < layout.counterWidth / 2 + 0.2;
      if (nearUpper && camera.position.y > layout.upperBottom - 0.2 && camera.position.y < layout.upperBottom + layout.upperHeight + 0.2) {
        camera.position.z = Math.max(camera.position.z, layout.backZ + 1.35);
      }
    }
    camera.lookAt(orbit.target);
  });

  return <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={0.09}
    minZoom={1} maxZoom={200} minDistance={wallMode ? 2.8 : 1.2} maxDistance={depth * 0.9} minPolarAngle={0.001} maxPolarAngle={Math.PI / 2 + (wallMode ? 0.15 : -0.06)}
    autoRotate={autoRotate && !wallMode} autoRotateSpeed={0.35}
    onStart={() => { interacting.current = true; destination.current = null; wallMotion.current = null; }}
    onEnd={() => { interacting.current = false; }} />;
};

// One merged geometry per product face: physical recessed grout, small edge bevels,
// and clipped UVs. Draw calls stay constant as the number of installed tiles grows.
const createTileGeometry = (tiles) => {
  const positions = [], uvs = [];
  const quad = (a, b, c, d, uv) => {
    for (const i of [0, 1, 2, 0, 2, 3]) {
      positions.push(...[a, b, c, d][i]);
      uvs.push(...uv[i]);
    }
  };
  tiles.forEach(({ left: l, right: r, bottom: b, top: t, u0, u1, v0, v1, rotated }) => {
    const bevel = Math.min(0.0015, (r - l) / 8, (t - b) / 8);
    const uv = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]].map(([u, v]) => rotated ? [v, 1 - u] : [u, v]);
    const outer = [[l,b,0], [r,b,0], [r,t,0], [l,t,0]];
    const inner = [[l+bevel,b+bevel,0.004], [r-bevel,b+bevel,0.004], [r-bevel,t-bevel,0.004], [l+bevel,t-bevel,0.004]];
    quad(...inner, uv);
    for (let i = 0; i < 4; i++) {
      const j = (i+1)%4;
      quad(outer[i], outer[j], inner[j], inner[i], [uv[i], uv[j], uv[j], uv[i]]);
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
};

const TileFace = ({ tiles, imageUrl, finish, normalMapUrl, roughnessMapUrl }) => {
  const { gl } = useThree();
  const sources = useLoader(THREE.TextureLoader, [imageUrl, ...(normalMapUrl ? [normalMapUrl] : []), ...(roughnessMapUrl ? [roughnessMapUrl] : [])]);
  const textures = useMemo(() => sources.map((source, index) => {
    const texture = source.clone();
    texture.colorSpace = index === 0 ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.needsUpdate = true;
    return texture;
  }), [sources, gl]);
  const geometry = useMemo(() => createTileGeometry(tiles), [tiles]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => textures.forEach((texture) => texture.dispose()), [textures]);
  const { label, ...material } = FINISHES[finish];
  return <mesh geometry={geometry} receiveShadow>
    <meshPhysicalMaterial map={textures[0]} normalMap={normalMapUrl ? textures[1] : null}
      roughnessMap={roughnessMapUrl ? textures[textures.length - 1] : null}
      {...material} metalness={0} envMapIntensity={0.85} />
  </mesh>;
};

const TiledSurface = ({ repeatWidth, repeatHeight, tileWidth, tileHeight, imageUrl, faceUrls, finish, groutColor, jointWidth, pattern, rotation, normalMapUrl, roughnessMapUrl, wallRegion, wallSurface = false }) => {
  const regionWidth = wallRegion?.fullWidth;
  const regionHeight = wallRegion?.fullHeight;
  const centerX = wallRegion?.centerX || 0;
  const centerY = wallRegion?.centerY || 0;
  const layout = useMemo(() => {
    const buildLayout = wallSurface ? buildWallGrid : buildTileLayout;
    if (!regionWidth) return buildLayout(repeatWidth, repeatHeight, tileWidth, tileHeight, jointWidth, pattern, rotation);
    const fullLayout = buildLayout(regionWidth, regionHeight, tileWidth, tileHeight, jointWidth, pattern, rotation);
    return clipWallLayout(fullLayout, { width: repeatWidth, height: repeatHeight, centerX, centerY });
  }, [repeatWidth, repeatHeight, tileWidth, tileHeight, jointWidth, pattern, rotation, regionWidth, regionHeight, centerX, centerY, wallSurface]);
  const faces = useMemo(() => [...new Set([imageUrl, ...(Array.isArray(faceUrls) ? faceUrls : []).filter((url) => typeof url === "string" && url)])].slice(0, 8), [imageUrl, faceUrls]);
  const batches = useMemo(() => faces.map((_, face) => layout.filter((tile, index) => (tile.faceIndex ?? index) % faces.length === face)), [layout, faces]);
  return <group>
    <mesh position={[0, 0, -0.003]} receiveShadow>
      <planeGeometry args={[repeatWidth, repeatHeight]} />
      <meshStandardMaterial color={groutColor} roughness={0.85} metalness={0} />
    </mesh>
    {faces.map((url, index) => <TileFace key={url} imageUrl={url} tiles={batches[index]} finish={finish} normalMapUrl={normalMapUrl} roughnessMapUrl={roughnessMapUrl} />)}
  </group>;
};

const Sofa = () => (
  <group position={[0, 0, -2.35]}>
    <RoundedBox position={[0, 0.64, 0]} castShadow receiveShadow args={[6.4, 0.8, 2.2]} radius={0.08} smoothness={4}>
      <meshStandardMaterial color="#b88768" roughness={0.82} />
    </RoundedBox>
    <RoundedBox position={[0, 1.45, -0.78]} castShadow receiveShadow args={[6.1, 1.15, 0.65]} radius={0.08} smoothness={4}>
      <meshStandardMaterial color="#a87558" roughness={0.86} />
    </RoundedBox>
    {[-3.05, 3.05].map((x) => (
      <RoundedBox key={x} position={[x, 1.12, 0]} castShadow args={[0.55, 1.25, 2.25]} radius={0.08} smoothness={4}>
        <meshStandardMaterial color="#986c55" roughness={0.88} />
      </RoundedBox>
    ))}
    {[-1.85, 0, 1.85].map((x, index) => (
      <RoundedBox key={x} position={[x, 1.14, -0.24]} rotation={[0, 0, index === 1 ? 0 : -0.07]} castShadow args={[1.65, 0.68, 1.45]} radius={0.08} smoothness={4}>
        <meshStandardMaterial color={index === 1 ? "#d3b69c" : "#c69a79"} roughness={0.9} />
      </RoundedBox>
    ))}
    {[-2.55, 2.55].map((x) => (
      <mesh key={x} position={[x, 0.17, -0.72]} castShadow>
        <cylinderGeometry args={[0.09, 0.07, 0.34, 12]} />
        <meshStandardMaterial color="#523c30" roughness={0.55} />
      </mesh>
    ))}
    {[-1.25, 1.25].map((x) => (
      <RoundedBox key={x} position={[x, 1.52, -0.38]} rotation={[0, 0, x < 0 ? -0.12 : 0.12]} castShadow args={[1.1, 0.9, 0.24]} radius={0.08} smoothness={4}>
        <meshStandardMaterial color={x < 0 ? "#e6d9c7" : "#78908a"} roughness={0.96} />
      </RoundedBox>
    ))}
  </group>
);

const Bed = () => (
  <group position={[0, 0, -1.9]}>
    <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
      <boxGeometry args={[6.2, 0.48, 7.1]} />
      <meshStandardMaterial color="#6f5548" roughness={0.65} />
    </mesh>
    <mesh position={[0, 0.72, 0.05]} castShadow receiveShadow>
      <boxGeometry args={[5.8, 0.55, 6.75]} />
      <meshStandardMaterial color="#f3eee6" roughness={0.96} />
    </mesh>
    <mesh position={[0, 1.04, 1.15]} castShadow>
      <boxGeometry args={[5.8, 0.16, 4.4]} />
      <meshStandardMaterial color="#c9a98d" roughness={0.92} />
    </mesh>
    <mesh position={[0, 0.65, -3.72]} castShadow>
      <boxGeometry args={[6.35, 1.5, 0.38]} />
      <meshStandardMaterial color="#755a4d" roughness={0.67} />
    </mesh>
    {[-1.45, 1.45].map((x) => (
      <mesh key={x} position={[x, 1.08, -2.63]} castShadow>
        <boxGeometry args={[2.1, 0.28, 1.15]} />
        <meshStandardMaterial color="#fffaf2" roughness={0.98} />
      </mesh>
    ))}
    <mesh position={[0, 1.16, -0.4]} castShadow>
      <boxGeometry args={[5.5, 0.14, 2.1]} />
      <meshStandardMaterial color="#82918b" roughness={0.94} />
    </mesh>
    {[-2.55, 2.55].map((x) => (
      <mesh key={x} position={[x, 0.12, -3.22]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.24, 12]} />
        <meshStandardMaterial color="#4e3b30" roughness={0.55} />
      </mesh>
    ))}
  </group>
);

const BathroomFixtures = () => (
  <group>
    <mesh position={[-2.85, 0.56, -3.15]} castShadow receiveShadow>
      <boxGeometry args={[3, 1.05, 1.35]} />
      <meshStandardMaterial color="#9a7b63" roughness={0.42} />
    </mesh>
    <mesh position={[-2.85, 1.12, -3.15]} castShadow receiveShadow>
      <boxGeometry args={[3.18, 0.14, 1.48]} />
      <meshStandardMaterial color="#f5f1e9" roughness={0.2} />
    </mesh>
    <mesh position={[-2.85, 1.22, -3.03]} castShadow>
      <boxGeometry args={[1.55, 0.16, 0.82]} />
      <meshStandardMaterial color="#fffefa" roughness={0.18} />
    </mesh>
    <mesh position={[-2.85, 1.31, -3.03]} castShadow>
      <boxGeometry args={[1.08, 0.06, 0.54]} />
      <meshStandardMaterial color="#d8e4e5" roughness={0.15} metalness={0.12} />
    </mesh>
    <mesh position={[-2.85, 1.48, -3.52]} castShadow>
      <cylinderGeometry args={[0.045, 0.045, 0.36, 12]} />
      <meshStandardMaterial color="#c4a66c" metalness={0.78} roughness={0.22} />
    </mesh>
    <mesh position={[-2.85, 2.72, -4.37]} castShadow>
      <boxGeometry args={[2.35, 1.72, 0.12]} />
      <meshStandardMaterial color="#c3a878" metalness={0.72} roughness={0.24} />
    </mesh>
    <mesh position={[-2.85, 2.72, -4.28]}>
      <boxGeometry args={[2.12, 1.49, 0.035]} />
      <meshStandardMaterial
        color="#a9c3c7"
        metalness={0.72}
        roughness={0.12}
        emissive="#54747c"
        emissiveIntensity={0.12}
      />
    </mesh>

    <mesh position={[2.55, 0.13, -2.75]} receiveShadow castShadow>
      <boxGeometry args={[3.5, 0.26, 3.15]} />
      <meshStandardMaterial color="#f5f2ed" roughness={0.24} />
    </mesh>
    <mesh position={[2.55, 0.33, -2.75]} castShadow>
      <boxGeometry args={[3.15, 0.2, 2.85]} />
      <meshStandardMaterial color="#e8f0f0" roughness={0.16} metalness={0.08} />
    </mesh>
    {[-1.12, 1.12].map((x) => (
      <mesh key={`shower-frame-${x}`} position={[2.55 + x, 2.85, -1.12]}>
        <boxGeometry args={[0.045, 5.1, 0.045]} />
        <meshStandardMaterial color="#c3a878" metalness={0.8} roughness={0.2} />
      </mesh>
    ))}
    <mesh position={[2.55, 2.85, -1.12]}>
      <boxGeometry args={[2.28, 5.1, 0.035]} />
      <meshPhysicalMaterial
        color="#d7e7e8"
        roughness={0.08}
        metalness={0.04}
        transmission={0.78}
        transparent
        opacity={0.28}
        side={THREE.DoubleSide}
      />
    </mesh>
    <mesh position={[2.55, 5.25, -3.1]} castShadow>
      <cylinderGeometry args={[0.48, 0.48, 0.1, 24]} />
      <meshStandardMaterial color="#c3a878" metalness={0.78} roughness={0.18} />
    </mesh>
    <mesh position={[2.55, 4.55, -3.12]}>
      <cylinderGeometry args={[0.035, 0.035, 1.4, 12]} />
      <meshStandardMaterial color="#c3a878" metalness={0.8} roughness={0.2} />
    </mesh>
    <mesh position={[2.55, 3.9, -3.12]}>
      <sphereGeometry args={[0.09, 16, 12]} />
      <meshStandardMaterial color="#c3a878" metalness={0.78} roughness={0.22} />
    </mesh>
    <mesh position={[1.38, 1.55, -3.8]} castShadow>
      <boxGeometry args={[0.08, 1.05, 0.08]} />
      <meshStandardMaterial color="#c3a878" metalness={0.75} roughness={0.23} />
    </mesh>
    <mesh position={[1.68, 1.55, -3.8]} castShadow>
      <boxGeometry args={[0.08, 1.05, 0.08]} />
      <meshStandardMaterial color="#c3a878" metalness={0.75} roughness={0.23} />
    </mesh>
    <mesh position={[1.53, 2.08, -3.8]} castShadow>
      <boxGeometry args={[0.38, 0.08, 0.08]} />
      <meshStandardMaterial color="#c3a878" metalness={0.75} roughness={0.23} />
    </mesh>

    <group position={[-1.65, 0, 1.35]}>
      <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.72, 0.78, 0.36, 28]} />
        <meshStandardMaterial color="#e9e6df" roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.42, -0.38]} castShadow>
        <boxGeometry args={[0.62, 0.68, 0.56]} />
        <meshStandardMaterial color="#f6f4ef" roughness={0.26} />
      </mesh>
      <mesh position={[0, 0.78, -0.57]} castShadow>
        <boxGeometry args={[0.74, 0.14, 0.18]} />
        <meshStandardMaterial color="#fffefa" roughness={0.2} />
      </mesh>
      <mesh position={[0, 1.3, -0.7]}>
        <boxGeometry args={[0.42, 0.58, 0.05]} />
        <meshStandardMaterial color="#d3e3e4" roughness={0.2} metalness={0.25} />
      </mesh>
      <mesh position={[0, 0.98, -0.55]}>
        <cylinderGeometry args={[0.055, 0.055, 0.4, 12]} />
        <meshStandardMaterial color="#c3a878" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>

    <group position={[-4.3, 0, -0.25]}>
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.52, 0.48, 0.8, 20]} />
        <meshStandardMaterial color="#d9d2c8" roughness={0.68} />
      </mesh>
      {[0, 1, 2, 3].map((index) => (
        <mesh
          key={`plant-leaf-${index}`}
          position={[
            -Math.sin((index * Math.PI) / 2) * 0.38,
            2.3 + (index % 2) * 0.22,
            -Math.cos((index * Math.PI) / 2) * 0.3,
          ]}
          rotation={[0.28, (index * Math.PI) / 2, -0.32]}
          castShadow
        >
          <coneGeometry args={[0.18, 1.05, 8]} />
          <meshStandardMaterial color={index % 2 ? "#63826b" : "#829477"} roughness={0.88} />
        </mesh>
      ))}
    </group>
  </group>
);

const CoffeeTable = () => (
  <group position={[0, 0, -1.6]} scale={0.8}>
    <RoundedBox position={[0, 0.72, 0]} castShadow args={[4.1, 0.17, 2.15]} radius={0.08} smoothness={4}>
      <meshStandardMaterial color="#8a6650" roughness={0.5} />
    </RoundedBox>
    {[-1.65, 1.65].flatMap((x) =>
      [-0.75, 0.75].map((z) => (
        <mesh key={`${x}-${z}`} position={[x, 0.35, z]} castShadow>
          <cylinderGeometry args={[0.055, 0.07, 0.7, 10]} />
          <meshStandardMaterial color="#574236" roughness={0.55} />
        </mesh>
      ))
    )}
    <mesh position={[0.35, 0.86, 0]} castShadow>
      <cylinderGeometry args={[0.19, 0.17, 0.2, 20]} />
      <meshStandardMaterial color="#b98c67" roughness={0.58} />
    </mesh>
    <mesh position={[0.35, 1.06, 0]} castShadow>
      <sphereGeometry args={[0.17, 16, 12]} />
      <meshStandardMaterial color="#71816a" roughness={0.9} />
    </mesh>
  </group>
);

const SideTable = ({ position }) => (
  <group position={position}>
    <RoundedBox position={[0, 0.78, 0]} castShadow args={[1.65, 0.15, 1.35]} radius={0.08} smoothness={4}>
      <meshStandardMaterial color="#916e55" roughness={0.58} />
    </RoundedBox>
    <RoundedBox position={[0, 0.36, 0]} castShadow args={[1.4, 0.72, 1.1]} radius={0.08} smoothness={4}>
      <meshStandardMaterial color="#b18a6d" roughness={0.65} />
    </RoundedBox>
    <mesh position={[0, 1.12, 0]} castShadow>
      <cylinderGeometry args={[0.12, 0.22, 0.48, 16]} />
      <meshStandardMaterial color="#d7c4a8" roughness={0.68} />
    </mesh>
    <mesh position={[0, 1.48, 0]} castShadow>
      <sphereGeometry args={[0.28, 20, 16]} />
      <meshStandardMaterial color="#f5dc9e" emissive="#8d6330" emissiveIntensity={0.22} />
    </mesh>
  </group>
);

const KitchenInteriors = ({ slabColor, upperCabinets = true }) => {
  const slabMaterial = useSlabMaterial(slabColor);
  return (
  <group>

    <group>
      <mesh position={[0, 1.05, -5.05]} castShadow receiveShadow>
        <boxGeometry args={[9.6, 1.75, 1.45]} />
        <meshStandardMaterial color="#69746e" roughness={0.48} />
      </mesh>
      <mesh position={[0, 2.02, -5.05]} castShadow receiveShadow>
        <boxGeometry args={[9.88, 0.18, 1.62]} />
        {slabColor ? <primitive object={slabMaterial} attach="material" dispose={null} /> : <meshStandardMaterial color="#e8e3da" roughness={0.2} />}
      </mesh>
      {[-3.55, -2.36, -1.18, 0, 1.18, 2.36, 3.55].map((x) => (
        <mesh key={`kitchen-lower-door-${x}`} position={[x, 1.04, -4.312]}>
          <boxGeometry args={[1.1, 1.48, 0.025]} />
          <meshStandardMaterial color={x % 2 ? "#77837b" : "#818b81"} roughness={0.54} />
        </mesh>
      ))}
      {[-3.55, -2.36, -1.18, 0, 1.18, 2.36, 3.55].map((x) => (
        <mesh key={`kitchen-lower-handle-${x}`} position={[x + 0.38, 1.1, -4.27]}>
          <boxGeometry args={[0.045, 0.34, 0.045]} />
          <meshStandardMaterial color="#b99a68" metalness={0.72} roughness={0.24} />
        </mesh>
      ))}
    </group>

    <group>
      <mesh position={[-5.35, 1.05, -0.35]} castShadow receiveShadow>
        <boxGeometry args={[1.45, 1.75, 7.7]} />
        <meshStandardMaterial color="#69746e" roughness={0.48} />
      </mesh>
      <mesh position={[-5.35, 2.02, -0.35]} castShadow receiveShadow>
        <boxGeometry args={[1.62, 0.18, 7.92]} />
        {slabColor ? <primitive object={slabMaterial} attach="material" dispose={null} /> : <meshStandardMaterial color="#e8e3da" roughness={0.2} />}
      </mesh>
      {[-3.35, -1.35, 0.65, 2.65].map((z) => (
        <mesh key={`kitchen-side-door-${z}`} position={[-4.604, 1.04, z]}>
          <boxGeometry args={[0.025, 1.48, 1.86]} />
          <meshStandardMaterial color="#77837b" roughness={0.54} />
        </mesh>
      ))}
    </group>

    {upperCabinets && <>
    <mesh position={[0, 3.35, -5.44]} castShadow>
      <boxGeometry args={[8.9, 1.9, 0.92]} />
      <meshStandardMaterial color="#d7d0c4" roughness={0.62} />
    </mesh>
    {[-3.15, -1.05, 1.05, 3.15].map((x) => (
      <group key={`kitchen-upper-${x}`}>
        <mesh position={[x, 3.35, -4.91]} castShadow>
          <boxGeometry args={[1.96, 1.82, 0.12]} />
          <meshStandardMaterial color={x % 2 ? "#f0ece4" : "#e8e2d8"} roughness={0.58} />
        </mesh>
        <mesh position={[x, 3.35, -4.83]}>
          <boxGeometry args={[1.78, 1.62, 0.025]} />
          <meshStandardMaterial color="#f4f0e8" roughness={0.52} />
        </mesh>
        <mesh position={[x + 0.66, 3.35, -4.79]}>
          <boxGeometry args={[0.045, 0.32, 0.045]} />
          <meshStandardMaterial color="#b99a68" metalness={0.72} roughness={0.24} />
        </mesh>
      </group>
    ))}

    </>}
    <mesh position={[-1.65, 2.2, -5.03]} castShadow>
      <boxGeometry args={[2.5, 0.08, 1.2]} />
      <meshStandardMaterial color="#373a38" roughness={0.28} metalness={0.24} />
    </mesh>
    {[[-2.25, -5.17], [-1.05, -5.17]].map(([x, z]) => (
      <mesh key={`cooktop-ring-${x}`} position={[x, 2.25, z]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.3, 0.035, 8, 24]} />
        <meshStandardMaterial color="#aeb2ad" metalness={0.72} roughness={0.22} />
      </mesh>
    ))}
    <mesh position={[-1.65, 3.12, -5.45]} castShadow>
      <boxGeometry args={[2.4, 0.16, 0.86]} />
      <meshStandardMaterial color="#c8c7c1" roughness={0.36} metalness={0.18} />
    </mesh>
    <mesh position={[-1.65, 2.7, -5.14]} castShadow>
      <boxGeometry args={[1.75, 0.78, 0.72]} />
      <meshStandardMaterial color="#d9d9d5" roughness={0.28} metalness={0.24} />
    </mesh>

    <mesh position={[2.05, 2.17, -5.01]} castShadow>
      <boxGeometry args={[1.85, 0.1, 1.28]} />
      <meshStandardMaterial color="#bfc6c3" roughness={0.22} metalness={0.3} />
    </mesh>
    <mesh position={[2.05, 2.18, -5.03]}>
      <boxGeometry args={[1.25, 0.035, 0.82]} />
      <meshStandardMaterial color="#59615e" roughness={0.2} metalness={0.34} />
    </mesh>
    <mesh position={[2.05, 2.46, -5.28]} castShadow>
      <cylinderGeometry args={[0.045, 0.045, 0.54, 12]} />
      <meshStandardMaterial color="#b99a68" metalness={0.78} roughness={0.2} />
    </mesh>
    <mesh position={[2.05, 2.72, -5.03]}>
      <torusGeometry args={[0.23, 0.045, 10, 24, Math.PI]} />
      <meshStandardMaterial color="#b99a68" metalness={0.78} roughness={0.2} />
    </mesh>

    <group position={[4.35, 0, -1.7]}>
      <mesh position={[0, 1.65, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 3.3, 1.8]} />
        <meshStandardMaterial color="#d9dedb" roughness={0.24} metalness={0.12} />
      </mesh>
      <mesh position={[0.92, 1.75, 0.02]}>
        <boxGeometry args={[0.025, 2.55, 1.5]} />
        <meshStandardMaterial color="#9bb5bd" roughness={0.18} metalness={0.12} />
      </mesh>
      <mesh position={[0, 2.18, 0.93]}>
        <boxGeometry args={[0.4, 0.07, 0.035]} />
        <meshStandardMaterial color="#aeb3af" metalness={0.74} roughness={0.2} />
      </mesh>
    </group>

    <group position={[0.2, 0, 0.9]}>
      <mesh position={[0, 1.88, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.2, 1.8, 2.15]} />
        <meshStandardMaterial color="#e8e2d8" roughness={0.5} />
      </mesh>
      <mesh position={[0, 2.84, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.48, 0.16, 2.42]} />
        {slabColor ? <primitive object={slabMaterial} attach="material" dispose={null} /> : <meshStandardMaterial color="#c5b9a7" roughness={0.24} />}
      </mesh>
      {[-1.35, 0, 1.35].map((x) => (
        <mesh key={`island-panel-${x}`} position={[x, 1.88, 1.09]}>
          <boxGeometry args={[1.28, 1.58, 0.025]} />
          <meshStandardMaterial color="#f0ece4" roughness={0.58} />
        </mesh>
      ))}
      <mesh position={[0.4, 2.98, -0.25]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.24, 0.24, 0.035, 20]} />
        <meshStandardMaterial color="#d59a52" roughness={0.74} />
      </mesh>
      <mesh position={[0.4, 3.13, -0.25]}>
        <sphereGeometry args={[0.16, 16, 12]} />
        <meshStandardMaterial color="#78906d" roughness={0.82} />
      </mesh>
    </group>

    {[-1.1, 1.1].map((x) => (
      <group key={`kitchen-pendant-${x}`}>
        <mesh position={[x, 5.8, -3.1]}>
          <cylinderGeometry args={[0.025, 0.025, 1.5, 8]} />
          <meshStandardMaterial color="#88765e" metalness={0.55} roughness={0.36} />
        </mesh>
        <mesh position={[x, 5.02, -3.1]} castShadow>
          <coneGeometry args={[0.42, 0.3, 24, 1, true]} />
          <meshStandardMaterial color="#c4a36d" metalness={0.48} roughness={0.32} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[x, 4.9, -3.1]}>
          <sphereGeometry args={[0.12, 12, 10]} />
          <meshStandardMaterial color="#fff0c9" emissive="#ffd98d" emissiveIntensity={0.8} />
        </mesh>
      </group>
    ))}
  </group>
);
};

const LivingRoomFurniture = () => (
  <group>
    <group position={[0, 0, -2.1]} scale={1.25}>
      <Sofa />
    </group>
    <CoffeeTable />
    <SideTable position={[-4.05, 0, -2.1]} />
    <SideTable position={[4.05, 0, -2.1]} />
    <mesh position={[0, 2.6, -6.42]} castShadow>
      <boxGeometry args={[5.4, 2.1, 0.22]} />
      <meshStandardMaterial color="#806858" roughness={0.72} />
    </mesh>
    <mesh position={[0, 2.62, -6.28]}>
      <boxGeometry args={[4.9, 1.75, 0.04]} />
      <meshStandardMaterial color="#9caa9f" roughness={0.95} />
    </mesh>
  </group>
);

const BedroomFurniture = () => (
  <group>
    <Bed />
    <SideTable position={[-4.15, 0, -3.25]} />
    <SideTable position={[4.15, 0, -3.25]} />
    <mesh position={[0, 2.6, -5.85]} castShadow>
      <boxGeometry args={[5.2, 2.15, 0.18]} />
      <meshStandardMaterial color="#b9987e" roughness={0.78} />
    </mesh>
  </group>
);

const RoomWallPanel = ({
  position,
  rotation = [0, 0, 0],
  dimensions,
  repeatWidth,
  repeatHeight,
  textureProps,
  wallRegion,
  tiled,
  wallColor,
}) => (
  <group position={position} rotation={rotation}>
    {tiled ? <TiledSurface {...textureProps} repeatWidth={repeatWidth} repeatHeight={repeatHeight} wallRegion={wallRegion} /> :
      <mesh receiveShadow><planeGeometry args={dimensions} /><meshStandardMaterial color={wallColor} roughness={0.88} /></mesh>}
  </group>
);

const RoomFurnishings = ({ room, slabColor, upperCabinets = true }) => {
  const { width, depth } = ROOM_TEMPLATES[room];
  return <group position={[room === "living" ? -width * 0.19 : 0, 0, -depth / 2 + 6.6]}>
    {room === "living" && <LivingRoomFurniture />}
    {room === "bedroom" && <BedroomFurniture />}
    {room === "bathroom" && <BathroomFixtures />}
    {room === "kitchen" && <KitchenInteriors slabColor={slabColor} upperCabinets={upperCabinets} />}
  </group>;
};

const ArchitecturalDetails = ({ room, lighting }) => {
  const { width, depth, height } = ROOM_TEMPLATES[room];
  return <group>
    {/* Shallow ceiling perimeter and warm recessed luminaires frame the room. */}
    {[-1, 1].map((side) => <group key={side}>
      <mesh position={[side * (width/2-0.65), height-0.2, 0]} receiveShadow>
        <boxGeometry args={[1.3, 0.4, depth]} /><meshStandardMaterial color="#f3efe7" roughness={0.8} />
      </mesh>
      {[-0.33, -0.1, 0.13, 0.36].map((fraction) => <mesh key={fraction} position={[side*(width/2-0.7), height-0.41, depth*fraction]} rotation={[-Math.PI/2,0,0]}>
        <circleGeometry args={[0.14, 24]} /><meshStandardMaterial color="#fff4d9" emissive="#ffe1b2" emissiveIntensity={lighting === "warm" ? 2 : 0.5} />
      </mesh>)}
    </group>)}
    <mesh position={[0, height-0.2, -depth/2+0.6]}><boxGeometry args={[width,0.4,1.2]} /><meshStandardMaterial color="#f3efe7" roughness={0.8} /></mesh>
    {/* Restrained fluted feature panel and a plant give scale without covering tiles. */}
    {Array.from({length: 20}, (_, i) => <mesh key={i} position={[width*(0.22+i*0.0085), height*0.4, -depth/2+0.09]} castShadow>
      <boxGeometry args={[0.1,height*0.76,0.16]} /><meshStandardMaterial color={i%3 ? "#b49a7c" : "#c0a98b"} roughness={0.78} />
    </mesh>)}
  </group>;
};

const ShowroomPlant = ({ room }) => {
  const { width, depth } = ROOM_TEMPLATES[room];
  return <group position={[width/2-2.1,0,-depth/2+2.2]}>
    <mesh position={[0,0.65,0]} castShadow receiveShadow><cylinderGeometry args={[0.7,0.48,1.3,32]} /><meshStandardMaterial color="#d3cabb" roughness={0.87} /></mesh>
    <mesh position={[0,2.4,0]} castShadow><cylinderGeometry args={[0.045,0.08,3.6,12]} /><meshStandardMaterial color="#6e5d42" roughness={0.9} /></mesh>
    {Array.from({length:14}, (_,i) => <mesh key={i} position={[Math.sin(i*2.4)*0.6,2.3+i*0.17,Math.cos(i*2.4)*0.6]} rotation={[0.35, i*2.4, 0.5]} scale={[0.34,0.7,0.09]} castShadow>
      <sphereGeometry args={[1,16,12]} /><meshStandardMaterial color={i%2 ? "#526c4c" : "#6c8256"} roughness={0.72} />
    </mesh>)}
  </group>;
};

const KitchenFeatureWall = ({ room, textureProps, coverage, wallColor }) => {
  const { width, height } = ROOM_TEMPLATES[room];
  const { backZ, backsplash } = getKitchenLayout(ROOM_TEMPLATES[room]);
  if (coverage === "full") return <RoomWallPanel textureProps={textureProps} tiled wallColor={wallColor} position={[0, height / 2, backZ]} dimensions={[width, height]} repeatWidth={width} repeatHeight={height} />;
  return <group>
    <mesh position={[0, height / 2, backZ - 0.012]} receiveShadow><planeGeometry args={[width, height]} /><meshStandardMaterial color={wallColor} roughness={0.88} /></mesh>
    <group position={[0, backsplash.bottom + backsplash.height / 2, backZ + 0.012]}>
      <TiledSurface {...textureProps} repeatWidth={backsplash.width} repeatHeight={backsplash.height} wallRegion={{ fullWidth: width, fullHeight: height, centerX: 0, centerY: backsplash.bottom + backsplash.height / 2 - height / 2 }} />
    </group>
  </group>;
};

const Room = ({ tile, room, surface, appearance, wallAppearance, kitchen, inspection, quality }) => {
  const tileSize = useMemo(() => getTileDimensions(tile.size), [tile.size]);
  const { width, depth, height } = ROOM_TEMPLATES[room];
  const textureProps = {
    imageUrl: tile.imageUrl, faceUrls: tile.faceUrls,
    normalMapUrl: tile.normalMapUrl, roughnessMapUrl: tile.roughnessMapUrl,
    tileWidth: tileSize.width, tileHeight: tileSize.height, ...appearance,
  };
  const wallMode = surface !== "floor";
  const wallTextureProps = {
    ...textureProps, ...wallAppearance, wallSurface: true,
    rotation: getWallRotation(tileSize, wallAppearance.orientation),
  };
  const wallColor = room === "bathroom" ? "#e5e1d9" : "#e8e3db";
  const panel = { textureProps: wallTextureProps, tiled: wallMode && !(room === "kitchen" && kitchen.coverage === "backsplash"), wallColor };
  return <group>
    {!wallMode && <ArchitecturalDetails room={room} lighting={appearance.lighting} />}
    <mesh position={[0,height,0]} rotation={[Math.PI/2,0,0]}><planeGeometry args={[width,depth]} /><meshStandardMaterial color="#f4f0e9" roughness={0.95} /></mesh>
    <group rotation={[-Math.PI / 2, 0, 0]}>
      {surface !== "walls" ? <TiledSurface {...textureProps} repeatWidth={width} repeatHeight={depth} /> :
        <mesh receiveShadow><planeGeometry args={[width, depth]} /><meshStandardMaterial color="#c7c1b7" roughness={0.86} /></mesh>}
    </group>
    {room === "kitchen" && wallMode ? <KitchenFeatureWall room={room} textureProps={wallTextureProps} coverage={kitchen.coverage} wallColor={wallColor} /> :
      <RoomWallPanel {...panel} position={[0, height / 2, -depth / 2]} dimensions={[width, height]} repeatWidth={width} repeatHeight={height} />}
    {/* Left wall surrounds a real, floor-height daylight opening. */}
    <group position={[-width/2, 0, 0]} rotation={[0, Math.PI/2, 0]}>
      {[-1,1].map((side) => <RoomWallPanel key={side} {...panel} position={[side*depth*0.35,height/2,0]} dimensions={[depth*0.3,height]} repeatWidth={depth*0.3} repeatHeight={height} wallRegion={{ fullWidth: depth, fullHeight: height, centerX: side*depth*0.35, centerY: 0 }} />)}
      <RoomWallPanel {...panel} position={[0,height*0.95,0]} dimensions={[depth*0.4,height*0.1]} repeatWidth={depth*0.4} repeatHeight={height*0.1} wallRegion={{ fullWidth: depth, fullHeight: height, centerX: 0, centerY: height*0.45 }} />
      <mesh position={[0,height*0.45,-0.12]}><planeGeometry args={[depth*0.4,height*0.9]} /><meshBasicMaterial color="#d7e6e9" /></mesh>
      {[-1,-0.5,0,0.5,1].map((side) => <mesh key={side} position={[side*depth*0.2,height*0.45,0.04]} castShadow>
        <boxGeometry args={[0.08,height*0.9,0.18]} /><meshStandardMaterial color="#5c584e" roughness={0.5} metalness={0.3} />
      </mesh>)}
      {[0.08,height*0.9].map((y) => <mesh key={y} position={[0,y,0.04]} castShadow><boxGeometry args={[depth*0.4,0.12,0.18]} /><meshStandardMaterial color="#5c584e" roughness={0.5} /></mesh>)}
    </group>
    <RoomWallPanel {...panel} position={[width / 2, height / 2, 0]} rotation={[0, -Math.PI / 2, 0]} dimensions={[depth, height]} repeatWidth={depth} repeatHeight={height} />

    {[-1, 1].map((side) => <RoomWallPanel key={side} {...panel} position={[side * width * 0.375, height / 2, depth / 2]} rotation={[0, Math.PI, 0]} dimensions={[width / 4, height]} repeatWidth={width / 4} repeatHeight={height} wallRegion={{ fullWidth: width, fullHeight: height, centerX: side*width*0.375, centerY: 0 }} />)}
    <RoomWallPanel {...panel} position={[0, height * 0.95, depth / 2]} rotation={[0, Math.PI, 0]} dimensions={[width / 2, height * 0.1]} repeatWidth={width / 2} repeatHeight={height * 0.1} wallRegion={{ fullWidth: width, fullHeight: height, centerX: 0, centerY: height*0.45 }} />
    {[-1, 0, 1].map((side) => <mesh key={side} position={[side * width / 4, height * 0.45, depth / 2]} castShadow>
      <boxGeometry args={[0.09, height * 0.9, 0.12]} /><meshStandardMaterial color="#554b40" roughness={0.45} metalness={0.3} />
    </mesh>)}
    <mesh position={[0, height * 0.45, depth / 2 + 0.05]} rotation={[0, Math.PI, 0]}>
      <planeGeometry args={[width / 2, height * 0.9]} />
      <meshStandardMaterial color="#dbe9eb" emissive="#dbe9eb" emissiveIntensity={0.45} roughness={0.2} />
    </mesh>
    {[
      [[0, 0.15, -depth/2+0.04], [width, 0.3, 0.08]],
      [[-width/2+0.04, 0.15, 0], [0.08, 0.3, depth]],
      [[width/2-0.04, 0.15, 0], [0.08, 0.3, depth]],
    ].map(([position, dimensions], index) => <mesh key={index} position={position} receiveShadow>
      <boxGeometry args={dimensions} /><meshStandardMaterial color="#c1b4a2" roughness={0.65} />
    </mesh>)}
    {appearance.furniture && <>
      {/* Existing furniture remains in feet, placed against the enlarged back wall. */}
      {room === "kitchen" && wallMode ? <WallKitchen room={ROOM_TEMPLATES[room]} slabColor={kitchen.slabColor} upperCabinets={kitchen.upperCabinets} inspection={inspection} /> :
        !inspection && <RoomFurnishings room={room} slabColor={kitchen.slabColor} upperCabinets={kitchen.upperCabinets} />}
      {!inspection && <ShowroomPlant room={room} />}
      {quality !== "performance" && <ContactShadows key={`${room}-${surface}-${tile.imageUrl}-${appearance.rotation}-${appearance.pattern}-${appearance.jointWidth}-${wallMode ? `${inspection}-${kitchen.upperCabinets}` : "floor"}`} position={[0, 0.015, 0]} opacity={0.28} scale={Math.max(width, depth)} blur={2.5} far={5} resolution={256} frames={1} />}
    </>}
  </group>;
};

const PreviewLoadingFallback = () => (
  <mesh position={[0, 2, 0]}>
    <boxGeometry args={[4, 0.08, 4]} />
    <meshStandardMaterial color="#a46d45" wireframe />
  </mesh>
);

class VisualizerErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("Unable to render the tile visualizer:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="tile-visualizer-error" role="alert">
          The 3D preview could not be loaded. Please return to the gallery and try
          another product image.
        </div>
      );
    }
    return this.props.children;
  }
}

const TileVisualizer = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const tile = location.state?.tile;
  const [initialCamera] = useState(() => {
    if (tile?.type !== "wall") return DEFAULT_CAMERA;
    const view = getWallCameraView(ROOM_TEMPLATES.living, "front");
    return { position: view.position, fov: view.fov, near: 0.05, far: 120 };
  });
  const [room, setRoom] = useState("living");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState("");
  const [autoRotate, setAutoRotate] = useState(true);
  const [autoZoom, setAutoZoom] = useState(true);
  const [preset, setPreset] = useState("close");
  const [wallPreset, setWallPreset] = useState("front");
  const [wallOrientation, setWallOrientation] = useState("vertical");
  const [wallPattern, setWallPattern] = useState("straight");
  const [wallFinish, setWallFinish] = useState("product");
  const [wallGroutColor, setWallGroutColor] = useState("#b5b2ab");
  const [wallJointWidth, setWallJointWidth] = useState(2);
  const [slabColor, setSlabColor] = useState(null);
  const [upperCabinets, setUpperCabinets] = useState(true);
  const [coverage, setCoverage] = useState("full");
  const [inspection, setInspection] = useState(false);
  const [cameraReset, setCameraReset] = useState(0);
  const [finish, setFinish] = useState("product");
  const [groutColor, setGroutColor] = useState("#b5b2ab");
  const [jointWidth, setJointWidth] = useState(2);
  const [pattern, setPattern] = useState("straight");
  const [rotation, setRotation] = useState(0);
  const [furniture, setFurniture] = useState(true);
  const [lighting, setLighting] = useState("daylight");
  const [quality, setQuality] = useState("balanced");
  const dimensions = getTileDimensions(tile?.size);
  const resolvedFinish = finish === "product" ? getProductFinish(tile) : finish;
  const stageRef = useRef(null);
  const [surface, setSurface] = useState(
    tile?.type === "wall" ? "walls" : "floor"
  );

  const wallMode = surface !== "floor";
  const activePreset = wallMode ? wallPreset : preset;
  const resolvedWallFinish = wallFinish === "product" ? getProductFinish(tile) : wallFinish;
  const cameraPresets = wallMode ? {
    ...(surface === "both" ? { balanced: "Floor & Wall" } : {}),
    ...Object.fromEntries(Object.entries(WALL_CAMERA_PRESETS).filter(([value]) => value !== "backsplash" || room === "kitchen")),
  } : CAMERA_PRESETS;

  const selectSurface = (nextSurface) => {
    if (surface === nextSurface) return;
    setSurface(nextSurface);
    setInspection(false);
    setWallPreset(nextSurface === "both" ? "balanced" : "front");
    setCameraReset((value) => value + 1);
  };

  const selectCamera = (nextPreset) => {
    if (wallMode) setWallPreset(nextPreset);
    else setPreset(nextPreset);
    setInspection(false);
    setCameraReset((value) => value + 1);
    setAutoRotate(false);
    setAutoZoom(false);
  };

  const changeRoom = (nextRoom) => {
    setRoom(nextRoom);
    setInspection(false);
    if (wallMode) setWallPreset(surface === "both" ? "balanced" : "front");
  };

  const inspectWall = () => {
    const nextInspection = !inspection;
    setInspection(nextInspection);
    setWallPreset(nextInspection ? (room === "kitchen" && coverage === "backsplash" ? "backsplash" : "inspect") : (surface === "both" ? "balanced" : "front"));
    setCameraReset((value) => value + 1);
    setAutoRotate(false);
    setAutoZoom(false);
  };

  useEffect(() => {
    const syncFullscreenState = () => {
      setIsFullscreen(document.fullscreenElement === stageRef.current);
    };
    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () => document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  const toggleFullscreen = async () => {
    setFullscreenError("");
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        setAutoRotate(true);
        setAutoZoom(true);
        if (wallMode) setWallPreset("wall-close");
        else setPreset("close");
        setInspection(false);
        setCameraReset((value) => value + 1);
        if (stageRef.current?.requestFullscreen) {
          await stageRef.current.requestFullscreen();
        } else {
          setFullscreenError("Full screen is not supported by this browser.");
        }
      }
    } catch (error) {
      console.error("Unable to change visualizer full-screen mode:", error);
      setFullscreenError("Unable to open full screen. Please check your browser permissions.");
    }
  };

  const backToGallery = () => {
    if (window.history.state?.idx > 0) {
      navigate(-1);
    } else {
      navigate(COLLECTION_PATH);
    }
  };

  if (!tile?.imageUrl) {
    return (
      <main className="tile-visualizer-page">
        <button className="tile-visualizer-back" onClick={backToGallery} type="button">
          ← Back to products
        </button>
        <p className="tile-visualizer-error" role="alert">
          This preview needs to be opened from a product in the collection gallery.
        </p>
      </main>
    );
  }

  return (
    <main className="tile-visualizer-page">
      <header className="tile-visualizer-toolbar">
        <div className="tile-visualizer-product">
          <button className="tile-visualizer-back" onClick={backToGallery} type="button">
            ← Back to products
          </button>
          <div>
            <span className="tile-visualizer-eyebrow">TILES WALA · MATERIAL STUDIO</span>
            <h1>{tile.name}</h1>
            <p>{tile.size}{tile.finish ? ` · ${tile.finish}` : ""}</p>
          </div>
        </div>
        <div className="tile-visualizer-controls">
          <label>
            Room
            <select value={room} onChange={(event) => changeRoom(event.target.value)}>
              {Object.entries(ROOM_TEMPLATES).map(([key, template]) => (
                <option value={key} key={key}>{template.label}</option>
              ))}
            </select>
          </label>
          <fieldset className="tile-visualizer-surface">
            <legend>Apply tile to</legend>
            {[
              ["floor", "Floor"],
              ["walls", "Walls"],
              ["both", "Both"],
            ].map(([value, label]) => (
              <button
                className={surface === value ? "is-selected" : ""}
                key={value}
                onClick={() => selectSurface(value)}
                type="button"
                aria-pressed={surface === value}
              >
                {label}
              </button>
            ))}
          </fieldset>
          <button
            className="tile-visualizer-fullscreen-button"
            type="button"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Exit full screen" : "View full screen"}
            title={isFullscreen ? "Exit full screen" : "View full screen"}
          >
            <span aria-hidden="true">{isFullscreen ? "⤢" : "⛶"}</span>
            <span>{isFullscreen ? "Exit" : "Full screen"}</span>
          </button>
        </div>
      </header>

      <details className="tile-visualizer-settings">
        <summary>Tile & scene settings</summary>
        <div className="tile-visualizer-settings-grid">
          {surface !== "walls" && <>
          {surface === "both" && <p className="tile-visualizer-settings-heading">Floor tile settings</p>}
          <label>Finish<select value={finish} onChange={(e) => setFinish(e.target.value)}>
            <option value="product">Product finish ({FINISHES[getProductFinish(tile)].label})</option>
            {Object.entries(FINISHES).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}
          </select></label>
          <label>Layout<select value={pattern} onChange={(e) => setPattern(e.target.value)}>
            <option value="straight">Straight</option><option value="brick">Brick / staggered</option><option value="vertical">Vertical</option><option value="horizontal">Horizontal</option>
          </select></label>
          <label>Rotation<select value={rotation} onChange={(e) => setRotation(Number(e.target.value))}><option value={0}>0°</option><option value={90}>90°</option></select></label>
          <label>Grout / epoxy<select value={groutColor} onChange={(e) => setGroutColor(e.target.value)}>
            <option value="#eeeae2">White</option><option value="#b5b2ab">Light Grey</option><option value="#626363">Dark Grey</option><option value="#c6b599">Beige</option><option value="#272727">Black</option>
          </select></label>
          <label>Joint width: {jointWidth} mm<input aria-label="Joint width" type="range" min="1" max="5" step="0.5" value={jointWidth} onChange={(e) => setJointWidth(Number(e.target.value))} /></label>
          </>}
          {wallMode && <>
            <p className="tile-visualizer-settings-heading">Wall tile settings</p>
            <label>Wall Tile Orientation<select value={wallOrientation} onChange={(e) => setWallOrientation(e.target.value)}>
              <option value="vertical">Vertical</option><option value="horizontal">Horizontal</option>
            </select></label>
            <label>Wall layout<select value={wallPattern} onChange={(e) => setWallPattern(e.target.value)}><option value="straight">Straight</option><option value="brick">Brick / staggered</option></select></label>
            <label>Wall finish<select value={wallFinish} onChange={(e) => setWallFinish(e.target.value)}>
              <option value="product">Product finish ({FINISHES[getProductFinish(tile)].label})</option>
              {Object.entries(FINISHES).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}
            </select></label>
            <label>Wall grout / epoxy<select value={wallGroutColor} onChange={(e) => setWallGroutColor(e.target.value)}>
              <option value="#eeeae2">White</option><option value="#b5b2ab">Light Grey</option><option value="#626363">Dark Grey</option><option value="#c6b599">Beige</option><option value="#272727">Black</option>
            </select></label>
            <label>Wall joint width: {wallJointWidth} mm<input aria-label="Wall joint width" type="range" min="1" max="5" step="0.5" value={wallJointWidth} onChange={(e) => setWallJointWidth(Number(e.target.value))} /></label>
            {Math.abs(dimensions.width - dimensions.height) < 0.001 && <small className="tile-visualizer-square-note">Square tiles retain their dimensions; orientation rotates the tile face.</small>}
          </>}
          {room === "kitchen" && <>
            <p className="tile-visualizer-settings-heading">Kitchen customization</p>
            <fieldset className="tile-visualizer-slab-colors">
              <legend>Kitchen Slab Color</legend>
              {["white", "black"].map((value) => <button key={value} type="button" aria-label={value === "white" ? "White slab" : "Black slab"} aria-pressed={(slabColor || "white") === value} onClick={() => setSlabColor(value)}>
                <span className={value === "white" ? "slab-swatch-white" : "slab-swatch-black"} aria-hidden="true" />{value === "white" ? "White" : "Black"}
              </button>)}
            </fieldset>
            {wallMode && <label>Tile Coverage<select value={coverage} onChange={(e) => setCoverage(e.target.value)}><option value="full">Full Wall</option><option value="backsplash">Backsplash Only</option></select></label>}
            <label className="tile-visualizer-checkbox"><input type="checkbox" checked={upperCabinets} onChange={(e) => setUpperCabinets(e.target.checked)} />Show upper cabinets</label>
          </>}
          <label>Lighting<select value={lighting} onChange={(e) => setLighting(e.target.value)}><option value="daylight">Daylight</option><option value="warm">Warm interior</option></select></label>
          <label>Quality<select value={quality} onChange={(e) => setQuality(e.target.value)}><option value="performance">Performance</option><option value="balanced">Balanced</option><option value="high">High Quality</option></select></label>
          <label className="tile-visualizer-checkbox"><input type="checkbox" checked={furniture} onChange={(e) => setFurniture(e.target.checked)} />Show furniture</label>
        </div>
      </details>
      <section
        className="tile-visualizer-stage"
        ref={stageRef}
        aria-label={`${tile.name} 3D room preview`}
      >
        <div className="tile-visualizer-overlay-toolbar">
        {isFullscreen && (
          <button
            className="tile-visualizer-exit-fullscreen"
            type="button"
            onClick={toggleFullscreen}
            aria-label="Exit full screen"
          >
            <span aria-hidden="true">⤢</span>
            Exit full screen
          </button>
        )}
        <button
          className="tile-visualizer-rotation-toggle"
          type="button"
          onClick={() => setAutoRotate((rotating) => !rotating)}
          aria-label={autoRotate ? "Pause auto-rotate" : "Resume auto-rotate"}
          aria-pressed={autoRotate}
          title={autoRotate ? "Pause auto-rotate" : "Resume auto-rotate"}
        >
          <span aria-hidden="true">{autoRotate ? "Ⅱ" : "▶"}</span>
          {autoRotate ? "Pause rotation" : "Auto-rotate"}
        </button>
        <button
          className="tile-visualizer-zoom-toggle"
          type="button"
          onClick={() => setAutoZoom((zooming) => !zooming)}
          aria-label={autoZoom ? "Pause auto-zoom" : "Resume auto-zoom"}
          aria-pressed={autoZoom}
          title={autoZoom ? "Pause auto-zoom" : "Resume auto-zoom"}
        >
          <span aria-hidden="true">⌕</span>
          {autoZoom ? "Pause zoom" : "Auto-zoom"}
        </button>
        <div className="tile-visualizer-scene-label">
          <span className="tile-visualizer-live-dot" />
          {ROOM_TEMPLATES[room].label} · {
            surface === "both"
              ? "Floor & walls"
              : surface.charAt(0).toUpperCase() + surface.slice(1)
          }
        </div>
        </div>
        <div className={`tile-visualizer-camera-presets${wallMode ? " tile-visualizer-wall-cameras" : ""}`} role="group" aria-label="Camera views">
          {Object.entries(cameraPresets).map(([value, label]) => <button key={value} type="button" aria-pressed={activePreset === value} onClick={() => selectCamera(value)}>{label}</button>)}
          {wallMode && <button type="button" aria-pressed={inspection} onClick={inspectWall}>{inspection ? "Exit wall inspection" : "Inspect Wall Tiles"}</button>}
          <button type="button" onClick={() => selectCamera(wallMode ? (surface === "both" ? "balanced" : "front") : "floor")}>Reset camera</button>
        </div>
        <div className="tile-visualizer-tile-chip">
          <img src={tile.imageUrl} alt="" />
          <span>
            <strong>{tile.name}</strong>
            <small>{tile.size} tile</small>
          </span>
        </div>
        <VisualizerErrorBoundary key={tile.imageUrl}>
          <Canvas
            shadows dpr={[1, QUALITY[quality].dpr]}
            camera={initialCamera}
            gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, outputColorSpace: THREE.SRGBColorSpace }}
            onCreated={({ gl }) => { gl.toneMappingExposure = 1; gl.shadowMap.type = THREE.PCFSoftShadowMap; }}
          >
            <color attach="background" args={["#e9e5df"]} />
            <Suspense fallback={<PreviewLoadingFallback />}>
              {/* Local studio lighting: no remote HDR download or dependency on a CDN. */}
              <Environment key={`${quality}-${lighting}-${room}-${furniture}-${wallMode ? `${slabColor}-${upperCabinets}-${inspection}-${surface}` : `floor-${slabColor}-${upperCabinets}`}`} resolution={quality === "high" ? 256 : 128} frames={1}>
                <Lightformer form="rect" intensity={lighting === "warm" ? 1.8 : 3} color={lighting === "warm" ? "#ffe1b2" : "#e9f3ff"} position={[0, 5, 16]} scale={[12, 8, 1]} />
                <Lightformer form="rect" intensity={1.2} color="#fff0d8" position={[-12, 8, 0]} rotation={[0, Math.PI / 2, 0]} scale={[8, 4, 1]} />
                <Lightformer form="rect" intensity={1.5} position={[0, 10, -8]} rotation={[Math.PI / 2, 0, 0]} scale={[10, 5, 1]} />
                <hemisphereLight intensity={1.5} args={["#fff4df", "#847661", 1.5]} />
                {furniture && (wallMode && room === "kitchen" ? <WallKitchen room={ROOM_TEMPLATES[room]} slabColor={slabColor} upperCabinets={upperCabinets} inspection={inspection} /> :
                  !inspection && <RoomFurnishings room={room} slabColor={slabColor} upperCabinets={upperCabinets} />)}
                {wallMode && <Lightformer form="rect" intensity={0.8} color="#eef4ff" position={[0, 6, 1]} rotation={[0, Math.PI, 0]} scale={[6, 5, 1]} />}
              </Environment>
              <hemisphereLight args={[lighting === "warm" ? "#ffecd4" : "#f0f6ff", "#a99b8b", 1.1]} />
              <directionalLight key={quality} position={[8, 14, 20]} intensity={lighting === "warm" ? 1.2 : 2.2} color={lighting === "warm" ? "#ffd6a1" : "#fff3df"} castShadow
                shadow-mapSize-width={QUALITY[quality].shadow} shadow-mapSize-height={QUALITY[quality].shadow}
                shadow-camera-left={-22} shadow-camera-right={22} shadow-camera-top={24} shadow-camera-bottom={-24}
                shadow-camera-far={85} shadow-normalBias={0.025} shadow-bias={-0.0001} shadow-radius={3} />
              <pointLight position={[-5, 9, -10]} intensity={lighting === "warm" ? 100 : 25} color="#ffe1b2" decay={2} />
              {wallMode && <Suspense fallback={null}><WallLighting room={ROOM_TEMPLATES[room]} kitchen={room === "kitchen"} quality={quality} furniture={furniture} upperCabinets={upperCabinets} inspection={inspection} view={activePreset} /></Suspense>}
              <Room tile={tile} room={room} surface={surface} quality={quality} inspection={inspection}
                wallAppearance={{ orientation: wallOrientation, pattern: wallPattern, finish: resolvedWallFinish, groutColor: wallGroutColor, jointWidth: wallJointWidth }}
                kitchen={{ slabColor, upperCabinets, coverage }}
                appearance={{ finish: resolvedFinish, groutColor, jointWidth, pattern, rotation, furniture, lighting }} />
            </Suspense>
            {!wallMode && preset === "top" && <LayoutCamera room={room} />}
            <RoomOrbitControls room={room} surface={surface} preset={activePreset} reset={cameraReset} autoRotate={autoRotate} autoZoom={autoZoom} upperCabinets={upperCabinets && !inspection} coverage={coverage} />
          </Canvas>
        </VisualizerErrorBoundary>
        <p className="tile-visualizer-hint">
          Drag to orbit · scroll or pinch to zoom · right-drag to pan
        </p>
      </section>
      <p className="tile-visualizer-note">
        {dimensions.fallback ? "Size unavailable: preview uses a 2 × 4 ft tile. " : "Tile scale follows product dimensions. "}
        {wallMode ? wallJointWidth : jointWidth} mm joints · {FINISHES[wallMode ? resolvedWallFinish : resolvedFinish].label} · Preview colors and reflections vary with your display.
      </p>
      {fullscreenError && (
        <p className="tile-visualizer-fullscreen-error" role="alert">
          {fullscreenError}
        </p>
      )}
    </main>
  );
};

export default TileVisualizer;
