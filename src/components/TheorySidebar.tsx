import React, { useState } from 'react';
import { BookOpen, Atom, Sparkles, ChevronRight, Layers, ShieldAlert, Cpu, Eye, Compass } from 'lucide-react';

interface TheorySidebarProps {
  onSelectConcept?: (conceptId: string) => void;
}

export const TheorySidebar: React.FC<TheorySidebarProps> = () => {
  const [expandedReal, setExpandedReal] = useState<string | null>('4d');

  const realDimensions = [
    {
      id: '0d',
      title: '0D — Point & Singularity',
      subtitle: 'Zero spatial dimensions (0,0,0)',
      icon: '0D',
      color: 'text-amber-400 border-amber-500/40 bg-amber-950/20',
      summary: 'A point has no length, width, or depth.',
      details: 'In Quantum Field Theory, fundamental particles like electrons and quarks are treated as zero-dimensional mathematical point objects with charge and spin but no spatial volume. Singularities (such as black hole cores) represent zero-dimensional infinities in General Relativity.',
    },
    {
      id: '1d',
      title: '1D — Line & Superstrings',
      subtitle: 'Single spatial axis (X)',
      icon: '1D',
      color: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/20',
      summary: 'Movement restricted to forward and backward along a line.',
      details: 'In String Theory, fundamental constituents of matter are not point particles, but 1D Planck-length (about 10^-35 meters) vibrating strings. A string\'s resonant harmonic modes dictate its observable mass, charge, and spin in higher dimensions.',
    },
    {
      id: '2d',
      title: '2D — Plane & Hologram',
      subtitle: 'Dual spatial axes (X, Y)',
      icon: '2D',
      color: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/20',
      summary: 'Flat geometry with area, but zero thickness.',
      details: 'In 2D (Flatland), lines block other lines, so 2D creatures can only see 1D boundary edges. In quantum physics, 2D materials like graphene exhibit extraordinary quantum Hall effects. The Holographic Principle posits that all 3D gravitational bulk physics can be mathematically encoded on a 2D boundary surface.',
    },
    {
      id: '3d',
      title: '3D — Volume & Human Realm',
      subtitle: 'Triple spatial axes (X, Y, Z)',
      icon: '3D',
      color: 'text-blue-400 border-blue-500/40 bg-blue-950/20',
      summary: 'Our visible physical universe with enclosed volumes.',
      details: 'In 3D space, light travels along 3 axes. Opaque 2D surfaces (like cube faces or walls) completely block light rays, meaning 3D observers can see at most 3 faces of a cube simultaneously and cannot see inside sealed containers.',
    },
    {
      id: '4d',
      title: '4D — Hyper-Volume & Sight',
      subtitle: 'Four spatial axes (X, Y, Z, W)',
      icon: '4D',
      color: 'text-purple-400 border-purple-500/40 bg-purple-950/20',
      summary: 'Hyper-space with an orthogonal 4th direction W.',
      details: 'A 4D observer situated along the 4th spatial axis W looks DOWN at 3D space. Because 2D faces of a 3D cube lie entirely within the 3D plane (W = 0), light rays traveling along the W axis bypass these faces completely! Thus, ALL 6 faces and the entire internal volume are visible simultaneously without occlusion.',
    },
    {
      id: 'higher',
      title: '5D to 11D — Calabi-Yau & String Theory',
      subtitle: 'Extra compactified spatial dimensions',
      icon: 'N-D',
      color: 'text-rose-400 border-rose-500/40 bg-rose-950/20',
      summary: 'Curled extra dimensions existing at every subatomic point.',
      details: 'Visualizing extra dimensions: Imagine looking at a tightrope from far away—it looks like a 1D line. But an ant crawling on it sees a 2D circular cylinder wrapped around it! In M-Theory and Superstring Theory, our 3D universe contains 6 to 7 extra spatial dimensions curled up at every single point in space into microscopic 6-dimensional Calabi-Yau shapes at the Planck scale (10^-35 meters). Fundamental particles are actually 1D vibrating strings whose harmonic ripples bounce through these 11 dimensions, creating all known subatomic forces.',
    },
  ];

  return (
    <aside className="w-full lg:w-[340px] xl:w-[380px] bg-slate-950/95 border-r border-slate-800 flex flex-col h-full flex-shrink-0 select-none overflow-hidden">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-5 h-5 text-cyan-400" />
          <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-slate-100">
            Spatial & Dimensional Guide
          </h2>
        </div>
        <p className="text-[11px] text-slate-400 leading-tight">
          Theoretical physics and geometric hierarchy of spatial dimensions from 0D to 11D.
        </p>
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
        <div className="space-y-2">
          <div className="px-1 text-[10px] font-mono uppercase text-slate-400 tracking-wider flex items-center justify-between">
            <span>Spatial Dimensions</span>
            <span>0D → 11D</span>
          </div>

          {realDimensions.map((dim) => {
            const isExpanded = expandedReal === dim.id;
            return (
              <div
                key={dim.id}
                className={`rounded-xl border transition-all overflow-hidden ${
                  isExpanded ? 'bg-slate-900 border-cyan-500/40 shadow-lg' : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <button
                  onClick={() => setExpandedReal(isExpanded ? null : dim.id)}
                  className="w-full p-2.5 text-left flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-7 h-7 rounded-lg border font-mono text-xs font-bold flex items-center justify-center flex-shrink-0 ${dim.color}`}>
                      {dim.icon}
                    </span>
                    <div className="truncate">
                      <div className="font-mono text-xs font-bold text-slate-200 truncate">{dim.title}</div>
                      <div className="text-[10px] text-slate-400 truncate">{dim.subtitle}</div>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90 text-cyan-400' : ''}`} />
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 pt-1 border-t border-slate-800/60 text-xs text-slate-300 space-y-2">
                    <div className="p-2 bg-slate-950/60 rounded-lg border border-slate-800 text-[11px] font-mono text-cyan-300">
                      {dim.summary}
                    </div>
                    <p className="leading-relaxed text-[11px] text-slate-300">
                      {dim.details}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/50 text-[10px] font-mono text-slate-500 flex items-center justify-between">
        <div className="flex items-center gap-1 text-cyan-400">
          <Layers className="w-3 h-3" />
          <span>Theoretical Physics Guide</span>
        </div>
        <span>0D - 11D</span>
      </div>
    </aside>
  );
};
