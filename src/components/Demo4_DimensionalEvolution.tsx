import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ReferenceCube3D } from './ReferenceCube3D';
import { playShiftSound } from '../utils/sound';
import { attachDragRotate, createDicePipTexture, createRenderer, observeResize, teardownRenderer } from '../utils/three';
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
    desc: 'Space has volume (X, Y, Z). The 6 dice faces (pips 1-6) close into a cube. From anywhere in 3D you can see at most 3 of its faces, and never the core inside. Keep sliding to look at it from a 4th direction.',
    lore: '"Human perception is locked in 3D. We can see surfaces, but the interior of a locked steel vault or an apple remains hidden from our line of sight."',
  },
  {
    dim: 4,
    title: '4D Sight (Cube Seen From 4D)',
    axes: '[X, Y, Z, W]',
    color: '#a855f7',
    subtitle: '4D Observer - Simultaneous Vision',
    desc: 'The same dice cube, seen from a 4th direction, W. Nothing in 3D space sits between a W-viewer and any part of the cube, so all 6 faces and the core are in view at once. This is the view from Demo 1. Pulling the faces apart is how we hint at it on a 3D screen.',
    lore: '"Entering 4D space feels like standing inside the universe itself. You look upon a 3D cube and see its front, back, top, bottom, left, right, and internal organs all at once."',
  },
  {
    dim: 5,
    title: '5D Sight (Tesseract Seen From 5D)',
    axes: '[X, Y, Z, W, V]',
    color: '#ec4899',
    subtitle: '5D Observer - One Level Higher',
    desc: 'The same trick, one level up. A tesseract (4D hypercube) is bounded by 8 cubes, and a 4D viewer can see at most 4 of them at once. From a 5th direction, V, all 8 are in view together. They are laid out here as the tesseract\'s net (the "Dalí cross"), the way Demo 2 lays a cube out as 6 squares.',
    lore: 'Not to be confused with string theory\'s extra dimensions, which are curled up into tiny 6-dimensional Calabi-Yau shapes. The 5th direction here is a flat, open one, like W in the 4D view.',
  },
];

// The rule every step follows: from inside its own space you can see at most
// half of a shape's sides and none of its inside; from one dimension up you
// can see all of it at once.
const PATTERN_ROWS = [
  { shape: 'Line', bound: '2 ends', inside: '1', above: '2 + inside' },
  { shape: 'Square', bound: '4 edges', inside: '2', above: '4 + inside' },
  { shape: 'Cube', bound: '6 faces', inside: '3', above: '6 + inside' },
  { shape: 'Tesseract', bound: '8 cubes', inside: '4', above: '8 + inside' },
];

function patternRow(d: number) {
  if (d < 1.5) return 0;
  if (d < 2.5) return 1;
  if (d < 4.5) return 2;
  return 3;
}

const AXIS_NAMES = ['X', 'Y', 'Z'];
const AXIS_COLORS = ['#38bdf8', '#22c55e', '#eab308'];

// Half the cube's edge length in scene units.
const HALF = 1.1;
// How far each face slides out along its normal by 4.0D (the Demo 1 view).
const FACE_SEPARATION = 1.1;
// 5D layout: edge length of each tesseract cell and centre-to-centre spacing.
const CELL = 1.0;
const CELL_SPACING = 1.3;
// The viewer one dimension up, drawn as a glowing marker above the shape.
const OBSERVER_POS = new THREE.Vector3(2.6, 3.0, 1.2);

// --- Cube topology for the 1D -> 3D sweep ----------------------------------
// Vertex i has sign (+1/-1) on axis k from bit k of i. Squashing the higher
// axes to zero length turns the cube into a square, then a line.
const CUBE_SIGNS: number[][] = Array.from({ length: 8 }, (_, i) =>
  Array.from({ length: 3 }, (_, k) => ((i >> k) & 1 ? 1 : -1))
);
const CUBE_EDGES: Array<{ a: number; b: number; axis: number }> = [];
for (let i = 0; i < 8; i++) {
  for (let k = 0; k < 3; k++) {
    const j = i ^ (1 << k);
    if (j > i) CUBE_EDGES.push({ a: i, b: j, axis: k });
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

// For each dice face, the cube vertices behind its 4 corners, in
// PlaneGeometry vertex order so the pip texture keeps its orientation.
const DICE_FACE_CORNERS: number[][] = DICE_FACES_DATA.map((fd) => {
  const euler = new THREE.Euler(fd.rot[0], fd.rot[1], fd.rot[2]);
  const normal = new THREE.Vector3(fd.normal[0], fd.normal[1], fd.normal[2]);
  return [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([u, v]) => {
    const p = new THREE.Vector3(u, v, 0).applyEuler(euler).add(normal);
    return vertexIndex([Math.round(p.x), Math.round(p.y), Math.round(p.z)]);
  });
});

function clamp01(x: number) {
  return Math.min(1, Math.max(0, x));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

// Cube vertex positions for a dimension value in [1, 3]: axis k (k >= 1) has
// extent clamp(d - k, 0, 1), so 2.5D is a square half-way to being a cube.
function sweepCube(d: number, out: Float32Array) {
  const extents = [1, clamp01(d - 1), clamp01(d - 2)];
  for (let i = 0; i < 8; i++) {
    for (let k = 0; k < 3; k++) out[i * 3 + k] = CUBE_SIGNS[i][k] * extents[k] * HALF;
  }
}

function makeRay(color: number): THREE.Line {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  // LineDashedMaterial reads per-vertex distances; we update them in place.
  geo.setAttribute('lineDistance', new THREE.BufferAttribute(new Float32Array(2), 1));
  const line = new THREE.Line(
    geo,
    new THREE.LineDashedMaterial({ color, dashSize: 0.14, gapSize: 0.07, transparent: true, opacity: 0.65 })
  );
  line.frustumCulled = false;
  return line;
}

function setRay(line: THREE.Line, from: THREE.Vector3, to: THREE.Vector3) {
  const pos = line.geometry.attributes.position as THREE.BufferAttribute;
  pos.setXYZ(0, from.x, from.y, from.z);
  pos.setXYZ(1, to.x, to.y, to.z);
  pos.needsUpdate = true;
  const dist = line.geometry.attributes.lineDistance as THREE.BufferAttribute;
  dist.setX(1, from.distanceTo(to));
  dist.needsUpdate = true;
}

export const Demo4_DimensionalEvolution: React.FC<Demo4Props> = ({ soundEnabled }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [dimVal, setDimVal] = useState<number>(1.0); // Continuous slider from 1.0 to 5.0

  // The render loop reads the slider through a ref so the scene is built once.
  const dimRef = useRef(dimVal);
  dimRef.current = dimVal;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, 3.6, 9.6);
    camera.lookAt(0, 0.9, 0);

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

    // masterGroup takes the user's drag and the slow spin; contentGroup is
    // nudged up in 5D so the taller tesseract net stays centred.
    const masterGroup = new THREE.Group();
    scene.add(masterGroup);
    const contentGroup = new THREE.Group();
    masterGroup.add(contentGroup);

    // --- SWEEP WIREFRAME (line -> square -> cube), coloured by axis ---
    const vertexPositions = new Float32Array(8 * 3);
    const edgePositions = new Float32Array(CUBE_EDGES.length * 6);
    const edgeColors = new Float32Array(CUBE_EDGES.length * 6);
    CUBE_EDGES.forEach((edge, idx) => {
      const color = new THREE.Color(AXIS_COLORS[edge.axis]);
      color.toArray(edgeColors, idx * 6);
      color.toArray(edgeColors, idx * 6 + 3);
    });
    const edgeGeo = new THREE.BufferGeometry();
    edgeGeo.setAttribute('position', new THREE.BufferAttribute(edgePositions, 3).setUsage(THREE.DynamicDrawUsage));
    edgeGeo.setAttribute('color', new THREE.BufferAttribute(edgeColors, 3));
    const sweepEdges = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ vertexColors: true }));
    sweepEdges.frustumCulled = false;
    contentGroup.add(sweepEdges);

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
    contentGroup.add(pipGroup);

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
    contentGroup.add(plane2D);

    // --- DICE FACES (2D -> 4D): textured quads pinned to the cube corners ---
    const faceTextures = DICE_FACES_DATA.map((fd) => createDicePipTexture(fd.pips, fd.color));
    const faceMeshes = DICE_FACES_DATA.map((_, idx) => {
      const geo = new THREE.PlaneGeometry(HALF * 2, HALF * 2);
      (geo.attributes.position as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage);
      const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({
          map: faceTextures[idx],
          side: THREE.DoubleSide,
          roughness: 0.2,
          metalness: 0.1,
          transparent: true,
          opacity: 1,
        })
      );
      mesh.frustumCulled = false;
      contentGroup.add(mesh);
      return mesh;
    });

    // White outline around each separated face (same look as Demo 1).
    const outlinePositions = new Float32Array(6 * 4 * 6);
    const outlineGeo = new THREE.BufferGeometry();
    outlineGeo.setAttribute('position', new THREE.BufferAttribute(outlinePositions, 3).setUsage(THREE.DynamicDrawUsage));
    const faceOutlines = new THREE.LineSegments(outlineGeo, new THREE.LineBasicMaterial({ color: 0xffffff }));
    faceOutlines.frustumCulled = false;
    contentGroup.add(faceOutlines);

    // --- TESSERACT CELLS (4D -> 5D): each face thickens into a cube ---
    const unitBox = new THREE.BoxGeometry(1, 1, 1);
    const unitBoxEdges = new THREE.EdgesGeometry(unitBox);
    const makeCell = (material: THREE.MeshStandardMaterial) => {
      const mesh = new THREE.Mesh(unitBox, material);
      mesh.add(new THREE.LineSegments(unitBoxEdges, new THREE.LineBasicMaterial({ color: 0xffffff })));
      mesh.visible = false;
      contentGroup.add(mesh);
      return mesh;
    };
    const cellMaterial = (opts: THREE.MeshStandardMaterialParameters) =>
      new THREE.MeshStandardMaterial({ transparent: true, depthWrite: false, roughness: 0.3, ...opts });
    const faceCells = faceTextures.map((map) => makeCell(cellMaterial({ map, opacity: 0.7 })));
    const centreCell = makeCell(cellMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.3, opacity: 0.3 }));
    const farCell = makeCell(cellMaterial({ color: 0xec4899, emissive: 0xbe185d, emissiveIntensity: 0.4, opacity: 0.55 }));

    // --- CENTRAL AMBER CORE ---
    const coreMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 1.5 });
    const coreSphere = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 24), coreMat);
    contentGroup.add(coreSphere);

    // --- THE VIEWER ONE DIMENSION UP + ITS LINES OF SIGHT ---
    const eyeMesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.22, 0),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 1.2 })
    );
    eyeMesh.position.copy(OBSERVER_POS);
    scene.add(eyeMesh);

    // Rays 0-5 go to the six faces (4D) or face cells (5D), 6 to the core or
    // centre cell, 7 to the tesseract's far cell (5D only).
    const rays = [
      ...DICE_FACES_DATA.map(() => makeRay(0x38bdf8)),
      makeRay(0xf59e0b),
      makeRay(0xec4899),
    ];
    rays.forEach((ray) => scene.add(ray));

    const drag = attachDragRotate(renderer.domElement, (dx, dy) => {
      masterGroup.rotation.y += dx * 0.008;
      masterGroup.rotation.x += dy * 0.008;
    });

    const target = new THREE.Vector3();
    let animId: number;
    let lastTime = performance.now();

    const animate = (now: number) => {
      animId = requestAnimationFrame(animate);
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      const d = dimRef.current;

      if (!drag.isDragging()) {
        masterGroup.rotation.y += 0.3 * dt;
      }
      eyeMesh.rotation.y += 1.2 * dt;

      // 3 -> 4: faces slide apart (Demo 1). 4 -> 5: faces thicken into cells.
      const separation = clamp01(d - 3) * FACE_SEPARATION;
      const grow = smoothstep(4, 5, d);
      const inCellPhase = d > 4;
      contentGroup.position.y = grow * (CELL_SPACING / 2);

      sweepCube(Math.min(d, 3), vertexPositions);

      // 1D -> 3D wireframe; once the faces separate, each gets its own outline.
      sweepEdges.visible = d <= 3;
      if (sweepEdges.visible) {
        CUBE_EDGES.forEach((edge, idx) => {
          edgePositions.set(vertexPositions.subarray(edge.a * 3, edge.a * 3 + 3), idx * 6);
          edgePositions.set(vertexPositions.subarray(edge.b * 3, edge.b * 3 + 3), idx * 6 + 3);
        });
        edgeGeo.attributes.position.needsUpdate = true;
      }

      // 1D -> 2D: pips ride the leading edge of the sweep, the square fills in.
      const ext1 = clamp01(d - 1);
      pipGroup.visible = d < 2;
      pipGroup.position.y = ext1 * HALF;
      plane2D.visible = d > 1 && d <= 2.02;
      plane2D.scale.set(1, Math.max(0.001, ext1), 1);
      planeMat.opacity = 0.75 * ext1;

      // 2D -> 4D: dice faces on the cube corners, pushed out along their normals.
      const showFaces = d > 2.02 && !inCellPhase;
      const faceOpacity = 1 - 0.15 * smoothstep(3, 3.3, d);
      faceOutlines.visible = showFaces && d > 3;
      faceMeshes.forEach((mesh, faceIdx) => {
        mesh.visible = showFaces;
        if (!showFaces) return;
        const n = DICE_FACES_DATA[faceIdx].normal;
        const pos = mesh.geometry.attributes.position as THREE.BufferAttribute;
        DICE_FACE_CORNERS[faceIdx].forEach((v, corner) => {
          pos.setXYZ(
            corner,
            vertexPositions[v * 3] + n[0] * separation,
            vertexPositions[v * 3 + 1] + n[1] * separation,
            vertexPositions[v * 3 + 2] + n[2] * separation
          );
        });
        pos.needsUpdate = true;
        mesh.geometry.computeVertexNormals();
        (mesh.material as THREE.MeshStandardMaterial).opacity = faceOpacity;

        if (faceOutlines.visible) {
          // Corner order is TL, TR, BL, BR; walk the rim TL-TR-BR-BL.
          const rim = [0, 1, 3, 2];
          for (let e = 0; e < 4; e++) {
            const a = rim[e];
            const b = rim[(e + 1) % 4];
            const base = (faceIdx * 4 + e) * 6;
            outlinePositions[base] = pos.getX(a);
            outlinePositions[base + 1] = pos.getY(a);
            outlinePositions[base + 2] = pos.getZ(a);
            outlinePositions[base + 3] = pos.getX(b);
            outlinePositions[base + 4] = pos.getY(b);
            outlinePositions[base + 5] = pos.getZ(b);
          }
        }
      });
      if (faceOutlines.visible) outlineGeo.attributes.position.needsUpdate = true;

      // 4D -> 5D: each separated face extrudes along its normal into a cube,
      // a centre cube appears around the core, and the 8th (far) cube drops
      // out below the bottom one: the 8 cells of a tesseract, laid out as its net.
      const faceDistance = HALF + FACE_SEPARATION;
      faceCells.forEach((cell, idx) => {
        cell.visible = inCellPhase;
        if (!inCellPhase) return;
        const n = DICE_FACES_DATA[idx].normal;
        const size = lerp(HALF * 2, CELL, grow);
        const thickness = lerp(0.002, CELL, grow);
        cell.scale.set(n[0] ? thickness : size, n[1] ? thickness : size, n[2] ? thickness : size);
        const dist = lerp(faceDistance, CELL_SPACING, grow);
        cell.position.set(n[0] * dist, n[1] * dist, n[2] * dist);
      });
      centreCell.visible = inCellPhase;
      centreCell.scale.setScalar(Math.max(0.001, grow * CELL));
      farCell.visible = inCellPhase;
      farCell.scale.setScalar(Math.max(0.001, grow * CELL));
      farCell.position.set(0, -lerp(faceDistance, CELL_SPACING * 2, grow), 0);

      // Core: hidden in the closed cube, glowing once seen from 4D, then
      // shrinking to sit inside the tesseract's centre cell.
      coreSphere.visible = d >= 2.2;
      coreSphere.scale.setScalar(lerp(1, 0.6, grow));
      coreMat.emissiveIntensity = 0.3 + 1.5 * smoothstep(3, 3.5, d);

      // Lines of sight from the viewer one dimension up to every piece.
      const sight = smoothstep(3, 3.3, d);
      eyeMesh.visible = sight > 0;
      masterGroup.updateMatrixWorld();
      rays.forEach((ray, idx) => {
        const isFar = idx === 7;
        ray.visible = sight > 0 && (!isFar || inCellPhase);
        if (!ray.visible) return;
        if (idx < 6) {
          if (inCellPhase) {
            faceCells[idx].getWorldPosition(target);
          } else {
            const n = DICE_FACES_DATA[idx].normal;
            const dist = HALF + separation;
            contentGroup.localToWorld(target.set(n[0] * dist, n[1] * dist, n[2] * dist));
          }
        } else if (idx === 6) {
          coreSphere.getWorldPosition(target);
        } else {
          farCell.getWorldPosition(target);
        }
        setRay(ray, OBSERVER_POS, target);
        (ray.material as THREE.LineDashedMaterial).opacity = 0.65 * sight;
      });

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

  // Below 3D a stage lasts until its sweep completes; above it, label by the
  // nearer view so the title, buttons and table switch together.
  const currentDiscreteDim = Math.min(5, Math.max(1, dimVal <= 3 ? Math.floor(dimVal) : Math.round(dimVal)));
  const currentConfig = DIMENSION_CONFIG[currentDiscreteDim - 1];
  const activeRow = patternRow(dimVal);

  // Each stage runs up to and including its whole number, so 3.0D reads
  // "100% extruded" rather than "0% into the next stage".
  const getExtrusionStatus = () => {
    const pct = (start: number) => Math.round((dimVal - start) * 100);
    if (dimVal <= 2.0) return `Sweeping 1D line along Y-axis → 2D square (${pct(1)}% extruded)`;
    if (dimVal <= 3.0) return `Sweeping 2D square along Z-axis → 3D dice cube (${pct(2)}% extruded)`;
    if (dimVal < 4.0) return `Viewing the cube from a 4th direction (W): faces open out, core revealed (${pct(3)}%)`;
    if (dimVal === 4.0) return 'The whole cube in view at once, as seen from 4D (the Demo 1 view)';
    if (dimVal < 5.0) return `One level up: each face thickens into a cube, giving the 8 cells of a tesseract (${pct(4)}%)`;
    return 'All 8 cubic cells of a tesseract in view at once, as seen from 5D';
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
            {dimVal <= 3
              ? 'Each step sweeps the shape along a new perpendicular axis: line → square → cube.'
              : 'The glowing marker (upper right) is a viewer one dimension up. Its dashed lines of sight reach every piece, and nothing blocks any of them.'}
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
          {dimVal <= 3 && (
            <div className="bg-slate-950/80 border border-slate-800 px-2.5 py-1.5 rounded-lg backdrop-blur text-[10px] font-mono text-slate-300 flex items-center gap-2">
              <span className="text-slate-500">Edges along:</span>
              {AXIS_NAMES.map((axis, k) => (
                <span key={axis} className={`flex items-center gap-1 ${k < Math.ceil(dimVal) ? '' : 'opacity-30'}`}>
                  <span className="w-2.5 h-0.5 inline-block" style={{ backgroundColor: AXIS_COLORS[k] }} />
                  {axis}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* WebGL Canvas */}
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing min-h-[420px]" />

        {/* Bottom Continuous Slider Bar for 1D to 5D */}
        <div className="p-4 bg-slate-900/90 border-t border-slate-800 backdrop-blur-md flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-mono font-bold text-purple-300 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-purple-400" />
              CONTINUOUS DIMENSION SLIDER (1.0D → 5.0D)
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

          {/* The pattern every step follows */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">
              Sides you can see at once
            </span>
            <table className="w-full text-[10px] font-mono border-separate border-spacing-y-0.5">
              <thead>
                <tr className="text-slate-500 text-left">
                  <th className="font-normal pl-1.5">Shape</th>
                  <th className="font-normal">Sides</th>
                  <th className="font-normal">From inside</th>
                  <th className="font-normal">From 1 dim up</th>
                </tr>
              </thead>
              <tbody>
                {PATTERN_ROWS.map((row, idx) => (
                  <tr
                    key={row.shape}
                    className={idx === activeRow ? 'bg-purple-950/70 text-white' : 'text-slate-400'}
                  >
                    <td className="py-1 pl-1.5 rounded-l font-bold">{row.shape}</td>
                    <td>{row.bound}</td>
                    <td>{row.inside}</td>
                    <td className="rounded-r text-purple-300">{row.above}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[10px] text-slate-500 font-mono leading-snug">
              From inside its own space you see at most half of a shape's sides and never its inside. From one dimension up, nothing blocks the view.
            </p>
          </div>
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
