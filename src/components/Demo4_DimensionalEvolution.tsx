import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ReferenceCube3D } from './ReferenceCube3D';
import { playClickSound, playShiftSound } from '../utils/sound';
import { attachDragRotate, createDicePipTexture, createRenderer, observeResize, teardownRenderer } from '../utils/three';
import { Sliders, Sparkles, Layers, Compass, Info, ArrowRight, Orbit } from 'lucide-react';

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
    desc: 'Space consists of a single linear coordinate axis (X). Sweeping this segment along the perpendicular Y axis traces out a 2D square.',
    lore: '"In a 1D universe, life is a point trapped between two other points on a line. There is no concept of turning, only forward and back."',
  },
  {
    dim: 2,
    title: '2D Flatland Square (2-Space)',
    axes: '[X, Y]',
    color: '#22c55e',
    subtitle: '2D Surface - Flatland Physics',
    desc: 'Space has width and height (X, Y). Sweeping the square along the perpendicular Z axis traces out a 3D cube.',
    lore: '"A 2D Flatlander cannot fathom a 3D sphere. When a sphere passes through Flatland, the Flatlander only sees a growing and shrinking 2D circle."',
  },
  {
    dim: 3,
    title: '3D Standard Dice Cube (3-Space)',
    axes: '[X, Y, Z]',
    color: '#eab308',
    subtitle: '3D Volume - Occluded Interior',
    desc: 'Space has volume (X, Y, Z). The 6 dice faces (pips 1-6) close into a cube with a hidden interior. Sweeping the whole cube along a 4th axis, W, traces out a tesseract.',
    lore: '"Human perception is locked in 3D. We can see surfaces, but the interior of a locked steel vault or an apple remains hidden from our line of sight."',
  },
  {
    dim: 4,
    title: '4D Tesseract (4-Space)',
    axes: '[X, Y, Z, W]',
    color: '#a855f7',
    subtitle: '4D Hypercube - Simultaneous Vision',
    desc: 'Two copies of the cube, one at each end of the W axis, joined edge-to-edge. Projected into 3D the far cube looks smaller and sits inside the near one. The dice cube is one of the tesseract\'s 8 cubic cells. As the tesseract turns through the XW and ZW planes, cells appear to pass through each other. Nothing is actually passing through anything: that is the 4D rotation seen from 3D.',
    lore: '"Entering 4D space feels like standing inside the universe itself. You look upon a 3D cube and see its front, back, top, bottom, left, right, and internal organs all at once."',
  },
  {
    dim: 5,
    title: '5D Penteract (5-Space)',
    axes: '[X, Y, Z, W, V]',
    color: '#ec4899',
    subtitle: '5D Hypercube - Two Projections Deep',
    desc: 'Sweeping the tesseract along a 5th axis, V, gives the penteract (5-cube). To draw it we project twice: 5D to 4D, then 4D to 3D. Each step adds another layer of "far copies drawn smaller".',
    lore: 'Not to be confused with string theory\'s extra dimensions. Those are curled up into tiny 6-dimensional Calabi-Yau shapes at every point of space, not flat, open axes like the V axis drawn here.',
  },
];

// Counts for the n-cube at each whole dimension: 2^n vertices, n*2^(n-1) edges,
// and the number of square faces and cubic cells it contains.
const NCUBE_COUNTS: Record<number, { vertices: number; edges: number; squares: number; cubes: number }> = {
  1: { vertices: 2, edges: 1, squares: 0, cubes: 0 },
  2: { vertices: 4, edges: 4, squares: 1, cubes: 0 },
  3: { vertices: 8, edges: 12, squares: 6, cubes: 1 },
  4: { vertices: 16, edges: 32, squares: 24, cubes: 8 },
  5: { vertices: 32, edges: 80, squares: 80, cubes: 40 },
};

const AXIS_NAMES = ['X', 'Y', 'Z', 'W', 'V'];
const AXIS_COLORS = ['#38bdf8', '#22c55e', '#eab308', '#a855f7', '#ec4899'];

// Half the edge length of the cube in scene units.
const HALF = 1.1;
// Distance of the projection "eye" along W (and V) in unit-cube coordinates.
// Smaller values exaggerate the far-copy-looks-smaller effect.
const PROJECTION_DISTANCE = 3.2;

// --- 5-cube topology -------------------------------------------------------
// Vertex i has sign (+1/-1) on axis k from bit k of i. Lower-dimensional cubes
// are the same 32 vertices with the higher axes squashed to zero length, so
// one structure covers the whole 1D -> 5D sweep.
const NCUBE_SIGNS: number[][] = Array.from({ length: 32 }, (_, i) =>
  Array.from({ length: 5 }, (_, k) => ((i >> k) & 1 ? 1 : -1))
);
const NCUBE_EDGES: Array<{ a: number; b: number; axis: number }> = [];
for (let i = 0; i < 32; i++) {
  for (let k = 0; k < 5; k++) {
    const j = i ^ (1 << k);
    if (j > i) NCUBE_EDGES.push({ a: i, b: j, axis: k });
  }
}

function vertexIndex(signs: number[]): number {
  return signs.reduce((idx, s, k) => idx | (s > 0 ? 1 << k : 0), 0);
}

const DICE_FACES_DATA = [
  { name: 'front', pips: 1, color: '#a855f7', normal: [0, 0, 1], rot: [0, 0, 0] },
  { name: 'top', pips: 2, color: '#22c55e', normal: [0, 1, 0], rot: [-Math.PI / 2, 0, 0] },
  { name: 'right', pips: 3, color: '#ef4444', normal: [1, 0, 0], rot: [0, Math.PI / 2, 0] },
  { name: 'left', pips: 4, color: '#3b82f6', normal: [-1, 0, 0], rot: [0, -Math.PI / 2, 0] },
  { name: 'bottom', pips: 5, color: '#eab308', normal: [0, -1, 0], rot: [Math.PI / 2, 0, 0] },
  { name: 'back', pips: 6, color: '#06b6d4', normal: [0, 0, -1], rot: [0, Math.PI, 0] },
];

// For each dice face, the n-cube vertices behind its 4 corners, in
// PlaneGeometry vertex order so the pip texture keeps its orientation. The dice
// lives on the cell at W = -1, V = -1.
const DICE_FACE_CORNERS: number[][] = DICE_FACES_DATA.map((fd) => {
  const euler = new THREE.Euler(fd.rot[0], fd.rot[1], fd.rot[2]);
  const normal = new THREE.Vector3(fd.normal[0], fd.normal[1], fd.normal[2]);
  return [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([u, v]) => {
    const p = new THREE.Vector3(u, v, 0).applyEuler(euler).add(normal);
    return vertexIndex([Math.round(p.x), Math.round(p.y), Math.round(p.z), -1, -1]);
  });
});

// The 8 vertices of the dice cell (W = V = -1), used to keep the core centred
// inside it as the higher-dimensional projection moves the cell around.
const DICE_CELL_VERTICES = Array.from({ length: 32 }, (_, i) => i).filter(
  (i) => NCUBE_SIGNS[i][3] < 0 && NCUBE_SIGNS[i][4] < 0
);

function clamp01(x: number) {
  return Math.min(1, Math.max(0, x));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

// Projects every n-cube vertex to 3D for a continuous dimension value d in
// [1, 5]. Axis k (k >= 1) has extent clamp(d - k, 0, 1), so 2.5D is a square
// half-way through being swept into a cube. Rotations in planes that involve
// W or V are scaled by that axis's extent, which makes the 3D cube sit still
// at exactly d = 3 and blend smoothly into the 4D motion after it.
function projectNCube(d: number, t: number, out: Float32Array) {
  const extents = [1, clamp01(d - 1), clamp01(d - 2), clamp01(d - 3), clamp01(d - 4)];
  const rotations: Array<[number, number, number]> = [
    [0, 3, t * 0.55 * extents[3]], // XW
    [2, 3, t * 0.35 * extents[3]], // ZW
    [1, 4, t * 0.45 * extents[4]], // YV
    [0, 4, t * 0.25 * extents[4]], // XV
  ];
  const p = [0, 0, 0, 0, 0];

  for (let i = 0; i < 32; i++) {
    for (let k = 0; k < 5; k++) p[k] = NCUBE_SIGNS[i][k] * extents[k];

    for (const [a, b, angle] of rotations) {
      if (angle === 0) continue;
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      const pa = p[a];
      const pb = p[b];
      p[a] = pa * c - pb * s;
      p[b] = pa * s + pb * c;
    }

    // Perspective 5D -> 4D (along V), then 4D -> 3D (along W).
    const k5 = PROJECTION_DISTANCE / (PROJECTION_DISTANCE - p[4]);
    for (let k = 0; k < 4; k++) p[k] *= k5;
    const k4 = PROJECTION_DISTANCE / (PROJECTION_DISTANCE - p[3]);

    out[i * 3] = p[0] * k4 * HALF;
    out[i * 3 + 1] = p[1] * k4 * HALF;
    out[i * 3 + 2] = p[2] * k4 * HALF;
  }
}

export const Demo4_DimensionalEvolution: React.FC<Demo4Props> = ({ soundEnabled }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [dimVal, setDimVal] = useState<number>(1.0); // Continuous slider from 1.0 to 5.0
  const [hyperRotate, setHyperRotate] = useState<boolean>(true);

  // The render loop reads these through refs so the scene is built only once.
  const dimRef = useRef(dimVal);
  dimRef.current = dimVal;
  const hyperRotateRef = useRef(hyperRotate);
  hyperRotateRef.current = hyperRotate;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, 3.2, 7.8);
    camera.lookAt(0, 0, 0);

    const renderer = createRenderer(container);
    const stopResize = observeResize(container, camera, renderer);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.95));

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 1.8);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0xa855f7, 2, 50);
    pointLight.position.set(0, 2, 2);
    scene.add(pointLight);

    // Master Group (user drag + slow auto spin)
    const masterGroup = new THREE.Group();
    scene.add(masterGroup);

    // --- N-CUBE WIREFRAME (line -> square -> cube -> tesseract -> penteract) ---
    const vertexPositions = new Float32Array(32 * 3);

    const edgeGeo = new THREE.BufferGeometry();
    const edgePositions = new Float32Array(NCUBE_EDGES.length * 2 * 3);
    const edgeColors = new Float32Array(NCUBE_EDGES.length * 2 * 3);
    NCUBE_EDGES.forEach((edge, idx) => {
      const color = new THREE.Color(AXIS_COLORS[edge.axis]);
      color.toArray(edgeColors, idx * 6);
      color.toArray(edgeColors, idx * 6 + 3);
    });
    edgeGeo.setAttribute('position', new THREE.BufferAttribute(edgePositions, 3).setUsage(THREE.DynamicDrawUsage));
    edgeGeo.setAttribute('color', new THREE.BufferAttribute(edgeColors, 3));
    const edges = new THREE.LineSegments(
      edgeGeo,
      new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95 })
    );
    edges.frustumCulled = false;
    masterGroup.add(edges);

    const vertexGeo = new THREE.BufferGeometry();
    vertexGeo.setAttribute('position', new THREE.BufferAttribute(vertexPositions, 3).setUsage(THREE.DynamicDrawUsage));
    const vertices = new THREE.Points(
      vertexGeo,
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.09 })
    );
    vertices.frustumCulled = false;
    masterGroup.add(vertices);

    // --- 1D PIPS: the six dice colours strung along the line ---
    const pipColors = [0xa855f7, 0x22c55e, 0xef4444, 0x3b82f6, 0xeab308, 0x06b6d4];
    const pipGroup = new THREE.Group();
    const pipGeo = new THREE.SphereGeometry(0.11, 16, 16);
    pipColors.forEach((color, i) => {
      const pip = new THREE.Mesh(
        pipGeo,
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.8 })
      );
      pip.position.set(-0.9 + i * 0.36, 0, 0);
      pipGroup.add(pip);
    });
    masterGroup.add(pipGroup);

    // --- 2D FLATLAND FILL ---
    const planeMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      roughness: 0.3,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const plane2D = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, HALF * 2), planeMat);
    masterGroup.add(plane2D);

    // --- DICE FACES: textured quads pinned to n-cube vertices ---
    const faceMeshes = DICE_FACES_DATA.map((fd) => {
      const geo = new THREE.PlaneGeometry(HALF * 2, HALF * 2);
      (geo.attributes.position as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage);
      const mat = new THREE.MeshStandardMaterial({
        map: createDicePipTexture(fd.pips, fd.color),
        side: THREE.DoubleSide,
        roughness: 0.2,
        metalness: 0.1,
        transparent: true,
        opacity: 0.95,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = false;
      masterGroup.add(mesh);
      return mesh;
    });

    // --- CENTRAL AMBER CORE ---
    const coreMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 1.5 });
    const coreSphere = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 24), coreMat);
    masterGroup.add(coreSphere);

    const drag = attachDragRotate(renderer.domElement, (dx, dy) => {
      masterGroup.rotation.y += dx * 0.008;
      masterGroup.rotation.x += dy * 0.008;
    });

    let animId: number;
    let hyperTime = 0;
    let lastTime = performance.now();

    const animate = (now: number) => {
      animId = requestAnimationFrame(animate);
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      const d = dimRef.current;

      if (!drag.isDragging()) {
        masterGroup.rotation.y += 0.3 * dt;
      }
      if (hyperRotateRef.current) {
        hyperTime += dt;
      }

      projectNCube(d, hyperTime, vertexPositions);

      NCUBE_EDGES.forEach((edge, idx) => {
        edgePositions.set(vertexPositions.subarray(edge.a * 3, edge.a * 3 + 3), idx * 6);
        edgePositions.set(vertexPositions.subarray(edge.b * 3, edge.b * 3 + 3), idx * 6 + 3);
      });
      edgeGeo.attributes.position.needsUpdate = true;
      vertexGeo.attributes.position.needsUpdate = true;

      // 1D -> 2D: pips ride the leading edge of the sweep, the square fills in.
      const ext1 = clamp01(d - 1);
      pipGroup.visible = d < 2;
      pipGroup.position.y = ext1 * HALF;
      plane2D.visible = d > 1 && d <= 2.02;
      plane2D.scale.set(1, Math.max(0.001, ext1), 1);
      planeMat.opacity = 0.75 * ext1;

      // 2D -> 5D: the dice faces follow the W = V = -1 cell. Past 3D they turn
      // translucent: a 4D viewer is not blocked by the 3D faces.
      const showFaces = d > 2.02;
      const faceOpacity = 0.95 - 0.45 * smoothstep(3, 3.5, d);
      faceMeshes.forEach((mesh, faceIdx) => {
        mesh.visible = showFaces;
        if (!showFaces) return;
        const pos = mesh.geometry.attributes.position as THREE.BufferAttribute;
        DICE_FACE_CORNERS[faceIdx].forEach((v, corner) => {
          pos.setXYZ(corner, vertexPositions[v * 3], vertexPositions[v * 3 + 1], vertexPositions[v * 3 + 2]);
        });
        pos.needsUpdate = true;
        mesh.geometry.computeVertexNormals();
        (mesh.material as THREE.MeshStandardMaterial).opacity = faceOpacity;
      });

      // Core: hidden inside the closed cube, glowing once 4D sight exposes it.
      // It sits at the dice cell's centroid and shrinks with the cell's
      // projected size, so it stays inside the cube it belongs to.
      let cx = 0, cy = 0, cz = 0, spread = 0;
      for (const v of DICE_CELL_VERTICES) {
        cx += vertexPositions[v * 3];
        cy += vertexPositions[v * 3 + 1];
        cz += vertexPositions[v * 3 + 2];
      }
      cx /= 8; cy /= 8; cz /= 8;
      for (const v of DICE_CELL_VERTICES) {
        spread += Math.hypot(vertexPositions[v * 3] - cx, vertexPositions[v * 3 + 1] - cy, vertexPositions[v * 3 + 2] - cz);
      }
      // A full unit cube's corners sit HALF * sqrt(3) from its centre.
      const cellScale = Math.min(1, spread / 8 / (HALF * Math.sqrt(3)));
      coreSphere.position.set(cx, cy, cz);
      coreSphere.scale.setScalar(Math.max(0.05, cellScale));
      coreSphere.visible = d >= 2.2;
      coreMat.emissiveIntensity = d <= 3 ? 0.3 : 0.3 + 1.5 * smoothstep(3, 3.5, d);

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      drag.dispose();
      stopResize();
      teardownRenderer(container, renderer, scene);
    };
  }, []);

  const currentDiscreteDim = Math.min(5, Math.max(1, Math.floor(dimVal)));
  const currentConfig = DIMENSION_CONFIG[currentDiscreteDim - 1];
  const counts = NCUBE_COUNTS[currentDiscreteDim];

  const getExtrusionStatus = () => {
    const pct = Math.round((dimVal - Math.floor(dimVal)) * 100);
    if (dimVal < 2.0) return `Sweeping 1D line along Y-axis → 2D square (${pct}% extruded)`;
    if (dimVal < 3.0) return `Sweeping 2D square along Z-axis → 3D dice cube (${pct}% extruded)`;
    if (dimVal < 4.0) return `Sweeping 3D cube along 4th W-axis → 4D tesseract (${pct}% extruded)`;
    if (dimVal < 5.0) return `Sweeping 4D tesseract along 5th V-axis → 5D penteract (${pct}% extruded)`;
    return '5D penteract fully extruded (projected 5D → 4D → 3D)';
  };

  return (
    <div className="relative w-full h-full min-h-[620px] flex flex-col lg:flex-row gap-4 p-4 text-slate-100 bg-slate-950 font-sans">
      {/* Interactive WebGL Canvas */}
      <div className="relative flex-1 rounded-2xl border border-purple-500/30 bg-gradient-to-b from-slate-900 via-slate-950 to-black overflow-hidden shadow-2xl flex flex-col">
        {/* Top Header Badge + Live Status */}
        <div className="absolute top-4 left-4 right-4 sm:right-auto z-10 flex flex-col gap-1.5 max-w-lg pointer-events-none">
          <div className="flex items-center gap-2 bg-slate-900/90 border border-purple-500/40 px-3 py-1.5 rounded-xl backdrop-blur-md shadow-lg self-start">
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
          <p className="text-[11px] font-mono text-slate-300 bg-black/70 px-3 py-1.5 rounded-xl border border-slate-800 backdrop-blur">
            Each step sweeps the whole shape along a brand-new perpendicular axis: point → line → square → cube → tesseract → penteract.
          </p>
          <div className="bg-purple-950/80 border border-purple-500/50 px-3.5 py-1.5 rounded-xl backdrop-blur text-xs font-mono text-purple-200 flex items-center gap-2 shadow-xl">
            <ArrowRight className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <span>{getExtrusionStatus()}</span>
          </div>
        </div>

        {/* State Badge + axis colour legend */}
        <div className="absolute top-4 right-4 z-10 hidden md:flex flex-col items-end gap-1.5 pointer-events-none">
          <div className="bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 rounded-xl backdrop-blur text-xs font-mono text-purple-300 flex items-center gap-2 shadow-lg">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Dimension Level: <strong className="text-white font-bold">{dimVal.toFixed(2)}D</strong></span>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 px-2.5 py-1.5 rounded-lg backdrop-blur text-[10px] font-mono text-slate-300 flex items-center gap-2">
            <span className="text-slate-500">Edges along:</span>
            {AXIS_NAMES.map((axis, k) => (
              <span key={axis} className={`flex items-center gap-1 ${k < Math.ceil(dimVal) ? '' : 'opacity-30'}`}>
                <span className="w-2.5 h-0.5 inline-block" style={{ backgroundColor: AXIS_COLORS[k] }} />
                {axis}
              </span>
            ))}
          </div>
        </div>

        {/* WebGL Canvas */}
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing min-h-[420px]" />

        {/* Bottom Continuous Slider Bar for 1D to 5D Extrusion */}
        <div className="p-4 bg-slate-900/90 border-t border-slate-800 backdrop-blur-md flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-mono font-bold text-purple-300 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-purple-400" />
              CONTINUOUS DIMENSIONAL EXTRUSION SLIDER (1.0D → 5.0D)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setHyperRotate(!hyperRotate);
                  playClickSound(soundEnabled);
                }}
                className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold border flex items-center gap-1.5 transition-all ${
                  hyperRotate
                    ? 'bg-purple-500/20 border-purple-400 text-purple-100'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
                title="Rotate the shape in the XW, ZW, YV and XV planes"
              >
                <Orbit className="w-3.5 h-3.5" />
                <span>Hyper-rotation: {hyperRotate ? 'ON' : 'OFF'}</span>
              </button>
              <span className="text-xs font-mono font-bold text-white px-2.5 py-0.5 rounded bg-purple-950 border border-purple-500">
                {currentConfig.title}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs font-mono font-bold text-sky-400">1.0D</span>
            <input
              type="range"
              min="1.0"
              max="5.0"
              step="0.01"
              value={dimVal}
              aria-label="Dimension level"
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
                  currentDiscreteDim === d
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

          <div className="grid grid-cols-4 gap-1.5 text-center font-mono">
            {[
              ['Vertices', counts.vertices],
              ['Edges', counts.edges],
              ['Squares', counts.squares],
              ['Cubes', counts.cubes],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-slate-950/70 border border-slate-800 py-1.5">
                <div className="text-sm font-bold text-white">{value}</div>
                <div className="text-[9px] uppercase text-slate-500">{label}</div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 font-mono leading-snug">
            Each sweep doubles the vertices: an n-cube has 2<sup>n</sup> vertices and n·2<sup>n−1</sup> edges.
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
