import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Eye, Lock } from 'lucide-react';
import { attachDragRotate, createRenderer, observeResize, teardownRenderer } from '../utils/three';

interface ReferenceCube3DProps {
  highlightFace?: string | null;
  className?: string;
  title?: string;
}

// BoxGeometry material order: +X, -X, +Y, -Y, +Z, -Z
const FACE_ORDER = ['right', 'left', 'top', 'bottom', 'front', 'back'];
const FACE_COLORS = [0xef4444, 0x3b82f6, 0x22c55e, 0xeab308, 0xa855f7, 0x06b6d4];
const FACE_NORMALS = [
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, -1, 0),
  new THREE.Vector3(0, 0, 1),
  new THREE.Vector3(0, 0, -1),
];
const HALF_SIZE = 0.6;

export const ReferenceCube3D: React.FC<ReferenceCube3DProps> = ({
  highlightFace,
  className = '',
  title = 'Standard 3D Space (Reference)',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const materialsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const [visibleCount, setVisibleCount] = useState<number>(3);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(2.2, 1.8, 2.8);
    camera.lookAt(0, 0, 0);

    const renderer = createRenderer(container);
    const stopResize = observeResize(container, camera, renderer);

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 1.2);
    dirLight1.position.set(5, 5, 5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xf43f5e, 0.8);
    dirLight2.position.set(-5, -5, -5);
    scene.add(dirLight2);

    const cubeGroup = new THREE.Group();
    scene.add(cubeGroup);

    // Fully opaque, front-side-only faces: this is the 3D baseline, so the
    // faces must genuinely hide the back of the cube and its core.
    const materials = FACE_COLORS.map((color) => new THREE.MeshStandardMaterial({
      color,
      roughness: 0.3,
      metalness: 0.2,
      side: THREE.FrontSide,
    }));
    materialsRef.current = materials;

    const geometry = new THREE.BoxGeometry(HALF_SIZE * 2, HALF_SIZE * 2, HALF_SIZE * 2);
    cubeGroup.add(new THREE.Mesh(geometry, materials));

    const wireframe = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      new THREE.LineBasicMaterial({ color: 0xffffff })
    );
    cubeGroup.add(wireframe);

    // Inner core: present, but never visible from any 3D vantage point.
    const innerCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.8 })
    );
    cubeGroup.add(innerCore);

    const drag = attachDragRotate(renderer.domElement, (dx, dy) => {
      cubeGroup.rotation.y += dx * 0.01;
      cubeGroup.rotation.x += dy * 0.01;
    });

    const worldNormal = new THREE.Vector3();
    const faceCenter = new THREE.Vector3();
    let lastVisible = -1;
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (!drag.isDragging()) {
        cubeGroup.rotation.y += 0.006;
        cubeGroup.rotation.x += 0.003;
      }

      // A face is visible when the camera is on the outward side of its plane.
      // Using the face-to-camera vector (not the view direction) keeps the
      // count correct under perspective projection.
      let visible = 0;
      for (const normal of FACE_NORMALS) {
        worldNormal.copy(normal).applyQuaternion(cubeGroup.quaternion);
        faceCenter.copy(worldNormal).multiplyScalar(HALF_SIZE);
        if (worldNormal.dot(faceCenter.subVectors(camera.position, faceCenter)) > 0) {
          visible++;
        }
      }
      // Only touch React state when the value changes, not once per frame.
      if (visible !== lastVisible) {
        lastVisible = visible;
        setVisibleCount(visible);
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      drag.dispose();
      stopResize();
      teardownRenderer(container, renderer, scene);
      materialsRef.current = [];
    };
  }, []);

  useEffect(() => {
    materialsRef.current.forEach((mat, idx) => {
      const isHighlighted = highlightFace === FACE_ORDER[idx];
      mat.emissive.setHex(isHighlighted ? 0xffffff : 0x000000);
      mat.emissiveIntensity = isHighlighted ? 0.45 : 0;
    });
  }, [highlightFace]);

  return (
    <div
      className={`relative rounded-xl border border-cyan-500/30 bg-slate-950/80 p-3 shadow-xl backdrop-blur-md transition-all ${className}`}
    >
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-mono font-semibold text-cyan-200 uppercase tracking-wider">
            {title}
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
          3D Space [X,Y,Z]
        </span>
      </div>

      <div className="relative w-full h-[180px] cursor-grab active:cursor-grabbing rounded-lg overflow-hidden bg-gradient-to-b from-slate-900/60 to-black/80 flex items-center justify-center">
        <div ref={mountRef} className="w-full h-full" />

        {/* 3D Limitation Badge */}
        <div className="absolute top-2 left-2 bg-slate-900/90 border border-slate-700/80 rounded-md px-2 py-1 text-[11px] font-mono text-slate-300 flex items-center gap-1.5 shadow-md">
          <Eye className="w-3.5 h-3.5 text-cyan-400" />
          <span>Visible: <strong className="text-cyan-300">{visibleCount}/6</strong> faces</span>
        </div>

        <div className="absolute top-2 right-2 bg-rose-950/80 border border-rose-800/60 rounded-md px-2 py-1 text-[10px] font-mono text-rose-300 flex items-center gap-1 shadow-md">
          <Lock className="w-3 h-3 text-rose-400" />
          <span>{6 - visibleCount} Occluded</span>
        </div>

        {/* Interior Core Occlusion Hint */}
        <div className="absolute bottom-2 left-2 right-2 bg-black/75 backdrop-blur-sm border border-slate-800/80 rounded px-2 py-1 text-[10px] font-mono text-slate-400 text-center">
          <span className="text-amber-400 font-semibold">Inner Core: </span>
          <span className="text-slate-300">Blocked by 3D opaque geometry</span>
        </div>
      </div>

      <div className="mt-2 text-[11px] text-slate-400 leading-snug font-sans">
        In standard 3D space, light rays travel in straight lines. Front faces physically block back faces and internal volumes from reach.
      </div>
    </div>
  );
};
