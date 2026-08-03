import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ReferenceCube3D } from './ReferenceCube3D';
import { playClickSound, playCollapseSound } from '../utils/sound';
import { Play, Pause, RotateCcw, Camera, ShieldAlert, Sparkles, Eye, Info, Sliders } from 'lucide-react';

interface Demo2Props {
  soundEnabled: boolean;
}

const DICE_FACES = [
  { id: 'f1', pips: 1, name: 'Face 1 (Front)', color: '#a855f7', pipColor: '#ffffff', pos3d: [0, 2.5, 0.6], rot3d: [0, 0, 0], pos2d: [0, 0.02, 0] },
  { id: 'f2', pips: 2, name: 'Face 2 (Top)', color: '#22c55e', pipColor: '#ffffff', pos3d: [0, 3.1, 0], rot3d: [-Math.PI / 2, 0, 0], pos2d: [0, 0.02, -1.2] },
  { id: 'f3', pips: 3, name: 'Face 3 (Right)', color: '#ef4444', pipColor: '#ffffff', pos3d: [0.6, 2.5, 0], rot3d: [0, Math.PI / 2, 0], pos2d: [1.2, 0.02, 0] },
  { id: 'f4', pips: 4, name: 'Face 4 (Left)', color: '#3b82f6', pipColor: '#ffffff', pos3d: [-0.6, 2.5, 0], rot3d: [0, -Math.PI / 2, 0], pos2d: [-1.2, 0.02, 0] },
  { id: 'f5', pips: 5, name: 'Face 5 (Bottom)', color: '#eab308', pipColor: '#ffffff', pos3d: [0, 1.9, 0], rot3d: [Math.PI / 2, 0, 0], pos2d: [0, 0.02, 1.2] },
  { id: 'f6', pips: 6, name: 'Face 6 (Back)', color: '#06b6d4', pipColor: '#ffffff', pos3d: [0, 2.5, -0.6], rot3d: [0, Math.PI, 0], pos2d: [0, 0.02, 2.4] },
  { id: 'core', pips: 0, name: 'Interior Energy Nucleus', color: '#f59e0b', pipColor: '#fcb316', pos3d: [0, 2.5, 0], rot3d: [0, 0, 0], pos2d: [2.4, 0.02, 0] },
];

function createDicePipTexture(pipCount: number, bgColor: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 14;
  ctx.strokeRect(7, 7, 242, 242);

  const r = 26;
  ctx.fillStyle = '#ffffff';

  const drawPip = (x: number, y: number) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#000000';
    ctx.stroke();
  };

  const c = 128;
  const l = 70;
  const h = 186;

  if (pipCount === 1) {
    drawPip(c, c);
  } else if (pipCount === 2) {
    drawPip(l, l);
    drawPip(h, h);
  } else if (pipCount === 3) {
    drawPip(l, l);
    drawPip(c, c);
    drawPip(h, h);
  } else if (pipCount === 4) {
    drawPip(l, l);
    drawPip(h, l);
    drawPip(l, h);
    drawPip(h, h);
  } else if (pipCount === 5) {
    drawPip(l, l);
    drawPip(h, l);
    drawPip(c, c);
    drawPip(l, h);
    drawPip(h, h);
  } else if (pipCount === 6) {
    drawPip(l, l);
    drawPip(h, l);
    drawPip(l, c);
    drawPip(h, c);
    drawPip(l, h);
    drawPip(h, h);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export const Demo2_DimensionalCollapse: React.FC<Demo2Props> = ({ soundEnabled }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [collapseProgress, setCollapseProgress] = useState<number>(0.0); // 0 to 1
  const [isCollapsing, setIsCollapsing] = useState<boolean>(false);
  const [cameraMode, setCameraMode] = useState<'3d' | 'top' | 'side'>('3d');
  const [selectedFaceId, setSelectedFaceId] = useState<string | null>('f6');

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  const faceMeshesGroupRef = useRef<THREE.Group | null>(null);
  const coreMeshRef = useRef<THREE.Mesh | null>(null);
  const particleSystemRef = useRef<THREE.Points | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 6.5, 9.5);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 1.5);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0xf59e0b, 2, 50);
    pointLight.position.set(0, 3, 0);
    scene.add(pointLight);

    // 2D Dual-Vector Foil Plane Grid (Shimmering blue grid at Z=0)
    const foilPlaneGeo = new THREE.PlaneGeometry(16, 16, 32, 32);
    const foilPlaneMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    const foilPlane = new THREE.Mesh(foilPlaneGeo, foilPlaneMat);
    foilPlane.rotation.x = Math.PI / 2;
    scene.add(foilPlane);

    // --- DYNAMIC UNFOLDING FACES GROUP ---
    const faceMeshesGroup = new THREE.Group();
    faceMeshesGroupRef.current = faceMeshesGroup;
    scene.add(faceMeshesGroup);

    // Create 6 face meshes + core
    DICE_FACES.forEach((face) => {
      const isCore = face.id === 'core';
      if (isCore) {
        const coreGeo = new THREE.SphereGeometry(0.38, 24, 24);
        const coreMat = new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          emissive: 0xd97706,
          emissiveIntensity: 1.2,
          roughness: 0.1,
        });
        const mesh = new THREE.Mesh(coreGeo, coreMat);
        mesh.name = 'core';
        coreMeshRef.current = mesh;
        faceMeshesGroup.add(mesh);
      } else {
        const planeGeo = new THREE.PlaneGeometry(1.2, 1.2);
        const tex = createDicePipTexture(face.pips, face.color);
        const mat = new THREE.MeshStandardMaterial({
          map: tex,
          side: THREE.DoubleSide,
          roughness: 0.2,
          metalness: 0.1,
        });
        const mesh = new THREE.Mesh(planeGeo, mat);
        mesh.name = face.id;

        // Edge highlights
        const edGeo = new THREE.EdgesGeometry(planeGeo);
        const edMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
        mesh.add(new THREE.LineSegments(edGeo, edMat));

        faceMeshesGroup.add(mesh);
      }
    });

    // Particle cascade down to 2D
    const particleCount = 300;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      particlePos[i * 3] = (Math.random() - 0.5) * 8;
      particlePos[i * 3 + 1] = Math.random() * 4;
      particlePos[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.06,
      transparent: true,
      opacity: 0.5,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    particleSystemRef.current = particleSystem;
    scene.add(particleSystem);

    // Drag Orbit
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;

      scene.rotation.y += dx * 0.008;
      scene.rotation.x += dy * 0.008;

      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    // Animation loop (Auto-orbit smooth rotation)
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (!isDragging && faceMeshesGroupRef.current) {
        faceMeshesGroupRef.current.rotation.y += 0.003;
      }

      if (particleSystemRef.current) {
        const positions = particleSystemRef.current.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < particleCount; i++) {
          positions[i * 3 + 1] -= 0.02;
          if (positions[i * 3 + 1] < 0) {
            positions[i * 3 + 1] = 4;
          }
        }
        particleSystemRef.current.geometry.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      domElem.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Smooth Clean Unfolding Animation along collapseProgress (p)
  useEffect(() => {
    const p = collapseProgress; // 0 (3D Cube) to 1 (Flat 2D Net)

    if (faceMeshesGroupRef.current) {
      faceMeshesGroupRef.current.children.forEach((child) => {
        const faceData = DICE_FACES.find((f) => f.id === child.name);
        if (!faceData) return;

        const mesh = child as THREE.Mesh;
        const isCore = faceData.id === 'core';

        // Position Lerp from 3D position to 2D net position
        const px = (1 - p) * faceData.pos3d[0] + p * faceData.pos2d[0];
        const py = (1 - p) * faceData.pos3d[1] + p * faceData.pos2d[1];
        const pz = (1 - p) * faceData.pos3d[2] + p * faceData.pos2d[2];

        mesh.position.set(px, py, pz);

        if (isCore) {
          // As Z collapses, core sphere flattens along Y into a 2D disk
          const sy = Math.max(0.04, 1 - p * 0.96);
          mesh.scale.set(1, sy, 1);
        } else {
          // Rotation Lerp from 3D face orientation to flat XZ floor (rotation.x = Math.PI/2)
          const rx = (1 - p) * faceData.rot3d[0] + p * (Math.PI / 2);
          const ry = (1 - p) * faceData.rot3d[1];
          const rz = (1 - p) * faceData.rot3d[2];

          mesh.rotation.set(rx, ry, rz);

          // Highlight selected face
          if (mesh.material instanceof THREE.MeshStandardMaterial) {
            const isSelected = selectedFaceId && mesh.name === selectedFaceId;
            if (isSelected) {
              mesh.material.emissive.setHex(0xffffff);
              mesh.material.emissiveIntensity = 0.4;
            } else {
              mesh.material.emissive.setHex(0x000000);
              mesh.material.emissiveIntensity = 0;
            }
          }
        }
      });
    }
  }, [collapseProgress, selectedFaceId]);

  // Handle Camera Modes
  useEffect(() => {
    if (!cameraRef.current) return;
    const cam = cameraRef.current;
    if (cameraMode === 'top') {
      cam.position.set(0, 11, 0.001);
      cam.lookAt(0, 0, 0);
    } else if (cameraMode === 'side') {
      cam.position.set(0, 1.2, 11);
      cam.lookAt(0, 0, 0);
    } else {
      cam.position.set(0, 6.5, 9.5);
      cam.lookAt(0, 0, 0);
    }
  }, [cameraMode]);

  // Handle Auto Collapse Timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isCollapsing) {
      playCollapseSound(soundEnabled);
      timer = setInterval(() => {
        setCollapseProgress((prev) => {
          if (prev >= 1) {
            setIsCollapsing(false);
            return 1;
          }
          return prev + 0.015;
        });
      }, 35);
    }
    return () => clearInterval(timer);
  }, [isCollapsing, soundEnabled]);

  const selectedFaceInfo = DICE_FACES.find((f) => f.id === selectedFaceId);

  return (
    <div className="relative w-full h-full min-h-[620px] flex flex-col lg:flex-row gap-4 p-4 text-slate-100 bg-slate-950 font-sans">
      {/* Canvas Viewport */}
      <div className="relative flex-1 rounded-2xl border border-rose-500/30 bg-gradient-to-b from-slate-900 via-slate-950 to-black overflow-hidden shadow-2xl flex flex-col">
        {/* Header Overlay Badge */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5">
          <div className="flex items-center gap-2 bg-slate-900/90 border border-rose-500/40 px-3 py-1.5 rounded-xl backdrop-blur-md shadow-lg">
            <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-rose-200">
              projection of 3d object in 2d space
            </span>
            <span className="bg-rose-950 text-rose-300 border border-rose-700 text-[10px] px-2 py-0.5 rounded font-mono">
              3D Cube Unfolding → 2D Net
            </span>
          </div>
          <p className="text-[11px] font-mono text-slate-300 bg-black/70 px-3 py-1.5 rounded-xl border border-slate-800 backdrop-blur max-w-md">
            As vertical thickness (Z-axis) collapses to zero, all 6 dice faces (Pips 1–6) and the internal nucleus cleanly unfold flat onto a 2D net painting without losing information.
          </p>
        </div>

        {/* State Badge */}
        <div className="absolute top-4 right-4 z-10 bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 rounded-xl backdrop-blur text-xs font-mono text-rose-300 flex items-center gap-2 shadow-lg">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Foil Unfolding Progress: <strong className="text-white font-bold">{(collapseProgress * 100).toFixed(0)}%</strong></span>
        </div>

        {/* WebGL Canvas */}
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing min-h-[420px]" />

        {/* Viewport Slider & Control Bar */}
        <div className="p-3 bg-slate-900/90 border-t border-slate-800 backdrop-blur-md flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-mono font-bold text-rose-300 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-rose-400" />
              2D COLLAPSE & UNFOLDING SLIDER: <strong className="text-white">{(collapseProgress * 100).toFixed(0)}%</strong>
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (collapseProgress >= 1) {
                    setCollapseProgress(0);
                  }
                  setIsCollapsing(!isCollapsing);
                }}
                className="px-3.5 py-1 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-all"
              >
                {isCollapsing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isCollapsing ? 'PAUSE' : 'COLLAPSE'}</span>
              </button>

              <button
                onClick={() => {
                  setCollapseProgress(0);
                  setIsCollapsing(false);
                  playClickSound(soundEnabled);
                }}
                className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-mono flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>RESET</span>
              </button>

              {/* Camera View Selector */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono ml-2">
                <Camera className="w-3.5 h-3.5 text-slate-400 ml-1" />
                <button
                  onClick={() => setCameraMode('3d')}
                  className={`px-2 py-0.5 rounded ${cameraMode === '3d' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold' : 'text-slate-400'}`}
                >
                  3D Orbit
                </button>
                <button
                  onClick={() => setCameraMode('top')}
                  className={`px-2 py-0.5 rounded ${cameraMode === 'top' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold' : 'text-slate-400'}`}
                >
                  Top (2D)
                </button>
                <button
                  onClick={() => setCameraMode('side')}
                  className={`px-2 py-0.5 rounded ${cameraMode === 'side' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold' : 'text-slate-400'}`}
                >
                  Edge
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-400">0% (3D Cube)</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={collapseProgress}
              onChange={(e) => {
                setCollapseProgress(parseFloat(e.target.value));
                setIsCollapsing(false);
                playClickSound(soundEnabled);
              }}
              className="w-full accent-rose-500 bg-slate-800 rounded h-2.5 cursor-pointer"
            />
            <span className="text-xs font-mono text-rose-400 font-bold">100% (2D Net)</span>
          </div>
        </div>
      </div>

      {/* Control Sidebar & 3D Standard Reference */}
      <div className="w-full lg:w-[320px] flex flex-col gap-4">
        {/* MANDATORY Standard 3D Reference Cube */}
        <ReferenceCube3D highlightFace={selectedFaceId === 'f6' ? 'back' : selectedFaceId === 'f1' ? 'front' : null} title="3D Dice Geometry Reference" />

        {/* Controls */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3.5 backdrop-blur flex flex-col gap-3 shadow-lg">
          <span className="text-xs font-mono font-bold text-rose-300 uppercase">
            2D Foil Collapse & Unfolding Control
          </span>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300">3D Dice → 2D Net Unfolding</span>
              <span className="text-rose-400 font-bold">{(collapseProgress * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={collapseProgress}
              onChange={(e) => {
                setCollapseProgress(parseFloat(e.target.value));
                setIsCollapsing(false);
                playClickSound(soundEnabled);
              }}
              className="w-full accent-rose-500 bg-slate-800 rounded h-2 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0% (Closed 3D Cube)</span>
              <span>100% (Flat 2D Net)</span>
            </div>
          </div>

          {/* Dice Pip Face Selector */}
          <div className="pt-2 border-t border-slate-800 flex flex-col gap-1.5">
            <span className="text-[11px] font-mono font-semibold text-slate-300">
              Track Painted Dice Faces (Click to Inspect)
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {DICE_FACES.map((face) => (
                <button
                  key={face.id}
                  onClick={() => {
                    setSelectedFaceId(selectedFaceId === face.id ? null : face.id);
                    playClickSound(soundEnabled);
                  }}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-mono text-left flex items-center justify-between border transition-all ${
                    selectedFaceId === face.id
                      ? 'bg-rose-950 border-rose-400 text-white font-bold shadow'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0"
                      style={{ backgroundColor: face.color }}
                    />
                    <span className="truncate">{face.name}</span>
                  </div>
                  <Eye className="w-3 h-3 text-rose-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Inspection Info Card */}
          {selectedFaceInfo && (
            <div className="p-2.5 bg-slate-950 rounded-lg border border-rose-500/30 text-[11px] font-mono text-slate-300 space-y-1">
              <div className="text-rose-300 font-bold flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-rose-400" />
                <span>{selectedFaceInfo.name}</span>
              </div>
              <p className="text-slate-400 leading-snug">
                {selectedFaceInfo.id === 'core'
                  ? 'The interior energy nucleus has no 3D surface boundary, but flattens into an adjacent circle on the 2D foil.'
                  : `In 3D, ${selectedFaceInfo.name} sits on a specific side of the cube. As vertical thickness shrinks to zero, its ${selectedFaceInfo.pips} pips smoothly hinge open into flat net position.`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
