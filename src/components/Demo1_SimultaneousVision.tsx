import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ReferenceCube3D } from './ReferenceCube3D';
import { playClickSound, playShiftSound } from '../utils/sound';
import { attachDragRotate, createRenderer, disposeObject3D, observeResize, teardownRenderer } from '../utils/three';
import { Eye, Layers, Sparkles, Sliders, Info, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface Demo1Props {
  soundEnabled: boolean;
}

const FACES_4D = [
  { id: 'front', name: 'Front Face', color: '#a855f7', normal: [0, 0, 1], label: '+Z (Front)' },
  { id: 'back', name: 'Back Face', color: '#06b6d4', normal: [0, 0, -1], label: '-Z (Back)' },
  { id: 'left', name: 'Left Face', color: '#3b82f6', normal: [-1, 0, 0], label: '-X (Left)' },
  { id: 'right', name: 'Right Face', color: '#ef4444', normal: [1, 0, 0], label: '+X (Right)' },
  { id: 'top', name: 'Top Face', color: '#22c55e', normal: [0, 1, 0], label: '+Y (Top)' },
  { id: 'bottom', name: 'Bottom Face', color: '#eab308', normal: [0, -1, 0], label: '-Y (Bottom)' },
  { id: 'core', name: 'Internal Core', color: '#f59e0b', normal: [0, 0, 0], label: 'Internal Core' },
];

// Where the 4D vantage-point marker sits; all sight rays start here.
const OBSERVER_POS = new THREE.Vector3(0, 3.8, 0);

export const Demo1_SimultaneousVision: React.FC<Demo1Props> = ({ soundEnabled }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [wOffset, setWOffset] = useState<number>(0.0); // 4D offset slider along normal
  const [showCore, setShowCore] = useState<boolean>(true);
  const [selectedFace, setSelectedFace] = useState<string | null>(null);
  const [mode4D, setMode4D] = useState<boolean>(false);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const facesGroupRef = useRef<THREE.Group | null>(null);
  const coreMeshRef = useRef<THREE.Mesh | null>(null);
  const rayLinesGroupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, 3.2, 6.2);
    camera.lookAt(0, 0, 0);

    const renderer = createRenderer(container);
    const stopResize = observeResize(container, camera, renderer);

    // Ambient & Directional Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const light1 = new THREE.PointLight(0x38bdf8, 2.5, 100);
    light1.position.set(5, 8, 5);
    scene.add(light1);

    const light2 = new THREE.PointLight(0xa855f7, 1.8, 100);
    light2.position.set(-5, -5, -5);
    scene.add(light2);

    // Subtle background particles
    const particleCount = 200;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i++) {
      particlePos[i] = (Math.random() - 0.5) * 16;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.05,
      transparent: true,
      opacity: 0.4,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Group holding the 6 orthogonal planes
    const facesGroup = new THREE.Group();
    facesGroupRef.current = facesGroup;
    scene.add(facesGroup);

    // Group for 4D Sight Rays
    const rayLinesGroup = new THREE.Group();
    rayLinesGroupRef.current = rayLinesGroup;
    scene.add(rayLinesGroup);

    // Build the 6 perfectly aligned orthogonal planes
    const planeData = [
      { name: 'right', color: 0xef4444, rot: [0, Math.PI / 2, 0] },
      { name: 'left', color: 0x3b82f6, rot: [0, -Math.PI / 2, 0] },
      { name: 'top', color: 0x22c55e, rot: [-Math.PI / 2, 0, 0] },
      { name: 'bottom', color: 0xeab308, rot: [Math.PI / 2, 0, 0] },
      { name: 'front', color: 0xa855f7, rot: [0, 0, 0] },
      { name: 'back', color: 0x06b6d4, rot: [0, Math.PI, 0] },
    ];

    planeData.forEach((pd) => {
      const planeGeo = new THREE.PlaneGeometry(1.2, 1.2);
      const mat = new THREE.MeshStandardMaterial({
        color: pd.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        roughness: 0.2,
        metalness: 0.3,
      });
      const mesh = new THREE.Mesh(planeGeo, mat);
      mesh.name = pd.name;
      mesh.rotation.set(pd.rot[0], pd.rot[1], pd.rot[2]);

      // Bright white edge highlighting
      const edgesGeo = new THREE.EdgesGeometry(planeGeo);
      const edgesMat = new THREE.LineBasicMaterial({ color: 0xffffff });
      const edges = new THREE.LineSegments(edgesGeo, edgesMat);
      mesh.add(edges);

      facesGroup.add(mesh);
    });

    // Inner Glowing Core Sphere
    const coreGeo = new THREE.SphereGeometry(0.38, 24, 24);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 1.0,
      roughness: 0.1,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.name = 'core';
    coreMeshRef.current = coreMesh;
    facesGroup.add(coreMesh);

    // Glowing 4D Vantage Eye Indicator
    const eyeGeo = new THREE.OctahedronGeometry(0.22, 0);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.2,
    });
    const eyeMesh = new THREE.Mesh(eyeGeo, eyeMat);
    eyeMesh.position.copy(OBSERVER_POS);
    scene.add(eyeMesh);

    // Orbit Dragging
    const drag = attachDragRotate(renderer.domElement, (dx, dy) => {
      facesGroup.rotation.y += dx * 0.008;
      facesGroup.rotation.x += dy * 0.008;
    });

    // Animation loop
    let animId: number;
    const rayTarget = new THREE.Vector3();

    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (!drag.isDragging()) {
        facesGroup.rotation.y += 0.004;
      }

      particles.rotation.y += 0.001;

      // The faces keep spinning, so re-aim each sight ray at its face's
      // current world position instead of where it was when the ray was built.
      if (rayLinesGroup.children.length > 0) {
        facesGroup.updateMatrixWorld();
        rayLinesGroup.children.forEach((obj) => {
          const line = obj as THREE.Line;
          const target = line.userData.target as THREE.Object3D | undefined;
          if (!target) return;
          target.getWorldPosition(rayTarget);
          const pos = line.geometry.attributes.position as THREE.BufferAttribute;
          pos.setXYZ(1, rayTarget.x, rayTarget.y, rayTarget.z);
          pos.needsUpdate = true;
          // Update the dash distances in place; computeLineDistances() would
          // allocate a fresh GPU buffer every frame.
          const dist = line.geometry.attributes.lineDistance as THREE.BufferAttribute;
          dist.setX(1, OBSERVER_POS.distanceTo(rayTarget));
          dist.needsUpdate = true;
        });
      }
      if (coreMeshRef.current) {
        coreMeshRef.current.rotation.y += 0.01;
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

  // Update Face Positions along 4D Offset Vector
  useEffect(() => {
    const facesGroup = facesGroupRef.current;
    if (!facesGroup) return;

    const baseDistance = 0.6 + wOffset * 1.0; // 0.6 closed 3D cube at wOffset=0, expands up to 1.6 in 4D

    const normalsMap: Record<string, [number, number, number]> = {
      right: [1, 0, 0],
      left: [-1, 0, 0],
      top: [0, 1, 0],
      bottom: [0, -1, 0],
      front: [0, 0, 1],
      back: [0, 0, -1],
    };

    facesGroup.children.forEach((child) => {
      if (child === coreMeshRef.current) {
        const mesh = child as THREE.Mesh;
        if (mesh.material instanceof THREE.MeshStandardMaterial) {
          mesh.material.transparent = true;
          // At offset 0, the internal core is 100% occluded / faded away
          const coreOpacity = wOffset === 0 ? 0 : Math.min(1.0, wOffset * 2.5);
          mesh.material.opacity = showCore ? coreOpacity : 0;
          mesh.visible = showCore && wOffset > 0;
        }
        return;
      }

      const normal = normalsMap[child.name];
      if (!normal) return;

      child.position.set(
        normal[0] * baseDistance,
        normal[1] * baseDistance,
        normal[2] * baseDistance
      );

      // Highlight selected face & adjust 3D vs 4D material occlusion
      const mesh = child as THREE.Mesh;
      if (mesh.material instanceof THREE.MeshStandardMaterial) {
        if (wOffset === 0) {
          // Standard 3D Mode: Opaque front faces occlude back faces and interior
          mesh.material.transparent = false;
          mesh.material.side = THREE.FrontSide;
          mesh.material.opacity = 1.0;
        } else {
          // 4D Mode: Translucent double-sided surfaces allowing W-axis penetration
          mesh.material.transparent = true;
          mesh.material.side = THREE.DoubleSide;
        }

        if (selectedFace && mesh.name === selectedFace) {
          mesh.material.opacity = 1.0;
          mesh.material.emissive.setHex(0xffffff);
          mesh.material.emissiveIntensity = 0.5;
        } else if (selectedFace) {
          mesh.material.opacity = 0.3;
          mesh.material.emissive.setHex(0x000000);
          mesh.material.emissiveIntensity = 0;
        } else if (wOffset > 0) {
          mesh.material.opacity = mode4D ? 0.85 : 0.95;
          mesh.material.emissive.setHex(0x000000);
          mesh.material.emissiveIntensity = 0;
        }
      }
    });

    // Rebuild 4D Sight Rays (Only visible in 4D mode with wOffset > 0)
    const rayLinesGroup = rayLinesGroupRef.current;
    if (rayLinesGroup && sceneRef.current) {
      // Free the previous rays' buffers before rebuilding; this effect runs on
      // every slider tick.
      disposeObject3D(rayLinesGroup);
      rayLinesGroup.clear();

      if (mode4D && wOffset > 0) {
        const observerPos = OBSERVER_POS.clone();

        facesGroup.children.forEach((child) => {
          if (!child.visible) return;
          const targetPos = new THREE.Vector3();
          child.getWorldPosition(targetPos);

          const points = [observerPos, targetPos];
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          const mat = new THREE.LineDashedMaterial({
            color: child === coreMeshRef.current ? 0xf59e0b : 0x38bdf8,
            dashSize: 0.12,
            gapSize: 0.06,
            transparent: true,
            opacity: selectedFace ? (child.name === selectedFace ? 1.0 : 0.2) : 0.65,
          });
          const line = new THREE.Line(geometry, mat);
          line.computeLineDistances();
          line.userData.target = child;
          rayLinesGroup.add(line);
        });
      }
    }
  }, [wOffset, showCore, selectedFace, mode4D]);

  const selectedInfo = FACES_4D.find((f) => f.id === selectedFace);

  return (
    <div className="relative w-full h-full min-h-[620px] flex flex-col lg:flex-row gap-4 p-4 text-slate-100 bg-slate-950 font-sans">
      {/* Interactive WebGL Canvas */}
      <div className="relative flex-1 rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-slate-900 via-slate-950 to-black overflow-hidden shadow-2xl flex flex-col">
        {/* Top Viewport Header */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5">
          <div className="flex items-center gap-2 bg-slate-900/90 border border-cyan-500/40 px-3 py-1.5 rounded-xl backdrop-blur-md shadow-lg">
            <Eye className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-cyan-200">
              projection of 3d object in 4d space
            </span>
            <span className="bg-cyan-950 text-cyan-300 border border-cyan-700 text-[10px] px-2 py-0.5 rounded font-mono">
              [X, Y, Z, W]
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-300 bg-black/70 px-3 py-1.5 rounded-xl border border-slate-800 backdrop-blur max-w-md space-y-0.5">
            <div className="text-cyan-300 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>{wOffset === 0 ? '3D Principle: Opaque faces occlude interior & back' : '4D Principle: Light along W bypasses 3D faces'}</span>
            </div>
            <p className="text-slate-400">
              {wOffset === 0
                ? 'At 0 W-offset, the cube behaves as standard 3D: front faces block sight, and interior core/back faces are hidden.'
                : 'A 4D observer sees all 6 faces + inner sphere simultaneously with zero line-of-sight occlusion.'}
            </p>
          </div>
        </div>

        {/* 4D Offset Badge */}
        <div className="absolute top-4 right-4 z-10 bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 rounded-xl backdrop-blur text-xs font-mono text-cyan-300 flex items-center gap-2 shadow-lg">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>
            {wOffset === 0 ? (
              <strong className="text-amber-300 font-bold">3D Mode (W = 0)</strong>
            ) : (
              <>4D Normal Offset (W): <strong className="text-white">+{wOffset.toFixed(2)}</strong></>
            )}
          </span>
        </div>

        {/* Canvas Element */}
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing min-h-[420px]" />

        {/* Viewport Slider & Control Bar */}
        <div className="p-3 bg-slate-900/90 border-t border-slate-800 backdrop-blur-md flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-cyan-400" />
              4D NORMAL SEPARATION OFFSET (W-AXIS SLIDER): <strong className="text-white">+{wOffset.toFixed(2)}</strong>
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const nextMode = !mode4D;
                  setMode4D(nextMode);
                  setWOffset(nextMode ? 0.8 : 0.0);
                  playShiftSound(soundEnabled, nextMode ? 500 : 250);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all border ${
                  mode4D || wOffset > 0
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-lg shadow-cyan-500/20'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>4D Mode: {mode4D || wOffset > 0 ? 'UNFOLDED' : 'CLOSED 3D'}</span>
              </button>

              <button
                onClick={() => {
                  setShowCore(!showCore);
                  playClickSound(soundEnabled);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all border ${
                  showCore
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Internal Core: {showCore ? 'VISIBLE' : 'HIDDEN'}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-400">0.0 (3D Cube)</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.02"
              value={wOffset}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setWOffset(val);
                setMode4D(val > 0);
                playClickSound(soundEnabled);
              }}
              className="w-full accent-cyan-400 bg-slate-800 rounded h-2.5 cursor-pointer"
            />
            <span className="text-xs font-mono text-cyan-400 font-bold">1.0 (4D Unfolded)</span>
          </div>
        </div>
      </div>

      {/* Control Sidebar & 3D Standard Reference */}
      <div className="w-full lg:w-[320px] flex flex-col gap-4">
        {/* MANDATORY Standard 3D Reference Cube */}
        <ReferenceCube3D highlightFace={selectedFace} />

        {/* 4D Controls Box */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3.5 backdrop-blur flex flex-col gap-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-mono font-bold text-cyan-300 uppercase flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              4D Normal Offset Control
            </span>
            <span className="text-[10px] font-mono text-slate-400">W-Axis</span>
          </div>

          {/* Slider: 4D Normal Offset */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300">4D Separation Offset (W)</span>
              <span className="text-cyan-400 font-bold">+{wOffset.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={wOffset}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setWOffset(val);
                setMode4D(val > 0);
                playClickSound(soundEnabled);
              }}
              className="w-full accent-cyan-400 bg-slate-800 rounded h-2 cursor-pointer"
            />
            <p className="text-[10px] text-slate-400 leading-tight">
              Pulls all 6 faces apart along their normals. This exploded view is a 3D stand-in for what a 4D observer gets for free: every face and the core in view at once, none blocking another.
            </p>
          </div>

          {/* Facet Inspector */}
          <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-800">
            <span className="text-[11px] font-mono font-semibold text-slate-300">
              Facet & Core Inspector (Click to highlight)
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {FACES_4D.map((face) => (
                <button
                  key={face.id}
                  onClick={() => {
                    setSelectedFace(selectedFace === face.id ? null : face.id);
                    playClickSound(soundEnabled);
                  }}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-mono text-left flex items-center justify-between border transition-all ${
                    selectedFace === face.id
                      ? 'bg-cyan-950 border-cyan-400 text-white font-bold shadow-md'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0"
                      style={{ backgroundColor: face.color }}
                    />
                    <span className="truncate">{face.label}</span>
                  </div>
                  <Eye className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Selected Facet Explanation Box */}
          {selectedInfo && (
            <div className="p-2.5 bg-slate-950 rounded-lg border border-cyan-500/30 text-[11px] font-mono text-slate-300 space-y-1">
              <div className="text-cyan-300 font-bold flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-cyan-400" />
                <span>{selectedInfo.name} Analysis:</span>
              </div>
              <p className="text-slate-400 leading-snug">
                {selectedInfo.id === 'core'
                  ? 'In 3D, the internal core is 100% occluded by all 6 opaque faces. In 4D space, sight rays from W > 0 reach the core directly without intersecting any face!'
                  : `Normal vector [${selectedInfo.normal.join(', ')}]. In 3D perspective, this face blocks its opposite face. In 4D perspective, both faces lie on parallel W-layers and remain fully visible.`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
