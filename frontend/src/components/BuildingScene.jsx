import React, { useRef, useMemo, useState, useEffect, Suspense } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { Box, Text, Sphere, Cylinder, useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';

// Check if GLB model exists
const GLB_PATH = '/assets/building.glb';

// Preload the GLB model
try {
  useGLTF.preload(GLB_PATH);
} catch (e) {
  console.log('GLB model not available, using procedural geometry');
}

// Tree colors for variety
const TREE_COLORS = ['#228B22', '#2E8B57', '#3CB371', '#006400', '#32CD32'];
const CAR_COLORS = ['#2c3e50', '#e74c3c', '#3498db', '#27ae60', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#95a5a6', '#34495e'];

// Seeded random for consistent results
function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Simple tree component
function Tree({ position, scale = 1, colorIndex = 0 }) {
  const trunkHeight = 2 * scale;
  const trunkRadius = 0.3 * scale;
  const foliageRadius = 1.5 * scale;
  const foliageHeight = 3 * scale;
  const color = TREE_COLORS[colorIndex % TREE_COLORS.length];
  
  return (
    <group position={position}>
      {/* Trunk */}
      <Cylinder
        args={[trunkRadius, trunkRadius * 1.2, trunkHeight, 8]}
        position={[0, trunkHeight / 2, 0]}
      >
        <meshStandardMaterial color="#4a3728" roughness={0.9} />
      </Cylinder>
      
      {/* Foliage - cone shape */}
      <Cylinder
        args={[0, foliageRadius, foliageHeight, 8]}
        position={[0, trunkHeight + foliageHeight / 2, 0]}
      >
        <meshStandardMaterial color={color} roughness={0.8} />
      </Cylinder>
      
      {/* Second layer of foliage */}
      <Cylinder
        args={[0, foliageRadius * 0.8, foliageHeight * 0.7, 8]}
        position={[0, trunkHeight + foliageHeight * 1.1, 0]}
      >
        <meshStandardMaterial color={color} roughness={0.8} />
      </Cylinder>
    </group>
  );
}

// Rounded/bushy tree variant
function RoundTree({ position, scale = 1, colorIndex = 0 }) {
  const trunkHeight = 1.5 * scale;
  const trunkRadius = 0.25 * scale;
  const color = TREE_COLORS[colorIndex % TREE_COLORS.length];
  
  return (
    <group position={position}>
      {/* Trunk */}
      <Cylinder
        args={[trunkRadius, trunkRadius * 1.3, trunkHeight, 8]}
        position={[0, trunkHeight / 2, 0]}
      >
        <meshStandardMaterial color="#5d4e37" roughness={0.9} />
      </Cylinder>
      
      {/* Foliage spheres */}
      <Sphere args={[1.2 * scale, 12, 12]} position={[0, trunkHeight + 1 * scale, 0]}>
        <meshStandardMaterial color={color} roughness={0.85} />
      </Sphere>
      <Sphere args={[0.9 * scale, 10, 10]} position={[0.5 * scale, trunkHeight + 1.8 * scale, 0.3 * scale]}>
        <meshStandardMaterial color={color} roughness={0.85} />
      </Sphere>
      <Sphere args={[0.8 * scale, 10, 10]} position={[-0.4 * scale, trunkHeight + 1.5 * scale, -0.4 * scale]}>
        <meshStandardMaterial color={color} roughness={0.85} />
      </Sphere>
    </group>
  );
}

// Simple car component
function Car({ position, rotation = 0, color }) {
  const carColor = color || CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
  
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Car body - lower part */}
      <Box args={[2, 0.6, 1]} position={[0, 0.4, 0]}>
        <meshStandardMaterial color={carColor} metalness={0.6} roughness={0.3} />
      </Box>
      
      {/* Car body - cabin */}
      <Box args={[1.2, 0.5, 0.9]} position={[0.1, 0.95, 0]}>
        <meshStandardMaterial color={carColor} metalness={0.6} roughness={0.3} />
      </Box>
      
      {/* Windows */}
      <Box args={[1.1, 0.35, 0.92]} position={[0.1, 0.97, 0]}>
        <meshStandardMaterial color="#1a1a2e" metalness={0.9} roughness={0.1} />
      </Box>
      
      {/* Wheels */}
      <Cylinder args={[0.25, 0.25, 0.15, 12]} rotation={[0, 0, Math.PI / 2]} position={[0.6, 0.2, 0.5]}>
        <meshStandardMaterial color="#222222" roughness={0.9} />
      </Cylinder>
      <Cylinder args={[0.25, 0.25, 0.15, 12]} rotation={[0, 0, Math.PI / 2]} position={[-0.6, 0.2, 0.5]}>
        <meshStandardMaterial color="#222222" roughness={0.9} />
      </Cylinder>
      <Cylinder args={[0.25, 0.25, 0.15, 12]} rotation={[0, 0, Math.PI / 2]} position={[0.6, 0.2, -0.5]}>
        <meshStandardMaterial color="#222222" roughness={0.9} />
      </Cylinder>
      <Cylinder args={[0.25, 0.25, 0.15, 12]} rotation={[0, 0, Math.PI / 2]} position={[-0.6, 0.2, -0.5]}>
        <meshStandardMaterial color="#222222" roughness={0.9} />
      </Cylinder>
      
      {/* Headlights */}
      <Box args={[0.05, 0.15, 0.3]} position={[1.01, 0.4, 0.3]}>
        <meshStandardMaterial color="#ffffcc" emissive="#ffffaa" emissiveIntensity={0.3} />
      </Box>
      <Box args={[0.05, 0.15, 0.3]} position={[1.01, 0.4, -0.3]}>
        <meshStandardMaterial color="#ffffcc" emissive="#ffffaa" emissiveIntensity={0.3} />
      </Box>
      
      {/* Taillights */}
      <Box args={[0.05, 0.1, 0.2]} position={[-1.01, 0.4, 0.35]}>
        <meshStandardMaterial color="#ff3333" emissive="#ff0000" emissiveIntensity={0.2} />
      </Box>
      <Box args={[0.05, 0.1, 0.2]} position={[-1.01, 0.4, -0.35]}>
        <meshStandardMaterial color="#ff3333" emissive="#ff0000" emissiveIntensity={0.2} />
      </Box>
    </group>
  );
}

// Parking space line marker
function ParkingLine({ position, rotation = 0, length = 2.5 }) {
  return (
    <Box 
      args={[0.1, 0.02, length]} 
      position={position}
      rotation={[0, rotation, 0]}
    >
      <meshStandardMaterial color="#ffffff" />
    </Box>
  );
}

// Car park with multiple cars
function CarPark({ position, rows = 2, spotsPerRow = 6, seed = 1000 }) {
  const spotWidth = 2.8;
  const spotDepth = 5;
  const aisleWidth = 4;
  
  const parkingSpots = useMemo(() => {
    const spots = [];
    const cars = [];
    
    for (let row = 0; row < rows; row++) {
      const rowZ = row * (spotDepth + aisleWidth);
      const facingOut = row % 2 === 0;
      
      for (let spot = 0; spot < spotsPerRow; spot++) {
        const spotX = spot * spotWidth;
        const spotSeed = seed + row * 100 + spot;
        
        // Add parking lines
        spots.push({
          id: `line-${row}-${spot}`,
          position: [spotX - spotWidth/2, 0.01, rowZ],
          type: 'line'
        });
        
        // Deterministically place cars (70% occupancy based on seed)
        if (seededRandom(spotSeed) < 0.7) {
          cars.push({
            id: `car-${row}-${spot}`,
            position: [spotX, 0, rowZ + (facingOut ? -0.5 : 0.5)],
            rotation: facingOut ? Math.PI/2 : -Math.PI/2, // 90° rotation to face into bay
            color: CAR_COLORS[Math.floor(seededRandom(spotSeed + 1) * CAR_COLORS.length)]
          });
        }
      }
      
      // End line for row
      spots.push({
        id: `line-${row}-end`,
        position: [spotsPerRow * spotWidth - spotWidth/2, 0.01, rowZ],
        type: 'line'
      });
    }
    
    return { spots, cars };
  }, [rows, spotsPerRow, seed]);
  
  const parkingLotWidth = spotsPerRow * spotWidth;
  const parkingLotDepth = rows * (spotDepth + aisleWidth);
  
  return (
    <group position={position}>
      {/* Parking lot surface */}
      <Box 
        args={[parkingLotWidth, 0.1, parkingLotDepth]} 
        position={[parkingLotWidth/2 - spotWidth/2, -0.05, parkingLotDepth/2 - spotDepth/2]}
      >
        <meshStandardMaterial color="#2c2c2c" roughness={0.9} />
      </Box>
      
      {/* Parking lines */}
      {parkingSpots.spots.map(spot => (
        <ParkingLine key={spot.id} position={spot.position} length={spotDepth - 0.5} />
      ))}
      
      {/* Cars */}
      {parkingSpots.cars.map(car => (
        <Car key={car.id} position={car.position} rotation={car.rotation} color={car.color} />
      ))}
      
      {/* Parking lot border/curb */}
      <Box args={[parkingLotWidth + 0.5, 0.15, 0.3]} position={[parkingLotWidth/2 - spotWidth/2, 0.05, -spotDepth/2 - 0.5]}>
        <meshStandardMaterial color="#555555" />
      </Box>
      <Box args={[parkingLotWidth + 0.5, 0.15, 0.3]} position={[parkingLotWidth/2 - spotWidth/2, 0.05, parkingLotDepth - spotDepth/2 + 0.2]}>
        <meshStandardMaterial color="#555555" />
      </Box>
    </group>
  );
}

// Tree row for landscaping
function TreeRow({ startPosition, count, spacing = 4, treeType = 'mixed', seed = 0 }) {
  const trees = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const treeSeed = seed + i * 17; // Use deterministic seed
      return {
        id: i,
        position: [startPosition[0] + i * spacing, startPosition[1], startPosition[2]],
        type: treeType === 'mixed' ? (seededRandom(treeSeed) > 0.5 ? 'cone' : 'round') : treeType,
        scale: 0.8 + seededRandom(treeSeed + 1) * 0.4,
        colorIndex: Math.floor(seededRandom(treeSeed + 2) * TREE_COLORS.length)
      };
    });
  }, [startPosition[0], startPosition[1], startPosition[2], count, spacing, treeType, seed]);
  
  return (
    <group>
      {trees.map(tree => (
        tree.type === 'cone' 
          ? <Tree key={tree.id} position={tree.position} scale={tree.scale} colorIndex={tree.colorIndex} />
          : <RoundTree key={tree.id} position={tree.position} scale={tree.scale} colorIndex={tree.colorIndex} />
      ))}
    </group>
  );
}

// Landscape elements grouped
// Building footprint is approximately x: -10 to 50, z: -10 to 30 (centered around [20, 0, 10])
// Ground plane at y=0, all elements sit ON TOP of ground (y >= 0)
function Landscape() {
  return (
    <group>
      {/* ===== MAIN GRASS LAYER - COVERS ENTIRE GROUND ===== */}
      {/* Full grass coverage at ground level - this is the base layer */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[20, 0.01, -5]} receiveShadow>
        <planeGeometry args={[180, 160]} />
        <meshStandardMaterial color="#3a7d32" roughness={0.95} />
      </mesh>
      
      {/* ===== PAVED AREAS (on top of grass) ===== */}
      {/* Building foundation/plaza - matches building footprint: 60x40 at [20,0,10] */}
      <Box args={[60, 0.1, 40]} position={[20, 0.05, 10]}>
        <meshStandardMaterial color="#555555" roughness={0.8} />
      </Box>
      
      {/* Main parking lot asphalt */}
      <Box args={[40, 0.08, 25]} position={[5, 0.04, -55]}>
        <meshStandardMaterial color="#2a2a2a" roughness={0.9} />
      </Box>
      
      {/* Secondary parking lot asphalt */}
      <Box args={[22, 0.08, 18]} position={[50, 0.04, -50]}>
        <meshStandardMaterial color="#2a2a2a" roughness={0.9} />
      </Box>
      
      {/* Main entrance road - from parking to building front */}
      <Box args={[10, 0.06, 25]} position={[20, 0.03, -27]}>
        <meshStandardMaterial color="#333333" roughness={0.85} />
      </Box>
      
      {/* Sidewalk in front of building entrance - matches building width */}
      <Box args={[60, 0.1, 4]} position={[20, 0.05, -14]}>
        <meshStandardMaterial color="#777777" roughness={0.7} />
      </Box>
      
      {/* Sidewalk around parking */}
      <Box args={[50, 0.08, 2]} position={[5, 0.04, -40]}>
        <meshStandardMaterial color="#777777" roughness={0.7} />
      </Box>
      
      {/* ===== CAR PARKS - on top of asphalt ===== */}
      {/* Main car park - positioned at z=-55 */}
      <CarPark position={[-10, 0.1, -55]} rows={2} spotsPerRow={12} seed={1000} />
      
      {/* Secondary parking - right side */}
      <CarPark position={[42, 0.1, -50]} rows={2} spotsPerRow={5} seed={2000} />
      
      {/* ===== TREES - inside grass area ===== */}
      {/* Trees along parking area front edge - inside grass at z = -60 */}
      <TreeRow startPosition={[-15, 0.02, -62]} count={5} spacing={8} treeType="round" seed={100} />
      <TreeRow startPosition={[30, 0.02, -58]} count={4} spacing={7} treeType="round" seed={200} />
      
      {/* Trees along LEFT perimeter - inside at x = -15 */}
      <TreeRow startPosition={[-15, 0.02, -40]} count={6} spacing={12} treeType="cone" seed={300} />
      
      {/* Trees along RIGHT perimeter - inside at x = 65 */}
      <TreeRow startPosition={[65, 0.02, -40]} count={6} spacing={12} treeType="mixed" seed={400} />
      
      {/* Trees at BACK - inside at z = 45 */}
      <TreeRow startPosition={[-10, 0.02, 45]} count={10} spacing={8} treeType="mixed" seed={500} />
      
      {/* Corner accent trees - inside boundaries */}
      <RoundTree position={[-20, 0.02, -50]} scale={1.2} colorIndex={0} />
      <Tree position={[70, 0.02, -50]} scale={1.3} colorIndex={2} />
      <RoundTree position={[-20, 0.02, 42]} scale={1.1} colorIndex={3} />
      <Tree position={[70, 0.02, 42]} scale={1.1} colorIndex={1} />
      
      {/* Trees near building corners - outside building bounds */}
      <RoundTree position={[-12, 0.02, -15]} scale={0.9} colorIndex={1} />
      <Tree position={[52, 0.02, -15]} scale={1.0} colorIndex={3} />
      <RoundTree position={[-12, 0.02, 32]} scale={0.8} colorIndex={2} />
      <Tree position={[52, 0.02, 32]} scale={0.9} colorIndex={0} />
      
      {/* ===== DECORATIVE GRASS PATCHES (darker green accents) ===== */}
      {/* Planter strips along sidewalk - outside building at z=-16 */}
      <Box args={[25, 0.2, 2]} position={[-2, 0.1, -16]}>
        <meshStandardMaterial color="#2d5a27" roughness={0.95} />
      </Box>
      <Box args={[25, 0.2, 2]} position={[42, 0.1, -16]}>
        <meshStandardMaterial color="#2d5a27" roughness={0.95} />
      </Box>
    </group>
  );
}

// Color mapping for zone status
const getZoneColor = (temp, co2, status) => {
  if (status === 'alarm') return '#ff4444';
  if (status === 'warning') return '#ffaa00';
  
  // Temperature-based coloring (blue=cool, green=comfortable, red=warm)
  if (temp < 70) return '#4488ff';
  if (temp > 76) return '#ff6644';
  return '#44cc44';
};

// Get CO2 indicator color
const getCO2Color = (co2) => {
  if (co2 > 1000) return '#ff4444';
  if (co2 > 800) return '#ffaa00';
  return '#44cc44';
};

function ZoneBox({ zone, telemetry, alerts, isSelected, onClick }) {
  const meshRef = useRef();
  const { position, scale } = useMemo(() => {
    const pos = zone.pose?.position || { x: 0, y: 0, z: 0 };
    const props = zone.properties || {};
    const area = props.area || 1000;
    const height = props.height || 10;
    const size = Math.sqrt(area / 100);
    
    return {
      position: [pos.x, pos.y + height/2, pos.z],
      scale: [size, height, size]
    };
  }, [zone]);
  
  const temp = telemetry.find(t => t.assetId === zone.id && t.pointType === 'temperature')?.value || 72;
  const co2 = telemetry.find(t => t.assetId === zone.id && t.pointType === 'co2')?.value || 400;
  const hasAlert = alerts.some(a => a.assetId === zone.id && !a.resolved);
  
  const color = getZoneColor(temp, co2, hasAlert ? 'warning' : zone.status);
  
  useFrame((state) => {
    if (meshRef.current && isSelected) {
      meshRef.current.material.opacity = 0.6 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
    }
  });
  
  return (
    <group position={position}>
      <Box
        ref={meshRef}
        args={[1, 1, 1]}
        scale={scale}
        onClick={(e) => { e.stopPropagation(); onClick(zone.id); }}
      >
        <meshStandardMaterial
          color={color}
          transparent
          opacity={isSelected ? 0.7 : 0.4}
          wireframe={false}
        />
      </Box>
      
      {/* Zone label */}
      <Text
        position={[0, scale[1]/2 + 2, 0]}
        fontSize={2}
        color="white"
        anchorX="center"
        anchorY="bottom"
      >
        {zone.name.split(' - ')[0]}
      </Text>
      
      {/* Temperature indicator */}
      <Text
        position={[0, scale[1]/2 + 0.5, 0]}
        fontSize={1.5}
        color={color}
        anchorX="center"
        anchorY="bottom"
      >
        {temp.toFixed(1)}°F
      </Text>
      
      {/* CO2 indicator sphere */}
      <Sphere
        args={[0.8, 16, 16]}
        position={[scale[0]/2 + 1, scale[1]/2, 0]}
      >
        <meshStandardMaterial color={getCO2Color(co2)} />
      </Sphere>
      
      {/* Alert indicator */}
      {hasAlert && (
        <Sphere
          args={[1, 16, 16]}
          position={[-scale[0]/2 - 1, scale[1]/2, 0]}
        >
          <meshStandardMaterial color="#ff4444" emissive="#ff0000" emissiveIntensity={0.5} />
        </Sphere>
      )}
    </group>
  );
}

function AHUBox({ ahu, telemetry, isSelected, onClick }) {
  const pos = ahu.pose?.position || { x: 32, y: 2, z: 5 };
  
  const power = telemetry.find(t => t.assetId === ahu.id && t.pointType === 'power')?.value || 0;
  
  return (
    <group position={[pos.x, pos.y, pos.z]}>
      <Box
        args={[8, 4, 5]}
        onClick={(e) => { e.stopPropagation(); onClick(ahu.id); }}
      >
        <meshStandardMaterial
          color={isSelected ? '#00aaff' : '#666688'}
          metalness={0.5}
          roughness={0.3}
        />
      </Box>
      <Text
        position={[0, 3, 0]}
        fontSize={1.2}
        color="white"
        anchorX="center"
      >
        {ahu.name.split(' ')[0]}
      </Text>
      <Text
        position={[0, 1.5, 2.6]}
        fontSize={1}
        color="#88ff88"
        anchorX="center"
      >
        {power.toFixed(1)} kW
      </Text>
    </group>
  );
}

function ChillerBox({ chiller, telemetry, isSelected, onClick }) {
  const pos = chiller.pose?.position || { x: 35, y: 0, z: 10 };
  
  const load = telemetry.find(t => t.assetId === chiller.id && t.pointType === 'chillerLoad')?.value || 0;
  
  return (
    <group position={[pos.x, pos.y + 3, pos.z]}>
      <Box
        args={[6, 6, 4]}
        onClick={(e) => { e.stopPropagation(); onClick(chiller.id); }}
      >
        <meshStandardMaterial
          color={isSelected ? '#00ccff' : '#4488aa'}
          metalness={0.6}
          roughness={0.2}
        />
      </Box>
      <Text
        position={[0, 4, 0]}
        fontSize={1.2}
        color="white"
        anchorX="center"
      >
        Chiller
      </Text>
      <Text
        position={[0, 2.5, 2.1]}
        fontSize={1}
        color="#88ffff"
        anchorX="center"
      >
        {(load * 100).toFixed(0)}% Load
      </Text>
    </group>
  );
}

function BoilerBox({ boiler, telemetry, isSelected, onClick }) {
  const pos = boiler.pose?.position || { x: 38, y: 0, z: 10 };
  
  return (
    <group position={[pos.x, pos.y + 2.5, pos.z]}>
      <Box
        args={[4, 5, 3]}
        onClick={(e) => { e.stopPropagation(); onClick(boiler.id); }}
      >
        <meshStandardMaterial
          color={isSelected ? '#ffaa00' : '#aa6644'}
          metalness={0.4}
          roughness={0.4}
        />
      </Box>
      <Text
        position={[0, 3.5, 0]}
        fontSize={1}
        color="white"
        anchorX="center"
      >
        Boiler
      </Text>
    </group>
  );
}

function FloorPlate({ floor, yPosition }) {
  return (
    <Box
      args={[60, 0.5, 40]}
      position={[20, yPosition, 10]}
    >
      <meshStandardMaterial
        color="#334455"
        transparent
        opacity={0.3}
      />
    </Box>
  );
}

// GLB Model Component - loads the Blender-generated building model
function GLBModel({ assets, telemetry, alerts, selectedAsset, onSelectAsset }) {
  const { scene } = useGLTF(GLB_PATH);
  const modelRef = useRef();
  
  // Clone the scene so we can modify it
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    
    // Make all meshes interactive
    clone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        
        // Make materials responsive
        if (child.material) {
          child.material = child.material.clone();
          child.material.transparent = true;
        }
      }
    });
    
    return clone;
  }, [scene]);
  
  // Update zone colors based on telemetry
  useEffect(() => {
    if (!clonedScene) return;
    
    assets.forEach(asset => {
      if (!asset.meshId) return;
      
      const mesh = clonedScene.getObjectByName(asset.meshId);
      if (!mesh || !mesh.material) return;
      
      // Get telemetry for this asset
      const temp = telemetry.find(t => t.assetId === asset.id && t.pointType === 'temperature')?.value;
      const co2 = telemetry.find(t => t.assetId === asset.id && t.pointType === 'co2')?.value;
      const hasAlert = alerts.some(a => a.assetId === asset.id && !a.resolved);
      
      // Update opacity for selected items
      if (selectedAsset === asset.id) {
        mesh.material.opacity = 0.9;
        mesh.material.emissive = new THREE.Color(0x4488ff);
        mesh.material.emissiveIntensity = 0.3;
      } else {
        mesh.material.opacity = asset.type === 'zone' ? 0.5 : 0.9;
        mesh.material.emissive = new THREE.Color(0x000000);
        mesh.material.emissiveIntensity = 0;
      }
      
      // Color zones based on temperature
      if (asset.type === 'zone' && temp) {
        const color = getZoneColor(temp, co2 || 400, hasAlert ? 'warning' : asset.status);
        mesh.material.color = new THREE.Color(color);
      }
      
      // Highlight equipment with alerts
      if (hasAlert) {
        mesh.material.emissive = new THREE.Color(0xff4444);
        mesh.material.emissiveIntensity = 0.5;
      }
    });
  }, [clonedScene, assets, telemetry, alerts, selectedAsset]);
  
  // Handle click events
  const handleClick = (event) => {
    event.stopPropagation();
    
    const clickedMesh = event.object;
    const asset = assets.find(a => a.meshId === clickedMesh.name);
    
    if (asset) {
      onSelectAsset(asset.id);
    }
  };
  
  return (
    <group ref={modelRef} onClick={handleClick}>
      <primitive object={clonedScene} />
      
      {/* Add floating labels and indicators for zones */}
      {assets.filter(a => a.type === 'zone' && a.properties?.zoneType !== 'mechanical').map(zone => {
        const temp = telemetry.find(t => t.assetId === zone.id && t.pointType === 'temperature')?.value || 72;
        const co2 = telemetry.find(t => t.assetId === zone.id && t.pointType === 'co2')?.value || 400;
        const pos = zone.pose?.position || { x: 0, y: 0, z: 0 };
        const height = zone.properties?.height || 10;
        
        return (
          <group key={zone.id} position={[pos.x, pos.y + height + 2, pos.z]}>
            <Text
              fontSize={1.5}
              color="white"
              anchorX="center"
              anchorY="bottom"
              outlineWidth={0.1}
              outlineColor="#000000"
            >
              {zone.name.split(' - ')[0]}
            </Text>
            <Text
              position={[0, -1.5, 0]}
              fontSize={1.2}
              color={getZoneColor(temp, co2, zone.status)}
              anchorX="center"
              outlineWidth={0.08}
              outlineColor="#000000"
            >
              {temp.toFixed(1)}°F | {co2} ppm
            </Text>
          </group>
        );
      })}
    </group>
  );
}

// Loading fallback for GLB model
function GLBLoadingFallback() {
  return (
    <Html center>
      <div style={{
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '20px',
        borderRadius: '8px',
        fontFamily: 'system-ui'
      }}>
        Loading 3D Model...
      </div>
    </Html>
  );
}

function BuildingScene({ assets, telemetry, alerts, selectedAsset, onSelectAsset, useGLBModel = true }) {
  const [glbAvailable, setGlbAvailable] = useState(false);
  const [glbError, setGlbError] = useState(false);
  
  // Check if GLB model is available
  useEffect(() => {
    if (useGLBModel) {
      fetch(GLB_PATH, { method: 'HEAD' })
        .then(response => {
          setGlbAvailable(response.ok);
        })
        .catch(() => {
          setGlbAvailable(false);
          setGlbError(true);
        });
    }
  }, [useGLBModel]);
  
  const zones = assets.filter(a => a.type === 'zone' && a.properties?.zoneType !== 'mechanical');
  const ahus = assets.filter(a => a.type === 'ahu');
  const chillers = assets.filter(a => a.type === 'chiller');
  const boilers = assets.filter(a => a.type === 'boiler');
  const floors = assets.filter(a => a.type === 'floor');
  
  // Use GLB model if available and enabled
  if (useGLBModel && glbAvailable && !glbError) {
    return (
      <group>
        {/* Base ground plane - dark earth below grass level */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[20, -0.1, -5]} receiveShadow>
          <planeGeometry args={[200, 180]} />
          <meshStandardMaterial color="#1a1a14" />
        </mesh>
        
        {/* Landscape - grass, roads, trees, and car parks */}
        <Landscape />
        
        <Suspense fallback={<GLBLoadingFallback />}>
          <GLBModel
            assets={assets}
            telemetry={telemetry}
            alerts={alerts}
            selectedAsset={selectedAsset}
            onSelectAsset={onSelectAsset}
          />
        </Suspense>
        
        {/* Grid helper - subtle */}
        <gridHelper args={[200, 40, '#2a3a2a', '#1a2a1a']} position={[20, 0.02, -5]} />
      </group>
    );
  }
  
  // Fallback to procedural geometry
  return (
    <group>
      {/* Base ground plane - dark earth below grass level */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[20, -0.1, -5]} receiveShadow>
        <planeGeometry args={[200, 180]} />
        <meshStandardMaterial color="#1a1a14" />
      </mesh>
      
      {/* Landscape - grass, roads, trees, and car parks */}
      <Landscape />
      
      {/* Floor plates */}
      {floors.map((floor, idx) => (
        <FloorPlate key={floor.id} floor={floor} yPosition={idx * 10} />
      ))}
      
      {/* Zones */}
      {zones.map(zone => (
        <ZoneBox
          key={zone.id}
          zone={zone}
          telemetry={telemetry}
          alerts={alerts}
          isSelected={selectedAsset === zone.id}
          onClick={onSelectAsset}
        />
      ))}
      
      {/* AHUs */}
      {ahus.map(ahu => (
        <AHUBox
          key={ahu.id}
          ahu={ahu}
          telemetry={telemetry}
          isSelected={selectedAsset === ahu.id}
          onClick={onSelectAsset}
        />
      ))}
      
      {/* Chillers */}
      {chillers.map(chiller => (
        <ChillerBox
          key={chiller.id}
          chiller={chiller}
          telemetry={telemetry}
          isSelected={selectedAsset === chiller.id}
          onClick={onSelectAsset}
        />
      ))}
      
      {/* Boilers */}
      {boilers.map(boiler => (
        <BoilerBox
          key={boiler.id}
          boiler={boiler}
          telemetry={telemetry}
          isSelected={selectedAsset === boiler.id}
          onClick={onSelectAsset}
        />
      ))}
      
      {/* Grid helper */}
      <gridHelper args={[150, 30, '#333344', '#222233']} position={[20, 0, 10]} />
    </group>
  );
}

export default BuildingScene;
