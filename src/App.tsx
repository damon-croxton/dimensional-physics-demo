import React, { useState } from 'react';
import { DemoId } from './types';
import { Navbar } from './components/Navbar';
import { TheorySidebar } from './components/TheorySidebar';
import { ExplanationDrawer } from './components/ExplanationDrawer';
import { Demo1_SimultaneousVision } from './components/Demo1_SimultaneousVision';
import { Demo2_DimensionalCollapse } from './components/Demo2_DimensionalCollapse';
import { Demo3_CurvaturePropulsion } from './components/Demo3_CurvaturePropulsion';
import { Demo4_DimensionalEvolution } from './components/Demo4_DimensionalEvolution';

export default function App() {
  const [currentDemo, setCurrentDemo] = useState<DemoId>('demo1');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-cyan-500 selection:text-black">
      {/* Top Navbar */}
      <Navbar
        currentDemo={currentDemo}
        onSelectDemo={(demo) => {
          setCurrentDemo(demo);
        }}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        onOpenDrawer={() => setIsDrawerOpen(true)}
      />

      {/* Main Workspace with Permanent Left Theory Bar */}
      <div className="flex-1 w-full max-w-[1700px] mx-auto p-2 sm:p-4 flex flex-col lg:flex-row gap-4 min-h-0">
        {/* Permanent Left Theory Sidebar */}
        <TheorySidebar />

        {/* Main Demo Viewport */}
        <main className="flex-1 rounded-2xl border border-slate-800 bg-slate-950/80 shadow-2xl overflow-hidden flex flex-col min-w-0">
          {currentDemo === 'demo1' && <Demo1_SimultaneousVision soundEnabled={soundEnabled} />}
          {currentDemo === 'demo2' && <Demo2_DimensionalCollapse soundEnabled={soundEnabled} />}
          {currentDemo === 'demo3' && <Demo3_CurvaturePropulsion soundEnabled={soundEnabled} />}
          {currentDemo === 'demo4' && <Demo4_DimensionalEvolution soundEnabled={soundEnabled} />}
        </main>
      </div>

      {/* Theory Drawer Modal for Mobile / Fullscreen */}
      <ExplanationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        currentDemo={currentDemo}
      />

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 bg-slate-950 py-2.5 px-4 text-center text-[11px] font-mono text-slate-500">
        Adjacent Dimensions Tech Demo • Powered by WebGL & Three.js
      </footer>
    </div>
  );
}
