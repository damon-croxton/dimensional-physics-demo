// Shared Three.js plumbing used by every demo viewport: renderer setup,
// pointer-based drag rotation (mouse + touch), container-aware resizing,
// GPU resource disposal and the dice-face pip texture.

import * as THREE from 'three';

export function createRenderer(container: HTMLElement): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth || 1, container.clientHeight || 1);
  container.appendChild(renderer.domElement);
  return renderer;
}

// Keeps the camera aspect and drawing buffer in sync with the container. A
// ResizeObserver also catches layout changes (sidebar wrapping, panels opening)
// that never fire a window resize event.
export function observeResize(
  container: HTMLElement,
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer
): () => void {
  const resize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  return () => observer.disconnect();
}

export interface DragRotate {
  isDragging: () => boolean;
  dispose: () => void;
}

// Pointer events cover mouse, touch and pen. Capturing the pointer keeps the
// drag alive when it leaves the canvas without global window listeners.
export function attachDragRotate(
  element: HTMLElement,
  onDrag: (dx: number, dy: number) => void
): DragRotate {
  let activePointer: number | null = null;
  let prevX = 0;
  let prevY = 0;
  element.style.touchAction = 'none';

  const handleDown = (e: PointerEvent) => {
    if (activePointer !== null) return;
    activePointer = e.pointerId;
    prevX = e.clientX;
    prevY = e.clientY;
    element.setPointerCapture(e.pointerId);
  };

  const handleMove = (e: PointerEvent) => {
    if (e.pointerId !== activePointer) return;
    onDrag(e.clientX - prevX, e.clientY - prevY);
    prevX = e.clientX;
    prevY = e.clientY;
  };

  const handleUp = (e: PointerEvent) => {
    if (e.pointerId !== activePointer) return;
    activePointer = null;
    if (element.hasPointerCapture(e.pointerId)) {
      element.releasePointerCapture(e.pointerId);
    }
  };

  element.addEventListener('pointerdown', handleDown);
  element.addEventListener('pointermove', handleMove);
  element.addEventListener('pointerup', handleUp);
  element.addEventListener('pointercancel', handleUp);

  return {
    isDragging: () => activePointer !== null,
    dispose: () => {
      element.removeEventListener('pointerdown', handleDown);
      element.removeEventListener('pointermove', handleMove);
      element.removeEventListener('pointerup', handleUp);
      element.removeEventListener('pointercancel', handleUp);
    },
  };
}

function disposeMaterial(material: THREE.Material) {
  for (const value of Object.values(material)) {
    if (value instanceof THREE.Texture) value.dispose();
  }
  material.dispose();
}

// Frees the geometries, materials and textures under `root`. Three.js never
// garbage-collects GPU buffers, so skipping this leaks memory on every
// demo switch.
export function disposeObject3D(root: THREE.Object3D) {
  root.traverse((obj) => {
    const renderable = obj as Partial<THREE.Mesh>;
    renderable.geometry?.dispose();
    const material = renderable.material;
    if (Array.isArray(material)) material.forEach(disposeMaterial);
    else if (material) disposeMaterial(material);
  });
}

export function teardownRenderer(container: HTMLElement, renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
  disposeObject3D(scene);
  renderer.dispose();
  if (container.contains(renderer.domElement)) {
    container.removeChild(renderer.domElement);
  }
}

const PIP_LAYOUTS: Record<number, Array<[number, number]>> = {
  1: [[128, 128]],
  2: [[70, 70], [186, 186]],
  3: [[70, 70], [128, 128], [186, 186]],
  4: [[70, 70], [186, 70], [70, 186], [186, 186]],
  5: [[70, 70], [186, 70], [128, 128], [70, 186], [186, 186]],
  6: [[70, 70], [186, 70], [70, 128], [186, 128], [70, 186], [186, 186]],
};

export function createDicePipTexture(pipCount: number, bgColor: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 14;
  ctx.strokeRect(7, 7, 242, 242);

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 4;
  for (const [x, y] of PIP_LAYOUTS[pipCount] ?? []) {
    ctx.beginPath();
    ctx.arc(x, y, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
