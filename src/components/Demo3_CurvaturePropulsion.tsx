import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ReferenceCube3D } from './ReferenceCube3D';
import { playClickSound, playShiftSound } from '../utils/sound';
import { attachDragRotate, createRenderer, observeResize, teardownRenderer } from '../utils/three';
import { Rocket, Sliders, Sparkles, Compass, Info } from 'lucide-react';

interface Demo3Props {
  soundEnabled: boolean;
}

function createLabelSprite(text: string, color: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.beginPath();
  ctx.roundRect(10, 10, 492, 108, 24);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 8;
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.font = 'bold 46px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(2.8, 0.7, 1);
  return sprite;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export const Demo3_CurvaturePropulsion: React.FC<Demo3Props> = ({ soundEnabled }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  const [curvaturePower, setCurvaturePower] = useState<number>(75); // 0% to 100%
  const [lightSpeedFactor, setLightSpeedFactor] = useState<number>(15); // % of c (100 = 300,000 km/s, 15 = 45,000 km/s)
  const [isBlackDomain, setIsBlackDomain] = useState<boolean>(false);
  const [showGridLines, setShowGridLines] = useState<boolean>(true);
  const [isEngineActive, setIsEngineActive] = useState<boolean>(true);
  const [showAnalogy, setShowAnalogy] = useState<boolean>(true);

  // The render loop reads the live control values through this ref, so moving
  // a slider never has to tear down and rebuild the WebGL scene.
  const paramsRef = useRef({ curvaturePower, lightSpeedFactor, isEngineActive });
  paramsRef.current = { curvaturePower, lightSpeedFactor, isEngineActive };

  const sceneRef = useRef<THREE.Scene | null>(null);
  const gridMeshRef = useRef<THREE.Mesh | null>(null);
  const shipGroupRef = useRef<THREE.Group | null>(null);
  const wakeMeshRef = useRef<THREE.Mesh | null>(null);
  const blackDomainMeshRef = useRef<THREE.Mesh | null>(null);
  const photonsGroupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, 4.5, 9.5);
    camera.lookAt(0, 0, 0);

    const renderer = createRenderer(container);
    const stopResize = observeResize(container, camera, renderer);

    // Ambient & Point Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const mainLight = new THREE.PointLight(0x38bdf8, 2.5, 100);
    mainLight.position.set(5, 8, 5);
    scene.add(mainLight);

    const engineGlowLight = new THREE.PointLight(0x06b6d4, 3, 30);
    engineGlowLight.position.set(0, 0, -1);
    scene.add(engineGlowLight);

    // --- SPACETIME GRID MESH (General Relativity Plane) ---
    const gridGeo = new THREE.PlaneGeometry(16, 20, 60, 60);
    const gridMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      wireframe: true,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    });
    const gridMesh = new THREE.Mesh(gridGeo, gridMat);
    gridMesh.rotation.x = Math.PI / 2;
    gridMesh.position.y = -1.2;
    gridMeshRef.current = gridMesh;
    scene.add(gridMesh);

    // --- SPACESHIP MODEL (Halo / Gravity Class Vessel) ---
    const shipGroup = new THREE.Group();
    shipGroup.position.set(0, 0, 1.5);
    shipGroupRef.current = shipGroup;
    scene.add(shipGroup);

    // Ship Fuselage (Nose pointing forward along +Z)
    const coneGeo = new THREE.ConeGeometry(0.45, 2.2, 16);
    const coneMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.8,
      roughness: 0.2,
    });
    const fuselage = new THREE.Mesh(coneGeo, coneMat);
    fuselage.rotation.x = -Math.PI / 2; // Point cone tip forward (+Z)
    shipGroup.add(fuselage);

    // Front Nose Beacon Light (CLEAR FRONT INDICATOR)
    const noseLightGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const noseLightMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 3.0,
    });
    const noseBeacon = new THREE.Mesh(noseLightGeo, noseLightMat);
    noseBeacon.position.set(0, 0, 1.15);
    shipGroup.add(noseBeacon);

    // Explicit Floating Labels attached directly to Ship
    const frontSprite = createLabelSprite("▲ FRONT (NOSE)", "#38bdf8");
    frontSprite.position.set(0, 1.1, 1.0);
    shipGroup.add(frontSprite);

    const rearSprite = createLabelSprite("▼ REAR (ENGINE)", "#f97316");
    rearSprite.position.set(0, 1.1, -1.2);
    shipGroup.add(rearSprite);

    // Wing Fins
    const finGeo = new THREE.BoxGeometry(1.6, 0.06, 0.6);
    const finMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.5 });
    const fins = new THREE.Mesh(finGeo, finMat);
    fins.position.set(0, 0, -0.3);
    shipGroup.add(fins);

    // Curvature Drive Emitter Ring (Engine Core at REAR)
    const ringGeo = new THREE.TorusGeometry(0.55, 0.08, 16, 32);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0284c7,
      emissiveIntensity: 2.0,
    });
    const engineRing = new THREE.Mesh(ringGeo, ringMat);
    engineRing.position.set(0, 0, -0.9);
    shipGroup.add(engineRing);

    // Engine Exhaust Glow Plume (CLEAR REAR INDICATOR)
    const plumeGeo = new THREE.ConeGeometry(0.35, 1.2, 16);
    const plumeMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xea580c,
      emissiveIntensity: 2.5,
      transparent: true,
      opacity: 0.85,
    });
    const plumeMesh = new THREE.Mesh(plumeGeo, plumeMat);
    plumeMesh.rotation.x = Math.PI / 2; // Point exhaust backwards (-Z)
    plumeMesh.position.set(0, 0, -1.5);
    shipGroup.add(plumeMesh);

    // --- CURVATURE WAKE TRAIL (Expanding wake behind ship) ---
    const wakeGeo = new THREE.CylinderGeometry(0.6, 2.8, 10, 32, 1, true);
    const wakeMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x0369a1,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    const wakeMesh = new THREE.Mesh(wakeGeo, wakeMat);
    wakeMesh.rotation.x = Math.PI / 2;
    wakeMesh.position.set(0, 0, -5.8);
    wakeMeshRef.current = wakeMesh;
    scene.add(wakeMesh);

    // --- BLACK DOMAIN EVENT HORIZON SPHERE ---
    const bdGeo = new THREE.SphereGeometry(3.6, 32, 32);
    const bdMat = new THREE.MeshStandardMaterial({
      color: 0x050505,
      emissive: 0x111827,
      roughness: 0.9,
      transparent: true,
      opacity: 0.85,
    });
    const blackDomainMesh = new THREE.Mesh(bdGeo, bdMat);
    blackDomainMesh.position.set(0, 0, -4.5);
    blackDomainMesh.visible = false;
    blackDomainMeshRef.current = blackDomainMesh;
    scene.add(blackDomainMesh);

    // --- PHOTON STREAM (Light rays bending & slowing in the wake) ---
    const photonsGroup = new THREE.Group();
    photonsGroupRef.current = photonsGroup;
    scene.add(photonsGroup);

    const photonCount = 120;
    const pGeo = new THREE.SphereGeometry(0.05, 8, 8);
    const pMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 2.0,
    });
    for (let i = 0; i < photonCount; i++) {
      const pMesh = new THREE.Mesh(pGeo, pMat);
      pMesh.position.set(
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 12
      );
      photonsGroup.add(pMesh);
    }

    // Drag Orbit
    const drag = attachDragRotate(renderer.domElement, (dx, dy) => {
      scene.rotation.y += dx * 0.008;
      scene.rotation.x += dy * 0.008;
    });

    // Carve the curvature trough into the grid behind the ship. The plane is
    // rotated +90deg about X, so local +Y is world +Z and local +Z is world -Y
    // (positive local z pushes the grid down). The trough fades in smoothly
    // aft of the engine and deepens with drive power.
    let gridKey = '';
    const deformGrid = (power: number, active: boolean) => {
      const key = `${power}:${active}`;
      if (key === gridKey) return;
      gridKey = key;
      const attr = gridMesh.geometry.attributes.position as THREE.BufferAttribute;
      const positions = attr.array as Float32Array;
      for (let i = 0; i < attr.count; i++) {
        const x = positions[i * 3];
        const worldZ = positions[i * 3 + 1];
        const onset = smoothstep(0.6, -1.5, worldZ);
        positions[i * 3 + 2] = active ? (power / 100) * 1.2 * Math.exp(-0.3 * Math.abs(x)) * onset : 0;
      }
      attr.needsUpdate = true;
    };

    // Animation Loop
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const { curvaturePower, lightSpeedFactor, isEngineActive } = paramsRef.current;

      if (!drag.isDragging()) {
        scene.rotation.y += 0.003;
      }

      // Pulse engine core
      engineRing.rotation.z += 0.02;

      // Spacetime grid trough behind the ship (only rewritten when it changes)
      deformGrid(curvaturePower, isEngineActive);

      // Move photons along Z with speed scaled by local light speed factor
      if (photonsGroupRef.current) {
        photonsGroupRef.current.children.forEach((child) => {
          const inWake = isEngineActive && child.position.z < -0.5; // Behind ship engine ring in flattened wake
          // In front (unwarped space): normal fast speed (0.18)
          // In trailing wake (flattened space): lowered speed scaled directly by lightSpeedFactor %
          const currentSpeed = inWake
            ? Math.max(0.005, (lightSpeedFactor / 100) * 0.14)
            : 0.18;

          child.position.z -= currentSpeed;
          if (child.position.z < -10) {
            child.position.z = 6;
            child.position.x = (Math.random() - 0.5) * 6;
          }
        });
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      drag.dispose();
      stopResize();
      teardownRenderer(container, renderer, scene);
    };
  }, []);

  // Update Dynamic Materials based on light speed reduction & Black Domain
  useEffect(() => {
    if (gridMeshRef.current) {
      gridMeshRef.current.visible = showGridLines;
    }

    if (wakeMeshRef.current) {
      wakeMeshRef.current.visible = isEngineActive;
      const mat = wakeMeshRef.current.material as THREE.MeshStandardMaterial;
      if (lightSpeedFactor <= 10 || isBlackDomain) {
        // Black Domain colors (deep dark event horizon)
        mat.color.setHex(0x0f172a);
        mat.emissive.setHex(0x312e81);
        mat.opacity = 0.95;
      } else {
        mat.color.setHex(0x0284c7);
        mat.emissive.setHex(0x0369a1);
        mat.opacity = (curvaturePower / 100) * 0.75;
      }
    }

    if (blackDomainMeshRef.current) {
      blackDomainMeshRef.current.visible = isBlackDomain || lightSpeedFactor <= 8;
    }
  }, [lightSpeedFactor, curvaturePower, isBlackDomain, showGridLines, isEngineActive]);

  return (
    <div className="relative w-full h-full min-h-[620px] flex flex-col lg:flex-row gap-4 p-4 text-slate-100 bg-slate-950 font-sans">
      {/* Interactive WebGL Canvas */}
      <div className="relative flex-1 rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-slate-900 via-slate-950 to-black overflow-hidden shadow-2xl flex flex-col">
        {/* Top Header Badge */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5">
          <div className="flex items-center gap-2 bg-slate-900/90 border border-cyan-500/40 px-3 py-1.5 rounded-xl backdrop-blur-md shadow-lg">
            <Rocket className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-cyan-200">
              Curvature Propulsion Viewport
            </span>
            <span className="hidden xl:inline bg-cyan-950 text-cyan-300 border border-cyan-700 text-[10px] px-2 py-0.5 rounded font-mono">
              FTL Spacetime Wake
            </span>
          </div>
          <p className="text-[11px] font-mono text-slate-300 bg-black/70 px-3 py-1.5 rounded-xl border border-slate-800 backdrop-blur max-w-md">
            As the Curvature Drive flattens spacetime behind the vessel, the local speed of light (c) drops drastically, creating a trailing wake that pulls the ship forward like a soap-boat on water.
          </p>
        </div>

        {/* State Badge */}
        <div className="absolute top-4 right-4 z-10 bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 rounded-xl backdrop-blur text-xs font-mono text-cyan-300 flex items-center gap-2 shadow-lg">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Local wake c: <strong className="text-white font-bold">{lightSpeedFactor}% of c</strong> ({(lightSpeedFactor * 2998).toLocaleString()} km/s)</span>
        </div>

        {/* 3D Viewport Visual HUD Annotations */}
        <div className="absolute bottom-16 left-4 z-10 hidden sm:flex flex-col gap-2 pointer-events-none">
          <div className="bg-slate-950/80 border border-emerald-500/40 px-3 py-1.5 rounded-lg text-[10px] font-mono text-emerald-300 flex items-center gap-1.5 backdrop-blur shadow-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span>▲ FRONT (NOSE): Pointing Forward into Unwarped Space (Fast Photons, c = 100%)</span>
          </div>
          <div className="bg-slate-950/80 border border-cyan-500/40 px-3 py-1.5 rounded-lg text-[10px] font-mono text-cyan-300 flex items-center gap-1.5 backdrop-blur shadow-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-400" />
            <span>▼ REAR (ENGINE WAKE): Trailing Flattened Space (Photons SLOW DOWN to {lightSpeedFactor}% c)</span>
          </div>
        </div>

        {/* Canvas Element */}
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing min-h-[420px]" />

        {/* Viewport Control & Slider Bar */}
        <div className="p-3 bg-slate-900/90 border-t border-slate-800 backdrop-blur-md flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsEngineActive(!isEngineActive);
                  playShiftSound(soundEnabled, isEngineActive ? 200 : 600);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all border ${
                  isEngineActive
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-lg shadow-cyan-500/20'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                <Rocket className="w-3.5 h-3.5" />
                <span>Drive Engine: {isEngineActive ? 'ACTIVE (WARPING)' : 'STANDBY'}</span>
              </button>

              <button
                onClick={() => {
                  setIsBlackDomain(!isBlackDomain);
                  playClickSound(soundEnabled);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all border ${
                  isBlackDomain || lightSpeedFactor <= 8
                    ? 'bg-purple-900/40 border-purple-500 text-purple-200'
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                <Compass className="w-3.5 h-3.5 text-purple-400" />
                <span>Black Domain: {isBlackDomain || lightSpeedFactor <= 8 ? 'SEALED SANCTUARY' : 'OPEN SPACE'}</span>
              </button>
            </div>

            <button
              onClick={() => {
                setShowAnalogy(!showAnalogy);
                playClickSound(soundEnabled);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 text-xs font-mono flex items-center gap-1.5"
            >
              <Info className="w-3.5 h-3.5 text-amber-400" />
              <span>{showAnalogy ? 'Hide Soap-Boat Analogy' : 'How It Works (Soap Boat Analogy)'}</span>
            </button>
          </div>

          {/* Viewport Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300 flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  Spacetime Distortion Power
                </span>
                <span className="text-cyan-400 font-bold">{curvaturePower}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={curvaturePower}
                onChange={(e) => {
                  setCurvaturePower(parseFloat(e.target.value));
                  playClickSound(soundEnabled);
                }}
                className="w-full accent-cyan-400 bg-slate-800 rounded h-2.5 cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300 flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  Trailing Light Speed (c)
                </span>
                <span className="text-amber-400 font-bold">{lightSpeedFactor}% c</span>
              </div>
              <input
                type="range"
                min="2"
                max="100"
                step="1"
                value={lightSpeedFactor}
                onChange={(e) => {
                  setLightSpeedFactor(parseFloat(e.target.value));
                  playClickSound(soundEnabled);
                }}
                className="w-full accent-amber-400 bg-slate-800 rounded h-2.5 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Control Sidebar & 3D Standard Reference */}
      <div className="w-full lg:w-[320px] flex flex-col gap-4">
        {/* MANDATORY Standard 3D Reference Cube */}
        <ReferenceCube3D title="3D Standard Space Reference" />

        {/* Soap-Boat Analogy Explainer Card (for high human comprehension) */}
        {showAnalogy && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-3.5 backdrop-blur flex flex-col gap-2 shadow-lg">
            <div className="flex items-center gap-1.5 text-amber-300 font-mono font-bold text-xs">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>How Curvature Propulsion Works:</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
              <strong>The Surface-Tension Analogy</strong>: Imagine a paper boat in water. Dropping soap behind the stern reduces trailing surface tension. The higher tension ahead automatically <strong>pulls the vessel forward</strong> without needing rear engine thrust!
            </p>
            <div className="p-2 bg-black/60 rounded-lg border border-amber-500/30 text-[10px] font-mono text-amber-200">
              • High curvature ahead + Flattened space behind = Net Forward Metric Traction
            </div>
          </div>
        )}

        {/* Curvature Drive Controls */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3.5 backdrop-blur flex flex-col gap-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-mono font-bold text-cyan-300 uppercase flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              Curvature Drive Controls
            </span>
            <span className="text-[10px] font-mono text-slate-400">FTL Engine</span>
          </div>

          {/* Slider: Curvature Thrust Power */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300">Spacetime Distortion Power</span>
              <span className="text-cyan-400 font-bold">{curvaturePower}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={curvaturePower}
              onChange={(e) => {
                setCurvaturePower(parseFloat(e.target.value));
                playClickSound(soundEnabled);
              }}
              className="w-full accent-cyan-400 bg-slate-800 rounded h-2 cursor-pointer"
            />
            <p className="text-[10px] text-slate-400 leading-tight">
              Flattens spacetime curvature behind the stern, pulling the vessel forward through distorted space.
            </p>
          </div>

          {/* Slider: Local Speed of Light Reduction */}
          <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-800">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300">Trailing Light Speed (c)</span>
              <span className="text-amber-400 font-bold">{lightSpeedFactor}% c</span>
            </div>
            <input
              type="range"
              min="2"
              max="100"
              step="1"
              value={lightSpeedFactor}
              onChange={(e) => {
                setLightSpeedFactor(parseFloat(e.target.value));
                playClickSound(soundEnabled);
              }}
              className="w-full accent-amber-400 bg-slate-800 rounded h-2 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>2% c (Black Domain)</span>
              <span>100% c (Standard)</span>
            </div>
          </div>

          {/* Guided Step Presets */}
          <div className="pt-2 border-t border-slate-800 flex flex-col gap-1.5">
            <span className="text-[11px] font-mono font-semibold text-slate-300">
              Guided Interactive Presets
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
              <button
                onClick={() => {
                  setCurvaturePower(20);
                  setLightSpeedFactor(100);
                  setIsBlackDomain(false);
                  setIsEngineActive(false);
                  playClickSound(soundEnabled);
                }}
                className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 text-left truncate"
              >
                1. Sub-light Space
              </button>

              <button
                onClick={() => {
                  setCurvaturePower(80);
                  setLightSpeedFactor(15);
                  setIsBlackDomain(false);
                  setIsEngineActive(true);
                  playClickSound(soundEnabled);
                }}
                className="px-2 py-1.5 bg-cyan-950/60 border border-cyan-500/40 hover:border-cyan-400 rounded-lg text-cyan-200 text-left truncate"
              >
                2. FTL Curvature Drive
              </button>

              <button
                onClick={() => {
                  setCurvaturePower(95);
                  setLightSpeedFactor(5);
                  setIsBlackDomain(true);
                  setIsEngineActive(true);
                  playClickSound(soundEnabled);
                }}
                className="col-span-2 px-2 py-1.5 bg-purple-950/60 border border-purple-500/40 hover:border-purple-400 rounded-lg text-purple-200 text-center font-bold"
              >
                3. Trailing Black Domain (Cosmic Sanctuary)
              </button>
            </div>
          </div>
        </div>

        {/* Single Reference Citation */}
        <div className="rounded-xl border border-cyan-500/20 bg-slate-900/60 p-3 text-xs text-slate-300 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 font-mono font-bold text-cyan-300">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>Liu Cixin - Dark Forest Series - Curvature Propulsion drive</span>
          </div>
          <p className="leading-relaxed text-[11px] text-slate-300 italic font-serif">
            "A curvature propulsion drive bends local spacetime ahead of the vessel while expanding space behind it, allowing FTL transit through localized metric distortion."
          </p>
        </div>
      </div>
    </div>
  );
};
