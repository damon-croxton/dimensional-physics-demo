import React from 'react';
import { DemoId } from '../types';
import { playClickSound } from '../utils/sound';
import { Layers, Sparkles, Rocket, Sliders, Volume2, VolumeX, BookOpen } from 'lucide-react';

interface NavbarProps {
  currentDemo: DemoId;
  onSelectDemo: (demo: DemoId) => void;
  soundEnabled: boolean;
  onToggleSound?: () => void;
  onOpenDrawer?: () => void;
}

const DEMOS = [
  { id: 'demo1' as DemoId, label: '1. 4D Projection', subtitle: 'Simultaneous Vision', icon: EyeIcon },
  { id: 'demo2' as DemoId, label: '2. 2D Projection', subtitle: 'Dice Net Painting', icon: Layers },
  { id: 'demo4' as DemoId, label: '3. 1D-5D Transition', subtitle: 'Dimensional Extrusion', icon: Sliders },
  { id: 'demo3' as DemoId, label: '4. Curvature Drive', subtitle: 'FTL Metric Distortion', icon: Rocket },
];

function EyeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

export const Navbar: React.FC<NavbarProps> = ({
  currentDemo,
  onSelectDemo,
  soundEnabled,
  onToggleSound,
  onOpenDrawer,
}) => {
  return (
    <header className="sticky top-0 z-50 w-full bg-slate-950/90 border-b border-cyan-500/30 backdrop-blur-xl px-4 py-3 shadow-2xl">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand / Title */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 p-0.5 shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
          </div>
          <div>
            <h1 className="text-sm font-bold font-mono text-cyan-200 uppercase tracking-widest flex items-center gap-2">
              Adjacent Dimensions Tech Demo
            </h1>
            <p className="text-[10px] font-mono text-slate-400">
              Interactive Physics of Remembrance of Earth's Past (Liu Cixin)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 max-w-full min-w-0">
        {/* Demo Switcher Tabs */}
        <nav aria-label="Demos" className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 shadow-inner overflow-x-auto max-w-full">
          {DEMOS.map((demo) => {
            const Icon = demo.icon;
            const isActive = currentDemo === demo.id;
            return (
              <button
                key={demo.id}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => {
                  onSelectDemo(demo.id);
                  playClickSound(soundEnabled);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-2 flex-shrink-0 border ${
                  isActive
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100 font-bold shadow-md shadow-cyan-500/20'
                    : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                <div className="flex flex-col text-left">
                  <span>{demo.label}</span>
                  <span className="text-[9px] text-slate-500 font-normal">{demo.subtitle}</span>
                </div>
              </button>
            );
          })}
        </nav>

        {onOpenDrawer && (
          <button
            onClick={() => {
              onOpenDrawer();
              playClickSound(soundEnabled);
            }}
            className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/40 flex-shrink-0"
            title="Explain this demo"
            aria-label="Explain this demo"
          >
            <BookOpen className="w-4 h-4" />
          </button>
        )}

        {onToggleSound && (
          <button
            onClick={onToggleSound}
            className={`p-2 rounded-xl bg-slate-900/90 border flex-shrink-0 ${
              soundEnabled ? 'border-cyan-500/40 text-cyan-300' : 'border-slate-800 text-slate-500'
            } hover:text-cyan-200`}
            title={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
            aria-label={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
            aria-pressed={soundEnabled}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        )}
        </div>
      </div>
    </header>
  );
};
