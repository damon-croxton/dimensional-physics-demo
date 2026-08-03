import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ReferenceCube3D } from './ReferenceCube3D';
import { playClickSound, playShiftSound } from '../utils/sound';
import { Sliders, Sparkles, Layers, Compass, Info, ArrowRight } from 'lucide-react';

interface Demo4Props {
  soundEnabled: boolean;
}

const DIMENSION_CONFIG = [
  {
    dim: 1,
    title: '1D Line Segment (1-Space)',
    axes: '[X]',
    color: '#38bdf8',
    subtitle: '1D Line - Zero Height, Zero Depth',
    desc: 'Space consists of a single linear coordinate axis (X). Extruding this line segment along the perpendicular Y axis creates a 2D Square.',
    lore: '"In a 1D universe, life is a point trapped between two other points on a line. There is no concept of turning, only forward and back."',
  },
  {
    dim: 2,
    title: '2D Flatland Square (2-Space)',
    axes: '[X, Y]',
    color: '#22c55e',
    subtitle: '2D Surface - Flatland Physics',
    desc: 'Space has width and height (X, Y). Extruding this 2D square along the perpendicular Z axis creates a 3D Cube.',
    lore: '"A 2D Flatlander cannot fathom a 3D sphere. When a sphere passes through Flatland, the Flatlander only sees a growing and shrinking 2D circle."',
  },
  {
    dim: 3,
    title: '3D Standard Dice Cube (3-Space)',
    axes: '[X, Y, Z]',
    color: '#eab308',
    subtitle: '3D Volume - Occluded Interior',
    desc: 'Space has volume (X, Y, Z). The exact same 6 dice faces (Pips 1-6) form a closed 3D cube with an opaque interior.',
    lore: '"Human perception is locked in 3D. We can see surfaces, but the interior of a locked steel vault or an apple remains hidden from our line of sight."',
  },
  {
    dim: 4,
    title: '4D Tesseract Dice (4-Space)',
    axes: '[X, Y, Z, W]',
    color: '#a855f7',
    subtitle: '4D Hypercube - Simultaneous Vision',
    desc: 'The exact same 6 dice faces expand outward along the 4th spatial dimension (W), allowing simultaneous vision of all faces and the internal core without occlusion.',
    lore: '"Entering 4D space feels like standing inside the universe itself. You look upon a 3D cube and see its front, back, top, bottom, left, right, and internal organs all at once."',
  },
  {
    dim: 5,
    title: '5D Calabi-Yau Manifold (5-Space)',
    axes: '[X, Y, Z, W, V]',
    color: '#ec4899',
    subtitle: '5D Hyper-Space - String Vibrations',
    desc: 'Space incorporates a 5th spatial axis (V). Geometry folds into complex Calabi-Yau manifolds where quantum strings vibrate across 5-space.',
    lore: '"At 5 dimensions, space curls into extra-dimensional micro-manifolds. Matter is no longer a localized particle, but a harmonic wave vibrating across 5 orthogonal axes."',
  },
];

const DICE_FACES_DATA = [
  { name: 'front', pips: 1, color: '#a855f7', normal: [0, 0, 1], rot: [0, 0, 0] },
  { name: 'top', pips: 2, color: '#22c55e', normal: [0, 1, 0], rot: [-Math.PI / 2, 0, 0] },
  { name: 'right', pips: 3, color: '#ef4444', normal: [1, 0, 0], rot: [0, Math.PI / 2, 0] },
  { name: 'left', pips: 4, color: '#3b82f6', normal: [-1, 0, 0], rot: [0, -Math.PI / 2, 0] },
  { name: 'bottom', pips: 5, color: '#eab308', normal: [0, -1, 0], rot: [Math.PI / 2, 0, 0] },
  { name: 'back', pips: 6, color: '#06b6d4', normal: [0, 0, -1], rot: [0, Math.PI, 0] },
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

  if (pipCount === 1) drawPip(c, c);
  if (pipCount === 2) { drawPip(l, l); drawPip(h, h); }
  if (pipCount === 3) { drawPip(l, l); drawPip(c, c); drawPip(h, h); }
  if (pipCount === 4) { drawPip(l, l); drawPip(h, l); drawPip(l, h); drawPip(h, h); }
  if (pipCount === 5) { drawPip(l, l); drawPip(h, l); drawPip(c, c); drawPip(l, h); drawPip(h, h); }
  if (pipCount === 6) { drawPip(l, l); drawPip(h, l); drawPip(l, c); drawPip(h, c); drawPip(l, h); drawPip(h, h); }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export const Demo4_DimensionalEvolution: React.FC<Demo4Props> = ({ soundEnabled }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [dimVal, setDimVal] = useState<number>(1.0); // Continuous slider from 1.0 to 5.0

  const sceneRef = useRef<THREE.Scene | null>(null);

  // Geometry references
  const line1DRef = useRef<THREE.Line | null>(null);
  const plane2DRef = useRef<THREE.Mesh | null>(null);
  const diceFacesGroupRef = useRef<THREE.Group | null>(null);
  const diceFaceMeshesRef = useRef<THREE.Mesh[]>([]);
  const tesseractWireGroupRef = useRef<THREE.Group | null>(null);
  const manifold5DGroupRef = useRef<THREE.Group | null>(null);
  const coreSphereRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 3.2, 7.8);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 1.8);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0xa855f7, 2, 50);
    pointLight.position.set(0, 2, 2);
    scene.add(pointLight);

    // Master Group
    const masterGroup = new THREE.Group();
    scene.add(masterGroup);

    // --- 1D LINE SEGMENT (Base 1-Space) ---
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-1.5, 0, 0),
      new THREE.Vector3(1.5, 0, 0),
    ]);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 4 });
    const line1D = new THREE.Line(lineGeo, lineMat);
    line1DRef.current = line1D;
    masterGroup.add(line1D);

    // 1D Pip Dots (using the 6 dice colors)
    const pipColors = [0xa855f7, 0x22c55e, 0xef4444, 0x3b82f6, 0xeab308, 0x06b6d4];
    for (let i = 0; i < 6; i++) {
      const pMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 16, 16),
        new THREE.MeshStandardMaterial({ color: pipColors[i], emissive: pipColors[i], emissiveIntensity: 0.8 })
      );
      pMesh.position.set(-1.25 + i * 0.5, 0, 0);
      line1D.add(pMesh);
    }

    // --- 2D FLATLAND NET PLANE ---
    const planeGeo = new THREE.PlaneGeometry(2.8, 2.8);
    const planeMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      roughness: 0.3,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
    });
    const plane2D = new THREE.Mesh(planeGeo, planeMat);
    plane2DRef.current = plane2D;
    masterGroup.add(plane2D);

    const planeEdges = new THREE.EdgesGeometry(planeGeo);
    const planeEdgesMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
    plane2D.add(new THREE.LineSegments(planeEdges, planeEdgesMat));

    // --- 3D & 4D REUSED DICE FACES GROUP ---
    // (Consists of the exact same 6 dice face planes as Demo 1 & Demo 2)
    const diceFacesGroup = new THREE.Group();
    diceFacesGroupRef.current = diceFacesGroup;
    masterGroup.add(diceFacesGroup);

    const faceMeshes: THREE.Mesh[] = [];

    DICE_FACES_DATA.forEach((fd) => {
      const texture = createDicePipTexture(fd.pips, fd.color);
      const faceGeo = new THREE.PlaneGeometry(2.2, 2.2);
      const faceMat = new THREE.MeshStandardMaterial({
        map: texture,
        side: THREE.DoubleSide,
        roughness: 0.2,
        metalness: 0.1,
        transparent: true,
        opacity: 0.95,
      });

      const mesh = new THREE.Mesh(faceGeo, faceMat);
      mesh.rotation.set(fd.rot[0], fd.rot[1], fd.rot[2]);

      // White edge highlights
      const edgesGeo = new THREE.EdgesGeometry(faceGeo);
      const edgesMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
      mesh.add(new THREE.LineSegments(edgesGeo, edgesMat));

      diceFacesGroup.add(mesh);
      faceMeshes.push(mesh);
    });
    diceFaceMeshesRef.current = faceMeshes;

    // --- CENTRAL AMBER CORE SPHERE ---
    const coreSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 1.5 })
    );
    coreSphereRef.current = coreSphere;
    masterGroup.add(coreSphere);

    // --- 4D TESSERACT WIREFRAME & LIGHT RAYS ---
    const tesseractWireGroup = new THREE.Group();
    tesseractWireGroupRef.current = tesseractWireGroup;
    masterGroup.add(tesseractWireGroup);

    const innerBoxGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
    const innerEdgesGeo = new THREE.EdgesGeometry(innerBoxGeo);
    const innerEdgesMat = new THREE.LineBasicMaterial({ color: 0xa855f7, linewidth: 2 });
    const innerWire = new THREE.LineSegments(innerEdgesGeo, innerEdgesMat);
    tesseractWireGroup.add(innerWire);

    tesseractWireGroup.visible = false;

    // --- 5D CALABI-YAU MANIFOLD GROUP ---
    const manifoldGroup = new THREE.Group();
    manifold5DGroupRef.current = manifoldGroup;
    masterGroup.add(manifoldGroup);

    const torus1 = new THREE.Mesh(
      new THREE.TorusGeometry(1.8, 0.3, 20, 50),
      new THREE.MeshStandardMaterial({ color: 0xec4899, emissive: 0xbe185d, wireframe: true })
    );
    manifoldGroup.add(torus1);

    const torus2 = new THREE.Mesh(
      new THREE.TorusGeometry(1.1, 0.2, 16, 40),
      new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0x7e22ce, wireframe: true })
    );
    torus2.rotation.x = Math.PI / 2;
    manifoldGroup.add(torus2);

    manifoldGroup.visible = false;

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

      masterGroup.rotation.y += dx * 0.008;
      masterGroup.rotation.x += dy * 0.008;

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

      if (!isDragging) {
        masterGroup.rotation.y += 0.005;
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

  // Interpolate dimensional state based on continuous dimVal (1.0 to 5.0)
  useEffect(() => {
    const d = dimVal;

    // --- PHASE 1: 1D Line Segment (d = 1.0 to 2.0) ---
    if (line1DRef.current) {
      line1DRef.current.visible = d < 2.1;
      // Line remains centered at Y=0 when 1D, or moves to top edge during 1D->2D extrusion
      line1DRef.current.position.y = d <= 1.0 ? 0 : (d - 1.0) * 1.4;
    }

    // --- PHASE 2: 2D Flatland Plane Extrusion along Y (d = 1.0 to 2.1) ---
    if (plane2DRef.current) {
      if (d >= 1.0 && d <= 2.1) {
        plane2DRef.current.visible = true;
        const scaleY = Math.max(0.01, d - 1.0);
        plane2DRef.current.scale.set(1.0, scaleY, 1.0);
        const mat = plane2DRef.current.material as THREE.MeshStandardMaterial;
        mat.opacity = d <= 1.0 ? 0 : Math.min(0.9, (d - 1.0) * 0.9);
      } else {
        plane2DRef.current.visible = false;
      }
    }

    // --- PHASE 3: 2D -> 3D Extrusion along Z into Solid Dice Cube (d = 2.0 to 3.0) ---
    // --- & PHASE 4: 3D -> 4D Expansion along W (d = 3.0 to 4.0) ---
    if (diceFacesGroupRef.current) {
      if (d >= 2.0 && d <= 4.8) {
        diceFacesGroupRef.current.visible = true;

        if (d <= 3.0) {
          // 2D -> 3D Extrusion:
          // The exact 6 dice faces form a closed 3D Cube (baseDist = 1.1)
          // while extruding its depth along Z-axis from 0.01 at 2.0D to 1.0 at 3.0D
          const zExtrude = Math.max(0.01, d - 2.0);
          diceFacesGroupRef.current.scale.set(1.0, 1.0, zExtrude);

          // Faces stay in sealed 3D cube configuration (baseDist = 1.1)
          diceFaceMeshesRef.current.forEach((mesh, idx) => {
            const norm = DICE_FACES_DATA[idx].normal;
            mesh.position.set(norm[0] * 1.1, norm[1] * 1.1, norm[2] * 1.1);
          });
        } else {
          // 3D -> 4D Hypercube Expansion:
          // Full 3D scale (1,1,1)
          diceFacesGroupRef.current.scale.set(1.0, 1.0, 1.0);

          // Faces translate outwards along 4D W-axis normal from 1.1 up to 2.2
          const factor4D = (d - 3.0); // 0 at 3D, 1 at 4D
          const currentDist = 1.1 + factor4D * 1.1; // 1.1 to 2.2

          diceFaceMeshesRef.current.forEach((mesh, idx) => {
            const norm = DICE_FACES_DATA[idx].normal;
            mesh.position.set(norm[0] * currentDist, norm[1] * currentDist, norm[2] * currentDist);
          });
        }
      } else {
        diceFacesGroupRef.current.visible = false;
      }
    }

    // Central Amber Core Sphere
    if (coreSphereRef.current) {
      coreSphereRef.current.visible = d >= 2.2;
      if (d >= 2.2 && d <= 3.0) {
        // Obscured inside closed 3D cube
        const mat = coreSphereRef.current.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 0.3;
      } else if (d > 3.0) {
        // Exposed and glowing in 4D simultaneous vision
        const mat = coreSphereRef.current.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 1.8;
      }
    }

    // 4D Tesseract Wireframe
    if (tesseractWireGroupRef.current) {
      tesseractWireGroupRef.current.visible = d >= 3.1 && d <= 4.5;
      if (d >= 3.1 && d <= 4.5) {
        const scale = Math.min(1.0, (d - 3.1) / 0.9);
        tesseractWireGroupRef.current.scale.set(scale, scale, scale);
      }
    }

    // 5D Calabi-Yau Manifold
    if (manifold5DGroupRef.current) {
      manifold5DGroupRef.current.visible = d >= 4.0;
      if (d >= 4.0) {
        const scale = Math.min(1.0, (d - 4.0));
        manifold5DGroupRef.current.scale.set(scale, scale, scale);
      }
    }
  }, [dimVal]);

  const currentDiscreteDim = Math.floor(dimVal);
  const currentConfig = DIMENSION_CONFIG.find((c) => c.dim === Math.min(5, Math.max(1, currentDiscreteDim)))!;

  const getExtrusionStatus = () => {
    if (dimVal < 2.0) {
      const pct = Math.round((dimVal - 1.0) * 100);
      return `Extruding 1D Line segment along Y-axis → 2D Square (${pct}% extruded)`;
    } else if (dimVal < 3.0) {
      const pct = Math.round((dimVal - 2.0) * 100);
      return `Extruding 2D Flat Square along Z-axis → 3D Dice Cube (${pct}% extruded)`;
    } else if (dimVal < 4.0) {
      const pct = Math.round((dimVal - 3.0) * 100);
      return `Extruding 3D Dice Cube along 4th W-axis → 4D Hypercube (${pct}% expanded)`;
    } else {
      const pct = Math.round((dimVal - 4.0) * 100);
      return `Extruding 4D Hypercube along 5th V-axis → 5D Calabi-Yau Manifold (${pct}% folded)`;
    }
  };

  return (
    <div className="relative w-full h-full min-h-[620px] flex flex-col lg:flex-row gap-4 p-4 text-slate-100 bg-slate-950 font-sans">
      {/* Interactive WebGL Canvas */}
      <div className="relative flex-1 rounded-2xl border border-purple-500/30 bg-gradient-to-b from-slate-900 via-slate-950 to-black overflow-hidden shadow-2xl flex flex-col">
        {/* Top Header Badge */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5">
          <div className="flex items-center gap-2 bg-slate-900/90 border border-purple-500/40 px-3 py-1.5 rounded-xl backdrop-blur-md shadow-lg">
            <Layers className="w-4 h-4 text-purple-400 animate-pulse" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-purple-200">
              transition through the dimensions
            </span>
            <span
              className="px-2 py-0.5 rounded font-mono text-[10px] border"
              style={{ backgroundColor: `${currentConfig.color}20`, borderColor: currentConfig.color, color: currentConfig.color }}
            >
              {currentConfig.axes}
            </span>
          </div>
          <p className="text-[11px] font-mono text-slate-300 bg-black/70 px-3 py-1.5 rounded-xl border border-slate-800 backdrop-blur max-w-md">
            Drag the continuous slider below to see the EXACT same dice cube continuously evolve from a 1D Line to a 3D Cube, expand into a 4D Tesseract, and fold into 5D Space.
          </p>
        </div>

        {/* State Badge */}
        <div className="absolute top-4 right-4 z-10 bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 rounded-xl backdrop-blur text-xs font-mono text-purple-300 flex items-center gap-2 shadow-lg">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Dimension Level: <strong className="text-white font-bold">{dimVal.toFixed(2)}D</strong></span>
        </div>

        {/* Active Morph Formula HUD Banner */}
        <div className="absolute top-20 left-4 right-4 z-10 sm:right-auto bg-purple-950/80 border border-purple-500/50 px-3.5 py-1.5 rounded-xl backdrop-blur text-xs font-mono text-purple-200 flex items-center gap-2 shadow-xl max-w-lg">
          <ArrowRight className="w-4 h-4 text-purple-400 animate-bounce" />
          <span>{getExtrusionStatus()}</span>
        </div>

        {/* WebGL Canvas */}
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing min-h-[420px]" />

        {/* Bottom Continuous Slider Bar for 1D to 5D Extrusion */}
        <div className="p-4 bg-slate-900/90 border-t border-slate-800 backdrop-blur-md flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-purple-300 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-purple-400" />
              CONTINUOUS DIMENSIONAL EXTRUSION SLIDER (1.0D → 5.0D)
            </span>
            <span className="text-xs font-mono font-bold text-white px-2.5 py-0.5 rounded bg-purple-950 border border-purple-500">
              {currentConfig.title}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs font-mono font-bold text-sky-400">1.0D</span>
            <input
              type="range"
              min="1.0"
              max="5.0"
              step="0.05"
              value={dimVal}
              onChange={(e) => {
                const newD = parseFloat(e.target.value);
                setDimVal(newD);
                playShiftSound(soundEnabled, 200 + newD * 80);
              }}
              className="w-full accent-purple-500 bg-slate-800 rounded h-3 cursor-pointer"
            />
            <span className="text-xs font-mono font-bold text-pink-400">5.0D</span>
          </div>

          {/* Quick Dimension Step Buttons */}
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((d) => (
              <button
                key={d}
                onClick={() => {
                  setDimVal(d);
                  playShiftSound(soundEnabled, 200 + d * 100);
                }}
                className={`py-1.5 rounded-xl text-xs font-mono font-bold border transition-all ${
                  Math.round(dimVal) === d
                    ? 'bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-600/30'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                {d}.0D
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar Control & 3D Standard Reference */}
      <div className="w-full lg:w-[320px] flex flex-col gap-4">
        {/* MANDATORY Standard 3D Reference Cube */}
        <ReferenceCube3D title="3D Standard Cube Reference" />

        {/* Dimension Properties Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3.5 backdrop-blur flex flex-col gap-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-mono font-bold text-purple-300 uppercase flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-purple-400" />
              {currentConfig.title}
            </span>
            <span className="text-[10px] font-mono text-slate-400">{currentConfig.axes}</span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            {currentConfig.desc}
          </p>
        </div>

        {/* Dark Forest Lore */}
        <div className="rounded-xl border border-purple-500/20 bg-slate-900/60 p-3 text-xs text-slate-300 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 font-mono font-bold text-purple-300">
            <Info className="w-3.5 h-3.5 text-purple-400" />
            <span>Dimensional Physics Lore</span>
          </div>
          <p className="leading-relaxed text-[11px] text-slate-300 italic font-serif">
            {currentConfig.lore}
          </p>
        </div>
      </div>
    </div>
  );
};
