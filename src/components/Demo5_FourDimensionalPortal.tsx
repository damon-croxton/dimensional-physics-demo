import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ReferenceCube3D } from './ReferenceCube3D';
import { playClickSound, playShiftSound } from '../utils/sound';
import { Lock, Unlock, Eye, Sparkles, Sliders, Shield, Orbit } from 'lucide-react';

interface Demo5Props {
  soundEnabled: boolean;
}

export const Demo5_FourDimensionalPortal: React.FC<Demo5Props> = ({ soundEnabled }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [wOffset, setWOffset] = useState<number>(0.8); // 0 (3D Locked) to 1.5 (4D Unlocked)
  const [isCoreExtracted, setIsCoreExtracted] = useState<boolean>(false);
  const [lensIntensity, setLensIntensity] = useState<number>(0.6);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const vaultGroupRef = useRef<THREE.Group | null>(null);
  const crystalMeshRef = useRef<THREE.Mesh | null>(null);
  const portalRingRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 3, 7);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 1.5);
    dirLight1.position.set(5, 5, 5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xf59e0b, 1.0);
    dirLight2.position.set(-5, -5, -5);
    scene.add(dirLight2);

    // 4D Gravitational Lensing Portal Ring (Shimmering ring surrounding vault)
    const portalGeo = new THREE.TorusGeometry(2.4, 0.08, 16, 64);
    const portalMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1,
      roughness: 0.1,
    });
    const portalRing = new THREE.Mesh(portalGeo, portalMat);
    portalRingRef.current = portalRing;
    scene.add(portalRing);

    // Locked 3D Steel Vault Box
    const vaultGroup = new THREE.Group();
    vaultGroupRef.current = vaultGroup;
    scene.add(vaultGroup);

    // 6 thick metallic walls of the locked vault
    const wallGeo = new THREE.BoxGeometry(1.6, 1.6, 0.15);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.8,
      roughness: 0.2,
      transparent: true,
      opacity: 0.95,
    });

    const wallPositions = [
      { pos: [0, 0, 0.8], rot: [0, 0, 0], name: 'front' },
      { pos: [0, 0, -0.8], rot: [0, 0, 0], name: 'back' },
      { pos: [0.8, 0, 0], rot: [0, Math.PI / 2, 0], name: 'right' },
      { pos: [-0.8, 0, 0], rot: [0, Math.PI / 2, 0], name: 'left' },
      { pos: [0, 0.8, 0], rot: [Math.PI / 2, 0, 0], name: 'top' },
      { pos: [0, -0.8, 0], rot: [Math.PI / 2, 0, 0], name: 'bottom' },
    ];

    wallPositions.forEach((wp) => {
      const wall = new THREE.Mesh(wallGeo, wallMat.clone());
      wall.name = wp.name;
      wall.position.set(wp.pos[0], wp.pos[1], wp.pos[2]);
      wall.rotation.set(wp.rot[0], wp.rot[1], wp.rot[2]);

      const ed = new THREE.EdgesGeometry(wallGeo);
      const edMat = new THREE.LineBasicMaterial({ color: 0x38bdf8 });
      wall.add(new THREE.LineSegments(ed, edMat));

      vaultGroup.add(wall);
    });

    // Secret Glowing Core Crystal inside locked vault
    const crystalGeo = new THREE.OctahedronGeometry(0.45, 0);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 1.2,
      roughness: 0.1,
    });
    const crystalMesh = new THREE.Mesh(crystalGeo, crystalMat);
    crystalMeshRef.current = crystalMesh;
    scene.add(crystalMesh);

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

      vaultGroup.rotation.y += dx * 0.008;
      vaultGroup.rotation.x += dy * 0.008;

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
        vaultGroup.rotation.y += 0.005;
      }

      if (crystalMeshRef.current) {
        crystalMeshRef.current.rotation.y += 0.015;
      }

      if (portalRingRef.current) {
        portalRingRef.current.rotation.z += 0.005;
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

  // Update wall positions and transparency according to 4D offset (W)
  useEffect(() => {
    const vaultGroup = vaultGroupRef.current;
    if (!vaultGroup) return;

    // As W increases, 3D walls shift out of 3D line of sight along the 4th dimension
    vaultGroup.children.forEach((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.material instanceof THREE.MeshStandardMaterial) {
        // High W = 4D View, walls become transparent or slide away
        mesh.material.opacity = Math.max(0.15, 0.95 - wOffset * 0.6);
      }
      // Spread top and front walls along W vector
      if (child.name === 'top' || child.name === 'front') {
        child.position.y = (child.name === 'top' ? 0.8 : 0) + wOffset * 0.6;
        child.position.z = (child.name === 'front' ? 0.8 : 0) + wOffset * 0.6;
      }
    });

    // Move extracted crystal outside along W
    if (crystalMeshRef.current) {
      if (isCoreExtracted) {
        crystalMeshRef.current.position.set(0, 1.8, 1.2);
      } else {
        crystalMeshRef.current.position.set(0, 0, 0);
      }
    }

    // Portal ring scale
    if (portalRingRef.current) {
      portalRingRef.current.scale.setScalar(1 + lensIntensity * 0.3);
    }
  }, [wOffset, isCoreExtracted, lensIntensity]);

  return (
    <div className="relative w-full h-full min-h-[620px] flex flex-col lg:flex-row gap-4 p-4 text-slate-100 bg-slate-950 font-sans">
      {/* WebGL Canvas Viewport */}
      <div className="relative flex-1 rounded-2xl border border-amber-500/20 bg-gradient-to-b from-slate-900 via-slate-950 to-black overflow-hidden shadow-2xl flex flex-col">
        {/* Header Badge */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-1">
          <div className="flex items-center gap-2 bg-slate-900/90 border border-amber-500/40 px-3 py-1.5 rounded-xl backdrop-blur-md shadow-lg">
            <Unlock className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-amber-200">
              4D "Puddle" Portal into Locked 3D Space
            </span>
            <span className="bg-amber-950 text-amber-300 border border-amber-700 text-[10px] px-2 py-0.5 rounded font-mono">
              Bypassing 3D Boundaries via W
            </span>
          </div>
          <p className="text-[11px] font-mono text-slate-400 bg-black/60 px-2 py-1 rounded backdrop-blur max-w-sm">
            In 3D, a sealed steel vault cannot be opened without breaking the walls. From 4D, the interior is wide open!
          </p>
        </div>

        {/* Canvas */}
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing min-h-[420px]" />

        {/* Bottom Bar Controls */}
        <div className="p-3 bg-slate-900/90 border-t border-slate-800 backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsCoreExtracted(!isCoreExtracted);
                playShiftSound(soundEnabled, 500);
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all border ${
                isCoreExtracted
                  ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-lg shadow-amber-500/20'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{isCoreExtracted ? 'RETURN CORE TO LOCKED VAULT' : 'REACH FROM 4D & EXTRACT CORE'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Control Sidebar */}
      <div className="w-full lg:w-[320px] flex flex-col gap-4">
        {/* MANDATORY Standard 3D Reference Cube */}
        <ReferenceCube3D title="3D Locked Container (Reference)" />

        {/* Portal Controls */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3.5 backdrop-blur flex flex-col gap-3">
          <span className="text-xs font-mono font-bold text-amber-300 uppercase flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            4D Puddle Portal Depth
          </span>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300">4D Portal Offset (W)</span>
              <span className="text-amber-400 font-bold">{wOffset.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1.5"
              step="0.05"
              value={wOffset}
              onChange={(e) => {
                setWOffset(parseFloat(e.target.value));
                playClickSound(soundEnabled);
              }}
              className="w-full accent-amber-500 bg-slate-800 rounded h-1.5 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
              <span>0 (Locked 3D Wall)</span>
              <span>1.5 (Open 4D Bulk)</span>
            </div>
          </div>

          <div className="flex flex-col gap-1 pt-2 border-t border-slate-800">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300">Gravitational Lensing Distortion</span>
              <span className="text-sky-400 font-bold">{(lensIntensity * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={lensIntensity}
              onChange={(e) => {
                setLensIntensity(parseFloat(e.target.value));
                playClickSound(soundEnabled);
              }}
              className="w-full accent-sky-500 bg-slate-800 rounded h-1.5 cursor-pointer"
            />
          </div>
        </div>

        {/* Science Lore Explanation */}
        <div className="rounded-xl border border-amber-500/20 bg-slate-900/60 p-3 text-xs text-slate-300 flex flex-col gap-1.5">
          <span className="font-mono font-bold text-amber-300">Death's End Citation:</span>
          <p className="leading-relaxed text-[11px] text-slate-300">
            "In 4D space, Guan Yifan reached inside the sealed steel vault of the Gravity warship without cutting a single metal seam, touching the internal controls directly from the 4th dimension."
          </p>
        </div>
      </div>
    </div>
  );
};
