import React, { useState } from 'react';
import {
  Download,
  Upload,
  RotateCcw,
  RotateCw,
  AlertTriangle,
  CheckCircle2,
  FilePlus,
  Play,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { DiagnosticIssue, WorldData } from '../types/world';
import { PRESET_WORLDS } from '../utils/presets';

interface WorldHeaderProps {
  world: WorldData;
  onUpdateWorld: (updater: (prev: WorldData) => WorldData) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onNewWorld: () => void;
  onOpenImport: () => void;
  onOpenExport: () => void;
  onLoadPreset: (presetId: string) => void;
  diagnostics: DiagnosticIssue[];
  onOpenDiagnostics: () => void;
  activeView: 'editor' | 'graph';
  setActiveView: (view: 'editor' | 'graph') => void;
}

export const WorldHeader: React.FC<WorldHeaderProps> = ({
  world,
  onUpdateWorld,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onNewWorld,
  onOpenImport,
  onOpenExport,
  onLoadPreset,
  diagnostics,
  onOpenDiagnostics,
  activeView,
  setActiveView,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(world.title);

  const errorCount = diagnostics.filter((d) => d.severity === 'error').length;
  const warningCount = diagnostics.filter((d) => d.severity === 'warning').length;

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleInput.trim() && titleInput !== world.title) {
      onUpdateWorld((w) => ({ ...w, title: titleInput.trim() }));
    } else {
      setTitleInput(world.title);
    }
  };

  return (
    <header className="h-14 bg-cyber-surface border-b border-cyber-border flex items-center justify-between px-4 select-none shrink-0 z-20">
      {/* Left: Brand & World Title */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <span className="text-xl font-extrabold tracking-wider bg-gradient-to-r from-cyber-cyan via-cyber-neonBlue to-cyber-neonPink bg-clip-text text-transparent">
            HYPERFOLD
          </span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/30">
            WORLD EDITOR
          </span>
        </div>

        <div className="h-5 w-px bg-cyber-border mx-1" />

        {/* Editable World Title */}
        {isEditingTitle ? (
          <input
            type="text"
            className="bg-cyber-bg border border-cyber-cyan text-white text-sm font-semibold rounded px-2 py-1 focus:outline-none w-64"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTitleSubmit();
              if (e.key === 'Escape') {
                setTitleInput(world.title);
                setIsEditingTitle(false);
              }
            }}
            autoFocus
          />
        ) : (
          <button
            onClick={() => {
              setTitleInput(world.title);
              setIsEditingTitle(true);
            }}
            className="group flex items-center space-x-2 text-left hover:bg-cyber-card px-2 py-1 rounded transition-colors"
            title="Click to rename world"
          >
            <span className="text-sm font-semibold text-slate-100 group-hover:text-cyber-cyan transition-colors">
              {world.title}
            </span>
            <span className="text-xs text-slate-500 font-mono">({world.rooms.length} sectors)</span>
          </button>
        )}
      </div>

      {/* Middle: View Mode Tabs & Presets */}
      <div className="flex items-center space-x-2">
        <div className="flex bg-cyber-bg p-1 rounded-lg border border-cyber-border">
          <button
            onClick={() => setActiveView('editor')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors flex items-center space-x-1.5 ${
              activeView === 'editor'
                ? 'bg-cyber-cyan text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Sector Grid</span>
          </button>
          <button
            onClick={() => setActiveView('graph')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors flex items-center space-x-1.5 ${
              activeView === 'graph'
                ? 'bg-cyber-cyan text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>World Graph ({world.rooms.length})</span>
          </button>
        </div>

        {/* Preset Selector */}
        <select
          onChange={(e) => {
            if (e.target.value) {
              onLoadPreset(e.target.value);
              e.target.value = '';
            }
          }}
          defaultValue=""
          className="bg-cyber-card border border-cyber-border text-xs text-slate-300 rounded px-2.5 py-1.5 hover:border-cyber-cyan/50 focus:outline-none"
        >
          <option value="" disabled>
            Load Preset...
          </option>
          {PRESET_WORLDS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Right: History, Diagnostics, Import/Export */}
      <div className="flex items-center space-x-2">
        {/* Undo / Redo */}
        <div className="flex items-center space-x-1 bg-cyber-bg p-0.5 rounded border border-cyber-border">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="p-1.5 rounded hover:bg-cyber-card text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
            className="p-1.5 rounded hover:bg-cyber-card text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        <div className="h-5 w-px bg-cyber-border mx-1" />

        {/* Diagnostics Button */}
        <button
          onClick={onOpenDiagnostics}
          className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded text-xs font-medium border transition-colors ${
            errorCount > 0
              ? 'bg-red-500/10 border-red-500/40 text-red-400 hover:bg-red-500/20'
              : warningCount > 0
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 hover:bg-amber-500/20'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
          }`}
          title="Inspect world diagnostics and lint issues"
        >
          {errorCount > 0 ? (
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          ) : warningCount > 0 ? (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span>
            {errorCount > 0
              ? `${errorCount} error${errorCount > 1 ? 's' : ''}`
              : warningCount > 0
              ? `${warningCount} warning${warningCount > 1 ? 's' : ''}`
              : 'Valid World'}
          </span>
        </button>

        {/* New World */}
        <button
          onClick={onNewWorld}
          className="flex items-center space-x-1 px-2.5 py-1.5 bg-cyber-card hover:bg-cyber-hover border border-cyber-border text-slate-300 hover:text-white rounded text-xs transition-colors"
          title="Create brand new empty world"
        >
          <FilePlus className="w-3.5 h-3.5" />
          <span>New</span>
        </button>

        {/* Import JSON */}
        <button
          onClick={onOpenImport}
          className="flex items-center space-x-1 px-2.5 py-1.5 bg-cyber-card hover:bg-cyber-hover border border-cyber-border text-slate-300 hover:text-white rounded text-xs transition-colors"
          title="Import world or sector JSON file"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Import</span>
        </button>

        {/* Export JSON */}
        <button
          onClick={onOpenExport}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-cyber-cyan to-cyber-neonBlue text-slate-950 font-bold hover:brightness-110 rounded text-xs transition-all shadow-md"
          title="Export world JSON for Hyperfold"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export JSON</span>
        </button>
      </div>
    </header>
  );
};

