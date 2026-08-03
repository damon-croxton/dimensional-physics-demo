import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ReferenceCube3D } from './ReferenceCube3D';
import { playClickSound, playEtchSound, playShiftSound } from '../utils/sound';
import { Cpu, RotateCcw, Sparkles, Layers, Zap, Radio, Globe, Shield } from 'lucide-react';

interface Demo3Props {
  soundEnabled: boolean;
}

type SophonDimension = '11d' | '2d' | '1d' | '0d';

export const Demo3_SophonUnfolding: React.FC<Demo3Props> = ({ soundEnabled }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const canvas2DRef = useRef<HTMLCanvasElement>(null);

  const [dimension, setDimension] = useState<SophonDimension>('11d');
  const [isEtching, setIsEtching] = useState<boolean>(false);
  const [circuitDensity, setCircuitDensity] = useState<number>(12);
  const [isFoldedWithCircuits, setIsFoldedWithCircuits] = useState<boolean>(false);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // Mesh refs
  const proton11DGroupRef = useRef<THREE.Group | null>(null);
  const skySheet2DRef = useRef<THREE.Mesh | null>(null);
  const string1DRef = useRef<THREE.Line | null>(null);
  const point0DRef = useRef<THREE.Mesh | null>(null);
  const planetRef = useRef<THREE.Mesh | null>(null);

  // Initialize WebGL Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 3, 8);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 1.5);
    dirLight1.position.set(5, 5, 5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xf43f5e, 1.0);
    dirLight2.position.set(-5, -5, -5);
    scene.add(dirLight2);

    // --- 1. Planet Trisolaris (Background globe for 2D Sky Sheet) ---
    const planetGeo = new THREE.SphereGeometry(1.5, 32, 32);
    const planetMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.8,
      wireframe: true,
    });
    const planet = new THREE.Mesh(planetGeo, planetMat);
    planetRef.current = planet;
    scene.add(planet);

    // --- 2. 11D / 3D Compactified Proton (Calabi-Yau Polytope) ---
    const protonGroup = new THREE.Group();
    proton11DGroupRef.current = protonGroup;
    scene.add(protonGroup);

    // Nested wireframe dodecahedron & icosahedron matrices
    const icoGeo = new THREE.IcosahedronGeometry(0.9, 2);
    const icoMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.8,
    });
    const icoMesh = new THREE.Mesh(icoGeo, icoMat);
    protonGroup.add(icoMesh);

    const dodGeo = new THREE.DodecahedronGeometry(0.6, 1);
    const dodMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      wireframe: true,
      transparent: true,
      opacity: 0.9,
    });
    const dodMesh = new THREE.Mesh(dodGeo, dodMat);
    protonGroup.add(dodMesh);

    // Glowing core
    const coreGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const coreMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 1 });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    protonGroup.add(coreMesh);

    // --- 3. Unfolded 2D Sky Sheet (Giant plane wrapping planet) ---
    const skySheetGeo = new THREE.PlaneGeometry(8, 8, 32, 32);
    const skySheetMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      roughness: 0.1,
      metalness: 0.9,
    });
    const skySheet = new THREE.Mesh(skySheetGeo, skySheetMat);
    skySheet.rotation.x = Math.PI / 4;
    skySheet2DRef.current = skySheet;
    scene.add(skySheet);

    // --- 4. Unfolded 1D String ---
    const points1D = [];
    for (let i = -10; i <= 10; i += 0.5) {
      points1D.push(new THREE.Vector3(i, Math.sin(i * 2) * 0.2, 0));
    }
    const stringGeo = new THREE.BufferGeometry().setFromPoints(points1D);
    const stringMat = new THREE.LineBasicMaterial({ color: 0xf43f5e, linewidth: 3, transparent: true, opacity: 0 });
    const string1D = new THREE.Line(stringGeo, stringMat);
    string1DRef.current = string1D;
    scene.add(string1D);

    // --- 5. Unfolded 0D Point ---
    const pointGeo = new THREE.SphereGeometry(0.1, 16, 16);
    const pointMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2, transparent: true, opacity: 0 });
    const point0D = new THREE.Mesh(pointGeo, pointMat);
    point0DRef.current = point0D;
    scene.add(point0D);

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

      if (proton11DGroupRef.current) {
        proton11DGroupRef.current.rotation.y += dx * 0.008;
        proton11DGroupRef.current.rotation.x += dy * 0.008;
      }

      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    // Animation Loop
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (proton11DGroupRef.current && !isDragging) {
        proton11DGroupRef.current.rotation.y += 0.01;
        proton11DGroupRef.current.rotation.z += 0.005;
      }

      if (skySheet2DRef.current) {
        skySheet2DRef.current.rotation.z += 0.002;
      }

      if (planetRef.current) {
        planetRef.current.rotation.y += 0.002;
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

  // Update visibility according to current dimension state
  useEffect(() => {
    if (proton11DGroupRef.current) proton11DGroupRef.current.visible = dimension === '11d';
    if (skySheet2DRef.current) {
      const mat = skySheet2DRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = dimension === '2d' ? 0.85 : 0;
      skySheet2DRef.current.visible = dimension === '2d';
    }
    if (string1DRef.current) {
      const mat = string1DRef.current.material as THREE.LineBasicMaterial;
      mat.opacity = dimension === '1d' ? 1.0 : 0;
      string1DRef.current.visible = dimension === '1d';
    }
    if (point0DRef.current) {
      const mat = point0DRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = dimension === '0d' ? 1.0 : 0;
      point0DRef.current.visible = dimension === '0d';
    }
  }, [dimension]);

  // Render 2D Circuit Etching Canvas overlay
  useEffect(() => {
    const canvas = canvas2DRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background 2D mirror sheet
    ctx.fillStyle = 'rgba(14, 165, 233, 0.15)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw circuit grid lines
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1;
    const gridStep = canvas.width / circuitDensity;

    for (let x = 0; x <= canvas.width; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw integrated quantum computer circuits
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 8;

    for (let i = 0; i < circuitDensity; i++) {
      ctx.beginPath();
      const startX = Math.floor(Math.sin(i * 3) * 5 + 5) * gridStep;
      const startY = Math.floor(Math.cos(i * 2) * 5 + 5) * gridStep;
      const midX = startX + gridStep * 2;
      const endY = startY + gridStep * 3;

      ctx.moveTo(startX, startY);
      ctx.lineTo(midX, startY);
      ctx.lineTo(midX, endY);
      ctx.stroke();

      // Nodes
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(midX, endY, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [circuitDensity]);

  return (
    <div className="relative w-full h-full min-h-[620px] flex flex-col lg:flex-row gap-4 p-4 text-slate-100 bg-slate-950 font-sans">
      {/* Canvas Viewport */}
      <div className="relative flex-1 rounded-2xl border border-sky-500/20 bg-gradient-to-b from-slate-900 via-slate-950 to-black overflow-hidden shadow-2xl flex flex-col">
        {/* Header Badge */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-1">
          <div className="flex items-center gap-2 bg-slate-900/90 border border-sky-500/40 px-3 py-1.5 rounded-xl backdrop-blur-md shadow-lg">
            <Radio className="w-4 h-4 text-sky-400 animate-pulse" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-sky-200">
              Sophon Proton Unfolding Engine
            </span>
            <span className="bg-sky-950 text-sky-300 border border-sky-700 text-[10px] px-2 py-0.5 rounded font-mono">
              Trisolaran Particle Accelerator
            </span>
          </div>
          <p className="text-[11px] font-mono text-slate-400 bg-black/60 px-2 py-1 rounded backdrop-blur max-w-sm">
            Unfold a subatomic 11D proton into a giant 2D sky mirror, etch supercomputer circuits, and fold it back up!
          </p>
        </div>

        {/* 2D Interactive Circuit Canvas Overlay when in 2D mode */}
        {dimension === '2d' && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm pointer-events-auto">
            <div className="relative border border-sky-400/60 rounded-2xl p-3 bg-slate-950/90 shadow-2xl flex flex-col items-center gap-2">
              <div className="flex items-center justify-between w-full text-xs font-mono text-sky-300 border-b border-slate-800 pb-2">
                <span className="flex items-center gap-1.5 font-bold">
                  <Cpu className="w-4 h-4 text-sky-400" />
                  2D Sky Mirror Proton Surface (Nuclear Laser Etching)
                </span>
                <span className="text-[10px] bg-sky-950 px-2 py-0.5 rounded border border-sky-800">
                  Surface Area: 10^14 m²
                </span>
              </div>

              <canvas
                ref={canvas2DRef}
                width={360}
                height={260}
                className="rounded-lg border border-sky-800 bg-black cursor-crosshair shadow-inner"
                onClick={() => {
                  setCircuitDensity((prev) => (prev >= 20 ? 8 : prev + 3));
                  playEtchSound(soundEnabled);
                }}
              />

              <div className="flex items-center justify-between w-full text-[11px] font-mono text-slate-400">
                <span>Click canvas to etch quantum circuit arrays</span>
                <button
                  onClick={() => {
                    setDimension('11d');
                    setIsFoldedWithCircuits(true);
                    playShiftSound(soundEnabled, 600);
                  }}
                  className="px-3 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold shadow-lg shadow-sky-600/30 flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>FOLD BACK TO 11D PROTON</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* WebGL Canvas */}
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing min-h-[420px]" />

        {/* Bottom Mode Switch Bar */}
        <div className="p-3 bg-slate-900/90 border-t border-slate-800 backdrop-blur-md flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono text-slate-400 mr-1">Dimension State:</span>
            <button
              onClick={() => {
                setDimension('11d');
                playShiftSound(soundEnabled, 300);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 border transition-all ${
                dimension === '11d' ? 'bg-sky-500/20 border-sky-400 text-sky-200' : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              11D / 3D Proton
            </button>

            <button
              onClick={() => {
                setDimension('2d');
                playShiftSound(soundEnabled, 450);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 border transition-all ${
                dimension === '2d' ? 'bg-sky-500/20 border-sky-400 text-sky-200' : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-sky-400" />
              2D Unfolded Sky Mirror
            </button>

            <button
              onClick={() => {
                setDimension('1d');
                playShiftSound(soundEnabled, 600);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono border ${
                dimension === '1d' ? 'bg-rose-500/20 border-rose-400 text-rose-200' : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              1D String Thread
            </button>

            <button
              onClick={() => {
                setDimension('0d');
                playShiftSound(soundEnabled, 200);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono border ${
                dimension === '0d' ? 'bg-amber-500/20 border-amber-400 text-amber-200' : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              0D Point
            </button>
          </div>
        </div>
      </div>

      {/* Control Sidebar */}
      <div className="w-full lg:w-[320px] flex flex-col gap-4">
        {/* MANDATORY Standard 3D Reference Cube */}
        <ReferenceCube3D title="Macroscopic 3D Cube (Reference)" />

        {/* Sophon Status Box */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3.5 backdrop-blur flex flex-col gap-3">
          <span className="text-xs font-mono font-bold text-sky-300 uppercase flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-sky-400" />
            Sophon Supercomputer Status
          </span>

          <div className="flex flex-col gap-2 text-xs font-mono">
            <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Integrated Circuits:</span>
              <span className="text-sky-300 font-bold">{isFoldedWithCircuits ? 'ACTIVE (ETCHED)' : 'UNETCHED'}</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Scale Radius:</span>
              <span className="text-amber-400 font-bold">{dimension === '11d' ? '10⁻¹⁵ meters' : '10⁷ meters'}</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Intelligence Level:</span>
              <span className="text-emerald-400 font-bold">{isFoldedWithCircuits ? 'Quantum Autonomous AI' : 'Standard Subatomic'}</span>
            </div>
          </div>
        </div>

        {/* Book Lore */}
        <div className="rounded-xl border border-sky-500/20 bg-slate-900/60 p-3 text-xs text-slate-300 flex flex-col gap-1.5">
          <span className="font-mono font-bold text-sky-300">The Three-Body Problem Lore:</span>
          <p className="leading-relaxed text-[11px] text-slate-300">
            "To build the Sophon, Trisolaris unfolded a proton from 11 dimensions into 2 dimensions. It covered the entire sky of Trisolaris like a giant mirror. There, nuclear lasers etched integrated circuit arrays onto its surface before folding it back into subatomic scale."
          </p>
        </div>
      </div>
    </div>
  );
};
