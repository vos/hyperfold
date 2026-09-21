import React, { useState } from 'react';
import { X, Download, Copy, Check, Play, ExternalLink } from 'lucide-react';
import { WorldData } from '../types/world';
import { exportWorldJson } from '../utils/serialization';

interface ExportModalProps {
  world: WorldData;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ world, onClose }) => {
  const [copied, setCopied] = useState(false);
  const jsonContent = exportWorldJson(world);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${world.id || 'hyperfold-world'}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePlayInGame = () => {
    // Store in localStorage for game pickup
    try {
      localStorage.setItem('hyperfold_custom_world', jsonContent);
      window.open('http://localhost:5173/?load_custom=storage', '_blank');
    } catch {
      handleDownload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 select-none animate-in fade-in duration-200">
      <div className="bg-cyber-surface border border-cyber-border rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="h-14 px-6 border-b border-cyber-border flex items-center justify-between bg-cyber-bg/50 shrink-0">
          <div>
            <h3 className="text-base font-bold text-white">Export World JSON</h3>
            <p className="text-xs text-slate-400">
              Single-file world bundle conforming to Hyperfold's world schema
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-cyber-card"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: JSON Code Preview */}
        <div className="flex-1 p-6 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between pb-2 text-xs text-slate-400">
            <span className="font-mono">
              {world.id}.json ({world.rooms.length} sectors, {jsonContent.length} bytes)
            </span>
            <span>Schema: ./schemas/world.schema.json</span>
          </div>

          <div className="flex-1 overflow-auto bg-black rounded-lg border border-cyber-border p-4 font-mono text-xs text-slate-300 select-text">
            <pre className="whitespace-pre">{jsonContent}</pre>
          </div>
        </div>

        {/* Modal Footer: Action Buttons */}
        <div className="h-16 px-6 border-t border-cyber-border bg-cyber-bg/50 flex items-center justify-between shrink-0">
          <button
            onClick={handlePlayInGame}
            className="flex items-center space-x-2 px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold transition-colors"
            title="Send to game instance on port 5173"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Test in Game (Port 5173)</span>
          </button>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1.5 px-4 py-2 bg-cyber-card hover:bg-cyber-hover border border-cyber-border text-slate-200 rounded-lg text-xs font-medium transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy to Clipboard</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-cyber-cyan to-cyber-neonBlue text-slate-950 font-bold rounded-lg text-xs hover:brightness-110 shadow-lg transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download File (.json)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

