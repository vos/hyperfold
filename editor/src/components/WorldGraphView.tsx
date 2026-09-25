import React, { useState, useEffect } from 'react';
import {
  Plus,
  Compass,
  Trash2,
  Copy,
  ExternalLink,
  Flag,
  Key,
  Lock,
  Move,
  GripVertical,
} from 'lucide-react';
import { RoomData, WorldData } from '../types/world';
import { createEmptyRoom, moveSector, copySector } from '../utils/serialization';

function getKeyLabelForGate(gateId: string, world: WorldData): string {
  for (const r of world.rooms) {
    for (const c of r.collectibles || []) {
      if (c.type === 'key' && c.id === gateId && c.label) {
        return c.label;
      }
    }
  }
  for (const r of world.rooms) {
    for (const d of ['left', 'right', 'up', 'down'] as const) {
      const ex = r.exits?.[d];
      if (typeof ex === 'object' && ex !== null && ex.id === gateId && ex.label) {
        return ex.label;
      }
    }
  }
  return gateId;
}

interface WorldGraphViewProps {
  world: WorldData;
  onUpdateWorld: (updater: (prev: WorldData) => WorldData) => void;
  activeRoomId: string;
  onSelectRoom: (roomId: string) => void;
  onOpenEditor: () => void;
}

export const WorldGraphView: React.FC<WorldGraphViewProps> = ({
  world,
  onUpdateWorld,
  activeRoomId,
  onSelectRoom,
  onOpenEditor,
}) => {
  const [manualCoordX, setManualCoordX] = useState<number>(0);
  const [manualCoordY, setManualCoordY] = useState<number>(0);

  // Drag and drop state
  const [draggedRoom, setDraggedRoom] = useState<RoomData | null>(null);
  const [dragOverCoord, setDragOverCoord] = useState<[number, number] | null>(null);
  const [isCopyModifier, setIsCopyModifier] = useState<boolean>(false);

  // Listen for modifier key presses/releases while dragging
  useEffect(() => {
    if (!draggedRoom) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) {
        setIsCopyModifier(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.altKey && !e.ctrlKey && !e.metaKey) {
        setIsCopyModifier(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [draggedRoom]);

  // Calculate bounding box of all room coordinates
  const coordsList = world.rooms.map((r) => r.coords);
  const xs = coordsList.map(([x]) => x);
  const ys = coordsList.map(([, y]) => y);

  const minX = Math.min(...xs) - 1;
  const maxX = Math.max(...xs) + 1;
  const minY = Math.min(...ys) - 1;
  const maxY = Math.max(...ys) + 1;

  // Build coordinate lookup map
  const roomMap = new Map<string, RoomData>();
  for (const r of world.rooms) {
    roomMap.set(`${r.coords[0]},${r.coords[1]}`, r);
  }

  // Add room at coordinate
  const handleAddRoomAt = (x: number, y: number) => {
    const key = `${x},${y}`;
    if (roomMap.has(key)) return;

    const newRoom = createEmptyRoom([x, y]);
    onUpdateWorld((prev) => ({
      ...prev,
      rooms: [...prev.rooms, newRoom],
    }));
    onSelectRoom(newRoom.id);
  };

  // Set as starting room
  const handleSetStartingRoom = (room: RoomData) => {
    onUpdateWorld((prev) => ({
      ...prev,
      startingCoords: room.coords,
    }));
  };

  // Drag & drop event handlers
  const handleDragStart = (e: React.DragEvent, room: RoomData) => {
    const isCopy = e.altKey || e.ctrlKey || e.metaKey;
    setDraggedRoom(room);
    setIsCopyModifier(isCopy);
    e.dataTransfer.setData('text/plain', room.id);
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const handleDragEnd = () => {
    setDraggedRoom(null);
    setDragOverCoord(null);
    setIsCopyModifier(false);
  };

  const handleDragOverTarget = (e: React.DragEvent, x: number, y: number) => {
    e.preventDefault();
    e.stopPropagation();
    const isCopy = e.altKey || e.ctrlKey || e.metaKey;
    setIsCopyModifier(isCopy);
    e.dataTransfer.dropEffect = isCopy ? 'copy' : 'move';
    if (!dragOverCoord || dragOverCoord[0] !== x || dragOverCoord[1] !== y) {
      setDragOverCoord([x, y]);
    }
  };

  const handleDragEnterTarget = (e: React.DragEvent, x: number, y: number) => {
    e.preventDefault();
    e.stopPropagation();
    const isCopy = e.altKey || e.ctrlKey || e.metaKey;
    setIsCopyModifier(isCopy);
    setDragOverCoord([x, y]);
  };

  const handleDragLeaveTarget = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOverCoord(null);
  };

  const handleDropOnSlot = (e: React.DragEvent, targetX: number, targetY: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedRoom) return;

    const isCopy = e.altKey || e.ctrlKey || e.metaKey || isCopyModifier;
    const [sourceX, sourceY] = draggedRoom.coords;

    if (sourceX === targetX && sourceY === targetY) {
      handleDragEnd();
      return;
    }

    if (isCopy) {
      const copyResult = copySector(world, draggedRoom.id, [targetX, targetY]);
      if (copyResult) {
        onUpdateWorld(() => copyResult.newWorld);
        onSelectRoom(copyResult.newRoom.id);
      }
    } else {
      const updatedWorld = moveSector(world, draggedRoom.id, [targetX, targetY]);
      onUpdateWorld(() => updatedWorld);
      onSelectRoom(draggedRoom.id);
    }

    handleDragEnd();
  };

  // Delete room
  const handleDeleteRoom = (roomId: string) => {
    if (world.rooms.length <= 1) {
      alert('World must have at least one sector.');
      return;
    }
    const confirmed = confirm('Are you sure you want to delete this sector?');
    if (!confirmed) return;

    onUpdateWorld((prev) => {
      const remaining = prev.rooms.filter((r) => r.id !== roomId);
      return {
        ...prev,
        rooms: remaining,
        startingCoords:
          prev.startingCoords[0] === prev.rooms.find((r) => r.id === roomId)?.coords[0] &&
          prev.startingCoords[1] === prev.rooms.find((r) => r.id === roomId)?.coords[1]
            ? remaining[0].coords
            : prev.startingCoords,
      };
    });
  };

  // Synchronize adjacent exits
  const handleAutoConnectExits = () => {
    onUpdateWorld((prev) => {
      const updatedRooms = prev.rooms.map((rm) => {
        const [rx, ry] = rm.coords;
        const hasRight = !!prev.rooms.find((r) => r.coords[0] === rx + 1 && r.coords[1] === ry);
        const hasLeft = !!prev.rooms.find((r) => r.coords[0] === rx - 1 && r.coords[1] === ry);
        const hasUp = !!prev.rooms.find((r) => r.coords[0] === rx && r.coords[1] === ry + 1);
        const hasDown = !!prev.rooms.find((r) => r.coords[0] === rx && r.coords[1] === ry - 1);

        return {
          ...rm,
          exits: {
            right: typeof rm.exits?.right === 'object' && rm.exits.right !== null ? rm.exits.right : hasRight,
            left: typeof rm.exits?.left === 'object' && rm.exits.left !== null ? rm.exits.left : hasLeft,
            up: typeof rm.exits?.up === 'object' && rm.exits.up !== null ? rm.exits.up : hasUp,
            down: typeof rm.exits?.down === 'object' && rm.exits.down !== null ? rm.exits.down : hasDown,
          },
        };
      });

      return { ...prev, rooms: updatedRooms };
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-cyber-bg overflow-hidden select-none">
      {/* Top Controls Bar */}
      <div className="h-12 bg-cyber-surface border-b border-cyber-border px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <Compass className="w-4 h-4 text-cyber-cyan" />
          <span className="text-sm font-bold text-white tracking-wide">
            World Sector Matrix ({world.rooms.length} Sectors)
          </span>
          <span className="text-xs text-slate-500 font-mono">
            Spatial Bounds: X [{minX + 1}..{maxX - 1}], Y [{minY + 1}..{maxY - 1}]
          </span>

          {/* Drag & Modifier Quick Guide */}
          <div className="hidden lg:flex items-center space-x-2 text-[11px] font-mono px-2.5 py-1 rounded bg-cyber-card/70 border border-cyber-border/40">
            {draggedRoom ? (
              isCopyModifier ? (
                <span className="text-emerald-400 font-bold flex items-center space-x-1 animate-pulse">
                  <Copy className="w-3.5 h-3.5" />
                  <span>COPY MODE: Drop onto empty slot to clone "{draggedRoom.title}"</span>
                </span>
              ) : (
                <span className="text-cyber-cyan font-bold flex items-center space-x-1">
                  <Move className="w-3.5 h-3.5" />
                  <span>MOVE MODE: Drop onto slot to move/swap (Hold Alt / Option to copy)</span>
                </span>
              )
            ) : (
              <>
                <span className="text-slate-400">Drag to move</span>
                <span className="text-slate-600">•</span>
                <span className="text-emerald-400 font-medium">Alt + Drag to copy</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleAutoConnectExits}
            className="px-3 py-1 bg-cyber-card hover:bg-cyber-hover border border-cyber-border text-xs text-slate-200 hover:text-white rounded transition-colors"
            title="Automatically link matching exits for all adjacent sectors"
          >
            Auto-Sync Adjacent Exits
          </button>

          <div className="flex items-center space-x-1.5 bg-cyber-card px-2 py-1 rounded border border-cyber-border text-xs">
            <span className="text-slate-400">Add at:</span>
            <input
              type="number"
              className="w-10 bg-cyber-bg text-center text-white rounded px-1 text-xs border border-cyber-border"
              value={manualCoordX}
              onChange={(e) => setManualCoordX(parseInt(e.target.value) || 0)}
              title="X Coordinate"
            />
            <span className="text-slate-400">,</span>
            <input
              type="number"
              className="w-10 bg-cyber-bg text-center text-white rounded px-1 text-xs border border-cyber-border"
              value={manualCoordY}
              onChange={(e) => setManualCoordY(parseInt(e.target.value) || 0)}
              title="Y Coordinate"
            />
            <button
              onClick={() => handleAddRoomAt(manualCoordX, manualCoordY)}
              className="px-2 py-0.5 bg-cyber-cyan text-slate-950 font-bold rounded text-xs hover:brightness-110"
            >
              + Add
            </button>
          </div>
        </div>
      </div>

      {/* Matrix Canvas Viewport */}
      <div className="flex-1 overflow-auto p-12 flex items-center justify-center">
        <div
          className="grid gap-6 items-center justify-center p-8 bg-cyber-surface/40 rounded-2xl border border-cyber-border/60 shadow-2xl relative"
          style={{
            gridTemplateColumns: `repeat(${maxX - minX + 1}, minmax(180px, 180px))`,
          }}
        >
          {Array.from({ length: maxY - minY + 1 }).map((_, yIdx) => {
            // Invert Y coordinate so +Y is North/Upward
            const y = maxY - yIdx;

            return Array.from({ length: maxX - minX + 1 }).map((__, xIdx) => {
              const x = minX + xIdx;
              const key = `${x},${y}`;
              const room = roomMap.get(key);
              const isStartingRoom =
                world.startingCoords[0] === x && world.startingCoords[1] === y;
              const isSelected = room && room.id === activeRoomId;
              const isDragging = room && draggedRoom && draggedRoom.id === room.id;
              const isOver = dragOverCoord && dragOverCoord[0] === x && dragOverCoord[1] === y;

              // Check if slot is adjacent to any existing room
              const isAdjacentToExisting =
                roomMap.has(`${x + 1},${y}`) ||
                roomMap.has(`${x - 1},${y}`) ||
                roomMap.has(`${x},${y + 1}`) ||
                roomMap.has(`${x},${y - 1}`);

              if (!room) {
                // Empty slot being hovered while dragging
                if (isOver && draggedRoom) {
                  if (isCopyModifier) {
                    return (
                      <div
                        key={key}
                        onDragOver={(e) => handleDragOverTarget(e, x, y)}
                        onDragEnter={(e) => handleDragEnterTarget(e, x, y)}
                        onDragLeave={handleDragLeaveTarget}
                        onDrop={(e) => handleDropOnSlot(e, x, y)}
                        className="min-h-[160px] rounded-xl border-2 border-dashed border-emerald-400 bg-emerald-500/20 shadow-[0_0_25px_rgba(16,185,129,0.35)] flex flex-col items-center justify-center space-y-1.5 p-3 transition-all scale-[1.03]"
                      >
                        <div className="p-2 rounded-full bg-emerald-500/30 text-emerald-300">
                          <Copy className="w-5 h-5 animate-bounce" />
                        </div>
                        <span className="text-xs font-bold text-emerald-300 font-mono">
                          + Copy to ({x}, {y})
                        </span>
                        <span className="text-[10px] text-emerald-400/80 font-mono text-center truncate max-w-[150px]">
                          Clone "{draggedRoom.title}"
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={key}
                      onDragOver={(e) => handleDragOverTarget(e, x, y)}
                      onDragEnter={(e) => handleDragEnterTarget(e, x, y)}
                      onDragLeave={handleDragLeaveTarget}
                      onDrop={(e) => handleDropOnSlot(e, x, y)}
                      className="min-h-[160px] rounded-xl border-2 border-dashed border-cyber-cyan bg-cyber-cyan/20 shadow-[0_0_25px_rgba(0,229,255,0.35)] flex flex-col items-center justify-center space-y-1.5 p-3 transition-all scale-[1.03]"
                    >
                      <div className="p-2 rounded-full bg-cyber-cyan/30 text-cyber-cyan">
                        <Move className="w-5 h-5 animate-pulse" />
                      </div>
                      <span className="text-xs font-bold text-cyber-cyan font-mono">
                        Move to ({x}, {y})
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono text-center">
                        Hold Alt / Option to copy
                      </span>
                    </div>
                  );
                }

                // Empty slot while another card is dragging
                if (draggedRoom) {
                  return (
                    <div
                      key={key}
                      onDragOver={(e) => handleDragOverTarget(e, x, y)}
                      onDragEnter={(e) => handleDragEnterTarget(e, x, y)}
                      onDragLeave={handleDragLeaveTarget}
                      onDrop={(e) => handleDropOnSlot(e, x, y)}
                      className="min-h-[160px] rounded-xl border-2 border-dashed border-cyber-border/40 hover:border-slate-400 bg-cyber-bg/20 flex flex-col items-center justify-center space-y-1 transition-all"
                    >
                      <span className="text-[11px] font-mono text-slate-500">
                        Drop here ({x}, {y})
                      </span>
                    </div>
                  );
                }

                // Idle: adjacent empty slot shows "+ Add" button
                if (isAdjacentToExisting) {
                  return (
                    <button
                      key={key}
                      onDragOver={(e) => handleDragOverTarget(e, x, y)}
                      onDragEnter={(e) => handleDragEnterTarget(e, x, y)}
                      onDragLeave={handleDragLeaveTarget}
                      onDrop={(e) => handleDropOnSlot(e, x, y)}
                      onClick={() => handleAddRoomAt(x, y)}
                      title={`Add new sector at (${x}, ${y})`}
                      className="min-h-[160px] rounded-xl border-2 border-dashed border-cyber-border/40 hover:border-cyber-cyan/60 bg-cyber-bg/20 hover:bg-cyber-card/40 flex flex-col items-center justify-center space-y-1.5 transition-all group"
                    >
                      <Plus className="w-5 h-5 text-slate-500 group-hover:text-cyber-cyan transition-colors" />
                      <span className="text-[11px] font-mono text-slate-500 group-hover:text-slate-300">
                        + Add ({x}, {y})
                      </span>
                    </button>
                  );
                }

                // Idle: non-adjacent empty slot
                return (
                  <div
                    key={key}
                    onDragOver={(e) => handleDragOverTarget(e, x, y)}
                    onDragEnter={(e) => handleDragEnterTarget(e, x, y)}
                    onDragLeave={handleDragLeaveTarget}
                    onDrop={(e) => handleDropOnSlot(e, x, y)}
                    className="min-h-[160px]"
                  />
                );
              }

              const keysInRoom = (room.collectibles || []).filter((c) => c.type === 'key');
              const gatedExits = (['left', 'right', 'up', 'down'] as const)
                .filter((d) => typeof room.exits?.[d] === 'object' && room.exits[d] !== null)
                .map((d) => [d, room.exits[d] as any] as const);

              // Render Room Card with Drag & Drop capability
              return (
                <div
                  key={room.id}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, room)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOverTarget(e, x, y)}
                  onDragEnter={(e) => handleDragEnterTarget(e, x, y)}
                  onDragLeave={handleDragLeaveTarget}
                  onDrop={(e) => handleDropOnSlot(e, x, y)}
                  onClick={() => onSelectRoom(room.id)}
                  title="Drag to move sector • Hold Alt / Option to copy"
                  className={`min-h-[160px] rounded-xl p-3 flex flex-col justify-between cursor-grab active:cursor-grabbing transition-all relative border ${
                    isDragging
                      ? 'opacity-40 ring-2 ring-cyber-cyan border-dashed scale-95'
                      : isSelected
                      ? 'bg-cyber-card border-cyber-cyan ring-2 ring-cyber-cyan/40 shadow-xl scale-[1.03]'
                      : 'bg-cyber-card/80 border-cyber-border hover:border-slate-400 hover:bg-cyber-card'
                  }`}
                  style={{
                    boxShadow: isSelected && !isDragging ? `0 0 20px ${room.themeColor}33` : undefined,
                  }}
                >
                  {/* Drag Over Overlay for Existing Room Card */}
                  {isOver && draggedRoom && draggedRoom.id !== room.id && (
                    isCopyModifier ? (
                      <div className="absolute inset-0 bg-red-950/85 rounded-xl border-2 border-dashed border-red-500 flex flex-col items-center justify-center p-3 text-center z-20 pointer-events-none shadow-lg">
                        <span className="text-xs font-bold text-red-300">Occupied Slot</span>
                        <span className="text-[10px] text-red-400 mt-1">Drop on empty slot to copy</span>
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-purple-950/90 rounded-xl border-2 border-dashed border-purple-400 ring-2 ring-purple-400/40 flex flex-col items-center justify-center p-3 text-center z-20 pointer-events-none shadow-[0_0_25px_rgba(192,132,252,0.4)]">
                        <div className="p-1.5 rounded-full bg-purple-500/30 text-purple-200 mb-1">
                          <Move className="w-5 h-5 animate-pulse" />
                        </div>
                        <span className="text-xs font-bold text-purple-200">⇄ Swap Positions</span>
                        <span className="text-[10px] text-purple-300/80 font-mono mt-0.5">
                          with ({x}, {y})
                        </span>
                      </div>
                    )
                  )}

                  {/* Card Header: Coords, Grip Handle & Starting Star */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <GripVertical className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyber-cyan shrink-0" />
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: room.themeColor }}
                      />
                      <span className="font-mono text-xs font-bold text-white">
                        ({room.coords[0]}, {room.coords[1]})
                      </span>
                    </div>

                    {isStartingRoom && (
                      <span className="flex items-center space-x-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                        <Flag className="w-2.5 h-2.5" />
                        <span>START</span>
                      </span>
                    )}
                  </div>

                  {/* Card Title & Subtitle */}
                  <div className="my-1">
                    <h4 className="text-xs font-bold text-slate-100 truncate">{room.title}</h4>
                    <p className="text-[10px] text-slate-400 truncate">
                      {room.subtitle || 'No subtitle'}
                    </p>
                  </div>

                  {/* Key Collectibles in this Sector */}
                  {keysInRoom.length > 0 && (
                    <div className="flex items-center space-x-1.5 text-[10px] text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30 truncate my-0.5">
                      <Key className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="truncate font-mono font-medium" title={keysInRoom.map((k) => `Key: ${k.label || k.id}`).join(', ')}>
                        {keysInRoom.map((k) => k.label || k.id).join(', ')}
                      </span>
                    </div>
                  )}

                  {/* Locked Exits in this Sector with Required Key Label */}
                  {gatedExits.length > 0 && (
                    <div className="flex items-center space-x-1.5 text-[10px] text-pink-300 bg-pink-500/10 px-1.5 py-0.5 rounded border border-pink-500/30 truncate my-0.5">
                      <Lock className="w-3 h-3 text-pink-400 shrink-0" />
                      <span
                        className="truncate font-mono font-medium"
                        title={gatedExits.map(([d, g]) => `Locked ${d} door: requires "${getKeyLabelForGate(g.id, world)}"`).join('; ')}
                      >
                        {gatedExits.map(([d, g]) => `[${d[0].toUpperCase()}]: ${getKeyLabelForGate(g.id, world)}`).join(' ')}
                      </span>
                    </div>
                  )}

                  {/* Exit Direction Indicators */}
                  <div className="flex items-center space-x-1 text-[10px] font-mono">
                    {(['left', 'right', 'up', 'down'] as const).map((d) => {
                      const ex = room.exits?.[d];
                      const isG = typeof ex === 'object' && ex !== null;
                      const isOp = ex === true;
                      const char = d[0].toUpperCase();
                      const keyLabel = isG ? getKeyLabelForGate((ex as any).id, world) : undefined;
                      return (
                        <span
                          key={d}
                          title={isG ? `Gated ${d} exit: requires "${keyLabel}"` : `${d} exit: ${isOp ? 'Open' : 'Closed'}`}
                          className={`px-1 py-0.2 rounded font-mono ${
                            isG
                              ? 'text-pink-400 bg-pink-500/20 border border-pink-500/40'
                              : isOp
                              ? 'text-cyber-cyan bg-cyber-cyan/20'
                              : 'text-slate-600'
                          }`}
                        >
                          {isG ? `🔒${char}` : char}
                        </span>
                      );
                    })}

                    {/* Entities count badge */}
                    <span className="ml-auto text-[10px] text-slate-500">
                      {(room.collectibles?.length || 0) +
                        (room.movingPlatforms?.length || 0) +
                        (room.laserBarriers?.length || 0) +
                        (room.laserTurrets?.length || 0)}{' '}
                      ents
                    </span>
                  </div>

                  {/* Card Action Footer (Copy button replaced with drag & drop) */}
                  <div className="pt-2 border-t border-cyber-border/60 flex items-center justify-between">
                    <button
                      draggable={false}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectRoom(room.id);
                        onOpenEditor();
                      }}
                      className="text-[11px] font-semibold text-cyber-cyan hover:underline flex items-center space-x-1"
                    >
                      <span>Edit Grid</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>

                    <div className="flex items-center space-x-1">
                      {!isStartingRoom && (
                        <button
                          draggable={false}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetStartingRoom(room);
                          }}
                          title="Set as world starting sector"
                          className="p-1 text-slate-400 hover:text-emerald-400 rounded"
                        >
                          <Flag className="w-3 h-3" />
                        </button>
                      )}
                      {world.rooms.length > 1 && (
                        <button
                          draggable={false}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRoom(room.id);
                          }}
                          title="Delete sector"
                          className="p-1 text-slate-400 hover:text-red-400 rounded"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            });
          })}
        </div>
      </div>
    </div>
  );
};


