import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Eye, Lock, Maximize2, RotateCcw } from 'lucide-react';

interface ReferenceCube3DProps {
  highlightFace?: string | null;
  className?: string;
  title?: string;
}

export const ReferenceCube3D: React.FC<ReferenceCube3DProps> = ({
  highlightFace,
  className = '',
  title = 'Standard 3D Space (Reference)',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState<number>(3);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 220;
    const height = container.clientHeight || 200;

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(2.2, 1.8, 2.8);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 1.2);
    dirLight1.position.set(5, 5, 5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xf43f5e, 0.8);
    dirLight2.position.set(-5, -5, -5);
    scene.add(dirLight2);

    // Standard 3D Cube Group
    const cubeGroup = new THREE.Group();
    scene.add(cubeGroup);

    // Create 6 distinct colored faces
    const faceColors = [
      0xef4444, // Right - Red
      0x3b82f6, // Left - Blue
      0x22c55e, // Top - Green
      0xeab308, // Bottom - Yellow
      0xa855f7, // Front - Purple
      0x06b6d4, // Back - Cyan
    ];

    const materials = faceColors.map(color => new THREE.MeshStandardMaterial({
      color,
      roughness: 0.3,
      metalness: 0.2,
      transparent: true,
      opacity: 0.85,
      side: THREE.FrontSide, // Crucial: FrontSide means 3D depth blocks rear faces!
    }));

    const geometry = new THREE.BoxGeometry(1.2, 1.2, 1.2);
    const cubeMesh = new THREE.Mesh(geometry, materials);
    cubeGroup.add(cubeMesh);

    // Wireframe outline
    const wireframeGeo = new THREE.EdgesGeometry(geometry);
    const wireframeMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
    const wireframe = new THREE.LineSegments(wireframeGeo, wireframeMat);
    cubeGroup.add(wireframe);

    // Inner hidden core (invisible in standard 3D without slicing)
    const coreGeo = new THREE.SphereGeometry(0.35, 16, 16);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.8,
    });
    const innerCore = new THREE.Mesh(coreGeo, coreMat);
    cubeGroup.add(innerCore);

    // Orbit/drag interaction
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      cubeGroup.rotation.y += deltaX * 0.01;
      cubeGroup.rotation.x += deltaY * 0.01;

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    // Animation Loop & Face Visibility Calculation
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (!isDragging) {
        cubeGroup.rotation.y += 0.006;
        cubeGroup.rotation.x += 0.003;
      }

      // Calculate how many faces are visible to camera in 3D
      // Normal vectors of box faces
      const normals = [
        new THREE.Vector3(1, 0, 0),   // Right
        new THREE.Vector3(-1, 0, 0),  // Left
        new THREE.Vector3(0, 1, 0),   // Top
        new THREE.Vector3(0, -1, 0),  // Bottom
        new THREE.Vector3(0, 0, 1),   // Front
        new THREE.Vector3(0, 0, -1),  // Back
      ];

      let visible = 0;
      const camDir = new THREE.Vector3();
      camera.getWorldDirection(camDir);
      camDir.negate(); // Vector pointing from origin to camera

      normals.forEach((norm) => {
        const worldNorm = norm.clone().applyQuaternion(cubeGroup.quaternion);
        if (worldNorm.dot(camDir) > 0.05) {
          visible++;
        }
      });

      setVisibleCount(visible);
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
      cancelAnimationFrame(animationFrameId);
      domElem.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      materials.forEach(m => m.dispose());
      renderer.dispose();
    };
  }, []);

  return (
    <div
      className={`relative rounded-xl border border-cyan-500/30 bg-slate-950/80 p-3 shadow-xl backdrop-blur-md transition-all ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
