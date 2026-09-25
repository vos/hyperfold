import React, { useState, useEffect, useRef } from 'react';
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
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { DiagnosticIssue, WorldData } from '../types/world';
import { PRESET_WORLDS } from '../utils/presets';
import { getAdjacentSectors } from '../utils/navigation.ts';

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
  activeRoomId?: string;
  onSelectRoom?: (roomId: string) => void;
  onOpenHelp?: () => void;
  onTestInGame?: () => void;
  testingStatus?: 'idle' | 'opening' | 'connected';
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
  onOpenHelp,
  onTestInGame,
  testingStatus,
  onLoadPreset,
  diagnostics,
  onOpenDiagnostics,
  activeView,
  setActiveView,
  activeRoomId,
  onSelectRoom,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(world.title);
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
  const fileMenuRef = useRef<HTMLDivElement>(null);

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

  // Close dropdown on outside click or Escape
  useEffect(() => {
    if (!isFileMenuOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target as Node)) {
        setIsFileMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFileMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFileMenuOpen]);

  const activeRoom = world.rooms.find((r) => r.id === activeRoomId) || world.rooms[0];
  const adjacent = activeRoom ? getAdjacentSectors(activeRoom, world) : null;
  const connectedAdjacent = adjacent
    ? Object.values(adjacent).filter((a) => a.isConnected && a.room)
    : [];

  return (
    <header className="h-14 bg-cyber-surface border-b border-cyber-border flex items-center justify-between px-3 md:px-4 select-none shrink-0 z-30 flex-nowrap min-w-0">
      {/* Left: Brand, File Dropdown Menu & World Title */}
      <div className="flex items-center space-x-2 md:space-x-3 shrink-0 min-w-0">
        <div className="flex items-center space-x-1.5 shrink-0">
          <span className="text-lg md:text-xl font-extrabold tracking-wider bg-gradient-to-r from-cyber-cyan via-cyber-neonBlue to-cyber-neonPink bg-clip-text text-transparent">
            HYPERFOLD
          </span>
          <span className="hidden sm:inline text-[11px] font-semibold px-1.5 py-0.5 rounded bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/30">
            EDITOR
          </span>
        </div>

        {/* File Dropdown Menu */}
        <div className="relative shrink-0" ref={fileMenuRef}>
          <button
            onClick={() => setIsFileMenuOpen((prev) => !prev)}
            className={`flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${
              isFileMenuOpen
                ? 'bg-cyber-cyan/20 text-cyber-cyan border-cyber-cyan/50 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                : 'text-slate-200 hover:text-white bg-cyber-card hover:bg-cyber-hover border-cyber-border'
            }`}
            title="File menu (New, Import, Presets, Export, Diagnostics, Help)"
          >
            <span>File</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${isFileMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isFileMenuOpen && (
            <div className="absolute left-0 mt-1.5 w-64 bg-cyber-surface border border-cyber-border rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 backdrop-blur-md">
              {/* New World */}
              <button
                onClick={() => {
                  setIsFileMenuOpen(false);
                  onNewWorld();
                }}
                className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs text-slate-200 hover:text-white hover:bg-cyber-card transition-colors text-left"
              >
                <FilePlus className="w-4 h-4 text-cyber-cyan/80 shrink-0" />
                <span>New Blank World</span>
              </button>

              {/* Import World JSON */}
              <button
                onClick={() => {
                  setIsFileMenuOpen(false);
                  onOpenImport();
                }}
                className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs text-slate-200 hover:text-white hover:bg-cyber-card transition-colors text-left"
              >
                <Upload className="w-4 h-4 text-cyber-neonBlue/80 shrink-0" />
                <span>Import World JSON...</span>
              </button>

              {/* Export World JSON */}
              <button
                onClick={() => {
                  setIsFileMenuOpen(false);
                  onOpenExport();
                }}
                className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs text-slate-200 hover:text-white hover:bg-cyber-card transition-colors text-left"
              >
                <Download className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Export World JSON...</span>
              </button>

              <div className="h-px bg-cyber-border/70 my-1 mx-2" />

              {/* Presets Section */}
              <div className="px-3 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                <Sparkles className="w-3 h-3 text-cyber-cyan" />
                <span>Load Preset World</span>
              </div>
              {PRESET_WORLDS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setIsFileMenuOpen(false);
                    onLoadPreset(p.id);
                  }}
                  className="w-full flex items-center space-x-2.5 px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-cyber-card transition-colors text-left"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-cyber-cyan/60 shrink-0" />
                  <span className="truncate">{p.name}</span>
                </button>
              ))}

              <div className="h-px bg-cyber-border/70 my-1 mx-2" />

              {/* Diagnostics */}
              <button
                onClick={() => {
                  setIsFileMenuOpen(false);
                  onOpenDiagnostics();
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-200 hover:text-white hover:bg-cyber-card transition-colors text-left"
              >
                <div className="flex items-center space-x-2.5">
                  {errorCount > 0 ? (
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  ) : warningCount > 0 ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                  <span>World Diagnostics</span>
                </div>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                    errorCount > 0
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                      : warningCount > 0
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {errorCount > 0
                    ? `${errorCount} err`
                    : warningCount > 0
                    ? `${warningCount} warn`
                    : 'Valid'}
                </span>
              </button>

              {/* Help & Shortcuts */}
              {onOpenHelp && (
                <button
                  onClick={() => {
                    setIsFileMenuOpen(false);
                    onOpenHelp();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-200 hover:text-white hover:bg-cyber-card transition-colors text-left"
                >
                  <div className="flex items-center space-x-2.5">
                    <HelpCircle className="w-4 h-4 text-cyber-cyan shrink-0" />
                    <span>Controls &amp; Shortcuts</span>
                  </div>
                  <kbd className="px-1.5 py-0.5 bg-black/60 border border-cyber-border text-[10px] text-slate-400 rounded font-mono font-bold">
                    ?
                  </kbd>
                </button>
              )}
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-cyber-border shrink-0" />

        {/* Editable World Title */}
        {isEditingTitle ? (
          <input
            type="text"
            className="bg-cyber-bg border border-cyber-cyan text-white text-xs font-semibold rounded px-2 py-1 focus:outline-none w-36 sm:w-52"
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
            className="group flex items-center space-x-1.5 text-left hover:bg-cyber-card px-2 py-1 rounded transition-colors min-w-0"
            title="Click to rename world"
          >
            <span className="text-xs font-semibold text-slate-100 group-hover:text-cyber-cyan transition-colors truncate max-w-[100px] sm:max-w-[140px] md:max-w-[200px]">
              {world.title}
            </span>
            <span className="text-[11px] text-slate-500 font-mono hidden xl:inline shrink-0">
              ({world.rooms.length} sectors)
            </span>
          </button>
        )}
      </div>

      {/* Middle: View Mode Tabs & Sector Switcher */}
      <div className="flex items-center space-x-2 shrink min-w-0 mx-2">
        <div className="flex bg-cyber-bg p-0.5 sm:p-1 rounded-lg border border-cyber-border shrink-0">
          <button
            onClick={() => setActiveView('editor')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors flex items-center space-x-1.5 ${
              activeView === 'editor'
                ? 'bg-cyber-cyan text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sector Grid</span>
            <span className="sm:hidden">Grid</span>
          </button>
          <button
            onClick={() => setActiveView('graph')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors flex items-center space-x-1.5 ${
              activeView === 'graph'
                ? 'bg-cyber-cyan text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="hidden sm:inline">World Graph ({world.rooms.length})</span>
            <span className="sm:hidden">Graph ({world.rooms.length})</span>
          </button>
        </div>

        {/* Active Sector Switcher with Connected Adjacent Sectors */}
        {activeView === 'editor' && activeRoom && onSelectRoom && (
          <select
            value={activeRoom.id}
            onChange={(e) => onSelectRoom(e.target.value)}
            className="bg-cyber-card border border-cyber-border text-xs text-white rounded px-2 py-1.5 hover:border-cyber-cyan/50 focus:outline-none font-medium cursor-pointer max-w-[120px] sm:max-w-[170px] md:max-w-[210px] truncate shrink"
            title="Current sector: switch or jump to connected adjacent sectors"
          >
            {connectedAdjacent.length > 0 && (
              <optgroup label="Connected Adjacent Sectors">
                {connectedAdjacent.map(({ direction, room: adjRoom }) => (
                  <option key={`adj-${adjRoom!.id}`} value={adjRoom!.id}>
                    {direction === 'up' ? '▲ Up' : direction === 'down' ? '▼ Down' : direction === 'left' ? '◀ Left' : '▶ Right'}: ({adjRoom!.coords[0]}, {adjRoom!.coords[1]}) {adjRoom!.title}
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label={`All Sectors (${world.rooms.length})`}>
              {world.rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  ({r.coords[0]}, {r.coords[1]}) - {r.title}
                </option>
              ))}
            </optgroup>
          </select>
        )}
      </div>

      {/* Right: Diagnostics Alert (if errors), History, Test in Game & Export */}
      <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
        {/* Warning/Error badge: only rendered in header if there are diagnostics issues */}
        {(errorCount > 0 || warningCount > 0) && (
          <button
            onClick={onOpenDiagnostics}
            className={`flex items-center space-x-1 px-2 py-1.5 rounded text-xs font-semibold border transition-colors shrink-0 ${
              errorCount > 0
                ? 'bg-red-500/10 border-red-500/40 text-red-400 hover:bg-red-500/20'
                : 'bg-amber-500/10 border-amber-500/40 text-amber-400 hover:bg-amber-500/20'
            }`}
            title={`Inspect ${errorCount ? `${errorCount} errors` : `${warningCount} warnings`}`}
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span className="font-mono text-[11px]">{errorCount || warningCount}</span>
          </button>
        )}

        {/* Undo / Redo */}
        <div className="flex items-center space-x-0.5 bg-cyber-bg p-0.5 rounded border border-cyber-border shrink-0">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="p-1.5 rounded hover:bg-cyber-card text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
            className="p-1.5 rounded hover:bg-cyber-card text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Test in Game Quick Access Button */}
        {onTestInGame && (
          <button
            onClick={onTestInGame}
            disabled={testingStatus === 'opening'}
            className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded text-xs font-semibold transition-colors shadow-sm disabled:opacity-50 shrink-0"
            title="Test current world directly in game [F5]"
          >
            {testingStatus === 'connected' ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-bold hidden sm:inline">Tested!</span>
              </>
            ) : (
              <>
                <Play className={`w-3.5 h-3.5 fill-current ${testingStatus === 'opening' ? 'animate-pulse text-cyber-cyan' : ''}`} />
                <span className="hidden sm:inline">Test in Game</span>
                <span className="sm:hidden">Test</span>
                <kbd className="ml-0.5 px-1 py-0.2 bg-black/40 border border-emerald-500/30 text-[10px] text-emerald-400 rounded font-mono font-bold">
                  F5
                </kbd>
              </>
            )}
          </button>
        )}

        {/* Export JSON Button */}
        <button
          onClick={onOpenExport}
          className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-cyber-cyan to-cyber-neonBlue text-slate-950 font-bold hover:brightness-110 rounded text-xs transition-all shadow-md shrink-0"
          title="Export world JSON for Hyperfold"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Export</span>
        </button>
      </div>
    </header>
  );
};
