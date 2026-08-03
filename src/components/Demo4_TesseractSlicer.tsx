import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ReferenceCube3D } from './ReferenceCube3D';
import { playClickSound, playShiftSound } from '../utils/sound';
import { Box, Sliders, Orbit, Sparkles, Layers, Shield, Eye } from 'lucide-react';

interface Demo4Props {
  soundEnabled: boolean;
}

// Generate the 16 4D Vertices of a Tesseract
const TESSERACT_VERTICES_4D: Array<[number, number, number, number]> = [];
for (let x of [-1, 1]) {
  for (let y of [-1, 1]) {
    for (let z of [-1, 1]) {
      for (let w of [-1, 1]) {
        TESSERACT_VERTICES_4D.push([x, y, z, w]);
      }
    }
  }
}

// Generate the 32 Edges connecting vertices differing in exactly 1 coordinate
const TESSERACT_EDGES: Array<[number, number]> = [];
for (let i = 0; i < 16; i++) {
  for (let j = i + 1; j < 16; j++) {
    let diff = 0;
    for (let k = 0; k < 4; k++) {
      if (TESSERACT_VERTICES_4D[i][k] !== TESSERACT_VERTICES_4D[j][k]) diff++;
    }
    if (diff === 1) {
      TESSERACT_EDGES.push([i, j]);
    }
  }
}

export const Demo4_TesseractSlicer: React.FC<Demo4Props> = ({ soundEnabled }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // 4D Rotation Angles
  const [angleXW, setAngleXW] = useState<number>(0.5);
  const [angleYW, setAngleYW] = useState<number>(0.3);
  const [angleZW, setAngleZW] = useState<number>(0.2);
  const [wSlicePosition, setWSlicePosition] = useState<number>(0.0); // -2 to +2
  const [autoRotate4D, setAutoRotate4D] = useState<boolean>(true);
  const [renderMode, setRenderMode] = useState<'wireframe' | 'solid' | 'points'>('wireframe');

  const sceneRef = useRef<THREE.Scene | null>(null);
  const tesseractGroupRef = useRef<THREE.Group | null>(null);
  const sliceMeshGroupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 2.5, 6.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 1.2);
    dirLight1.position.set(5, 5, 5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xa855f7, 1.0);
    dirLight2.position.set(-5, -5, -5);
    scene.add(dirLight2);

    // Tesseract 3D Projection Group
    const tesseractGroup = new THREE.Group();
    tesseractGroupRef.current = tesseractGroup;
    scene.add(tesseractGroup);

    // 3D Slicing Hyperplane Result Group
    const sliceMeshGroup = new THREE.Group();
    sliceMeshGroupRef.current = sliceMeshGroup;
    scene.add(sliceMeshGroup);

    // Mouse Drag Orbiting
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

      tesseractGroup.rotation.y += dx * 0.008;
      tesseractGroup.rotation.x += dy * 0.008;

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

      if (autoRotate4D) {
        setAngleXW((prev) => (prev + 0.008) % (Math.PI * 2));
        setAngleYW((prev) => (prev + 0.005) % (Math.PI * 2));
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
  }, [autoRotate4D]);

  // Re-calculate 4D Rotation & Projection whenever angles or slice change
  useEffect(() => {
    const tesseractGroup = tesseractGroupRef.current;
    if (!tesseractGroup) return;

    // Clear previous projected geometry
    while (tesseractGroup.children.length > 0) {
      const child = tesseractGroup.children[0];
      tesseractGroup.remove(child);
    }

    // 1. Apply 4D Rotations (XW, YW, ZW)
    const cosXW = Math.cos(angleXW), sinXW = Math.sin(angleXW);
    const cosYW = Math.cos(angleYW), sinYW = Math.sin(angleYW);
    const cosZW = Math.cos(angleZW), sinZW = Math.sin(angleZW);

    const projected3DVerts: THREE.Vector3[] = [];

    TESSERACT_VERTICES_4D.forEach(([x, y, z, w]) => {
      // Rotate in XW plane
      let x1 = x * cosXW - w * sinXW;
      let w1 = x * sinXW + w * cosXW;

      // Rotate in YW plane
      let y1 = y * cosYW - w1 * sinYW;
      let w2 = y * sinYW + w1 * cosYW;

      // Rotate in ZW plane
      let z1 = z * cosZW - w2 * sinZW;
      let w3 = z * sinZW + w2 * cosZW;

      // 4D Perspective Projection down to 3D Space: (X', Y', Z') = 3D / (d - W)
      const distance = 3.0;
      const scale = distance / (distance - w3);

      projected3DVerts.push(new THREE.Vector3(x1 * scale * 0.8, y1 * scale * 0.8, z1 * scale * 0.8));
    });

    // 2. Render 32 4D-to-3D Projected Edges
    const lineMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 });
    TESSERACT_EDGES.forEach(([i, j]) => {
      const points = [projected3DVerts[i], projected3DVerts[j]];
      const edgeGeo = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(edgeGeo, lineMat);
      tesseractGroup.add(line);
    });

    // 3. Render 16 Vertex Spheres
    projected3DVerts.forEach((v, idx) => {
      const sphereGeo = new THREE.SphereGeometry(0.06, 12, 12);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: idx % 2 === 0 ? 0xa855f7 : 0xf59e0b,
        emissive: 0x0284c7,
      });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.position.copy(v);
      tesseractGroup.add(sphere);
    });

    // 4. Render 3D Slicing Plane Representation (W = wSlicePosition)
    const sliceGroup = sliceMeshGroupRef.current;
    if (sliceGroup) {
      while (sliceGroup.children.length > 0) {
        sliceGroup.remove(sliceGroup.children[0]);
      }

      // Slicing 3D hyperplane box
      const sliceBoxGeo = new THREE.BoxGeometry(2.2, 2.2, 2.2);
      const sliceBoxMat = new THREE.MeshStandardMaterial({
        color: 0x22c55e,
        wireframe: true,
        transparent: true,
        opacity: Math.max(0.1, 0.8 - Math.abs(wSlicePosition)),
      });
      const sliceBox = new THREE.Mesh(sliceBoxGeo, sliceBoxMat);
      sliceBox.scale.setScalar(Math.max(0.05, 1 - Math.abs(wSlicePosition) * 0.4));
      sliceGroup.add(sliceBox);
    }
  }, [angleXW, angleYW, angleZW, wSlicePosition]);

  return (
    <div className="relative w-full h-full min-h-[620px] flex flex-col lg:flex-row gap-4 p-4 text-slate-100 bg-slate-950 font-sans">
      {/* WebGL Canvas Viewport */}
      <div className="relative flex-1 rounded-2xl border border-purple-500/20 bg-gradient-to-b from-slate-900 via-slate-950 to-black overflow-hidden shadow-2xl flex flex-col">
        {/* Header Badge */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-1">
          <div className="flex items-center gap-2 bg-slate-900/90 border border-purple-500/40 px-3 py-1.5 rounded-xl backdrop-blur-md shadow-lg">
            <Box className="w-4 h-4 text-purple-400 animate-pulse" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-purple-200">
              4D Tesseract Rotation & 3D Cross-Section Slicer
            </span>
            <span className="bg-purple-950 text-purple-300 border border-purple-700 text-[10px] px-2 py-0.5 rounded font-mono">
              6-Plane 4D Rotation Engine
            </span>
          </div>
          <p className="text-[11px] font-mono text-slate-400 bg-black/60 px-2 py-1 rounded backdrop-blur max-w-sm">
            16 Vertices, 32 Edges, 24 Faces, 8 Cubes. Rotating in the XW and YW 4D planes turns inner cubes inside-out!
          </p>
        </div>

        {/* Canvas */}
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing min-h-[420px]" />

        {/* Bottom Bar Controls */}
        <div className="p-3 bg-slate-900/90 border-t border-slate-800 backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setAutoRotate4D(!autoRotate4D);
                playClickSound(soundEnabled);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2 border transition-all ${
                autoRotate4D ? 'bg-purple-500/20 border-purple-400 text-purple-200' : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <Orbit className="w-3.5 h-3.5 text-purple-400" />
              <span>4D Auto-Rotation: {autoRotate4D ? 'ACTIVE' : 'PAUSED'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Control Sidebar */}
      <div className="w-full lg:w-[320px] flex flex-col gap-4">
        {/* MANDATORY Standard 3D Reference Cube */}
        <ReferenceCube3D title="3D Cube Shadow (Reference)" />

        {/* 4D Angles Controls */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3.5 backdrop-blur flex flex-col gap-3">
          <span className="text-xs font-mono font-bold text-purple-300 uppercase flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-purple-400" />
            4D Rotation Planes
          </span>

          {/* Slider 1: XW Angle */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300">X-W Plane Angle</span>
              <span className="text-purple-400 font-bold">{(angleXW * (180 / Math.PI)).toFixed(0)}°</span>
            </div>
            <input
              type="range"
              min="0"
              max={Math.PI * 2}
              step="0.05"
              value={angleXW}
              onChange={(e) => {
                setAngleXW(parseFloat(e.target.value));
                setAutoRotate4D(false);
                playClickSound(soundEnabled);
              }}
              className="w-full accent-purple-500 bg-slate-800 rounded h-1.5 cursor-pointer"
            />
          </div>

          {/* Slider 2: YW Angle */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300">Y-W Plane Angle</span>
              <span className="text-purple-400 font-bold">{(angleYW * (180 / Math.PI)).toFixed(0)}°</span>
            </div>
            <input
              type="range"
              min="0"
              max={Math.PI * 2}
              step="0.05"
              value={angleYW}
              onChange={(e) => {
                setAngleYW(parseFloat(e.target.value));
                setAutoRotate4D(false);
                playClickSound(soundEnabled);
              }}
              className="w-full accent-purple-500 bg-slate-800 rounded h-1.5 cursor-pointer"
            />
          </div>

          {/* Slider 3: 3D Hyperplane Slice W */}
          <div className="flex flex-col gap-1 pt-2 border-t border-slate-800">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-emerald-300 font-semibold">3D Slicing Hyperplane (W)</span>
              <span className="text-emerald-400 font-bold">{wSlicePosition.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="-1.5"
              max="1.5"
              step="0.05"
              value={wSlicePosition}
              onChange={(e) => {
                setWSlicePosition(parseFloat(e.target.value));
                playClickSound(soundEnabled);
              }}
              className="w-full accent-emerald-500 bg-slate-800 rounded h-1.5 cursor-pointer"
            />
            <span className="text-[10px] text-slate-400">
              Slices the 4D hypercube with a 3D hyperplane, producing morphing 3D polyhedra cross-sections.
            </span>
          </div>
        </div>

        {/* Science Explanation */}
        <div className="rounded-xl border border-purple-500/20 bg-slate-900/60 p-3 text-xs text-slate-300 flex flex-col gap-1.5">
          <span className="font-mono font-bold text-purple-300">Mathematical Analogy:</span>
          <p className="leading-relaxed text-[11px] text-slate-300">
            "A 3D cube casting a shadow on a 2D wall produces a 2D square. A 4D hypercube casting a shadow into 3D space produces a 3D cube inside another 3D cube!"
          </p>
        </div>
      </div>
    </div>
  );
};
