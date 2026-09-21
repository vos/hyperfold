import React, { useState } from 'react';
import {
  Plus,
  Compass,
  Trash2,
  Copy,
  ExternalLink,
  Flag,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { RoomData, WorldData } from '../types/world';
import { cloneRoom, createEmptyRoom } from '../utils/serialization';

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

  // Duplicate room
  const handleDuplicateRoom = (room: RoomData) => {
    // Find adjacent empty slot
    const [rx, ry] = room.coords;
    const candidates: [number, number][] = [
      [rx + 1, ry],
      [rx, ry + 1],
      [rx - 1, ry],
      [rx, ry - 1],
    ];
    const targetSlot = candidates.find(([cx, cy]) => !roomMap.has(`${cx},${cy}`)) || [rx + 1, ry];
    const newRoom = cloneRoom(room, targetSlot);

    onUpdateWorld((prev) => ({
      ...prev,
      rooms: [...prev.rooms, newRoom],
    }));
    onSelectRoom(newRoom.id);
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
            right: hasRight,
            left: hasLeft,
            up: hasUp,
            down: hasDown,
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

              // Check if slot is adjacent to any existing room
              const isAdjacentToExisting =
                roomMap.has(`${x + 1},${y}`) ||
                roomMap.has(`${x - 1},${y}`) ||
                roomMap.has(`${x},${y + 1}`) ||
                roomMap.has(`${x},${y - 1}`);

              if (!room) {
                if (isAdjacentToExisting) {
                  return (
                    <button
                      key={key}
                      onClick={() => handleAddRoomAt(x, y)}
                      title={`Add new sector at (${x}, ${y})`}
                      className="h-36 rounded-xl border-2 border-dashed border-cyber-border/40 hover:border-cyber-cyan/60 bg-cyber-bg/20 hover:bg-cyber-card/40 flex flex-col items-center justify-center space-y-1.5 transition-all group"
                    >
                      <Plus className="w-5 h-5 text-slate-500 group-hover:text-cyber-cyan transition-colors" />
                      <span className="text-[11px] font-mono text-slate-500 group-hover:text-slate-300">
                        + Add ({x}, {y})
                      </span>
                    </button>
                  );
                }
                return <div key={key} className="h-36" />;
              }

              // Render Room Card
              return (
                <div
                  key={room.id}
                  onClick={() => onSelectRoom(room.id)}
                  className={`h-36 rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all relative border ${
                    isSelected
                      ? 'bg-cyber-card border-cyber-cyan ring-2 ring-cyber-cyan/40 shadow-xl scale-[1.03]'
                      : 'bg-cyber-card/80 border-cyber-border hover:border-slate-400 hover:bg-cyber-card'
                  }`}
                  style={{
                    boxShadow: isSelected ? `0 0 20px ${room.themeColor}33` : undefined,
                  }}
                >
                  {/* Card Header: Coords & Starting Star */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
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

                  {/* Exit Direction Indicators */}
                  <div className="flex items-center space-x-1 text-[10px] font-mono">
                    <span
                      title="Left Exit"
                      className={`px-1 py-0.2 rounded ${
                        room.exits.left ? 'text-cyber-cyan bg-cyber-cyan/20' : 'text-slate-600'
                      }`}
                    >
                      L
                    </span>
                    <span
                      title="Right Exit"
                      className={`px-1 py-0.2 rounded ${
                        room.exits.right ? 'text-cyber-cyan bg-cyber-cyan/20' : 'text-slate-600'
                      }`}
                    >
                      R
                    </span>
                    <span
                      title="Up Exit"
                      className={`px-1 py-0.2 rounded ${
                        room.exits.up ? 'text-cyber-cyan bg-cyber-cyan/20' : 'text-slate-600'
                      }`}
                    >
                      U
                    </span>
                    <span
                      title="Down Exit"
                      className={`px-1 py-0.2 rounded ${
                        room.exits.down ? 'text-cyber-cyan bg-cyber-cyan/20' : 'text-slate-600'
                      }`}
                    >
                      D
                    </span>

                    {/* Entities count badge */}
                    <span className="ml-auto text-[10px] text-slate-500">
                      {(room.collectibles?.length || 0) +
                        (room.movingPlatforms?.length || 0) +
                        (room.laserBarriers?.length || 0) +
                        (room.laserTurrets?.length || 0)}{' '}
                      ents
                    </span>
                  </div>

                  {/* Card Action Footer */}
                  <div className="pt-2 border-t border-cyber-border/60 flex items-center justify-between">
                    <button
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
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateRoom(room);
                        }}
                        title="Duplicate sector"
                        className="p-1 text-slate-400 hover:text-white rounded"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      {world.rooms.length > 1 && (
                        <button
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

