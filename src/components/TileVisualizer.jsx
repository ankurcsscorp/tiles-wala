import React, {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useLocation, useNavigate } from "react-router-dom";
import "./TileVisualizer.css";

const COLLECTION_PATH = "/";

const ROOM_TEMPLATES = {
  living: { label: "Living Room", width: 16, depth: 13, height: 9 },
  bedroom: { label: "Bedroom", width: 13, depth: 12, height: 9 },
  bathroom: { label: "Bathroom", width: 10, depth: 9, height: 8 },
  kitchen: { label: "Kitchen", width: 13, depth: 12, height: 9 },
};

const getAutoZoomOffset = (elapsed) =>
  Math.sin((elapsed / 16) * Math.PI * 2) * 1.25;

const RoomOrbitControls = ({ autoRotate, autoZoom }) => {
  const { camera, gl } = useThree();
  const dragPosition = useRef(null);
  const activePointers = useRef(new Map());
  const pinchDistance = useRef(0);
  const spherical = useRef(null);
  const isInteracting = useRef(false);
  const resumeRotationTimer = useRef(null);
  const zoomElapsed = useRef(0);
  const zoomBaseRadius = useRef(null);
  const target = useMemo(() => new THREE.Vector3(0, 3.5, -1), []);

  useEffect(() => {
    const element = gl.domElement;
    spherical.current = new THREE.Spherical().setFromVector3(
      camera.position.clone().sub(target)
    );
    zoomBaseRadius.current = spherical.current.radius;

    const updateCamera = () => {
      const nextPosition = new THREE.Vector3()
        .setFromSpherical(spherical.current)
        .add(target);
      camera.position.copy(nextPosition);
      camera.lookAt(target);
    };
    const pauseRotation = () => {
      isInteracting.current = true;
      window.clearTimeout(resumeRotationTimer.current);
    };
    const scheduleRotationResume = () => {
      window.clearTimeout(resumeRotationTimer.current);
      resumeRotationTimer.current = window.setTimeout(() => {
        isInteracting.current = false;
      }, 1800);
    };
    const measurePinchDistance = () => {
      const [first, second] = [...activePointers.current.values()];
      return Math.hypot(second.x - first.x, second.y - first.y);
    };
    const onPointerDown = (event) => {
      if (event.button !== 0) return;
      pauseRotation();
      activePointers.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
        pointerType: event.pointerType,
      });
      if (activePointers.current.size === 1) {
        dragPosition.current = { x: event.clientX, y: event.clientY };
      } else if (event.pointerType === "touch") {
        dragPosition.current = null;
        pinchDistance.current = measurePinchDistance();
      }
      element.setPointerCapture?.(event.pointerId);
    };
    const onPointerMove = (event) => {
      if (!activePointers.current.has(event.pointerId)) return;
      activePointers.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
        pointerType: event.pointerType,
      });
      if (event.pointerType === "touch" && activePointers.current.size > 1) {
        const nextPinchDistance = measurePinchDistance();
        if (pinchDistance.current > 0 && nextPinchDistance > 0) {
          const previousRadius = spherical.current.radius;
          spherical.current.radius = THREE.MathUtils.clamp(
            previousRadius * (pinchDistance.current / nextPinchDistance),
            7,
            32
          );
          zoomBaseRadius.current = THREE.MathUtils.clamp(
            zoomBaseRadius.current + spherical.current.radius - previousRadius,
            7,
            32
          );
          updateCamera();
        }
        pinchDistance.current = nextPinchDistance;
        return;
      }
      if (!dragPosition.current) return;
      const deltaX = event.clientX - dragPosition.current.x;
      const deltaY = event.clientY - dragPosition.current.y;
      dragPosition.current = { x: event.clientX, y: event.clientY };
      spherical.current.theta -= deltaX * 0.006;
      spherical.current.phi = THREE.MathUtils.clamp(
        spherical.current.phi + deltaY * 0.006,
        0.2,
        Math.PI / 2 - 0.04
      );
      updateCamera();
    };
    const stopDragging = (event) => {
      activePointers.current.delete(event.pointerId);
      element.releasePointerCapture?.(event.pointerId);
      if (activePointers.current.size > 1) {
        pinchDistance.current = measurePinchDistance();
      } else if (activePointers.current.size === 1) {
        const remainingPointer = activePointers.current.values().next().value;
        dragPosition.current = { x: remainingPointer.x, y: remainingPointer.y };
        pinchDistance.current = 0;
      } else {
        dragPosition.current = null;
        pinchDistance.current = 0;
      }
      if (activePointers.current.size === 0 && zoomBaseRadius.current !== null) {
        zoomBaseRadius.current = THREE.MathUtils.clamp(
          spherical.current.radius - getAutoZoomOffset(zoomElapsed.current),
          7,
          32
        );
        scheduleRotationResume();
      }
    };
    const onWheel = (event) => {
      event.preventDefault();
      pauseRotation();
      const previousRadius = spherical.current.radius;
      spherical.current.radius = THREE.MathUtils.clamp(
        spherical.current.radius * (1 + event.deltaY * 0.001),
        7,
        32
      );
      zoomBaseRadius.current = THREE.MathUtils.clamp(
        zoomBaseRadius.current + spherical.current.radius - previousRadius,
        7,
        32
      );
      updateCamera();
      scheduleRotationResume();
    };

    element.addEventListener("pointerdown", onPointerDown);
    element.addEventListener("pointermove", onPointerMove);
    element.addEventListener("pointerup", stopDragging);
    element.addEventListener("pointercancel", stopDragging);
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      element.removeEventListener("pointerdown", onPointerDown);
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerup", stopDragging);
      element.removeEventListener("pointercancel", stopDragging);
      element.removeEventListener("wheel", onWheel);
      window.clearTimeout(resumeRotationTimer.current);
    };
  }, [camera, gl, target]);

  useFrame((_, delta) => {
    if (isInteracting.current || !spherical.current) return;
    if (autoRotate) spherical.current.theta -= delta * 0.16;
    if (autoZoom && zoomBaseRadius.current !== null) {
      zoomElapsed.current += delta;
      spherical.current.radius = THREE.MathUtils.clamp(
        zoomBaseRadius.current + getAutoZoomOffset(zoomElapsed.current),
        7,
        32
      );
    }
    camera.position
      .setFromSpherical(spherical.current)
      .add(target);
    camera.lookAt(target);
  });

  return null;
};

const getTileDimensions = (size) => {
  const value = String(size ?? "");
  const dimensions = [...value.matchAll(/(\d+(?:\.\d+)?)\s*(mm|cm|m|ft|feet|')?/gi)];
  if (dimensions.length < 2) return { width: 2, height: 4 };

  const defaultUnit =
    dimensions.find((dimension) => dimension[2])?.[2]?.toLowerCase() ?? "mm";
  const toFeet = (dimension) => {
    const amount = Number(dimension[1]);
    const unit = (dimension[2] || defaultUnit).toLowerCase();
    if (unit === "mm") return amount / 304.8;
    if (unit === "cm") return amount / 30.48;
    if (unit === "m") return amount / 0.3048;
    return amount;
  };

  return {
    width: Math.max(toFeet(dimensions[0]), 0.1),
    height: Math.max(toFeet(dimensions[1]), 0.1),
  };
};

const TiledMaterial = ({
  imageUrl,
  tileWidth,
  tileHeight,
  repeatWidth,
  repeatHeight,
  roughness,
}) => {
  const sourceTexture = useLoader(THREE.TextureLoader, imageUrl);
  const texture = useMemo(() => {
    const repeatedTexture = sourceTexture.clone();
    repeatedTexture.colorSpace = THREE.SRGBColorSpace;
    repeatedTexture.wrapS = THREE.RepeatWrapping;
    repeatedTexture.wrapT = THREE.RepeatWrapping;
    repeatedTexture.repeat.set(repeatWidth / tileWidth, repeatHeight / tileHeight);
    repeatedTexture.needsUpdate = true;
    return repeatedTexture;
  }, [sourceTexture, repeatWidth, repeatHeight, tileWidth, tileHeight]);

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <meshStandardMaterial
      map={texture}
      roughness={roughness}
      metalness={0}
      side={THREE.DoubleSide}
    />
  );
};

const Sofa = () => (
  <group position={[0, 0, -2.35]}>
    <mesh position={[0, 0.64, 0]} castShadow receiveShadow>
      <boxGeometry args={[6.4, 0.8, 2.2]} />
      <meshStandardMaterial color="#b88768" roughness={0.82} />
    </mesh>
    <mesh position={[0, 1.45, -0.78]} castShadow receiveShadow>
      <boxGeometry args={[6.1, 1.15, 0.65]} />
      <meshStandardMaterial color="#a87558" roughness={0.86} />
    </mesh>
    {[-3.05, 3.05].map((x) => (
      <mesh key={x} position={[x, 1.12, 0]} castShadow>
        <boxGeometry args={[0.55, 1.25, 2.25]} />
        <meshStandardMaterial color="#986c55" roughness={0.88} />
      </mesh>
    ))}
    {[-1.85, 0, 1.85].map((x, index) => (
      <mesh key={x} position={[x, 1.14, -0.24]} rotation={[0, 0, index === 1 ? 0 : -0.07]} castShadow>
        <boxGeometry args={[1.65, 0.68, 1.45]} />
        <meshStandardMaterial color={index === 1 ? "#d3b69c" : "#c69a79"} roughness={0.9} />
      </mesh>
    ))}
    {[-2.55, 2.55].map((x) => (
      <mesh key={x} position={[x, 0.17, -0.72]} castShadow>
        <cylinderGeometry args={[0.09, 0.07, 0.34, 12]} />
        <meshStandardMaterial color="#523c30" roughness={0.55} />
      </mesh>
    ))}
    {[-1.25, 1.25].map((x) => (
      <mesh key={x} position={[x, 1.52, -0.38]} rotation={[0, 0, x < 0 ? -0.12 : 0.12]} castShadow>
        <boxGeometry args={[1.1, 0.9, 0.24]} />
        <meshStandardMaterial color={x < 0 ? "#e6d9c7" : "#78908a"} roughness={0.96} />
      </mesh>
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
            Math.sin(index * Math.PI / 2) * 0.38,
            2.3 + (index % 2) * 0.22,
            Math.cos(index * Math.PI / 2) * 0.3,
          ]}
          rotation={[0.28, index * Math.PI / 2, -0.32]}
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
  <group position={[0, 0, 1.1]}>
    <mesh position={[0, 0.72, 0]} castShadow>
      <boxGeometry args={[4.1, 0.17, 2.15]} />
      <meshStandardMaterial color="#8a6650" roughness={0.5} />
    </mesh>
    {[-1.65, 1.65].flatMap((x) =>
      [-0.75, 0.75].map((z) => (
        <mesh key={`${x}-${z}`} position={[x, 0.36, z]} castShadow>
          <cylinderGeometry args={[0.055, 0.07, 0.68, 10]} />
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
    <mesh position={[0, 0.78, 0]} castShadow>
      <boxGeometry args={[1.65, 0.15, 1.35]} />
      <meshStandardMaterial color="#916e55" roughness={0.58} />
    </mesh>
    <mesh position={[0, 0.4, 0]} castShadow>
      <boxGeometry args={[1.4, 0.72, 1.1]} />
      <meshStandardMaterial color="#b18a6d" roughness={0.65} />
    </mesh>
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

const KitchenInteriors = () => (
  <group>
    <mesh position={[0, 0.055, -0.4]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[8.2, 5.8]} />
      <meshStandardMaterial color="#ded6c9" roughness={0.94} />
    </mesh>

    <group>
      <mesh position={[0, 1.05, -5.05]} castShadow receiveShadow>
        <boxGeometry args={[9.6, 1.75, 1.45]} />
        <meshStandardMaterial color="#69746e" roughness={0.48} />
      </mesh>
      <mesh position={[0, 2.02, -5.05]} castShadow receiveShadow>
        <boxGeometry args={[9.88, 0.18, 1.62]} />
        <meshStandardMaterial color="#e8e3da" roughness={0.2} />
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
        <meshStandardMaterial color="#e8e3da" roughness={0.2} />
      </mesh>
      {[-3.35, -1.35, 0.65, 2.65].map((z) => (
        <mesh key={`kitchen-side-door-${z}`} position={[-4.604, 1.04, z]}>
          <boxGeometry args={[0.025, 1.48, 1.86]} />
          <meshStandardMaterial color="#77837b" roughness={0.54} />
        </mesh>
      ))}
    </group>

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
        <meshStandardMaterial color="#c5b9a7" roughness={0.24} />
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

const LivingRoomFurniture = () => (
  <group>
    <mesh position={[0, 0.04, -0.2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[9.4, 7.2]} />
      <meshStandardMaterial color="#d7c4af" roughness={0.97} />
    </mesh>
    <Sofa />
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
    <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[9.8, 9.4]} />
      <meshStandardMaterial color="#d5c2ae" roughness={0.98} />
    </mesh>
    <Bed />
    <SideTable position={[-4.15, 0, -3.25]} />
    <SideTable position={[4.15, 0, -3.25]} />
    <mesh position={[0, 2.6, -5.85]} castShadow>
      <boxGeometry args={[5.2, 2.15, 0.18]} />
      <meshStandardMaterial color="#b9987e" roughness={0.78} />
    </mesh>
  </group>
);

const AnimatedRoom = ({ room, children }) => {
  const group = useRef();
  const elapsed = useRef(0);

  useEffect(() => {
    elapsed.current = 0;
  }, [room]);

  useFrame((_, delta) => {
    if (!group.current) return;
    elapsed.current = Math.min(elapsed.current + delta, 0.85);
    const progress = 1 - Math.pow(1 - elapsed.current / 0.85, 3);
    group.current.position.y = (1 - progress) * -0.65;
    group.current.scale.setScalar(0.94 + progress * 0.06);
  });

  return (
    <group ref={group} key={room}>
      {children}
    </group>
  );
};

const Room = ({ tile, room, surface }) => {
  const tileSize = useMemo(() => getTileDimensions(tile.size), [tile.size]);
  const roughness = /(matte|mat\b|satin)/i.test(
    `${tile.finish ?? ""} ${tile.description ?? ""}`
  )
    ? 0.78
    : 0.24;
  const wallColor = room === "bathroom" ? "#dedbd3" : "#d8d1c7";
  const textureProps = {
    imageUrl: tile.imageUrl,
    tileWidth: tileSize.width,
    tileHeight: tileSize.height,
    roughness,
  };

  return (
    <AnimatedRoom room={room}>
      <mesh
        position={[0, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[ROOM_TEMPLATES[room].width, ROOM_TEMPLATES[room].depth]} />
        {surface !== "walls" ? (
          <TiledMaterial
            {...textureProps}
            repeatWidth={ROOM_TEMPLATES[room].width}
            repeatHeight={ROOM_TEMPLATES[room].depth}
          />
        ) : (
          <meshStandardMaterial color="#c7c1b7" roughness={0.86} />
        )}
      </mesh>

      <mesh
        position={[0, ROOM_TEMPLATES[room].height / 2, -ROOM_TEMPLATES[room].depth / 2]}
        receiveShadow
      >
        <planeGeometry args={[ROOM_TEMPLATES[room].width, ROOM_TEMPLATES[room].height]} />
        {surface !== "floor" ? (
          <TiledMaterial
            {...textureProps}
            repeatWidth={ROOM_TEMPLATES[room].width}
            repeatHeight={ROOM_TEMPLATES[room].height}
          />
        ) : (
          <meshStandardMaterial color={wallColor} roughness={0.88} />
        )}
      </mesh>

      <mesh
        position={[-ROOM_TEMPLATES[room].width / 2, ROOM_TEMPLATES[room].height / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
        receiveShadow
      >
        <planeGeometry args={[ROOM_TEMPLATES[room].depth, ROOM_TEMPLATES[room].height]} />
        {surface !== "floor" ? (
          <TiledMaterial
            {...textureProps}
            repeatWidth={ROOM_TEMPLATES[room].depth}
            repeatHeight={ROOM_TEMPLATES[room].height}
          />
        ) : (
          <meshStandardMaterial color={wallColor} roughness={0.88} />
        )}
      </mesh>

      <mesh
        position={[ROOM_TEMPLATES[room].width / 2, ROOM_TEMPLATES[room].height / 2, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        receiveShadow
      >
        <planeGeometry args={[ROOM_TEMPLATES[room].depth, ROOM_TEMPLATES[room].height]} />
        {surface !== "floor" ? (
          <TiledMaterial
            {...textureProps}
            repeatWidth={ROOM_TEMPLATES[room].depth}
            repeatHeight={ROOM_TEMPLATES[room].height}
          />
        ) : (
          <meshStandardMaterial color={wallColor} roughness={0.88} />
        )}
      </mesh>
      {room === "living" && <LivingRoomFurniture />}
      {room === "bedroom" && <BedroomFurniture />}
      {room === "bathroom" && <BathroomFixtures />}
      {room === "kitchen" && <KitchenInteriors />}
    </AnimatedRoom>
  );
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
  const [room, setRoom] = useState("living");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState("");
  const [autoRotate, setAutoRotate] = useState(true);
  const [autoZoom, setAutoZoom] = useState(true);
  const stageRef = useRef(null);
  const [surface, setSurface] = useState(
    tile?.type === "wall" ? "walls" : "floor"
  );

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
      } else if (stageRef.current?.requestFullscreen) {
        await stageRef.current.requestFullscreen();
      } else {
        setFullscreenError("Full screen is not supported by this browser.");
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
            <span className="tile-visualizer-eyebrow">360° ROOM PREVIEW</span>
            <h1>{tile.name}</h1>
            <p>{tile.size}{tile.finish ? ` · ${tile.finish}` : ""}</p>
          </div>
        </div>
        <div className="tile-visualizer-controls">
          <label>
            Room
            <select value={room} onChange={(event) => setRoom(event.target.value)}>
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
                onClick={() => setSurface(value)}
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

      <section
        className="tile-visualizer-stage"
        ref={stageRef}
        aria-label={`${tile.name} 3D room preview`}
      >
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
        <div className="tile-visualizer-tile-chip">
          <img src={tile.imageUrl} alt="" />
          <span>
            <strong>{tile.name}</strong>
            <small>{tile.size} tile</small>
          </span>
        </div>
        <VisualizerErrorBoundary>
          <Canvas
            shadows
            dpr={[1, 2]}
            camera={{ position: [12, 9, 15], fov: 39, near: 0.1, far: 150 }}
            gl={{
              antialias: true,
              toneMapping: THREE.ACESFilmicToneMapping,
              outputColorSpace: THREE.SRGBColorSpace,
            }}
            onCreated={({ gl }) => {
              gl.toneMappingExposure = 1.15;
            }}
          >
            <color attach="background" args={["#e7e9e8"]} />
            <hemisphereLight args={["#fffaf2", "#a99b8b", 1.45]} />
            <ambientLight intensity={0.62} />
            <directionalLight
              position={[7, 15, 9]}
              intensity={3.2}
              castShadow
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
              shadow-camera-left={-12}
              shadow-camera-right={12}
              shadow-camera-top={14}
              shadow-camera-bottom={-10}
              shadow-bias={-0.00015}
            />
            <pointLight position={[-5, 7, 5]} intensity={0.9} color="#ffe9ca" />
            <pointLight position={[5, 6, -4]} intensity={0.72} color="#d7ecff" />
            {room === "bathroom" && (
              <>
                <pointLight position={[-2.8, 5.8, -3.4]} intensity={1.15} color="#fff2d6" />
                <pointLight position={[2.7, 6.1, -2.7]} intensity={0.9} color="#e8f7ff" />
              </>
            )}
            {room === "kitchen" && (
              <>
                <pointLight position={[-2.2, 5.3, -3.5]} intensity={1.1} color="#fff1d4" />
                <pointLight position={[2.4, 5.1, -3.1]} intensity={0.95} color="#fff7e7" />
              </>
            )}
            <Suspense fallback={<PreviewLoadingFallback />}>
              <Room tile={tile} room={room} surface={surface} />
            </Suspense>
            <RoomOrbitControls autoRotate={autoRotate} autoZoom={autoZoom} />
          </Canvas>
        </VisualizerErrorBoundary>
        <p className="tile-visualizer-hint">
          Drag or swipe to look around · scroll or pinch to zoom
        </p>
      </section>
      <p className="tile-visualizer-note">
        Preview only. Tile scale is estimated from the product size and room template.
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
