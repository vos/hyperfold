import React from 'react';
import { X, Keyboard, MousePointer, Compass, Layers, RotateCcw } from 'lucide-react';

interface HelpModalProps {
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-cyber-surface border border-cyber-border rounded-xl shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-cyber-border flex items-center justify-between bg-cyber-card/50">
          <div className="flex items-center space-x-2 text-cyber-cyan font-bold tracking-wide">
            <Keyboard className="w-5 h-5" />
            <span className="text-base text-white">EDITOR CONTROLS &amp; SHORTCUTS</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-md hover:bg-cyber-surface"
            title="Close [Esc]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm select-none">
          {/* 2-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tools */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-cyber-cyan border-b border-cyber-border/40 pb-1.5">
                <MousePointer className="w-3.5 h-3.5" />
                <span>Editor Tools</span>
              </div>
              <div className="space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between py-1 border-b border-cyber-border/20">
                  <span className="text-slate-300">Select / Move Entities</span>
                  <kbd className="px-2 py-0.5 bg-cyber-bg border border-cyber-border text-white rounded font-bold">V</kbd>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-cyber-border/20">
                  <span className="text-slate-300">Pencil Brush</span>
                  <kbd className="px-2 py-0.5 bg-cyber-bg border border-cyber-border text-white rounded font-bold">B</kbd>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-cyber-border/20">
                  <span className="text-slate-300">Line Tool</span>
                  <kbd className="px-2 py-0.5 bg-cyber-bg border border-cyber-border text-white rounded font-bold">L</kbd>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-cyber-border/20">
                  <span className="text-slate-300">Rectangle Tool</span>
                  <kbd className="px-2 py-0.5 bg-cyber-bg border border-cyber-border text-white rounded font-bold">U</kbd>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-cyber-border/20">
                  <span className="text-slate-300">Flood Fill Bucket</span>
                  <kbd className="px-2 py-0.5 bg-cyber-bg border border-cyber-border text-white rounded font-bold">F</kbd>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-cyber-border/20">
                  <span className="text-slate-300">Eraser</span>
                  <kbd className="px-2 py-0.5 bg-cyber-bg border border-cyber-border text-white rounded font-bold">E</kbd>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-cyber-border/20">
                  <span className="text-slate-300">Eyedropper</span>
                  <kbd className="px-2 py-0.5 bg-cyber-bg border border-cyber-border text-white rounded font-bold">I</kbd>
                </div>
              </div>
            </div>

            {/* Tiles */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-cyber-neonPink border-b border-cyber-border/40 pb-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>Tile Palette Hotkeys</span>
              </div>
              <div className="space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between py-1 border-b border-cyber-border/20">
                  <span className="text-slate-300">Empty Space / Air</span>
                  <kbd className="px-2 py-0.5 bg-cyber-bg border border-cyber-border text-white rounded font-bold">1</kbd>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-cyber-border/20">
                  <span className="text-slate-300">Solid Wall</span>
                  <kbd className="px-2 py-0.5 bg-cyber-bg border border-cyber-border text-white rounded font-bold">2</kbd>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-cyber-border/20">
                  <span className="text-slate-300">One-way Platform</span>
                  <kbd className="px-2 py-0.5 bg-cyber-bg border border-cyber-border text-white rounded font-bold">3</kbd>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-cyber-border/20">
                  <span className="text-slate-300">Laser Spike Hazard</span>
                  <kbd className="px-2 py-0.5 bg-cyber-bg border border-cyber-border text-white rounded font-bold">4</kbd>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-cyber-border/20">
                  <span className="text-slate-300">Goal Warp Core</span>
                  <kbd className="px-2 py-0.5 bg-cyber-bg border border-cyber-border text-white rounded font-bold">5</kbd>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-cyber-border/20">
                  <span className="text-slate-300">Bounce Pad / Crumble / Prisms</span>
                  <div className="flex gap-1">
                    <kbd className="px-1.5 py-0.5 bg-cyber-bg border border-cyber-border text-white rounded font-bold">6</kbd>
                    <kbd className="px-1.5 py-0.5 bg-cyber-bg border border-cyber-border text-white rounded font-bold">7</kbd>
                    <kbd className="px-1.5 py-0.5 bg-cyber-bg border border-cyber-border text-white rounded font-bold">8</kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-cyber-border/20">
                  <span className="text-slate-300">Gate Key / Door</span>
                  <div className="flex gap-1">
                    <kbd className="px-1.5 py-0.5 bg-cyber-bg border border-cyber-border text-white rounded font-bold">9</kbd>
                    <kbd className="px-1.5 py-0.5 bg-cyber-bg border border-cyber-border text-white rounded font-bold">0</kbd>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-cyber-border/40 pb-1.5">
                <Compass className="w-3.5 h-3.5" />
                <span>Sector Navigation</span>
              </div>
              <div className="space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between py-1 border-b border-cyber-border/20">
                  <span className="text-slate-300">Jump to Adjacent Sector</span>
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-cyber-bg border border-cyber-border text-white rounded font-bold">Alt</kbd>
                    <span>+</span>
                    <kbd className="px-1.5 py-0.5 bg-cyber-bg border border-cyber-border text-white rounded font-bold">Arrows</kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-cyber-border/20">
                  <span className="text-slate-300">World Graph: Move Sector</span>
                  <span className="text-cyber-cyan font-bold text-[11px]">Drag Sector</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-cyber-border/20">
                  <span className="text-slate-300">World Graph: Copy Sector</span>
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-cyber-bg border border-cyber-border text-white rounded font-bold">Alt</kbd>
                    <span>+</span>
                    <span className="text-emerald-400 font-bold text-[11px]">Drag</span>
                  </div>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-cyber-border/20">
                  <span className="text-slate-300">Toggle Grid Overlay</span>
                  <kbd className="px-2 py-0.5 bg-cyber-bg border border-cyber-border text-white rounded font-bold">G</kbd>
                </div>
              </div>
            </div>

            {/* History & System */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-emerald-400 border-b border-cyber-border/40 pb-1.5">
                <RotateCcw className="w-3.5 h-3.5" />
                <span>History &amp; System</span>
              </div>
              <div className="space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between py-1 border-b border-cyber-border/20">
                  <span className="text-slate-300">Undo History</span>
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-cyber-bg border border-cyber-border text-white rounded font-bold">Ctrl</kbd>
                    <span>+</span>
                    <kbd className="px-1.5 py-0.5 bg-cyber-bg border border-cyber-border text-white rounded font-bold">Z</kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-cyber-border/20">
                  <span className="text-slate-300">Redo History</span>
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-cyber-bg border border-cyber-border text-white rounded font-bold">Ctrl</kbd>
                    <span>+</span>
                    <kbd className="px-1.5 py-0.5 bg-cyber-bg border border-cyber-border text-white rounded font-bold">Y</kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-cyber-border/20">
                  <span className="text-slate-300">Toggle This Help Menu</span>
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-cyber-bg border border-cyber-border text-white rounded font-bold">?</kbd>
                    <span>or</span>
                    <kbd className="px-1.5 py-0.5 bg-cyber-bg border border-cyber-border text-white rounded font-bold">H</kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-cyber-border/20">
                  <span className="text-slate-300">Close Dialogs / Deselect</span>
                  <kbd className="px-2 py-0.5 bg-cyber-bg border border-cyber-border text-white rounded font-bold">Esc</kbd>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-cyber-border/20">
                  <span className="text-emerald-300 font-semibold">Test in Game (Playtest)</span>
                  <kbd className="px-2 py-0.5 bg-cyber-bg border border-emerald-500/40 text-emerald-400 rounded font-bold">F5</kbd>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-cyber-border bg-cyber-card/30 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-cyber-cyan text-slate-950 font-bold rounded text-xs hover:brightness-110 transition-all shadow-md"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

