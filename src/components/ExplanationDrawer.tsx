import React from 'react';
import { DemoId } from '../types';
import { X, BookOpen } from 'lucide-react';

interface ExplanationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentDemo: DemoId;
}

export const ExplanationDrawer: React.FC<ExplanationDrawerProps> = ({
  isOpen,
  onClose,
  currentDemo,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-lg bg-slate-950 border-l border-cyan-500/30 p-6 overflow-y-auto h-full flex flex-col gap-6 shadow-2xl text-slate-200 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold font-mono text-cyan-200 uppercase">
              Dimensional Physics & Geometry Guide
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Explanation per Demo */}
        {currentDemo === 'demo1' && (
          <div className="flex flex-col gap-4 text-xs leading-relaxed">
            <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30">
              <h3 className="font-mono font-bold text-cyan-300 text-sm mb-1">
                Demo 1: 4D Simultaneous Sight
              </h3>
              <p className="text-slate-300">
                How a 4D observer views a 3D object like a cube without surface occlusion.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-mono font-semibold text-slate-200 uppercase text-[11px] tracking-wider text-cyan-400">
                1. Geometric Hierarchy & Sight Rays
              </h4>
              <p className="text-slate-300">
                In 2D space (Flatland), a 2D creature looking at a square can only see 1 edge at a time because lines block lines. But a 3D observer looking from above sees all 4 edges AND the entire inside simultaneously!
              </p>
              <p className="text-slate-300">
                By exact mathematical analogy, in 3D space, light rays are blocked by 2D surfaces (opaque cube faces). We can only see at most 3 of a cube's 6 faces at once.
              </p>
              <p className="text-slate-300">
                However, a 4D observer situated along the 4th spatial axis W looks DOWN at 3D space. The 2D faces of a 3D cube do NOT block light rays traveling along the W axis! Thus, <strong className="text-cyan-300">all 6 faces AND the internal core are visible simultaneously</strong>.
              </p>
            </div>
          </div>
        )}

        {currentDemo === 'demo2' && (
          <div className="flex flex-col gap-4 text-xs leading-relaxed">
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30">
              <h3 className="font-mono font-bold text-rose-300 text-sm mb-1">
                Demo 2: Dimensional Collapse (3D → 2D Reduction)
              </h3>
              <p className="text-slate-300">
                The geometry and physics of spatial flattening from 3D to 2D.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-mono font-semibold text-slate-200 uppercase text-[11px] tracking-wider text-rose-400">
                1. Flattening Geometry
              </h4>
              <p className="text-slate-300">
                When 3D space loses its 3rd dimension (Z-axis), the vertical volume collapses down to zero thickness on the XY plane.
              </p>
              <p className="text-slate-300">
                Because matter cannot vanish, every 3D face, interior core, and internal structure unspools smoothly onto the 2D plane as a flat net where every component is laid out side-by-side without overlapping.
              </p>
            </div>
          </div>
        )}

        {currentDemo === 'demo3' && (
          <div className="flex flex-col gap-4 text-xs leading-relaxed">
            <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-500/30">
              <h3 className="font-mono font-bold text-sky-300 text-sm mb-1">
                Demo 3: Curvature Propulsion Drive
              </h3>
              <p className="text-slate-300">
                Spacetime metric contraction and expanding trailing wakes.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-mono font-semibold text-slate-200 uppercase text-[11px] tracking-wider text-sky-400">
                1. Spacetime Distortion
              </h4>
              <p className="text-slate-300">
                Curvature propulsion operates by artificially compressing spacetime geometry ahead of a vessel while expanding the metric tensor behind it.
              </p>
              <p className="text-slate-300">
                The trailing distorted wake creates a localized region of lowered light-speed metric, propelling the craft forward across space without needing rear mass expulsion.
              </p>
            </div>
          </div>
        )}

        {currentDemo === 'demo4' && (
          <div className="flex flex-col gap-4 text-xs leading-relaxed">
            <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30">
              <h3 className="font-mono font-bold text-purple-300 text-sm mb-1">
                Demo 4: 1D → 5D Dimensional Evolution
              </h3>
              <p className="text-slate-300">
                Observing how spatial enclosure, vision, and geometry transform step-by-step from 1D to 5D.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-mono font-semibold text-slate-200 uppercase text-[11px] tracking-wider text-purple-400">
                1. Dimensional Progression
              </h4>
              <p className="text-slate-300">
                • <strong>1D Line</strong>: Objects exist as points along a single line. Movement is restricted along X.<br />
                • <strong>2D Flatland</strong>: Space expands to width and height. A closed perimeter line forms a complete 2D boundary.<br />
                • <strong>3D Cube</strong>: Volume is added (Z axis). Front opaque surfaces occlude the interior and back faces.<br />
                • <strong>4D Tesseract</strong>: Adding the 4th spatial axis (W) allows light to bypass 3D surfaces. All 6 faces + inner core are visible simultaneously.<br />
                • <strong>5D Calabi-Yau</strong>: Micro-manifolds fold extra dimensions into quantum string vibrations and harmonic fields.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
