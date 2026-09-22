import React, { useState } from 'react';
import {
  Layers,
  Sparkles,
  Settings,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Zap,
  Radio,
  Sliders,
  Flag,
  ArrowRight,
  Compass,
  Target,
} from 'lucide-react';
import {
  DiagnosticIssue,
  RoomData,
  SelectedEntity,
  WorldData,
  CollectibleData,
  MovingPlatformConfig,
  LaserBarrierConfig,
  LaserTurretConfig,
} from '../types/world';
import { getAdjacentSectors, getOppositeDirection } from '../utils/navigation.ts';

interface InspectorPanelProps {
  world: WorldData;
  onUpdateWorld: (updater: (prev: WorldData) => WorldData) => void;
  room: RoomData;
  onUpdateRoom: (updater: (prev: RoomData) => RoomData) => void;
  selectedEntity: SelectedEntity;
  onSelectEntity: (entity: SelectedEntity) => void;
  diagnostics: DiagnosticIssue[];
  activeTab: 'room' | 'entities' | 'world';
  setActiveTab: (tab: 'room' | 'entities' | 'world') => void;
  onSelectRoom?: (roomId: string) => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  world,
  onUpdateWorld,
  room,
  onUpdateRoom,
  selectedEntity,
  onSelectEntity,
  diagnostics,
  activeTab,
  setActiveTab,
  onSelectRoom,
}) => {
  const COLOR_PRESETS = [
    '#00e5ff', // Cyan
    '#0066ff', // Blue
    '#d000ff', // Purple
    '#ff007f', // Pink
    '#00ff66', // Green
    '#ffe600', // Yellow
    '#ff5500', // Orange
    '#ffffff', // White
  ];

  // Helper to add a new collectible
  const handleAddCollectible = (type: 'core' | 'prism' | 'key') => {
    const id = `${room.id}_${type}_${Date.now().toString().slice(-4)}`;
    const newCol: CollectibleData = {
      id,
      type,
      x: 400,
      y: 400,
    };
    onUpdateRoom((prev) => ({
      ...prev,
      collectibles: [...(prev.collectibles || []), newCol],
    }));
    onSelectEntity({ type: 'collectible', id });
  };

  // Helper to add a new moving platform
  const handleAddMovingPlatform = () => {
    const id = `${room.id}_plat_${Date.now().toString().slice(-4)}`;
    const newPlat: MovingPlatformConfig = {
      id,
      startX: 200,
      startY: 400,
      endX: 600,
      endY: 400,
      width: 100,
      height: 16,
      speed: 120,
      pauseTime: 0.4,
      initialProgress: 0,
      oneWay: true,
    };
    onUpdateRoom((prev) => ({
      ...prev,
      movingPlatforms: [...(prev.movingPlatforms || []), newPlat],
    }));
    onSelectEntity({ type: 'movingPlatform', id });
  };

  // Helper to add a new laser barrier
  const handleAddLaserBarrier = () => {
    const id = `${room.id}_barrier_${Date.now().toString().slice(-4)}`;
    const newBarrier: LaserBarrierConfig = {
      id,
      startX1: 200,
      startY1: 300,
      startX2: 600,
      startY2: 300,
      activeDuration: 2.0,
      inactiveDuration: 2.0,
      warningDuration: 0.6,
      width: 4,
    };
    onUpdateRoom((prev) => ({
      ...prev,
      laserBarriers: [...(prev.laserBarriers || []), newBarrier],
    }));
    onSelectEntity({ type: 'laserBarrier', id });
  };

  // Helper to add a new laser turret
  const handleAddLaserTurret = () => {
    const id = `${room.id}_turret_${Date.now().toString().slice(-4)}`;
    const newTurret: LaserTurretConfig = {
      id,
      x: 400,
      y: 120,
      direction: 'down',
      mode: 'projectile',
      fireInterval: 1.8,
      projectileSpeed: 280,
    };
    onUpdateRoom((prev) => ({
      ...prev,
      laserTurrets: [...(prev.laserTurrets || []), newTurret],
    }));
    onSelectEntity({ type: 'laserTurret', id });
  };

  // Find active entity objects
  const activeCollectible =
    selectedEntity?.type === 'collectible'
      ? room.collectibles?.find((c) => c.id === selectedEntity.id)
      : null;

  const activePlatform =
    selectedEntity?.type === 'movingPlatform'
      ? room.movingPlatforms?.find((p) => p.id === selectedEntity.id)
      : null;

  const activeBarrier =
    selectedEntity?.type === 'laserBarrier'
      ? room.laserBarriers?.find((b) => b.id === selectedEntity.id)
      : null;

  const activeTurret =
    selectedEntity?.type === 'laserTurret'
      ? room.laserTurrets?.find((t) => t.id === selectedEntity.id)
      : null;

  const activeBouncePadKey =
    selectedEntity?.type === 'bouncePad'
      ? `${selectedEntity.row},${selectedEntity.col}`
      : null;
  const activeBouncePadConfig = activeBouncePadKey
    ? room.bounceProps?.[activeBouncePadKey] || { vy: -1400, vx: 0 }
    : null;

  return (
    <aside className="w-80 bg-cyber-surface border-l border-cyber-border flex flex-col select-none shrink-0 z-10">
      {/* Tabs Header */}
      <div className="h-11 border-b border-cyber-border flex items-center px-2 bg-cyber-bg/50">
        <button
          onClick={() => setActiveTab('room')}
          className={`flex-1 py-2 text-xs font-semibold rounded flex items-center justify-center space-x-1 transition-colors ${
            activeTab === 'room'
              ? 'bg-cyber-card text-cyber-cyan border-b-2 border-cyber-cyan'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Sector</span>
        </button>

        <button
          onClick={() => setActiveTab('entities')}
          className={`flex-1 py-2 text-xs font-semibold rounded flex items-center justify-center space-x-1 transition-colors ${
            activeTab === 'entities'
              ? 'bg-cyber-card text-cyber-cyan border-b-2 border-cyber-cyan'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Entities</span>
        </button>

        <button
          onClick={() => setActiveTab('world')}
          className={`flex-1 py-2 text-xs font-semibold rounded flex items-center justify-center space-x-1 transition-colors relative ${
            activeTab === 'world'
              ? 'bg-cyber-card text-cyber-cyan border-b-2 border-cyber-cyan'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>World</span>
          {diagnostics.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-400 absolute top-2 right-2" />
          )}
        </button>
      </div>

      {/* Tab Content Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
        {/* ========================================================================= */}
        {/* TAB 1: ROOM / SECTOR SETTINGS */}
        {/* ========================================================================= */}
        {activeTab === 'room' && (
          <div className="space-y-4">
            {/* Sector Meta */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Sector Information
              </label>

              <div>
                <span className="text-slate-500 text-[10px]">Sector ID</span>
                <input
                  type="text"
                  value={room.id}
                  onChange={(e) => onUpdateRoom((r) => ({ ...r, id: e.target.value }))}
                  className="w-full bg-cyber-bg border border-cyber-border rounded px-2.5 py-1.5 text-white font-mono text-xs focus:border-cyber-cyan focus:outline-none"
                />
              </div>

              <div>
                <span className="text-slate-500 text-[10px]">Title</span>
                <input
                  type="text"
                  value={room.title}
                  onChange={(e) => onUpdateRoom((r) => ({ ...r, title: e.target.value }))}
                  className="w-full bg-cyber-bg border border-cyber-border rounded px-2.5 py-1.5 text-white text-xs focus:border-cyber-cyan focus:outline-none"
                />
              </div>

              <div>
                <span className="text-slate-500 text-[10px]">Subtitle / Hints</span>
                <input
                  type="text"
                  value={room.subtitle || ''}
                  onChange={(e) => onUpdateRoom((r) => ({ ...r, subtitle: e.target.value }))}
                  placeholder="Shown on sector entry..."
                  className="w-full bg-cyber-bg border border-cyber-border rounded px-2.5 py-1.5 text-slate-300 text-xs focus:border-cyber-cyan focus:outline-none"
                />
              </div>
            </div>

            <div className="h-px bg-cyber-border" />

            {/* Neon Colors */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Theme Neon Palette
              </label>

              <div className="flex items-center space-x-3">
                <div className="flex-1">
                  <span className="text-slate-500 text-[10px] block mb-1">Primary Color</span>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={room.themeColor}
                      onChange={(e) => onUpdateRoom((r) => ({ ...r, themeColor: e.target.value }))}
                      className="w-7 h-7 rounded border border-cyber-border bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={room.themeColor}
                      onChange={(e) => onUpdateRoom((r) => ({ ...r, themeColor: e.target.value }))}
                      className="w-20 bg-cyber-bg border border-cyber-border rounded px-2 py-1 text-white font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="flex-1">
                  <span className="text-slate-500 text-[10px] block mb-1">Accent Color</span>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={room.accentColor}
                      onChange={(e) => onUpdateRoom((r) => ({ ...r, accentColor: e.target.value }))}
                      className="w-7 h-7 rounded border border-cyber-border bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={room.accentColor}
                      onChange={(e) => onUpdateRoom((r) => ({ ...r, accentColor: e.target.value }))}
                      className="w-20 bg-cyber-bg border border-cyber-border rounded px-2 py-1 text-white font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Color Presets */}
              <div className="flex items-center space-x-1.5 pt-1">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    onClick={() => onUpdateRoom((r) => ({ ...r, themeColor: color }))}
                    className="w-5 h-5 rounded-full border border-slate-700 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    title={`Set primary color to ${color}`}
                  />
                ))}
              </div>
            </div>

            <div className="h-px bg-cyber-border" />

            {/* Exits & Adjacent Sectors Configuration */}
            {(() => {
              const adjacent = getAdjacentSectors(room, world);
              const connectedCount = Object.values(adjacent).filter((a) => a.isConnected).length;
              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Exits & Adjacent Sectors
                    </label>
                    <span className="text-[10px] text-cyber-cyan font-mono font-semibold">
                      {connectedCount} Connected
                    </span>
                  </div>

                  <div className="space-y-2">
                    {(['up', 'right', 'down', 'left'] as const).map((dir) => {
                      const info = adjacent[dir];
                      return (
                        <div
                          key={dir}
                          className={`p-2 rounded border transition-colors ${
                            room.exits[dir]
                              ? 'bg-cyber-cyan/10 border-cyber-cyan/50'
                              : 'bg-cyber-bg border-cyber-border'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={room.exits[dir]}
                                onChange={(e) =>
                                  onUpdateRoom((r) => ({
                                    ...r,
                                    exits: { ...r.exits, [dir]: e.target.checked },
                                  }))
                                }
                                className="rounded border-cyber-border bg-cyber-bg text-cyber-cyan focus:ring-0"
                              />
                              <span className="capitalize text-xs font-bold text-slate-200">
                                {dir} Exit
                              </span>
                            </label>
                            <span className="text-[10px] text-slate-500 font-mono">
                              Coord: ({info.targetCoords[0]}, {info.targetCoords[1]})
                            </span>
                          </div>

                          {info.room ? (
                            <div className="flex items-center justify-between pt-1 border-t border-cyber-border/40 text-xs">
                              <div className="flex items-center space-x-1.5 truncate mr-2">
                                <div
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: info.room.themeColor || '#00e5ff' }}
                                />
                                <span className="text-slate-300 text-[11px] truncate font-medium">
                                  {info.room.title}
                                </span>
                                {info.isTwoWay ? (
                                  <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/20 shrink-0">
                                    ⇄ 2-Way
                                  </span>
                                ) : info.isConnected ? (
                                  <span className="text-[9px] text-amber-400 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/20 shrink-0">
                                    → 1-Way
                                  </span>
                                ) : null}
                              </div>

                              <button
                                type="button"
                                onClick={() => onSelectRoom?.(info.room!.id)}
                                className="flex items-center space-x-1 px-2 py-0.5 rounded bg-cyber-card hover:bg-cyber-cyan/20 border border-cyber-border hover:border-cyber-cyan text-cyber-cyan hover:text-white text-[10px] font-semibold transition-colors shrink-0"
                                title={`Jump to Sector (${info.room.coords[0]}, ${info.room.coords[1]}): ${info.room.title}`}
                              >
                                <span>Jump</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="pt-1 border-t border-cyber-border/30 text-[10px] text-slate-500 flex items-center justify-between">
                              <span>
                                {info.isExitOpen
                                  ? '⚠️ Exit leads to void (no sector)'
                                  : 'No sector at coordinate'}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            <div className="h-px bg-cyber-border" />

            {/* Player Spawn Point */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Player Spawn Point
                </label>
                <button
                  onClick={() => onSelectEntity({ type: 'spawn' })}
                  className="text-[10px] text-cyber-cyan hover:underline"
                >
                  Select on Grid
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <div className="flex-1">
                  <span className="text-slate-500 text-[10px]">Pixel X</span>
                  <input
                    type="number"
                    value={room.spawnPoint ? room.spawnPoint[0] : 120}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      onUpdateRoom((r) => ({
                        ...r,
                        spawnPoint: [val, r.spawnPoint ? r.spawnPoint[1] : 680],
                      }));
                    }}
                    className="w-full bg-cyber-bg border border-cyber-border rounded px-2 py-1 text-white font-mono text-xs"
                  />
                </div>

                <div className="flex-1">
                  <span className="text-slate-500 text-[10px]">Pixel Y</span>
                  <input
                    type="number"
                    value={room.spawnPoint ? room.spawnPoint[1] : 680}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      onUpdateRoom((r) => ({
                        ...r,
                        spawnPoint: [r.spawnPoint ? r.spawnPoint[0] : 120, val],
                      }));
                    }}
                    className="w-full bg-cyber-bg border border-cyber-border rounded px-2 py-1 text-white font-mono text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <button
                  onClick={() => onUpdateRoom((r) => ({ ...r, spawnPoint: [120, 680] }))}
                  className="flex-1 py-1 bg-cyber-card hover:bg-cyber-hover border border-cyber-border rounded text-[10px] text-slate-300"
                >
                  Floor Preset (120, 680)
                </button>
                <button
                  onClick={() => onUpdateRoom((r) => ({ ...r, spawnPoint: [400, 400] }))}
                  className="flex-1 py-1 bg-cyber-card hover:bg-cyber-hover border border-cyber-border rounded text-[10px] text-slate-300"
                >
                  Center (400, 400)
                </button>
              </div>
            </div>

            {/* Bounce Pad Config Inspector (if selected) */}
            {selectedEntity?.type === 'bouncePad' && activeBouncePadKey && (
              <div className="p-3 bg-cyber-card rounded-lg border border-cyber-cyan/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyber-cyan">
                    Bounce Pad [{activeBouncePadKey}]
                  </span>
                  <button
                    onClick={() => onSelectEntity(null)}
                    className="text-[10px] text-slate-400 hover:text-white"
                  >
                    Done
                  </button>
                </div>

                <div>
                  <span className="text-slate-400 text-[10px]">Launch Vertical Velocity (vy)</span>
                  <input
                    type="number"
                    value={activeBouncePadConfig?.vy ?? -1400}
                    onChange={(e) => {
                      const vy = parseFloat(e.target.value) || -1400;
                      onUpdateRoom((r) => ({
                        ...r,
                        bounceProps: {
                          ...(r.bounceProps || {}),
                          [activeBouncePadKey]: { ...(r.bounceProps?.[activeBouncePadKey] || {}), vy },
                        },
                      }));
                    }}
                    className="w-full bg-cyber-bg border border-cyber-border rounded px-2 py-1 text-white font-mono text-xs"
                  />
                  <span className="text-[9px] text-slate-500">Default: -1400, Super: -1800, Mega: -2200</span>
                </div>

                <div>
                  <span className="text-slate-400 text-[10px]">Launch Horizontal Velocity (vx)</span>
                  <input
                    type="number"
                    value={activeBouncePadConfig?.vx ?? 0}
                    onChange={(e) => {
                      const vx = parseFloat(e.target.value) || 0;
                      onUpdateRoom((r) => ({
                        ...r,
                        bounceProps: {
                          ...(r.bounceProps || {}),
                          [activeBouncePadKey]: { ...(r.bounceProps?.[activeBouncePadKey] || {}), vx },
                        },
                      }));
                    }}
                    className="w-full bg-cyber-bg border border-cyber-border rounded px-2 py-1 text-white font-mono text-xs"
                  />
                </div>

                {/* Velocity Presets */}
                <div className="pt-1 space-y-1">
                  <span className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">Presets</span>
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateRoom((r) => ({
                          ...r,
                          bounceProps: {
                            ...(r.bounceProps || {}),
                            [activeBouncePadKey]: { ...(r.bounceProps?.[activeBouncePadKey] || {}), vy: -1400, vx: 0 },
                          },
                        }))
                      }
                      className="px-1.5 py-0.5 bg-cyber-bg hover:bg-cyber-hover border border-cyber-border rounded text-[9px] text-slate-300"
                    >
                      Default (-1400)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateRoom((r) => ({
                          ...r,
                          bounceProps: {
                            ...(r.bounceProps || {}),
                            [activeBouncePadKey]: { ...(r.bounceProps?.[activeBouncePadKey] || {}), vy: -1800, vx: 0 },
                          },
                        }))
                      }
                      className="px-1.5 py-0.5 bg-cyber-bg hover:bg-cyber-hover border border-cyber-cyan/40 rounded text-[9px] text-cyber-cyan"
                    >
                      Super (-1800)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateRoom((r) => ({
                          ...r,
                          bounceProps: {
                            ...(r.bounceProps || {}),
                            [activeBouncePadKey]: { ...(r.bounceProps?.[activeBouncePadKey] || {}), vy: -2200, vx: 0 },
                          },
                        }))
                      }
                      className="px-1.5 py-0.5 bg-cyber-bg hover:bg-cyber-hover border border-purple-500/40 rounded text-[9px] text-cyber-neonPurple"
                    >
                      Mega (-2200)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateRoom((r) => ({
                          ...r,
                          bounceProps: {
                            ...(r.bounceProps || {}),
                            [activeBouncePadKey]: { ...(r.bounceProps?.[activeBouncePadKey] || {}), vy: -1400, vx: 400 },
                          },
                        }))
                      }
                      className="px-1.5 py-0.5 bg-cyber-bg hover:bg-cyber-hover border border-amber-500/40 rounded text-[9px] text-amber-300"
                    >
                      Vault Right (+400)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateRoom((r) => ({
                          ...r,
                          bounceProps: {
                            ...(r.bounceProps || {}),
                            [activeBouncePadKey]: { ...(r.bounceProps?.[activeBouncePadKey] || {}), vy: -1400, vx: -400 },
                          },
                        }))
                      }
                      className="px-1.5 py-0.5 bg-cyber-bg hover:bg-cyber-hover border border-amber-500/40 rounded text-[9px] text-amber-300"
                    >
                      Vault Left (-400)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: DYNAMIC ENTITIES */}
        {/* ========================================================================= */}
        {activeTab === 'entities' && (
          <div className="space-y-4">
            {/* Add Entity Toolbar */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Add Dynamic Hazard / Entity
              </label>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => handleAddCollectible('core')}
                  className="flex items-center space-x-1.5 p-2 bg-cyber-card hover:bg-cyber-hover border border-cyber-border rounded text-left"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyber-cyan" />
                  <span>+ Core</span>
                </button>
                <button
                  onClick={() => handleAddCollectible('prism')}
                  className="flex items-center space-x-1.5 p-2 bg-cyber-card hover:bg-cyber-hover border border-cyber-border rounded text-left"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyber-neonPurple" />
                  <span>+ Prism</span>
                </button>
                <button
                  onClick={handleAddMovingPlatform}
                  className="flex items-center space-x-1.5 p-2 bg-cyber-card hover:bg-cyber-hover border border-cyber-border rounded text-left"
                >
                  <Sliders className="w-3.5 h-3.5 text-cyber-neonBlue" />
                  <span>+ Platform</span>
                </button>
                <button
                  onClick={handleAddLaserBarrier}
                  className="flex items-center space-x-1.5 p-2 bg-cyber-card hover:bg-cyber-hover border border-cyber-border rounded text-left"
                >
                  <Zap className="w-3.5 h-3.5 text-cyber-neonPink" />
                  <span>+ Laser Barrier</span>
                </button>
                <button
                  onClick={handleAddLaserTurret}
                  className="flex items-center space-x-1.5 p-2 bg-cyber-card hover:bg-cyber-hover border border-cyber-border rounded text-left col-span-2"
                >
                  <Radio className="w-3.5 h-3.5 text-cyber-neonGreen" />
                  <span>+ Laser Turret</span>
                </button>
              </div>
            </div>

            <div className="h-px bg-cyber-border" />

            {/* Active Entity Inspector */}
            {activeCollectible && (
              <div className="p-3 bg-cyber-card rounded-lg border border-cyber-cyan space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyber-cyan">Collectible ({activeCollectible.type})</span>
                  <button
                    onClick={() => {
                      onUpdateRoom((r) => ({
                        ...r,
                        collectibles: r.collectibles?.filter((c) => c.id !== activeCollectible.id),
                      }));
                      onSelectEntity(null);
                    }}
                    className="text-red-400 hover:text-red-300"
                    title="Delete Collectible"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div>
                  <span className="text-slate-500 text-[10px]">Collectible ID</span>
                  <input
                    type="text"
                    value={activeCollectible.id}
                    onChange={(e) => {
                      const newId = e.target.value.trim();
                      if (!newId) return;
                      onUpdateRoom((r) => ({
                        ...r,
                        collectibles: r.collectibles?.map((c) =>
                          c.id === activeCollectible.id ? { ...c, id: newId } : c
                        ),
                      }));
                      onSelectEntity({ type: 'collectible', id: newId });
                    }}
                    className="w-full bg-cyber-bg border border-cyber-border rounded px-2 py-1 text-white font-mono text-xs focus:border-cyber-cyan focus:outline-none"
                  />
                </div>

                <div>
                  <span className="text-slate-500 text-[10px]">Type</span>
                  <select
                    value={activeCollectible.type}
                    onChange={(e) => {
                      const t = e.target.value as 'core' | 'prism' | 'key';
                      onUpdateRoom((r) => ({
                        ...r,
                        collectibles: r.collectibles?.map((c) =>
                          c.id === activeCollectible.id ? { ...c, type: t } : c
                        ),
                      }));
                    }}
                    className="w-full bg-cyber-bg border border-cyber-border rounded px-2 py-1 text-white text-xs"
                  >
                    <option value="core">Data Core</option>
                    <option value="prism">Hyper Prism</option>
                    <option value="key">Gate Key</option>
                  </select>
                </div>

                <div className="flex space-x-2">
                  <div className="flex-1">
                    <span className="text-slate-500 text-[10px]">X</span>
                    <input
                      type="number"
                      value={activeCollectible.x}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        onUpdateRoom((r) => ({
                          ...r,
                          collectibles: r.collectibles?.map((c) =>
                            c.id === activeCollectible.id ? { ...c, x: val } : c
                          ),
                        }));
                      }}
                      className="w-full bg-cyber-bg border border-cyber-border rounded px-2 py-1 text-white font-mono text-xs"
                    />
                  </div>
                  <div className="flex-1">
                    <span className="text-slate-500 text-[10px]">Y</span>
                    <input
                      type="number"
                      value={activeCollectible.y}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        onUpdateRoom((r) => ({
                          ...r,
                          collectibles: r.collectibles?.map((c) =>
                            c.id === activeCollectible.id ? { ...c, y: val } : c
                          ),
                        }));
                      }}
                      className="w-full bg-cyber-bg border border-cyber-border rounded px-2 py-1 text-white font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Active Moving Platform */}
            {activePlatform && (
              <div className="p-3 bg-cyber-card rounded-lg border border-cyber-cyan space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyber-cyan truncate w-40">Platform: {activePlatform.id}</span>
                  <button
                    onClick={() => {
                      onUpdateRoom((r) => ({
                        ...r,
                        movingPlatforms: r.movingPlatforms?.filter((p) => p.id !== activePlatform.id),
                      }));
                      onSelectEntity(null);
                    }}
                    className="text-red-400 hover:text-red-300"
                    title="Delete Platform"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div>
                  <span className="text-slate-500 text-[10px]">Platform ID</span>
                  <input
                    type="text"
                    value={activePlatform.id}
                    onChange={(e) => {
                      const newId = e.target.value.trim();
                      if (!newId) return;
                      onUpdateRoom((r) => ({
                        ...r,
                        movingPlatforms: r.movingPlatforms?.map((p) =>
                          p.id === activePlatform.id ? { ...p, id: newId } : p
                        ),
                      }));
                      onSelectEntity({ type: 'movingPlatform', id: newId });
                    }}
                    className="w-full bg-cyber-bg border border-cyber-border rounded px-2 py-1 text-white font-mono text-xs focus:border-cyber-cyan focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 text-[10px]">Start X, Y</span>
                    <div className="flex space-x-1">
                      <input
                        type="number"
                        value={activePlatform.startX}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          onUpdateRoom((r) => ({
                            ...r,
                            movingPlatforms: r.movingPlatforms?.map((p) =>
                              p.id === activePlatform.id ? { ...p, startX: val } : p
                            ),
                          }));
                        }}
                        className="w-full bg-cyber-bg border border-cyber-border rounded px-1.5 py-1 text-white font-mono text-xs"
                      />
                      <input
                        type="number"
                        value={activePlatform.startY}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          onUpdateRoom((r) => ({
                            ...r,
                            movingPlatforms: r.movingPlatforms?.map((p) =>
                              p.id === activePlatform.id ? { ...p, startY: val } : p
                            ),
                          }));
                        }}
                        className="w-full bg-cyber-bg border border-cyber-border rounded px-1.5 py-1 text-white font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px]">End X, Y</span>
                    <div className="flex space-x-1">
                      <input
                        type="number"
                        value={activePlatform.endX}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          onUpdateRoom((r) => ({
                            ...r,
                            movingPlatforms: r.movingPlatforms?.map((p) =>
                              p.id === activePlatform.id ? { ...p, endX: val } : p
                            ),
                          }));
                        }}
                        className="w-full bg-cyber-bg border border-cyber-border rounded px-1.5 py-1 text-white font-mono text-xs"
                      />
                      <input
                        type="number"
                        value={activePlatform.endY}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          onUpdateRoom((r) => ({
                            ...r,
                            movingPlatforms: r.movingPlatforms?.map((p) =>
                              p.id === activePlatform.id ? { ...p, endY: val } : p
                            ),
                          }));
                        }}
                        className="w-full bg-cyber-bg border border-cyber-border rounded px-1.5 py-1 text-white font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 text-[10px]">Width (px)</span>
                    <input
                      type="number"
                      value={activePlatform.width}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 80;
                        onUpdateRoom((r) => ({
                          ...r,
                          movingPlatforms: r.movingPlatforms?.map((p) =>
                            p.id === activePlatform.id ? { ...p, width: val } : p
                          ),
                        }));
                      }}
                      className="w-full bg-cyber-bg border border-cyber-border rounded px-2 py-1 text-white font-mono text-xs"
                    />
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px]">Height (px)</span>
                    <input
                      type="number"
                      value={activePlatform.height ?? 16}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 16;
                        onUpdateRoom((r) => ({
                          ...r,
                          movingPlatforms: r.movingPlatforms?.map((p) =>
                            p.id === activePlatform.id ? { ...p, height: val } : p
                          ),
                        }));
                      }}
                      className="w-full bg-cyber-bg border border-cyber-border rounded px-2 py-1 text-white font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 text-[10px]">Speed (px/s)</span>
                    <input
                      type="number"
                      value={activePlatform.speed}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 100;
                        onUpdateRoom((r) => ({
                          ...r,
                          movingPlatforms: r.movingPlatforms?.map((p) =>
                            p.id === activePlatform.id ? { ...p, speed: val } : p
                          ),
                        }));
                      }}
                      className="w-full bg-cyber-bg border border-cyber-border rounded px-2 py-1 text-white font-mono text-xs"
                    />
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px]">Pause Time (s)</span>
                    <input
                      type="number"
                      step="0.1"
                      value={activePlatform.pauseTime ?? 0.4}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        onUpdateRoom((r) => ({
                          ...r,
                          movingPlatforms: r.movingPlatforms?.map((p) =>
                            p.id === activePlatform.id ? { ...p, pauseTime: val } : p
                          ),
                        }));
                      }}
                      className="w-full bg-cyber-bg border border-cyber-border rounded px-2 py-1 text-white font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 text-[10px]">Initial Progress (0-1)</span>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="1"
                      value={activePlatform.initialProgress ?? 0}
                      onChange={(e) => {
                        const val = Math.max(0, Math.min(1, parseFloat(e.target.value) || 0));
                        onUpdateRoom((r) => ({
                          ...r,
                          movingPlatforms: r.movingPlatforms?.map((p) =>
                            p.id === activePlatform.id ? { ...p, initialProgress: val } : p
                          ),
                        }));
                      }}
                      className="w-full bg-cyber-bg border border-cyber-border rounded px-2 py-1 text-white font-mono text-xs"
                    />
                  </div>
                  <div className="flex items-center pt-3">
                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activePlatform.oneWay ?? true}
                        onChange={(e) => {
                          const val = e.target.checked;
                          onUpdateRoom((r) => ({
                            ...r,
                            movingPlatforms: r.movingPlatforms?.map((p) =>
                              p.id === activePlatform.id ? { ...p, oneWay: val } : p
                            ),
                          }));
                        }}
                      />
                      <span className="text-[10px] text-slate-300">Jump-Through (One-Way)</span>
                    </label>
                  </div>
                </div>

                {/* Platform Custom Color Override */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-[10px]">Neon Color Override</span>
                    {activePlatform.themeColor &&
                      activePlatform.themeColor.toLowerCase() !== room.themeColor.toLowerCase() && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateRoom((r) => ({
                            ...r,
                            movingPlatforms: r.movingPlatforms?.map((p) =>
                              p.id === activePlatform.id ? { ...p, themeColor: undefined } : p
                            ),
                          }))
                        }
                        className="text-[9px] text-cyber-cyan hover:underline"
                      >
                        Reset to Sector
                      </button>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={activePlatform.themeColor || room.themeColor}
                      onChange={(e) => {
                        const color = e.target.value;
                        onUpdateRoom((r) => ({
                          ...r,
                          movingPlatforms: r.movingPlatforms?.map((p) =>
                            p.id === activePlatform.id
                              ? {
                                  ...p,
                                  themeColor:
                                    color.toLowerCase() === room.themeColor.toLowerCase() ? undefined : color,
                                }
                              : p
                          ),
                        }));
                      }}
                      className="w-6 h-6 rounded border border-cyber-border bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={activePlatform.themeColor || ''}
                      placeholder={`${room.themeColor} (Sector Default)`}
                      onChange={(e) => {
                        const color = e.target.value.trim();
                        onUpdateRoom((r) => ({
                          ...r,
                          movingPlatforms: r.movingPlatforms?.map((p) =>
                            p.id === activePlatform.id
                              ? {
                                  ...p,
                                  themeColor:
                                    !color || color.toLowerCase() === room.themeColor.toLowerCase()
                                      ? undefined
                                      : color,
                                }
                              : p
                          ),
                        }));
                      }}
                      className="flex-1 bg-cyber-bg border border-cyber-border rounded px-2 py-1 text-white font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Active Laser Barrier */}
            {activeBarrier && (
              <div className="p-3 bg-cyber-card rounded-lg border border-cyber-cyan space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyber-cyan truncate w-40">Barrier: {activeBarrier.id}</span>
                  <button
                    onClick={() => {
                      onUpdateRoom((r) => ({
                        ...r,
                        laserBarriers: r.laserBarriers?.filter((b) => b.id !== activeBarrier.id),
                      }));
                      onSelectEntity(null);
                    }}
                    className="text-red-400 hover:text-red-300"
                    title="Delete Barrier"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div>
                  <span className="text-slate-500 text-[10px]">Barrier ID</span>
                  <input
                    type="text"
                    value={activeBarrier.id}
                    onChange={(e) => {
                      const newId = e.target.value.trim();
                      if (!newId) return;
                      onUpdateRoom((r) => ({
                        ...r,
                        laserBarriers: r.laserBarriers?.map((b) =>
                          b.id === activeBarrier.id ? { ...b, id: newId } : b
                        ),
                      }));
                      onSelectEntity({ type: 'laserBarrier', id: newId });
                    }}
                    className="w-full bg-cyber-bg border border-cyber-border rounded px-2 py-1 text-white font-mono text-xs focus:border-cyber-cyan focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 text-[10px]">Pylon 1 (X, Y)</span>
                    <div className="flex space-x-1">
                      <input
                        type="number"
                        value={activeBarrier.startX1}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          onUpdateRoom((r) => ({
                            ...r,
                            laserBarriers: r.laserBarriers?.map((b) =>
                              b.id === activeBarrier.id ? { ...b, startX1: val } : b
                            ),
                          }));
                        }}
                        className="w-full bg-cyber-bg border border-cyber-border rounded px-1.5 py-1 text-white font-mono text-xs"
                      />
                      <input
                        type="number"
                        value={activeBarrier.startY1}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          onUpdateRoom((r) => ({
                            ...r,
                            laserBarriers: r.laserBarriers?.map((b) =>
                              b.id === activeBarrier.id ? { ...b, startY1: val } : b
                            ),
                          }));
                        }}
                        className="w-full bg-cyber-bg border border-cyber-border rounded px-1.5 py-1 text-white font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px]">Pylon 2 (X, Y)</span>
                    <div className="flex space-x-1">
                      <input
                        type="number"
                        value={activeBarrier.startX2}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          onUpdateRoom((r) => ({
                            ...r,
                            laserBarriers: r.laserBarriers?.map((b) =>
                              b.id === activeBarrier.id ? { ...b, startX2: val } : b
                            ),
                          }));
                        }}
                        className="w-full bg-cyber-bg border border-cyber-border rounded px-1.5 py-1 text-white font-mono text-xs"
                      />
                      <input
                        type="number"
                        value={activeBarrier.startY2}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          onUpdateRoom((r) => ({
                            ...r,
                            laserBarriers: r.laserBarriers?.map((b) =>
                              b.id === activeBarrier.id ? { ...b, startY2: val } : b
                            ),
                          }));
                        }}
                        className="w-full bg-cyber-bg border border-cyber-border rounded px-1.5 py-1 text-white font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Moving Barrier Harmonic Endpoints */}
                <div className="border border-cyber-border/70 rounded p-2 bg-cyber-bg/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-300">Pylon Movement (Harmonic)</span>
                    <label className="flex items-center space-x-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeBarrier.endX1 !== undefined}
                        onChange={(e) => {
                          const enable = e.target.checked;
                          onUpdateRoom((r) => ({
                            ...r,
                            laserBarriers: r.laserBarriers?.map((b) =>
                              b.id === activeBarrier.id
                                ? enable
                                  ? {
                                      ...b,
                                      endX1: b.startX1,
                                      endY1: b.startY1 + 100,
                                      endX2: b.startX2,
                                      endY2: b.startY2 + 100,
                                      speed: b.speed || 80,
                                      pauseTime: b.pauseTime ?? 0.4,
                                      initialProgress: b.initialProgress ?? 0,
                                    }
                                  : {
                                      ...b,
                                      endX1: undefined,
                                      endY1: undefined,
                                      endX2: undefined,
                                      endY2: undefined,
                                      speed: undefined,
                                      pauseTime: undefined,
                                      initialProgress: undefined,
                                    }
                                : b
                            ),
                          }));
                        }}
                      />
                      <span className="text-[10px] text-cyber-cyan">Enabled</span>
                    </label>
                  </div>

                  {activeBarrier.endX1 !== undefined && (
                    <div className="space-y-2 pt-1">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-slate-500 text-[10px]">End Pylon 1 (X, Y)</span>
                          <div className="flex space-x-1">
                            <input
                              type="number"
                              value={activeBarrier.endX1 ?? activeBarrier.startX1}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                onUpdateRoom((r) => ({
                                  ...r,
                                  laserBarriers: r.laserBarriers?.map((b) =>
                                    b.id === activeBarrier.id ? { ...b, endX1: val } : b
                                  ),
                                }));
                              }}
                              className="w-full bg-cyber-bg border border-cyber-border rounded px-1.5 py-1 text-white font-mono text-xs"
                            />
                            <input
                              type="number"
                              value={activeBarrier.endY1 ?? activeBarrier.startY1}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                onUpdateRoom((r) => ({
                                  ...r,
                                  laserBarriers: r.laserBarriers?.map((b) =>
                                    b.id === activeBarrier.id ? { ...b, endY1: val } : b
                                  ),
                                }));
                              }}
                              className="w-full bg-cyber-bg border border-cyber-border rounded px-1.5 py-1 text-white font-mono text-xs"
                            />
                          </div>
                        </div>

                        <div>
                          <span className="text-slate-500 text-[10px]">End Pylon 2 (X, Y)</span>
                          <div className="flex space-x-1">
                            <input
                              type="number"
                              value={activeBarrier.endX2 ?? activeBarrier.startX2}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                onUpdateRoom((r) => ({
                                  ...r,
                                  laserBarriers: r.laserBarriers?.map((b) =>
                                    b.id === activeBarrier.id ? { ...b, endX2: val } : b
                                  ),
                                }));
                              }}
                              className="w-full bg-cyber-bg border border-cyber-border rounded px-1.5 py-1 text-white font-mono text-xs"
                            />
                            <input
                              type="number"
                              value={activeBarrier.endY2 ?? activeBarrier.startY2}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                onUpdateRoom((r) => ({
                                  ...r,
                                  laserBarriers: r.laserBarriers?.map((b) =>
                                    b.id === activeBarrier.id ? { ...b, endY2: val } : b
                                  ),
                                }));
                              }}
                              className="w-full bg-cyber-bg border border-cyber-border rounded px-1.5 py-1 text-white font-mono text-xs"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5">
                        <div>
                          <span className="text-slate-500 text-[10px]">Speed (px/s)</span>
                          <input
                            type="number"
                            value={activeBarrier.speed ?? 80}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 80;
                              onUpdateRoom((r) => ({
                                ...r,
                                laserBarriers: r.laserBarriers?.map((b) =>
                                  b.id === activeBarrier.id ? { ...b, speed: val } : b
                                ),
                              }));
                            }}
                            className="w-full bg-cyber-bg border border-cyber-border rounded px-1.5 py-1 text-white font-mono text-xs"
                          />
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px]">Pause (s)</span>
                          <input
                            type="number"
                            step="0.1"
                            value={activeBarrier.pauseTime ?? 0.4}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              onUpdateRoom((r) => ({
                                ...r,
                                laserBarriers: r.laserBarriers?.map((b) =>
                                  b.id === activeBarrier.id ? { ...b, pauseTime: val } : b
                                ),
                              }));
                            }}
                            className="w-full bg-cyber-bg border border-cyber-border rounded px-1.5 py-1 text-white font-mono text-xs"
                          />
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px]">Phase (0-1)</span>
                          <input
                            type="number"
                            step="0.05"
                            min="0"
                            max="1"
                            value={activeBarrier.initialProgress ?? 0}
                            onChange={(e) => {
                              const val = Math.max(0, Math.min(1, parseFloat(e.target.value) || 0));
                              onUpdateRoom((r) => ({
                                ...r,
                                laserBarriers: r.laserBarriers?.map((b) =>
                                  b.id === activeBarrier.id ? { ...b, initialProgress: val } : b
                                ),
                              }));
                            }}
                            className="w-full bg-cyber-bg border border-cyber-border rounded px-1.5 py-1 text-white font-mono text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Always Active Toggle */}
                <div className="flex items-center justify-between border-t border-cyber-border/40 pt-2">
                  <div>
                    <span className="text-xs font-semibold text-slate-300 block">Always Active</span>
                    <span className="text-[10px] text-slate-500">Continuous beam with no pause or off-cycle</span>
                  </div>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(
                        activeBarrier.alwaysActive ||
                        (activeBarrier.inactiveDuration !== undefined && activeBarrier.inactiveDuration <= 0)
                      )}
                      onChange={(e) => {
                        const isAlways = e.target.checked;
                        onUpdateRoom((r) => ({
                          ...r,
                          laserBarriers: r.laserBarriers?.map((b) =>
                            b.id === activeBarrier.id
                              ? {
                                  ...b,
                                  alwaysActive: isAlways,
                                  inactiveDuration: isAlways ? 0 : (b.inactiveDuration && b.inactiveDuration > 0 ? b.inactiveDuration : 2.0),
                                  activeDuration: b.activeDuration && b.activeDuration > 0 ? b.activeDuration : 2.0,
                                }
                              : b
                          ),
                        }));
                      }}
                      className="rounded border-cyber-border bg-cyber-bg text-cyber-cyan focus:ring-0"
                    />
                    <span className="text-[10px] text-cyber-cyan font-mono">
                      {activeBarrier.alwaysActive || (activeBarrier.inactiveDuration !== undefined && activeBarrier.inactiveDuration <= 0)
                        ? 'Constant'
                        : 'Pulsing'}
                    </span>
                  </label>
                </div>

                {activeBarrier.alwaysActive || (activeBarrier.inactiveDuration !== undefined && activeBarrier.inactiveDuration <= 0) ? (
                  <div className="p-2 bg-cyber-cyan/5 border border-cyber-cyan/20 rounded text-[11px] text-slate-400">
                    <span className="text-cyber-cyan font-medium">Constant Lethal Beam:</span> Barrier remains active and lethal at all times with no warning or inactive pauses.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-500 text-[10px]">Active Time (s)</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          value={activeBarrier.activeDuration ?? 2.0}
                          onChange={(e) => {
                            const raw = parseFloat(e.target.value);
                            const val = isNaN(raw) ? 1 : Math.max(0.1, raw);
                            onUpdateRoom((r) => ({
                              ...r,
                              laserBarriers: r.laserBarriers?.map((b) =>
                                b.id === activeBarrier.id ? { ...b, activeDuration: val } : b
                              ),
                            }));
                          }}
                          className="w-full bg-cyber-bg border border-cyber-border rounded px-2 py-1 text-white font-mono text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px]">Inactive Time (s)</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={activeBarrier.inactiveDuration ?? 2.0}
                          onChange={(e) => {
                            const raw = parseFloat(e.target.value);
                            const val = isNaN(raw) ? 0 : Math.max(0, raw);
                            onUpdateRoom((r) => ({
                              ...r,
                              laserBarriers: r.laserBarriers?.map((b) =>
                                b.id === activeBarrier.id
                                  ? {
                                      ...b,
                                      inactiveDuration: val,
                                      alwaysActive: val <= 0,
                                    }
                                  : b
                              ),
                            }));
                          }}
                          className="w-full bg-cyber-bg border border-cyber-border rounded px-2 py-1 text-white font-mono text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-500 text-[10px]">Warning Duration (s)</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={activeBarrier.warningDuration ?? 0.6}
                          onChange={(e) => {
                            const raw = parseFloat(e.target.value);
                            const val = isNaN(raw) ? 0 : Math.max(0, raw);
                            onUpdateRoom((r) => ({
                              ...r,
                              laserBarriers: r.laserBarriers?.map((b) =>
                                b.id === activeBarrier.id ? { ...b, warningDuration: val } : b
                              ),
                            }));
                          }}
                          className="w-full bg-cyber-bg border border-cyber-border rounded px-2 py-1 text-white font-mono text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px]">Timing Phase (0-1)</span>
                        <input
                          type="number"
                          step="0.05"
                          min="0"
                          max="1"
                          value={activeBarrier.initialPhase ?? 0}
                          onChange={(e) => {
                            const raw = parseFloat(e.target.value);
                            const val = isNaN(raw) ? 0 : Math.max(0, Math.min(1, raw));
                            onUpdateRoom((r) => ({
                              ...r,
                              laserBarriers: r.laserBarriers?.map((b) =>
                                b.id === activeBarrier.id ? { ...b, initialPhase: val } : b
                              ),
                            }));
                          }}
                          className="w-full bg-cyber-bg border border-cyber-border rounded px-2 py-1 text-white font-mono text-xs"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <span className="text-slate-500 text-[10px]">Beam Width (px)</span>
                  <input
                    type="number"
                    value={activeBarrier.width ?? 4}
                    min="1"
                    max="20"
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 4;
                      onUpdateRoom((r) => ({
                        ...r,
                        laserBarriers: r.laserBarriers?.map((b) =>
                          b.id === activeBarrier.id ? { ...b, width: val } : b
                        ),
                      }));
                    }}
                    className="w-full bg-cyber-bg border border-cyber-border rounded px-2 py-1 text-white font-mono text-xs"
                  />
                </div>

                {/* Laser Barrier Neon Color Override */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-[10px]">Beam Color Override</span>
                    {activeBarrier.themeColor &&
                      activeBarrier.themeColor.toLowerCase() !== '#ff0055' && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateRoom((r) => ({
                            ...r,
                            laserBarriers: r.laserBarriers?.map((b) =>
                              b.id === activeBarrier.id ? { ...b, themeColor: undefined } : b
                            ),
                          }))
                        }
                        className="text-[9px] text-cyber-cyan hover:underline"
                      >
                        Reset to Default (#ff0055)
                      </button>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={activeBarrier.themeColor || '#ff0055'}
                      onChange={(e) => {
                        const color = e.target.value;
                        onUpdateRoom((r) => ({
                          ...r,
                          laserBarriers: r.laserBarriers?.map((b) =>
                            b.id === activeBarrier.id
                              ? {
                                  ...b,
                                  themeColor: color.toLowerCase() === '#ff0055' ? undefined : color,
                                }
                              : b
                          ),
                        }));
                      }}
                      className="w-6 h-6 rounded border border-cyber-border bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={activeBarrier.themeColor || ''}
                      placeholder="#ff0055 (Hazard Red Default)"
                      onChange={(e) => {
                        const color = e.target.value.trim();
                        onUpdateRoom((r) => ({
                          ...r,
                          laserBarriers: r.laserBarriers?.map((b) =>
                            b.id === activeBarrier.id
                              ? {
                                  ...b,
                                  themeColor:
                                    !color || color.toLowerCase() === '#ff0055' ? undefined : color,
                                }
                              : b
                          ),
                        }));
                      }}
                      className="flex-1 bg-cyber-bg border border-cyber-border rounded px-2 py-1 text-white font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Active Laser Turret */}
            {activeTurret && (
              <div className="p-3 bg-cyber-card rounded-lg border border-cyber-cyan space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyber-cyan truncate w-40">Turret: {activeTurret.id}</span>
                  <button
                    onClick={() => {
                      onUpdateRoom((r) => ({
                        ...r,
                        laserTurrets: r.laserTurrets?.filter((t) => t.id !== activeTurret.id),
                      }));
                      onSelectEntity(null);
                    }}
                    className="text-red-400 hover:text-red-300"
                    title="Delete Turret"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div>
                  <span className="text-slate-500 text-[10px]">Turret ID</span>
                  <input
                    type="text"
                    value={activeTurret.id}
                    onChange={(e) => {
                      const newId = e.target.value.trim();
                      if (!newId) return;
                      onUpdateRoom((r) => ({
                        ...r,
                        laserTurrets: r.laserTurrets?.map((t) =>
                          t.id === activeTurret.id ? { ...t, id: newId } : t
                        ),
                      }));
                      onSelectEntity({ type: 'laserTurret', id: newId });
                    }}
                    className="w-full bg-cyber-bg border border-cyber-border rounded px-2 py-1 text-white font-mono text-xs focus:border-cyber-cyan focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 text-[10px]">Position X, Y</span>
                    <div className="flex space-x-1">
                      <input
                        type="number"
                        value={activeTurret.x}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          onUpdateRoom((r) => ({
                            ...r,
                            laserTurrets: r.laserTurrets?.map((t) =>
                              t.id === activeTurret.id ? { ...t, x: val } : t
                            ),
                          }));
                        }}
                        className="w-full bg-cyber-bg border border-cyber-border rounded px-1.5 py-1 text-white font-mono text-xs"
                      />
                      <input
                        type="number"
                        value={activeTurret.y}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          onUpdateRoom((r) => ({
                            ...r,
                            laserTurrets: r.laserTurrets?.map((t) =>
                              t.id === activeTurret.id ? { ...t, y: val } : t
                            ),
                          }));
                        }}
                        className="w-full bg-cyber-bg border border-cyber-border rounded px-1.5 py-1 text-white font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px]">Mode</span>
                    <select
                      value={activeTurret.mode || 'projectile'}
                      onChange={(e) => {
                        const m = e.target.value as 'projectile' | 'beam';
                        onUpdateRoom((r) => ({
                          ...r,
                          laserTurrets: r.laserTurrets?.map((t) => {
                            if (t.id !== activeTurret.id) return t;
                            if (m === 'beam') {
                              // Strip projectile-specific parameters when switching to beam mode
                              const { fireInterval, fireOffset, projectileSpeed, projectileLength, ...rest } = t;
                              return {
                                ...rest,
                                mode: 'beam',
                                activeDuration: t.activeDuration ?? 2.0,
                                inactiveDuration: t.inactiveDuration ?? 2.0,
                              };
                            } else {
                              // Strip beam-specific parameters when switching to projectile mode
                              const { activeDuration, inactiveDuration, warningDuration, initialPhase, ...rest } = t;
                              return {
                                ...rest,
                                mode: 'projectile',
                                fireInterval: t.fireInterval ?? 1.8,
                                projectileSpeed: t.projectileSpeed ?? 280,
                              };
                            }
                          }),
                        }));
                      }}
                      className="w-full bg-cyber-bg border border-cyber-border rounded px-2 py-1 text-white text-xs"
                    >
                      <option value="projectile">Pulse Projectile</option>
                      <option value="beam">Continuous Beam</option>
                    </select>
                  </div>
                </div>

                {/* Auto-Targeting Option */}
                <div className="space-y-2 border border-cyber-border/70 rounded p-2.5 bg-cyber-bg/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <Target className={`w-3.5 h-3.5 ${activeTurret.autoTarget ? 'text-cyber-neonGreen' : 'text-slate-400'}`} />
                      <div>
                        <span className="text-slate-300 text-xs font-bold block">Auto-Targeting</span>
                        <span className="text-slate-500 text-[9px] block">Dynamically track & aim at player</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateRoom((r) => ({
                          ...r,
                          laserTurrets: r.laserTurrets?.map((t) =>
                            t.id === activeTurret.id ? { ...t, autoTarget: !t.autoTarget } : t
                          ),
                        }));
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                        activeTurret.autoTarget
                          ? 'bg-cyber-neonGreen/20 border-cyber-neonGreen text-cyber-neonGreen'
                          : 'bg-cyber-bg border-cyber-border text-slate-400 hover:text-white'
                      }`}
                    >
                      {activeTurret.autoTarget ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>

                  {activeTurret.autoTarget && (
                    <div className="pt-1 border-t border-cyber-border/40">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-slate-500 text-[9px]">Target Range (px)</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-cyber-cyan font-mono text-[9px]">
                            {activeTurret.targetRange !== undefined ? `${activeTurret.targetRange}px` : 'Infinite (Full Sector)'}
                          </span>
                          {activeTurret.targetRange !== undefined && (
                            <button
                              type="button"
                              onClick={() => {
                                onUpdateRoom((r) => ({
                                  ...r,
                                  laserTurrets: r.laserTurrets?.map((t) =>
                                    t.id === activeTurret.id ? { ...t, targetRange: undefined } : t
                                  ),
                                }));
                              }}
                              className="text-[9px] text-cyber-cyan hover:underline"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min="1"
                          placeholder="Infinite (Full Sector)"
                          value={activeTurret.targetRange ?? ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                            onUpdateRoom((r) => ({
                              ...r,
                              laserTurrets: r.laserTurrets?.map((t) =>
                                t.id === activeTurret.id ? { ...t, targetRange: val } : t
                              ),
                            }));
                          }}
                          className="w-full bg-cyber-bg border border-cyber-border rounded px-2 py-1 text-white font-mono text-xs focus:border-cyber-cyan focus:outline-none pr-6"
                        />
                        {activeTurret.targetRange !== undefined && (
                          <button
                            type="button"
                            title="Reset targeting range to infinite"
                            onClick={() => {
                              onUpdateRoom((r) => ({
                                ...r,
                                laserTurrets: r.laserTurrets?.map((t) =>
                                  t.id === activeTurret.id ? { ...t, targetRange: undefined } : t
                                ),
                              }));
                            }}
                            className="absolute right-2 text-slate-400 hover:text-white text-xs px-1"
                          >
                            ×
                          </button>
                        )}
                      </div>
                      {activeTurret.targetRange !== undefined && (
                        <div className="text-right pt-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateRoom((r) => ({
                                ...r,
                                laserTurrets: r.laserTurrets?.map((t) =>
                                  t.id === activeTurret.id ? { ...t, targetRange: undefined } : t
                                ),
                              }));
                            }}
                            className="text-[9px] text-cyber-cyan hover:underline"
                          >
                            Reset to Infinite Range
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Direction and Custom Angle */}
                <div className="space-y-2 border border-cyber-border/70 rounded p-2.5 bg-cyber-bg/40">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[10px] font-bold">
                      {activeTurret.autoTarget ? 'Default / Idle Firing Angle' : 'Firing Angle & Direction'}
                    </span>
                    <span className="text-cyber-cyan font-mono text-[10px]">
                      {activeTurret.angle !== undefined
                        ? `${activeTurret.angle}°`
                        : `Cardinal (${activeTurret.direction || 'down'})`}
                    </span>
                  </div>

                  {/* Top row: Cardinal Dropdown + Exact Degree Input */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-500 text-[9px] block mb-0.5">Cardinal Preset</span>
                      <select
                        value={activeTurret.direction || 'down'}
                        onChange={(e) => {
                          const dir = e.target.value as 'left' | 'right' | 'up' | 'down';
                          onUpdateRoom((r) => ({
                            ...r,
                            laserTurrets: r.laserTurrets?.map((t) =>
                              t.id === activeTurret.id ? { ...t, direction: dir } : t
                            ),
                          }));
                        }}
                        className="w-full bg-cyber-bg border border-cyber-border rounded px-1.5 py-1 text-white text-xs"
                      >
                        <option value="down">Down (90°)</option>
                        <option value="up">Up (270°)</option>
                        <option value="left">Left (180°)</option>
                        <option value="right">Right (0°)</option>
                      </select>
                    </div>

                    <div>
                      <span className="text-slate-500 text-[9px] block mb-0.5">Exact Degrees (0–359)</span>
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min="0"
                          max="359"
                          value={activeTurret.angle ?? ''}
                          placeholder="Auto"
                          onChange={(e) => {
                            const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                            onUpdateRoom((r) => ({
                              ...r,
                              laserTurrets: r.laserTurrets?.map((t) =>
                                t.id === activeTurret.id ? { ...t, angle: val } : t
                              ),
                            }));
                          }}
                          className="w-full bg-cyber-bg border border-cyber-border rounded px-2 py-1 text-white font-mono text-xs focus:border-cyber-cyan focus:outline-none"
                        />
                        {activeTurret.angle !== undefined && (
                          <span className="absolute right-2 text-slate-400 text-[10px] pointer-events-none">°</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Second row: Angle Slider */}
                  <div className="pt-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-500 text-[9px] font-mono">0°</span>
                      <input
                        type="range"
                        min="0"
                        max="359"
                        step="1"
                        value={
                          activeTurret.angle ??
                          (activeTurret.direction === 'up'
                            ? 270
                            : activeTurret.direction === 'left'
                            ? 180
                            : activeTurret.direction === 'right'
                            ? 0
                            : 90)
                        }
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          onUpdateRoom((r) => ({
                            ...r,
                            laserTurrets: r.laserTurrets?.map((t) =>
                              t.id === activeTurret.id ? { ...t, angle: val } : t
                            ),
                          }));
                        }}
                        className="flex-1 accent-cyber-cyan cursor-pointer"
                      />
                      <span className="text-slate-500 text-[9px] font-mono">359°</span>
                    </div>
                  </div>

                  {/* Third row: Angle Presets */}
                  <div className="grid grid-cols-4 gap-1 pt-1">
                    {[
                      { label: '0° R', angle: 0, dir: 'right' },
                      { label: '45° ↘', angle: 45 },
                      { label: '90° D', angle: 90, dir: 'down' },
                      { label: '135° ↙', angle: 135 },
                      { label: '180° L', angle: 180, dir: 'left' },
                      { label: '225° ↖', angle: 225 },
                      { label: '270° U', angle: 270, dir: 'up' },
                      { label: '315° ↗', angle: 315 },
                    ].map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => {
                          onUpdateRoom((r) => ({
                            ...r,
                            laserTurrets: r.laserTurrets?.map((t) =>
                              t.id === activeTurret.id
                                ? {
                                    ...t,
                                    angle: p.angle,
                                    ...(p.dir ? { direction: p.dir as any } : {}),
                                  }
                                : t
                            ),
                          }));
                        }}
                        className={`px-1 py-1 rounded text-[9px] border transition-colors ${
                          activeTurret.angle === p.angle
                            ? 'bg-cyber-cyan/20 border-cyber-cyan text-cyber-cyan font-bold'
                            : 'bg-cyber-bg border-cyber-border text-slate-400 hover:text-white'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {activeTurret.angle !== undefined && (
                    <div className="text-right pt-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateRoom((r) => ({
                            ...r,
                            laserTurrets: r.laserTurrets?.map((t) =>
                              t.id === activeTurret.id ? { ...t, angle: undefined } : t
                            ),
                          }));
                        }}
                        className="text-[9px] text-cyber-cyan hover:underline"
                      >
                        Reset to Cardinal Direction
                      </button>
                    </div>
                  )}
                </div>

                {/* Mode-Specific Settings */}
                {activeTurret.mode === 'beam' ? (
                  // Beam Mode Settings
                  <div className="space-y-2 pt-1">
                    <span className="text-[10px] font-bold text-slate-300 block">Beam Mode Cycle</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-500 text-[10px]">Active Time (s)</span>
                        <input
                          type="number"
                          step="0.1"
                          value={activeTurret.activeDuration ?? 2.0}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 2.0;
                            onUpdateRoom((r) => ({
                              ...r,
                              laserTurrets: r.laserTurrets?.map((t) =>
                                t.id === activeTurret.id ? { ...t, activeDuration: val } : t
                              ),
                            }));
                          }}
                          className="w-full bg-cyber-bg border border-cyber-border rounded px-2 py-1 text-white font-mono text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px]">Inactive Time (s)</span>
                        <input
                          type="number"
                          step="0.1"
                          value={activeTurret.inactiveDuration ?? 2.0}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 2.0;
                            onUpdateRoom((r) => ({
                              ...r,
                              laserTurrets: r.laserTurrets?.map((t) =>
                                t.id === activeTurret.id ? { ...t, inactiveDuration: val } : t
                              ),
                            }));
                          }}
                          className="w-full bg-cyber-bg border border-cyber-border rounded px-2 py-1 text-white font-mono text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-500 text-[10px]">Warning Telegraph (s)</span>
                        <input
                          type="number"
                          step="0.1"
                          value={activeTurret.warningDuration ?? 0.6}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            onUpdateRoom((r) => ({
                              ...r,
                              laserTurrets: r.laserTurrets?.map((t) =>
                                t.id === activeTurret.id ? { ...t, warningDuration: val } : t
                              ),
                            }));
                          }}
                          className="w-full bg-cyber-bg border border-cyber-border rounded px-2 py-1 text-white font-mono text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px]">Timing Phase (0-1)</span>
                        <input
                          type="number"
                          step="0.05"
                          min="0"
                          max="1"
                          value={activeTurret.initialPhase ?? 0}
                          onChange={(e) => {
                            const val = Math.max(0, Math.min(1, parseFloat(e.target.value) || 0));
                            onUpdateRoom((r) => ({
                              ...r,
                              laserTurrets: r.laserTurrets?.map((t) =>
                                t.id === activeTurret.id ? { ...t, initialPhase: val } : t
                              ),
                            }));
                          }}
                          className="w-full bg-cyber-bg border border-cyber-border rounded px-2 py-1 text-white font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  // Projectile Mode Settings
                  <div className="space-y-2 pt-1">
                    <span className="text-[10px] font-bold text-slate-300 block">Pulse Projectile Parameters</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-500 text-[10px]">Fire Interval (s)</span>
                        <input
                          type="number"
                          step="0.1"
                          value={activeTurret.fireInterval ?? 1.8}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 1.8;
                            onUpdateRoom((r) => ({
                              ...r,
                              laserTurrets: r.laserTurrets?.map((t) =>
                                t.id === activeTurret.id ? { ...t, fireInterval: val } : t
                              ),
                            }));
                          }}
                          className="w-full bg-cyber-bg border border-cyber-border rounded px-2 py-1 text-white font-mono text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px]">Initial Fire Offset (s)</span>
                        <input
                          type="number"
                          step="0.1"
                          value={activeTurret.fireOffset ?? 0}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            onUpdateRoom((r) => ({
                              ...r,
                              laserTurrets: r.laserTurrets?.map((t) =>
                                t.id === activeTurret.id ? { ...t, fireOffset: val } : t
                              ),
                            }));
                          }}
                          className="w-full bg-cyber-bg border border-cyber-border rounded px-2 py-1 text-white font-mono text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-500 text-[10px]">Projectile Speed (px/s)</span>
                        <input
                          type="number"
                          value={activeTurret.projectileSpeed ?? 320}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 320;
                            onUpdateRoom((r) => ({
                              ...r,
                              laserTurrets: r.laserTurrets?.map((t) =>
                                t.id === activeTurret.id ? { ...t, projectileSpeed: val } : t
                              ),
                            }));
                          }}
                          className="w-full bg-cyber-bg border border-cyber-border rounded px-2 py-1 text-white font-mono text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px]">Projectile Length (px)</span>
                        <input
                          type="number"
                          value={activeTurret.projectileLength ?? 20}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 20;
                            onUpdateRoom((r) => ({
                              ...r,
                              laserTurrets: r.laserTurrets?.map((t) =>
                                t.id === activeTurret.id ? { ...t, projectileLength: val } : t
                              ),
                            }));
                          }}
                          className="w-full bg-cyber-bg border border-cyber-border rounded px-2 py-1 text-white font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Turret Neon Color Override */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-[10px]">Turret Color Override</span>
                    {activeTurret.themeColor &&
                      activeTurret.themeColor.toLowerCase() !== room.themeColor.toLowerCase() && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateRoom((r) => ({
                            ...r,
                            laserTurrets: r.laserTurrets?.map((t) =>
                              t.id === activeTurret.id ? { ...t, themeColor: undefined } : t
                            ),
                          }))
                        }
                        className="text-[9px] text-cyber-cyan hover:underline"
                      >
                        Reset to Sector
                      </button>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={activeTurret.themeColor || room.themeColor}
                      onChange={(e) => {
                        const color = e.target.value;
                        onUpdateRoom((r) => ({
                          ...r,
                          laserTurrets: r.laserTurrets?.map((t) =>
                            t.id === activeTurret.id
                              ? {
                                  ...t,
                                  themeColor:
                                    color.toLowerCase() === room.themeColor.toLowerCase()
                                      ? undefined
                                      : color,
                                }
                              : t
                          ),
                        }));
                      }}
                      className="w-6 h-6 rounded border border-cyber-border bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={activeTurret.themeColor || ''}
                      placeholder={`${room.themeColor} (Sector Default)`}
                      onChange={(e) => {
                        const color = e.target.value.trim();
                        onUpdateRoom((r) => ({
                          ...r,
                          laserTurrets: r.laserTurrets?.map((t) =>
                            t.id === activeTurret.id
                              ? {
                                  ...t,
                                  themeColor:
                                    !color || color.toLowerCase() === room.themeColor.toLowerCase()
                                      ? undefined
                                      : color,
                                }
                              : t
                          ),
                        }));
                      }}
                      className="flex-1 bg-cyber-bg border border-cyber-border rounded px-2 py-1 text-white font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* List of Entities in Sector */}
            <div className="space-y-1 pt-2">
              <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                Sector Entity Manifest
              </span>

              <div className="space-y-1 max-h-48 overflow-y-auto">
                {room.collectibles?.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => onSelectEntity({ type: 'collectible', id: c.id })}
                    className={`flex items-center justify-between p-1.5 rounded cursor-pointer text-xs ${
                      selectedEntity?.type === 'collectible' && selectedEntity.id === c.id
                        ? 'bg-cyber-card border border-cyber-cyan text-white'
                        : 'bg-cyber-bg hover:bg-cyber-card text-slate-400'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <Sparkles className="w-3 h-3 text-cyber-cyan" />
                      <span className="font-mono">{c.type}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      ({c.x}, {c.y})
                    </span>
                  </div>
                ))}

                {room.movingPlatforms?.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => onSelectEntity({ type: 'movingPlatform', id: p.id })}
                    className={`flex items-center justify-between p-1.5 rounded cursor-pointer text-xs ${
                      selectedEntity?.type === 'movingPlatform' && selectedEntity.id === p.id
                        ? 'bg-cyber-card border border-cyber-cyan text-white'
                        : 'bg-cyber-bg hover:bg-cyber-card text-slate-400'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 truncate">
                      <Sliders className="w-3 h-3 text-cyber-neonBlue shrink-0" />
                      <span className="truncate">{p.id}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 shrink-0">
                      {p.speed} px/s
                    </span>
                  </div>
                ))}

                {room.laserBarriers?.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => onSelectEntity({ type: 'laserBarrier', id: b.id })}
                    className={`flex items-center justify-between p-1.5 rounded cursor-pointer text-xs ${
                      selectedEntity?.type === 'laserBarrier' && selectedEntity.id === b.id
                        ? 'bg-cyber-card border border-cyber-cyan text-white'
                        : 'bg-cyber-bg hover:bg-cyber-card text-slate-400'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 truncate">
                      <Zap className="w-3 h-3 text-cyber-neonPink shrink-0" />
                      <span className="truncate">{b.id}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 shrink-0">
                      {b.alwaysActive || (b.inactiveDuration !== undefined && b.inactiveDuration <= 0)
                        ? 'Always Active'
                        : `${b.activeDuration ?? 2}s`}
                    </span>
                  </div>
                ))}

                {room.laserTurrets?.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => onSelectEntity({ type: 'laserTurret', id: t.id })}
                    className={`flex items-center justify-between p-1.5 rounded cursor-pointer text-xs ${
                      selectedEntity?.type === 'laserTurret' && selectedEntity.id === t.id
                        ? 'bg-cyber-card border border-cyber-cyan text-white'
                        : 'bg-cyber-bg hover:bg-cyber-card text-slate-400'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 truncate">
                      <Radio className="w-3 h-3 text-cyber-neonGreen shrink-0" />
                      <span className="truncate">{t.id}</span>
                      {t.autoTarget && (
                        <span className="text-[9px] px-1 py-0.2 bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/30 shrink-0 font-mono">
                          AUTO
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 shrink-0">
                      {t.mode || 'proj'}
                    </span>
                  </div>
                ))}

                {(!room.collectibles?.length &&
                  !room.movingPlatforms?.length &&
                  !room.laserBarriers?.length &&
                  !room.laserTurrets?.length) && (
                  <div className="text-center py-4 text-slate-600 text-xs">
                    No dynamic entities placed yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: WORLD & DIAGNOSTICS */}
        {/* ========================================================================= */}
        {activeTab === 'world' && (
          <div className="space-y-4">
            {/* World Metadata */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                World Information
              </label>

              <div>
                <span className="text-slate-500 text-[10px]">World ID</span>
                <input
                  type="text"
                  value={world.id}
                  onChange={(e) => onUpdateWorld((w) => ({ ...w, id: e.target.value }))}
                  className="w-full bg-cyber-bg border border-cyber-border rounded px-2.5 py-1.5 text-white font-mono text-xs focus:border-cyber-cyan focus:outline-none"
                />
              </div>

              <div>
                <span className="text-slate-500 text-[10px]">World Title</span>
                <input
                  type="text"
                  value={world.title}
                  onChange={(e) => onUpdateWorld((w) => ({ ...w, title: e.target.value }))}
                  className="w-full bg-cyber-bg border border-cyber-border rounded px-2.5 py-1.5 text-white text-xs focus:border-cyber-cyan focus:outline-none"
                />
              </div>

              <div>
                <span className="text-slate-500 text-[10px]">Overview / Narrative</span>
                <textarea
                  value={world.description || ''}
                  onChange={(e) => onUpdateWorld((w) => ({ ...w, description: e.target.value }))}
                  rows={3}
                  className="w-full bg-cyber-bg border border-cyber-border rounded px-2.5 py-1.5 text-slate-300 text-xs focus:border-cyber-cyan focus:outline-none"
                />
              </div>

              <div>
                <span className="text-slate-500 text-[10px]">Starting Coordinates</span>
                <select
                  value={`${world.startingCoords[0]},${world.startingCoords[1]}`}
                  onChange={(e) => {
                    const [sx, sy] = e.target.value.split(',').map(Number);
                    onUpdateWorld((w) => ({ ...w, startingCoords: [sx, sy] }));
                  }}
                  className="w-full bg-cyber-bg border border-cyber-border rounded px-2 py-1.5 text-white text-xs"
                >
                  {world.rooms.map((r) => (
                    <option key={r.id} value={`${r.coords[0]},${r.coords[1]}`}>
                      Sector ({r.coords[0]}, {r.coords[1]}) - {r.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="h-px bg-cyber-border" />

            {/* Diagnostics & Linting Issues */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Live Diagnostics
                </label>
                <span className="text-[10px] text-slate-500">
                  {diagnostics.length} issue{diagnostics.length !== 1 ? 's' : ''}
                </span>
              </div>

              {diagnostics.length === 0 ? (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="text-xs">World passes all schema and gameplay invariants!</span>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {diagnostics.map((d) => (
                    <div
                      key={d.id}
                      className={`p-2.5 rounded border text-xs space-y-1 ${
                        d.severity === 'error'
                          ? 'bg-red-500/10 border-red-500/30 text-red-300'
                          : d.severity === 'warning'
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                          : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                      }`}
                    >
                      <div className="flex items-start space-x-2">
                        {d.severity === 'error' ? (
                          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          {d.roomId && (
                            <span className="font-mono font-bold block text-[10px] text-slate-400">
                              {d.roomId}
                            </span>
                          )}
                          <p>{d.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

