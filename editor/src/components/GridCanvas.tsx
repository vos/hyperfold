import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import {
  GRID_COLS,
  GRID_ROWS,
  ROOM_SIZE,
  TILE_SIZE,
  RoomData,
  WorldData,
  TileGlyph,
  EditorTool,
  SelectedEntity,
  isGatedExit,
  getGateColor,
  getBaseFiringAngle,
} from '../types/world';
import { TILE_DEFINITIONS } from '../utils/tileDefinitions';
import { getAdjacentSectors } from '../utils/navigation.ts';

function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

// Lucide Key icon teeth SVG path (24x24 viewBox)
const LUCIDE_KEY_TEETH_PATH =
  typeof Path2D !== 'undefined'
    ? new Path2D('m7.5 15.5 2.3 2.3a1 1 0 0 1 0 1.4l-2.1 2.1a1 1 0 0 1-1.4 0L4 19')
    : null;

interface GridCanvasProps {
  room: RoomData;
  world: WorldData;
  onSelectRoom: (roomId: string) => void;
  onUpdateRoom: (updater: (prev: RoomData) => RoomData, addToHistory?: boolean) => void;
  onBeginStroke?: () => void;
  onEndStroke?: () => void;
  currentTool: EditorTool;
  selectedGlyph: TileGlyph;
  onSelectGlyph: (glyph: TileGlyph) => void;
  selectedEntity: SelectedEntity;
  onSelectEntity: (entity: SelectedEntity) => void;
  showGrid: boolean;
  showEntities: boolean;
  showCoordinates: boolean;
  brushSize: number;
  onOpenHelp?: () => void;
}

export const GridCanvas: React.FC<GridCanvasProps> = ({
  room,
  world,
  onSelectRoom,
  onUpdateRoom,
  onBeginStroke,
  onEndStroke,
  currentTool,
  selectedGlyph,
  onSelectGlyph,
  selectedEntity,
  onSelectEntity,
  showGrid,
  showEntities,
  showCoordinates,
  brushSize,
  onOpenHelp,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [zoom, setZoom] = useState<number>(1.0);
  const [hoverPos, setHoverPos] = useState<{ col: number; row: number; pixelX: number; pixelY: number } | null>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [dragStart, setDragStart] = useState<{ col: number; row: number; pixelX: number; pixelY: number } | null>(null);

  // Dragging dynamic entity handle
  const [draggingEntityHandle, setDraggingEntityHandle] = useState<{
    entityType:
      | 'spawn'
      | 'collectible'
      | 'movingPlatformStart'
      | 'movingPlatformEnd'
      | 'laserBarrier1'
      | 'laserBarrier2'
      | 'laserBarrierEnd1'
      | 'laserBarrierEnd2'
      | 'laserBarrierEndBeam'
      | 'laserBarrierBeam'
      | 'laserTurret'
      | 'portal';
    id?: string;
    initialCoords?: {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      startX: number;
      startY: number;
    };
  } | null>(null);

  // Helper to get exact canvas coordinates from mouse event
  const getCanvasCoords = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = ROOM_SIZE / rect.width;
      const scaleY = ROOM_SIZE / rect.height;

      const pixelX = Math.max(0, Math.min(ROOM_SIZE - 1, (e.clientX - rect.left) * scaleX));
      const pixelY = Math.max(0, Math.min(ROOM_SIZE - 1, (e.clientY - rect.top) * scaleY));

      const col = Math.floor(pixelX / TILE_SIZE);
      const row = Math.floor(pixelY / TILE_SIZE);

      return { pixelX, pixelY, col, row };
    },
    []
  );

  // Paint tile(s) on grid
  const paintTiles = useCallback(
    (targetCells: { r: number; c: number }[], glyph: TileGlyph) => {
      onUpdateRoom((prev) => {
        let changed = false;
        const newGrid = [...prev.grid];
        for (const cell of targetCells) {
          if (cell.r >= 0 && cell.r < GRID_ROWS && cell.c >= 0 && cell.c < GRID_COLS) {
            if (newGrid[cell.r][cell.c] !== glyph) {
              const rowChars = newGrid[cell.r].split('');
              rowChars[cell.c] = glyph;
              newGrid[cell.r] = rowChars.join('');
              changed = true;
            }
          }
        }
        return changed ? { ...prev, grid: newGrid } : prev;
      }, false);
    },
    [onUpdateRoom]
  );

  // Flood fill algorithm
  const floodFill = useCallback(
    (startR: number, startC: number, fillGlyph: TileGlyph) => {
      const targetGlyph = room.grid[startR]?.[startC];
      if (targetGlyph === fillGlyph) return;

      const visited = new Set<string>();
      const queue: [number, number][] = [[startR, startC]];
      const cellsToPaint: { r: number; c: number }[] = [];

      while (queue.length > 0) {
        const [r, c] = queue.shift()!;
        const key = `${r},${c}`;
        if (visited.has(key)) continue;
        visited.add(key);

        if (r < 0 || r >= GRID_ROWS || c < 0 || c >= GRID_COLS) continue;
        if (room.grid[r][c] !== targetGlyph) continue;

        cellsToPaint.push({ r, c });

        queue.push([r + 1, c]);
        queue.push([r - 1, c]);
        queue.push([r, c + 1]);
        queue.push([r, c - 1]);
      }

      paintTiles(cellsToPaint, fillGlyph);
    },
    [room.grid, paintTiles]
  );

  // Bresenham's line algorithm for line tool
  const getLineCells = (r0: number, c0: number, r1: number, c1: number): { r: number; c: number }[] => {
    const cells: { r: number; c: number }[] = [];
    const dx = Math.abs(c1 - c0);
    const dy = Math.abs(r1 - r0);
    const sx = c0 < c1 ? 1 : -1;
    const sy = r0 < r1 ? 1 : -1;
    let err = dx - dy;

    let currC = c0;
    let currR = r0;

    while (true) {
      cells.push({ r: currR, c: currC });
      if (currC === c1 && currR === r1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        currC += sx;
      }
      if (e2 < dx) {
        err += dx;
        currR += sy;
      }
    }
    return cells;
  };

  // Rectangle tool cells
  const getRectCells = (r0: number, c0: number, r1: number, c1: number): { r: number; c: number }[] => {
    const minR = Math.min(r0, r1);
    const maxR = Math.max(r0, r1);
    const minC = Math.min(c0, c1);
    const maxC = Math.max(c0, c1);
    const cells: { r: number; c: number }[] = [];
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        cells.push({ r, c });
      }
    }
    return cells;
  };

  // Get cells for brush size
  const getBrushCells = (centerR: number, centerC: number, size: number) => {
    const cells: { r: number; c: number }[] = [];
    for (let dr = 0; dr < size; dr++) {
      for (let dc = 0; dc < size; dc++) {
        cells.push({ r: centerR + dr, c: centerC + dc });
      }
    }
    return cells;
  };

  // Mouse Down handler
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    if (!coords) return;

    onBeginStroke?.();
    setIsMouseDown(true);
    setDragStart(coords);

    // If tool is 'select', check if user clicked an entity handle
    if (currentTool === 'select') {
      const HIT_RADIUS = 20;

      // 1. Check spawn point
      if (room.spawnPoint) {
        const [sx, sy] = room.spawnPoint;
        if (Math.hypot(coords.pixelX - sx, coords.pixelY - sy) <= HIT_RADIUS) {
          onSelectEntity({ type: 'spawn' });
          setDraggingEntityHandle({ entityType: 'spawn' });
          return;
        }
      }

      // 2. Check collectibles
      if (room.collectibles) {
        for (const col of room.collectibles) {
          if (Math.hypot(coords.pixelX - col.x, coords.pixelY - col.y) <= HIT_RADIUS) {
            onSelectEntity({ type: 'collectible', id: col.id });
            setDraggingEntityHandle({ entityType: 'collectible', id: col.id });
            return;
          }
        }
      }

      // 3. Check moving platforms
      if (room.movingPlatforms) {
        for (const p of room.movingPlatforms) {
          if (Math.hypot(coords.pixelX - p.startX, coords.pixelY - p.startY) <= HIT_RADIUS) {
            onSelectEntity({ type: 'movingPlatform', id: p.id });
            setDraggingEntityHandle({ entityType: 'movingPlatformStart', id: p.id });
            return;
          }
          if (Math.hypot(coords.pixelX - p.endX, coords.pixelY - p.endY) <= HIT_RADIUS) {
            onSelectEntity({ type: 'movingPlatform', id: p.id });
            setDraggingEntityHandle({ entityType: 'movingPlatformEnd', id: p.id });
            return;
          }
        }
      }

      // 4. Check laser barriers
      if (room.laserBarriers) {
        for (const b of room.laserBarriers) {
          // Check start handles
          if (Math.hypot(coords.pixelX - b.startX1, coords.pixelY - b.startY1) <= HIT_RADIUS) {
            onSelectEntity({ type: 'laserBarrier', id: b.id });
            setDraggingEntityHandle({ entityType: 'laserBarrier1', id: b.id });
            return;
          }
          if (Math.hypot(coords.pixelX - b.startX2, coords.pixelY - b.startY2) <= HIT_RADIUS) {
            onSelectEntity({ type: 'laserBarrier', id: b.id });
            setDraggingEntityHandle({ entityType: 'laserBarrier2', id: b.id });
            return;
          }
          // Check ghost platform end handles
          if (b.endX1 !== undefined && b.endY1 !== undefined) {
            if (Math.hypot(coords.pixelX - b.endX1, coords.pixelY - b.endY1) <= HIT_RADIUS) {
              onSelectEntity({ type: 'laserBarrier', id: b.id });
              setDraggingEntityHandle({ entityType: 'laserBarrierEnd1', id: b.id });
              return;
            }
          }
          if (b.endX2 !== undefined && b.endY2 !== undefined) {
            if (Math.hypot(coords.pixelX - b.endX2, coords.pixelY - b.endY2) <= HIT_RADIUS) {
              onSelectEntity({ type: 'laserBarrier', id: b.id });
              setDraggingEntityHandle({ entityType: 'laserBarrierEnd2', id: b.id });
              return;
            }
          }
          // Check ghost beam body (moves both ghost endpoints together)
          if (
            b.endX1 !== undefined &&
            b.endY1 !== undefined &&
            b.endX2 !== undefined &&
            b.endY2 !== undefined
          ) {
            if (distToSegment(coords.pixelX, coords.pixelY, b.endX1, b.endY1, b.endX2, b.endY2) <= 12) {
              onSelectEntity({ type: 'laserBarrier', id: b.id });
              setDraggingEntityHandle({
                entityType: 'laserBarrierEndBeam',
                id: b.id,
                initialCoords: {
                  x1: b.endX1,
                  y1: b.endY1,
                  x2: b.endX2,
                  y2: b.endY2,
                  startX: coords.pixelX,
                  startY: coords.pixelY,
                },
              });
              return;
            }
          }
          // Check main beam body (moves both start endpoints together)
          if (distToSegment(coords.pixelX, coords.pixelY, b.startX1, b.startY1, b.startX2, b.startY2) <= 12) {
            onSelectEntity({ type: 'laserBarrier', id: b.id });
            setDraggingEntityHandle({
              entityType: 'laserBarrierBeam',
              id: b.id,
              initialCoords: {
                x1: b.startX1,
                y1: b.startY1,
                x2: b.startX2,
                y2: b.startY2,
                startX: coords.pixelX,
                startY: coords.pixelY,
              },
            });
            return;
          }
          // Check path lines between start and end
          if (
            b.endX1 !== undefined &&
            b.endY1 !== undefined &&
            distToSegment(coords.pixelX, coords.pixelY, b.startX1, b.startY1, b.endX1, b.endY1) <= 10
          ) {
            onSelectEntity({ type: 'laserBarrier', id: b.id });
            return;
          }
          if (
            b.endX2 !== undefined &&
            b.endY2 !== undefined &&
            distToSegment(coords.pixelX, coords.pixelY, b.startX2, b.startY2, b.endX2, b.endY2) <= 10
          ) {
            onSelectEntity({ type: 'laserBarrier', id: b.id });
            return;
          }
        }
      }

      // 5. Check laser turrets
      if (room.laserTurrets) {
        for (const t of room.laserTurrets) {
          if (Math.hypot(coords.pixelX - t.x, coords.pixelY - t.y) <= HIT_RADIUS) {
            onSelectEntity({ type: 'laserTurret', id: t.id });
            setDraggingEntityHandle({ entityType: 'laserTurret', id: t.id });
            return;
          }
        }
      }

      // 5.5 Check Portals
      if (room.portals) {
        for (const p of room.portals) {
          const pw = p.width ?? 44;
          const ph = p.height ?? 68;
          if (
            coords.pixelX >= p.x - 4 &&
            coords.pixelX <= p.x + pw + 4 &&
            coords.pixelY >= p.y - 4 &&
            coords.pixelY <= p.y + ph + 4
          ) {
            onSelectEntity({ type: 'portal', id: p.id });
            setDraggingEntityHandle({
              entityType: 'portal',
              id: p.id,
              initialCoords: {
                x1: p.x,
                y1: p.y,
                x2: 0,
                y2: 0,
                startX: p.x,
                startY: p.y,
              },
            });
            return;
          }
        }
      }

      // 6. Check Bounce Pad tile
      const clickedTile = room.grid[coords.row]?.[coords.col];
      if (clickedTile === 'B') {
        onSelectEntity({ type: 'bouncePad', row: coords.row, col: coords.col });
        return;
      }

      onSelectEntity(null);
      return;
    }

    // Drawing Tools
    if (currentTool === 'pencil') {
      paintTiles(getBrushCells(coords.row, coords.col, brushSize), selectedGlyph);
    } else if (currentTool === 'eraser') {
      paintTiles(getBrushCells(coords.row, coords.col, brushSize), ' ');
    } else if (currentTool === 'fill') {
      floodFill(coords.row, coords.col, selectedGlyph);
    } else if (currentTool === 'eyedropper') {
      const glyph = (room.grid[coords.row]?.[coords.col] as TileGlyph) || ' ';
      onSelectGlyph(glyph);
    }
  };

  // Mouse Move handler
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    if (!coords) return;
    setHoverPos(coords);

    if (!isMouseDown) return;

    // Handle entity handle dragging
    if (draggingEntityHandle) {
      const snapX = Math.round(coords.pixelX / 20) * 20;
      const snapY = Math.round(coords.pixelY / 20) * 20;

      onUpdateRoom((prev) => {
        if (draggingEntityHandle.entityType === 'spawn') {
          return { ...prev, spawnPoint: [snapX, snapY] };
        }
        if (draggingEntityHandle.entityType === 'collectible') {
          return {
            ...prev,
            collectibles: prev.collectibles?.map((c) =>
              c.id === draggingEntityHandle.id ? { ...c, x: snapX, y: snapY } : c
            ),
          };
        }
        if (draggingEntityHandle.entityType === 'movingPlatformStart') {
          return {
            ...prev,
            movingPlatforms: prev.movingPlatforms?.map((p) =>
              p.id === draggingEntityHandle.id ? { ...p, startX: snapX, startY: snapY } : p
            ),
          };
        }
        if (draggingEntityHandle.entityType === 'movingPlatformEnd') {
          return {
            ...prev,
            movingPlatforms: prev.movingPlatforms?.map((p) =>
              p.id === draggingEntityHandle.id ? { ...p, endX: snapX, endY: snapY } : p
            ),
          };
        }
        if (draggingEntityHandle.entityType === 'laserBarrier1') {
          return {
            ...prev,
            laserBarriers: prev.laserBarriers?.map((b) =>
              b.id === draggingEntityHandle.id ? { ...b, startX1: snapX, startY1: snapY } : b
            ),
          };
        }
        if (draggingEntityHandle.entityType === 'laserBarrier2') {
          return {
            ...prev,
            laserBarriers: prev.laserBarriers?.map((b) =>
              b.id === draggingEntityHandle.id ? { ...b, startX2: snapX, startY2: snapY } : b
            ),
          };
        }
        if (draggingEntityHandle.entityType === 'laserBarrierEnd1') {
          return {
            ...prev,
            laserBarriers: prev.laserBarriers?.map((b) =>
              b.id === draggingEntityHandle.id ? { ...b, endX1: snapX, endY1: snapY } : b
            ),
          };
        }
        if (draggingEntityHandle.entityType === 'laserBarrierEnd2') {
          return {
            ...prev,
            laserBarriers: prev.laserBarriers?.map((b) =>
              b.id === draggingEntityHandle.id ? { ...b, endX2: snapX, endY2: snapY } : b
            ),
          };
        }
        if (draggingEntityHandle.entityType === 'laserBarrierEndBeam' && draggingEntityHandle.initialCoords) {
          const dx = snapX - Math.round(draggingEntityHandle.initialCoords.startX / 20) * 20;
          const dy = snapY - Math.round(draggingEntityHandle.initialCoords.startY / 20) * 20;
          return {
            ...prev,
            laserBarriers: prev.laserBarriers?.map((b) =>
              b.id === draggingEntityHandle.id
                ? {
                    ...b,
                    endX1: Math.max(0, Math.min(ROOM_SIZE, draggingEntityHandle.initialCoords!.x1 + dx)),
                    endY1: Math.max(0, Math.min(ROOM_SIZE, draggingEntityHandle.initialCoords!.y1 + dy)),
                    endX2: Math.max(0, Math.min(ROOM_SIZE, draggingEntityHandle.initialCoords!.x2 + dx)),
                    endY2: Math.max(0, Math.min(ROOM_SIZE, draggingEntityHandle.initialCoords!.y2 + dy)),
                  }
                : b
            ),
          };
        }
        if (draggingEntityHandle.entityType === 'laserBarrierBeam' && draggingEntityHandle.initialCoords) {
          const dx = snapX - Math.round(draggingEntityHandle.initialCoords.startX / 20) * 20;
          const dy = snapY - Math.round(draggingEntityHandle.initialCoords.startY / 20) * 20;
          return {
            ...prev,
            laserBarriers: prev.laserBarriers?.map((b) =>
              b.id === draggingEntityHandle.id
                ? {
                    ...b,
                    startX1: Math.max(0, Math.min(ROOM_SIZE, draggingEntityHandle.initialCoords!.x1 + dx)),
                    startY1: Math.max(0, Math.min(ROOM_SIZE, draggingEntityHandle.initialCoords!.y1 + dy)),
                    startX2: Math.max(0, Math.min(ROOM_SIZE, draggingEntityHandle.initialCoords!.x2 + dx)),
                    startY2: Math.max(0, Math.min(ROOM_SIZE, draggingEntityHandle.initialCoords!.y2 + dy)),
                  }
                : b
            ),
          };
        }
        if (draggingEntityHandle.entityType === 'laserTurret') {
          return {
            ...prev,
            laserTurrets: prev.laserTurrets?.map((t) =>
              t.id === draggingEntityHandle.id ? { ...t, x: snapX, y: snapY } : t
            ),
          };
        }
        if (draggingEntityHandle.entityType === 'portal') {
          return {
            ...prev,
            portals: prev.portals?.map((p) =>
              p.id === draggingEntityHandle.id
                ? {
                    ...p,
                    x: Math.max(0, Math.min(ROOM_SIZE - (p.width ?? 44), snapX - (p.width ?? 44) * 0.5)),
                    y: Math.max(0, Math.min(ROOM_SIZE - (p.height ?? 68), snapY - (p.height ?? 68) * 0.5 + 6)),
                  }
                : p
            ),
          };
        }
        return prev;
      }, false);
      return;
    }

    // Brush painting while dragging
    if (currentTool === 'pencil') {
      paintTiles(getBrushCells(coords.row, coords.col, brushSize), selectedGlyph);
    } else if (currentTool === 'eraser') {
      paintTiles(getBrushCells(coords.row, coords.col, brushSize), ' ');
    }
  };

  // Mouse Up handler
  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isMouseDown) return;
    setIsMouseDown(false);

    if (draggingEntityHandle) {
      setDraggingEntityHandle(null);
      onEndStroke?.();
      return;
    }

    const coords = getCanvasCoords(e);
    if (coords && dragStart) {
      if (currentTool === 'line') {
        const cells = getLineCells(dragStart.row, dragStart.col, coords.row, coords.col);
        paintTiles(cells, selectedGlyph);
      } else if (currentTool === 'rect') {
        const cells = getRectCells(dragStart.row, dragStart.col, coords.row, coords.col);
        paintTiles(cells, selectedGlyph);
      }
    }

    setDragStart(null);
    onEndStroke?.();
  };

  // Global window mouseup listener to ensure stroke commits even if mouse released outside canvas
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isMouseDown) {
        setIsMouseDown(false);
        setDraggingEntityHandle(null);
        setDragStart(null);
        onEndStroke?.();
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isMouseDown, onEndStroke]);

  // Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High DPI scaling
    const dpr = window.devicePixelRatio || 1;
    canvas.width = ROOM_SIZE * dpr;
    canvas.height = ROOM_SIZE * dpr;
    ctx.resetTransform();
    ctx.scale(dpr, dpr);

    // 1. Dark Void Background
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, ROOM_SIZE, ROOM_SIZE);

    // Subtle Room Theme Glow in Center
    const gradient = ctx.createRadialGradient(400, 400, 50, 400, 400, 450);
    gradient.addColorStop(0, `${room.themeColor}12`);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, ROOM_SIZE, ROOM_SIZE);

    // 2. Render Exit Indicators
    const borderThickness = 6;
    const getGateKeyLabel = (ex: any): string => {
      for (const r of world.rooms) {
        for (const c of r.collectibles || []) {
          if (c.type === 'key' && c.id === ex.id && c.label) {
            return c.label;
          }
        }
      }
      return ex.label || ex.id;
    };

    // Helper to determine if a tile position on the perimeter is blocked by tiles
    const isTileBlocked = (r: number, c: number): boolean => {
      const glyph = room.grid[r]?.[c] || ' ';
      return glyph !== ' ';
    };

    // Helper to find contiguous unblocked tile segments [start, end] along an edge (indices 0..19)
    const getOpenExitRanges = (dir: 'left' | 'right' | 'up' | 'down'): [number, number][] => {
      const ranges: [number, number][] = [];
      let start: number | null = null;
      const count = dir === 'left' || dir === 'right' ? GRID_ROWS : GRID_COLS;

      for (let i = 0; i < count; i++) {
        const blocked =
          dir === 'left'
            ? isTileBlocked(i, 0)
            : dir === 'right'
            ? isTileBlocked(i, GRID_COLS - 1)
            : dir === 'up'
            ? isTileBlocked(0, i)
            : isTileBlocked(GRID_ROWS - 1, i);

        if (!blocked) {
          if (start === null) start = i;
        } else {
          if (start !== null) {
            ranges.push([start, i - 1]);
            start = null;
          }
        }
      }
      if (start !== null) {
        ranges.push([start, count - 1]);
      }
      return ranges;
    };

    // Helper to check whether the opposite side of a doorway at edge index i is blocked
    const getOppositeTileStatus = (
      dir: 'left' | 'right' | 'up' | 'down',
      index: number
    ): { isBlocked: boolean; reason?: 'no_room' | 'no_exit' | 'wall' } => {
      const [rx, ry] = room.coords;
      let targetCoords: [number, number];
      let oppDir: 'left' | 'right' | 'up' | 'down';
      let oppR: number;
      let oppC: number;

      if (dir === 'left') {
        targetCoords = [rx - 1, ry];
        oppDir = 'right';
        oppR = index;
        oppC = GRID_COLS - 1;
      } else if (dir === 'right') {
        targetCoords = [rx + 1, ry];
        oppDir = 'left';
        oppR = index;
        oppC = 0;
      } else if (dir === 'up') {
        targetCoords = [rx, ry + 1];
        oppDir = 'down';
        oppR = GRID_ROWS - 1;
        oppC = index;
      } else {
        // down
        targetCoords = [rx, ry - 1];
        oppDir = 'up';
        oppR = 0;
        oppC = index;
      }

      const neighbor = world.rooms.find(
        (r) => r.coords[0] === targetCoords[0] && r.coords[1] === targetCoords[1]
      );

      if (!neighbor) {
        return { isBlocked: true, reason: 'no_room' };
      }

      if (!neighbor.exits?.[oppDir]) {
        return { isBlocked: true, reason: 'no_exit' };
      }

      const neighborGlyph = neighbor.grid[oppR]?.[oppC] || ' ';
      if (neighborGlyph !== ' ') {
        return { isBlocked: true, reason: 'wall' };
      }

      return { isBlocked: false };
    };

    interface ExitSegment {
      start: number;
      end: number;
      isBlocked: boolean;
      reason?: 'no_room' | 'no_exit' | 'wall';
    }

    // Splits an unblocked exit range into subsegments based on opposite-side passable status
    const getExitSegments = (
      dir: 'left' | 'right' | 'up' | 'down',
      rangeStart: number,
      rangeEnd: number
    ): ExitSegment[] => {
      const segments: ExitSegment[] = [];
      let currentStart = rangeStart;
      let currentStatus = getOppositeTileStatus(dir, rangeStart);

      for (let i = rangeStart + 1; i <= rangeEnd; i++) {
        const status = getOppositeTileStatus(dir, i);
        if (
          status.isBlocked !== currentStatus.isBlocked ||
          status.reason !== currentStatus.reason
        ) {
          segments.push({
            start: currentStart,
            end: i - 1,
            isBlocked: currentStatus.isBlocked,
            reason: currentStatus.reason,
          });
          currentStart = i;
          currentStatus = status;
        }
      }
      segments.push({
        start: currentStart,
        end: rangeEnd,
        isBlocked: currentStatus.isBlocked,
        reason: currentStatus.reason,
      });

      return segments;
    };

    const drawExitArrow = (x: number, y: number, angle: number, col: string) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.shadowColor = col;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(-6, -5);
      ctx.lineTo(4, 0);
      ctx.lineTo(-6, 5);
      ctx.stroke();
      ctx.restore();
    };

    const drawHazardStrip = (
      x: number,
      y: number,
      w: number,
      h: number,
      dir: 'left' | 'right' | 'up' | 'down'
    ) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();

      // Dark crimson base
      ctx.fillStyle = '#1c0505';
      ctx.fillRect(x, y, w, h);

      // Diagonal hazard stripes
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 4;

      const stripeSpacing = 8;
      const diagonal = w + h + 20;

      ctx.beginPath();
      for (let offset = -diagonal; offset <= diagonal; offset += stripeSpacing) {
        ctx.moveTo(x + offset, y - 10);
        ctx.lineTo(x + offset + diagonal, y + diagonal + 10);
      }
      ctx.stroke();

      ctx.restore();

      // Outer solid barrier edge line on room boundary
      ctx.save();
      ctx.strokeStyle = '#ff4d4d';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      if (dir === 'left') {
        ctx.moveTo(0, y);
        ctx.lineTo(0, y + h);
      } else if (dir === 'right') {
        ctx.moveTo(ROOM_SIZE, y);
        ctx.lineTo(ROOM_SIZE, y + h);
      } else if (dir === 'up') {
        ctx.moveTo(x, 0);
        ctx.lineTo(x + w, 0);
      } else {
        // down
        ctx.moveTo(x, ROOM_SIZE);
        ctx.lineTo(x + w, ROOM_SIZE);
      }
      ctx.stroke();
      ctx.restore();
    };

    const drawBlockedMarker = (
      dir: 'left' | 'right' | 'up' | 'down',
      centerPos: number,
      reason?: 'no_room' | 'no_exit' | 'wall'
    ) => {
      ctx.save();

      let label = '⛔ BLOCKED';
      if (reason === 'no_room') label = '⛔ NO SECTOR';
      else if (reason === 'no_exit') label = '⛔ CLOSED EXIT';
      else if (reason === 'wall') label = '⛔ WALL BLOCKED';

      ctx.font = 'bold 11px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const textWidth = ctx.measureText(label).width;
      const padX = 8;
      const badgeW = Math.round(textWidth + padX * 2);
      const badgeH = 22;

      let badgeX = 0;
      let badgeY = 0;

      if (dir === 'left') {
        badgeX = Math.round(borderThickness + 8);
        badgeY = Math.round(centerPos - badgeH / 2);
      } else if (dir === 'right') {
        badgeX = Math.round(ROOM_SIZE - borderThickness - badgeW - 8);
        badgeY = Math.round(centerPos - badgeH / 2);
      } else if (dir === 'up') {
        badgeX = Math.round(centerPos - badgeW / 2);
        badgeY = Math.round(borderThickness + 8);
      } else {
        // down
        badgeX = Math.round(centerPos - badgeW / 2);
        badgeY = Math.round(ROOM_SIZE - borderThickness - badgeH - 8);
      }

      // Clamp within canvas boundaries with margin
      badgeX = Math.max(4, Math.min(ROOM_SIZE - badgeW - 4, badgeX));
      badgeY = Math.max(4, Math.min(ROOM_SIZE - badgeH - 4, badgeY));

      // 1. Drop shadow behind badge
      ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;

      // 2. Solid dark cyber card background (fully opaque to cleanly cover grid lines and entities)
      ctx.fillStyle = '#1c0505';
      if (typeof (ctx as any).roundRect === 'function') {
        ctx.beginPath();
        (ctx as any).roundRect(badgeX, badgeY, badgeW, badgeH, 4);
        ctx.fill();
      } else {
        ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
      }

      // 3. Warning red neon border
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      if (typeof (ctx as any).roundRect === 'function') {
        ctx.stroke();
      } else {
        ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);
      }

      // 4. Clear shadows for razor-sharp text
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // 5. Crisp high-contrast label in pure white
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, badgeX + padX, Math.round(badgeY + badgeH / 2));

      ctx.restore();
    };

    const drawLockedGateBadge = (
      dir: 'left' | 'right' | 'up' | 'down',
      keyLabel: string,
      col: string,
      centerPos: number,
      blockedStatus: 'none' | 'partial' | 'all' = 'none'
    ) => {
      ctx.save();

      // Clean, crisp font with key emoji
      ctx.font = 'bold 11px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      let text = `🔑 ${keyLabel}`;
      if (blockedStatus === 'all') {
        text = `🔑 ${keyLabel} • ⛔ BLOCKED`;
      } else if (blockedStatus === 'partial') {
        text = `🔑 ${keyLabel} • ⚠️ PARTIAL`;
      }
      const textWidth = ctx.measureText(text).width;

      const padX = 8;
      const badgeW = Math.round(textWidth + padX * 2);
      const badgeH = 22;

      let badgeX = 0;
      let badgeY = 0;

      if (dir === 'left') {
        badgeX = Math.round(borderThickness + 8);
        badgeY = Math.round(centerPos - badgeH / 2);
      } else if (dir === 'right') {
        badgeX = Math.round(ROOM_SIZE - borderThickness - badgeW - 8);
        badgeY = Math.round(centerPos - badgeH / 2);
      } else if (dir === 'up') {
        badgeX = Math.round(centerPos - badgeW / 2);
        badgeY = Math.round(borderThickness + 8);
      } else {
        // down
        badgeX = Math.round(centerPos - badgeW / 2);
        badgeY = Math.round(ROOM_SIZE - borderThickness - badgeH - 8);
      }

      // Clamp within canvas boundaries with margin
      badgeX = Math.max(4, Math.min(ROOM_SIZE - badgeW - 4, badgeX));
      badgeY = Math.max(4, Math.min(ROOM_SIZE - badgeH - 4, badgeY));

      // 1. Drop shadow behind badge
      ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;

      // 2. Solid dark cyber card background
      ctx.fillStyle = blockedStatus === 'all' ? '#1c0505' : '#080d1a';
      if (typeof (ctx as any).roundRect === 'function') {
        ctx.beginPath();
        (ctx as any).roundRect(badgeX, badgeY, badgeW, badgeH, 4);
        ctx.fill();
      } else {
        ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
      }

      // 3. Neon border in gate color or warning red
      const strokeCol = blockedStatus === 'all' ? '#ef4444' : blockedStatus === 'partial' ? '#f59e0b' : col;
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = strokeCol;
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      if (typeof (ctx as any).roundRect === 'function') {
        ctx.stroke();
      } else {
        ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);
      }

      // 4. CRITICAL: Completely clear all shadows so text is razor-sharp with no blur or chromatic ghosting
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // 5. Crisp high-contrast label in white or red
      ctx.fillStyle = blockedStatus === 'all' ? '#fca5a5' : '#ffffff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, badgeX + padX, Math.round(badgeY + badgeH / 2));

      ctx.restore();
    };

    if (room.exits.left) {
      const ex = room.exits.left;
      const isGated = isGatedExit(ex);
      const col = isGated ? (ex.color || getGateColor(ex.id)) : room.themeColor;
      const ranges = getOpenExitRanges('left');

      for (const [start, end] of ranges) {
        const segments = getExitSegments('left', start, end);
        for (const seg of segments) {
          const y = seg.start * TILE_SIZE;
          const h = (seg.end - seg.start + 1) * TILE_SIZE;

          if (seg.isBlocked) {
            // Blocked: red hazard inward aura
            const grad = ctx.createLinearGradient(0, 0, 16, 0);
            grad.addColorStop(0, 'rgba(239, 68, 68, 0.28)');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.fillRect(0, y, 16, h);

            // Red hazard diagonal stripe border
            drawHazardStrip(0, y, borderThickness, h, 'left');
          } else {
            // Open: Portal aura gradient extending into room
            const grad = ctx.createLinearGradient(0, 0, 16, 0);
            grad.addColorStop(0, `${col}33`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.fillRect(0, y, 16, h);

            // Glowing border indicator along edge
            ctx.fillStyle = col;
            ctx.shadowColor = col;
            ctx.shadowBlur = 8;
            ctx.fillRect(0, y, borderThickness, h);
            ctx.shadowBlur = 0;
          }
        }
      }
    }
    if (room.exits.right) {
      const ex = room.exits.right;
      const isGated = isGatedExit(ex);
      const col = isGated ? (ex.color || getGateColor(ex.id)) : room.themeColor;
      const ranges = getOpenExitRanges('right');

      for (const [start, end] of ranges) {
        const segments = getExitSegments('right', start, end);
        for (const seg of segments) {
          const y = seg.start * TILE_SIZE;
          const h = (seg.end - seg.start + 1) * TILE_SIZE;

          if (seg.isBlocked) {
            // Blocked: red hazard inward aura
            const grad = ctx.createLinearGradient(ROOM_SIZE, 0, ROOM_SIZE - 16, 0);
            grad.addColorStop(0, 'rgba(239, 68, 68, 0.28)');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.fillRect(ROOM_SIZE - 16, y, 16, h);

            // Red hazard diagonal stripe border
            drawHazardStrip(ROOM_SIZE - borderThickness, y, borderThickness, h, 'right');
          } else {
            // Open: Portal aura gradient extending into room
            const grad = ctx.createLinearGradient(ROOM_SIZE, 0, ROOM_SIZE - 16, 0);
            grad.addColorStop(0, `${col}33`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.fillRect(ROOM_SIZE - 16, y, 16, h);

            // Glowing border indicator along edge
            ctx.fillStyle = col;
            ctx.shadowColor = col;
            ctx.shadowBlur = 8;
            ctx.fillRect(ROOM_SIZE - borderThickness, y, borderThickness, h);
            ctx.shadowBlur = 0;
          }
        }
      }
    }
    if (room.exits.up) {
      const ex = room.exits.up;
      const isGated = isGatedExit(ex);
      const col = isGated ? (ex.color || getGateColor(ex.id)) : room.themeColor;
      const ranges = getOpenExitRanges('up');

      for (const [start, end] of ranges) {
        const segments = getExitSegments('up', start, end);
        for (const seg of segments) {
          const x = seg.start * TILE_SIZE;
          const w = (seg.end - seg.start + 1) * TILE_SIZE;

          if (seg.isBlocked) {
            // Blocked: red hazard inward aura
            const grad = ctx.createLinearGradient(0, 0, 0, 16);
            grad.addColorStop(0, 'rgba(239, 68, 68, 0.28)');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.fillRect(x, 0, w, 16);

            // Red hazard diagonal stripe border
            drawHazardStrip(x, 0, w, borderThickness, 'up');
          } else {
            // Open: Portal aura gradient extending into room
            const grad = ctx.createLinearGradient(0, 0, 0, 16);
            grad.addColorStop(0, `${col}33`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.fillRect(x, 0, w, 16);

            // Glowing border indicator along edge
            ctx.fillStyle = col;
            ctx.shadowColor = col;
            ctx.shadowBlur = 8;
            ctx.fillRect(x, 0, w, borderThickness);
            ctx.shadowBlur = 0;
          }
        }
      }
    }
    if (room.exits.down) {
      const ex = room.exits.down;
      const isGated = isGatedExit(ex);
      const col = isGated ? (ex.color || getGateColor(ex.id)) : room.themeColor;
      const ranges = getOpenExitRanges('down');

      for (const [start, end] of ranges) {
        const segments = getExitSegments('down', start, end);
        for (const seg of segments) {
          const x = seg.start * TILE_SIZE;
          const w = (seg.end - seg.start + 1) * TILE_SIZE;

          if (seg.isBlocked) {
            // Blocked: red hazard inward aura
            const grad = ctx.createLinearGradient(0, ROOM_SIZE, 0, ROOM_SIZE - 16);
            grad.addColorStop(0, 'rgba(239, 68, 68, 0.28)');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.fillRect(x, ROOM_SIZE - 16, w, 16);

            // Red hazard diagonal stripe border
            drawHazardStrip(x, ROOM_SIZE - borderThickness, w, borderThickness, 'down');
          } else {
            // Open: Portal aura gradient extending into room
            const grad = ctx.createLinearGradient(0, ROOM_SIZE, 0, ROOM_SIZE - 16);
            grad.addColorStop(0, `${col}33`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.fillRect(x, ROOM_SIZE - 16, w, 16);

            // Glowing border indicator along edge
            ctx.fillStyle = col;
            ctx.shadowColor = col;
            ctx.shadowBlur = 8;
            ctx.fillRect(x, ROOM_SIZE - borderThickness, w, borderThickness);
            ctx.shadowBlur = 0;
          }
        }
      }
    }

    // 3. Render Tiles
    for (let r = 0; r < GRID_ROWS; r++) {
      const rowStr = room.grid[r] || '';
      for (let c = 0; c < GRID_COLS; c++) {
        const glyph = rowStr[c] || ' ';
        const x = c * TILE_SIZE;
        const y = r * TILE_SIZE;

        if (glyph === '#') {
          // Solid Block
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = room.themeColor;
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);

          // Inner bevel
          ctx.strokeStyle = `${room.accentColor}55`;
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8);
        } else if (glyph === '=') {
          // One-Way Platform
          ctx.fillStyle = '#00ffaa33';
          ctx.fillRect(x, y, TILE_SIZE, 8);
          ctx.fillStyle = '#00ffaa';
          ctx.fillRect(x, y, TILE_SIZE, 4);

          // Upward indicator arrows
          ctx.fillStyle = '#00ffaa';
          ctx.beginPath();
          ctx.moveTo(x + 14, y + 14);
          ctx.lineTo(x + 20, y + 8);
          ctx.lineTo(x + 26, y + 14);
          ctx.closePath();
          ctx.fill();
        } else if (glyph === '^') {
          // Spike Up
          ctx.fillStyle = '#ff0055';
          ctx.beginPath();
          ctx.moveTo(x + 5, y + TILE_SIZE);
          ctx.lineTo(x + 20, y + 6);
          ctx.lineTo(x + 35, y + TILE_SIZE);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();
        } else if (glyph === 'v') {
          // Spike Down
          ctx.fillStyle = '#ff0055';
          ctx.beginPath();
          ctx.moveTo(x + 5, y);
          ctx.lineTo(x + 20, y + TILE_SIZE - 6);
          ctx.lineTo(x + 35, y);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();
        } else if (glyph === '<') {
          // Spike Left
          ctx.fillStyle = '#ff0055';
          ctx.beginPath();
          ctx.moveTo(x + TILE_SIZE, y + 5);
          ctx.lineTo(x + 6, y + 20);
          ctx.lineTo(x + TILE_SIZE, y + 35);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();
        } else if (glyph === '>') {
          // Spike Right
          ctx.fillStyle = '#ff0055';
          ctx.beginPath();
          ctx.moveTo(x, y + 5);
          ctx.lineTo(x + TILE_SIZE - 6, y + 20);
          ctx.lineTo(x, y + 35);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();
        } else if (glyph === 'B') {
          // Bounce Pad
          ctx.fillStyle = '#ff00d433';
          ctx.fillRect(x, y + 26, TILE_SIZE, 14);
          ctx.fillStyle = '#ff00d4';
          ctx.fillRect(x, y + 22, TILE_SIZE, 6);

          // Energy wave
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x + 8, y + 16);
          ctx.lineTo(x + 20, y + 10);
          ctx.lineTo(x + 32, y + 16);
          ctx.stroke();
        } else if (glyph === 'C') {
          // Crumble Block
          ctx.fillStyle = '#ffaa0022';
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = '#ffaa00';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);

          // Crack lines
          ctx.beginPath();
          ctx.moveTo(x + 6, y + 8);
          ctx.lineTo(x + 18, y + 22);
          ctx.lineTo(x + 32, y + 16);
          ctx.moveTo(x + 18, y + 22);
          ctx.lineTo(x + 22, y + 34);
          ctx.stroke();
        } else if (glyph === 'G') {
          // Goal Beacon
          ctx.fillStyle = '#ffff0033';
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = '#ffff00';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 6, y + 6, TILE_SIZE - 12, TILE_SIZE - 12);

          // Center portal star
          ctx.fillStyle = '#ffff00';
          ctx.beginPath();
          ctx.arc(x + 20, y + 20, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 4. Line / Rect Tool In-Progress Preview
    if (isMouseDown && dragStart && hoverPos) {
      ctx.fillStyle = '#00f0ff44';
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;

      if (currentTool === 'line') {
        const cells = getLineCells(dragStart.row, dragStart.col, hoverPos.row, hoverPos.col);
        for (const c of cells) {
          ctx.fillRect(c.c * TILE_SIZE, c.r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          ctx.strokeRect(c.c * TILE_SIZE, c.r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      } else if (currentTool === 'rect') {
        const cells = getRectCells(dragStart.row, dragStart.col, hoverPos.row, hoverPos.col);
        for (const c of cells) {
          ctx.fillRect(c.c * TILE_SIZE, c.r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          ctx.strokeRect(c.c * TILE_SIZE, c.r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }
    }

    // 5. Grid Lines
    if (showGrid) {
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;

      for (let i = 0; i <= GRID_COLS; i++) {
        ctx.beginPath();
        ctx.moveTo(i * TILE_SIZE, 0);
        ctx.lineTo(i * TILE_SIZE, ROOM_SIZE);
        ctx.stroke();
      }
      for (let i = 0; i <= GRID_ROWS; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * TILE_SIZE);
        ctx.lineTo(ROOM_SIZE, i * TILE_SIZE);
        ctx.stroke();
      }
    }

    // 6. Dynamic Entities Layer
    if (showEntities) {
      // A. Moving Platforms
      if (room.movingPlatforms) {
        for (const plat of room.movingPlatforms) {
          const isSelected = selectedEntity?.type === 'movingPlatform' && selectedEntity.id === plat.id;
          const color = plat.themeColor || '#00e5ff';

          // Trajectory path line
          ctx.strokeStyle = `${color}99`;
          ctx.setLineDash([6, 6]);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(plat.startX, plat.startY);
          ctx.lineTo(plat.endX, plat.endY);
          ctx.stroke();
          ctx.setLineDash([]);

          // Ghost platform at end
          const pWidth = plat.width || 80;
          const pHeight = plat.height || 16;
          ctx.fillStyle = `${color}22`;
          ctx.strokeStyle = `${color}66`;
          ctx.lineWidth = 1.5;
          ctx.fillRect(plat.endX - pWidth / 2, plat.endY - pHeight / 2, pWidth, pHeight);
          ctx.strokeRect(plat.endX - pWidth / 2, plat.endY - pHeight / 2, pWidth, pHeight);

          // Platform at start
          ctx.fillStyle = `${color}44`;
          ctx.strokeStyle = color;
          ctx.lineWidth = isSelected ? 3 : 2;
          ctx.fillRect(plat.startX - pWidth / 2, plat.startY - pHeight / 2, pWidth, pHeight);
          ctx.strokeRect(plat.startX - pWidth / 2, plat.startY - pHeight / 2, pWidth, pHeight);

          // Start handle
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(plat.startX, plat.startY, 5, 0, Math.PI * 2);
          ctx.fill();

          // End handle
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(plat.endX, plat.endY, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // B. Laser Barriers
      if (room.laserBarriers) {
        for (const bar of room.laserBarriers) {
          const isSelected = selectedEntity?.type === 'laserBarrier' && selectedEntity.id === bar.id;
          const color = bar.themeColor || '#ff0055';

          // Laser beam line
          ctx.strokeStyle = color;
          ctx.lineWidth = isSelected ? Math.max(5, (bar.width || 4) + 2) : (bar.width || 4);
          ctx.shadowColor = color;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.moveTo(bar.startX1, bar.startY1);
          ctx.lineTo(bar.startX2, bar.startY2);
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Harmonic movement preview if moving endpoints are configured
          if (
            bar.endX1 !== undefined &&
            bar.endY1 !== undefined &&
            bar.endX2 !== undefined &&
            bar.endY2 !== undefined
          ) {
            ctx.strokeStyle = `${color}66`;
            ctx.setLineDash([4, 4]);
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(bar.startX1, bar.startY1);
            ctx.lineTo(bar.endX1, bar.endY1);
            ctx.moveTo(bar.startX2, bar.startY2);
            ctx.lineTo(bar.endX2, bar.endY2);
            ctx.stroke();
            ctx.setLineDash([]);

            // Ghost beam at end
            ctx.strokeStyle = `${color}44`;
            ctx.lineWidth = bar.width || 4;
            ctx.beginPath();
            ctx.moveTo(bar.endX1, bar.endY1);
            ctx.lineTo(bar.endX2, bar.endY2);
            ctx.stroke();

            // End handles
            ctx.fillStyle = isSelected ? '#ffffff' : `${color}cc`;
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(bar.endX1, bar.endY1, isSelected ? 6 : 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(bar.endX2, bar.endY2, isSelected ? 6 : 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }

          // Pylon 1 Handle
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(bar.startX1, bar.startY1, 6, 0, Math.PI * 2);
          ctx.fill();

          // Pylon 2 Handle
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(bar.startX2, bar.startY2, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // C. Laser Turrets
      if (room.laserTurrets) {
        for (const tur of room.laserTurrets) {
          const isSelected = selectedEntity?.type === 'laserTurret' && selectedEntity.id === tur.id;
          const color = tur.themeColor || '#00e5ff';

          // Turret Mount Box
          ctx.fillStyle = '#1e293b';
          ctx.strokeStyle = color;
          ctx.lineWidth = isSelected ? 3 : 2;
          ctx.fillRect(tur.x - 12, tur.y - 12, 24, 24);
          ctx.strokeRect(tur.x - 12, tur.y - 12, 24, 24);

          // Aim Trajectory Line
          const angleRad = getBaseFiringAngle(tur);

          const aimLength = tur.mode === 'beam' ? 600 : 120;
          ctx.strokeStyle = tur.mode === 'beam' ? '#ff007f99' : '#00e5ff99';
          ctx.setLineDash([4, 4]);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(tur.x, tur.y);
          ctx.lineTo(tur.x + Math.cos(angleRad) * aimLength, tur.y + Math.sin(angleRad) * aimLength);
          ctx.stroke();
          ctx.setLineDash([]);

          // Nozzle
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(tur.x + Math.cos(angleRad) * 12, tur.y + Math.sin(angleRad) * 12, 4, 0, Math.PI * 2);
          ctx.fill();

          // Auto-Targeting Reticle & Range Indicator
          if (tur.autoTarget) {
            if (tur.targetRange && tur.targetRange > 0 && isSelected) {
              ctx.save();
              ctx.strokeStyle = '#39ff14';
              ctx.globalAlpha = 0.35;
              ctx.setLineDash([6, 6]);
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.arc(tur.x, tur.y, tur.targetRange, 0, Math.PI * 2);
              ctx.stroke();
              ctx.restore();
            }

            ctx.save();
            ctx.strokeStyle = '#39ff14';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(tur.x, tur.y, 6, 0, Math.PI * 2);
            ctx.moveTo(tur.x - 9, tur.y);
            ctx.lineTo(tur.x + 9, tur.y);
            ctx.moveTo(tur.x, tur.y - 9);
            ctx.lineTo(tur.x, tur.y + 9);
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      // D. Collectibles
      if (room.collectibles) {
        for (const col of room.collectibles) {
          const isSelected = selectedEntity?.type === 'collectible' && selectedEntity.id === col.id;

          if (col.type === 'core') {
            ctx.fillStyle = '#00f0ff';
            ctx.strokeStyle = isSelected ? '#ffffff' : '#00aaff';
            ctx.lineWidth = isSelected ? 2 : 1;
            ctx.beginPath();
            ctx.moveTo(col.x, col.y - 10);
            ctx.lineTo(col.x + 10, col.y);
            ctx.lineTo(col.x, col.y + 10);
            ctx.lineTo(col.x - 10, col.y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          } else if (col.type === 'prism') {
            ctx.fillStyle = '#d000ff';
            ctx.strokeStyle = isSelected ? '#ffffff' : '#ff00aa';
            ctx.lineWidth = isSelected ? 2 : 1;
            ctx.beginPath();
            ctx.moveTo(col.x, col.y - 12);
            ctx.lineTo(col.x + 10, col.y + 8);
            ctx.lineTo(col.x - 10, col.y + 8);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          } else {
            // Gate Key Collectible (rendered using Lucide Key vector geometry)
            const keyColor = col.color || getGateColor(col.id);
            const keySize = 22;

            ctx.save();
            ctx.translate(col.x, col.y);

            const scale = keySize / 24;
            ctx.scale(scale, scale);
            ctx.translate(-12, -12); // Center 24x24 Lucide viewBox at (col.x, col.y)

            const strokeCol = isSelected ? '#ffffff' : keyColor;
            ctx.strokeStyle = strokeCol;
            ctx.lineWidth = isSelected ? 2.5 : 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.shadowColor = strokeCol;
            ctx.shadowBlur = isSelected ? 10 : 6;

            // 1. Head (circle at cx=15.5, cy=7.5, r=5.5)
            ctx.beginPath();
            ctx.arc(15.5, 7.5, 5.5, 0, Math.PI * 2);
            ctx.fillStyle = isSelected ? '#ffffff33' : `${keyColor}33`;
            ctx.fill();
            ctx.stroke();

            // 2. Shaft (line from (2, 21) to (11.6, 11.4))
            ctx.beginPath();
            ctx.moveTo(2, 21);
            ctx.lineTo(11.6, 11.4);
            ctx.stroke();

            // 3. Teeth (Lucide SVG path: m7.5 15.5 2.3 2.3a1 1 0 0 1 0 1.4l-2.1 2.1a1 1 0 0 1-1.4 0L4 19)
            if (LUCIDE_KEY_TEETH_PATH) {
              ctx.stroke(LUCIDE_KEY_TEETH_PATH);
            } else {
              ctx.beginPath();
              ctx.moveTo(7.5, 15.5);
              ctx.lineTo(9.8, 17.8);
              ctx.lineTo(9.8, 19.2);
              ctx.lineTo(7.7, 21.3);
              ctx.lineTo(6.3, 21.3);
              ctx.lineTo(4, 19);
              ctx.stroke();
            }

            ctx.restore();

            // Floating badge above key (clean, non-overlapping)
            const labelText = `🔑 ${col.label || col.id}`;
            ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
            const tw = ctx.measureText(labelText).width;
            const badgeW = Math.round(tw + 12);
            const badgeH = 18;
            const badgeX = Math.round(col.x - badgeW * 0.5);
            const badgeY = Math.round(col.y - 28);

            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
            ctx.shadowBlur = 6;
            ctx.shadowOffsetY = 1;

            ctx.fillStyle = '#080d1a';
            if (typeof (ctx as any).roundRect === 'function') {
              ctx.beginPath();
              (ctx as any).roundRect(badgeX, badgeY, badgeW, badgeH, 3);
              ctx.fill();
            } else {
              ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
            }

            ctx.strokeStyle = isSelected ? '#ffffff' : keyColor;
            ctx.lineWidth = isSelected ? 1.5 : 1;
            ctx.shadowColor = isSelected ? '#ffffff' : keyColor;
            ctx.shadowBlur = 4;
            if (typeof (ctx as any).roundRect === 'function') {
              ctx.stroke();
            } else {
              ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);
            }

            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;

            ctx.fillStyle = isSelected ? '#ffffff' : keyColor;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(labelText, col.x, Math.round(badgeY + badgeH / 2));
            ctx.restore();
          }
        }
      }

      // E. Quantum Teleportation Portals (Simple, static editor representation)
      if (room.portals) {
        for (const p of room.portals) {
          const isSelected = selectedEntity?.type === 'portal' && selectedEntity.id === p.id;
          const x = p.x;
          const y = p.y;
          const w = p.width ?? 44;
          const h = p.height ?? 68;
          const cx = x + w * 0.5;
          const cy = y + h * 0.5;
          const portalColor = p.themeColor || room.themeColor;
          const isSource = !!p.targetPortalId;

          // Find target room for destination color reflection
          let destRoom: RoomData | undefined;
          let destPortal: any = null;
          if (p.targetPortalId) {
            for (const r of world.rooms) {
              const found = r.portals?.find((other) => other.id === p.targetPortalId);
              if (found) {
                destRoom = r;
                destPortal = found;
                break;
              }
            }
          }
          const destColor = destRoom?.themeColor || portalColor;

          ctx.save();

          // 1. Base pedestal line
          ctx.fillStyle = portalColor;
          ctx.fillRect(x - 2, y + h - 3, w + 4, 3);

          // 2. Static Portal Frame
          const cornerRadius = Math.min(w * 0.5, 10);
          ctx.fillStyle = 'rgba(10, 16, 30, 0.85)';
          ctx.strokeStyle = isSelected ? '#ffffff' : portalColor;
          ctx.lineWidth = isSelected ? 2.5 : 1.5;
          ctx.beginPath();
          ctx.roundRect(x, y, w, h - 2, cornerRadius);
          ctx.fill();
          ctx.stroke();

          // 3. Simple Inner Aperture
          const pad = 6;
          const innerW = w - pad * 2;
          const innerH = h - pad * 2 - 2;
          ctx.fillStyle = `${destColor}33`;
          ctx.strokeStyle = `${destColor}88`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(x + pad, y + pad, innerW, innerH, Math.min(innerW * 0.5, 8));
          ctx.fill();
          ctx.stroke();

          // 4. Static Gateway Glyph (Oval & Core Dot)
          ctx.strokeStyle = destColor;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(cx, cy, innerW * 0.35, innerH * 0.3, 0, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = isSource ? '#ffffff' : destColor;
          ctx.beginPath();
          ctx.arc(cx, cy, 3, 0, Math.PI * 2);
          ctx.fill();

          if (p.reverseVelocity) {
            ctx.fillStyle = '#ff3366';
            ctx.font = 'bold 7px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('REV', cx, cy + innerH * 0.32);
          }

          // 5. Static Label Badge
          const revTag = p.reverseVelocity ? '↺ ' : '';
          const labelText = revTag + (p.label || (isSource ? `${p.id} ➔ ${p.targetPortalId}` : p.id));
          ctx.font = 'bold 9px monospace';
          const tw = ctx.measureText(labelText).width;
          const badgeW = tw + 8;
          const badgeH = 14;
          const badgeX = cx - badgeW * 0.5;
          const badgeY = y - 10;

          ctx.fillStyle = '#080d1a';
          ctx.strokeStyle = isSelected ? '#ffffff' : portalColor;
          ctx.lineWidth = isSelected ? 1.5 : 1;
          ctx.beginPath();
          ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = isSelected ? '#ffffff' : (isSource ? '#00e5ff' : portalColor);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(labelText, cx, badgeY + badgeH * 0.5);

          // 6. Simple Link Line to Destination (when selected)
          if (isSelected && destRoom && destRoom.id === room.id && destPortal) {
            const destCx = destPortal.x + (destPortal.width ?? 44) * 0.5;
            const destCy = destPortal.y + (destPortal.height ?? 68) * 0.5;

            ctx.save();
            ctx.strokeStyle = destColor;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);

            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(destCx, destCy);
            ctx.stroke();

            // Destination highlight box
            ctx.setLineDash([]);
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = destColor;
            const dw = destPortal.width ?? 44;
            const dh = destPortal.height ?? 68;
            ctx.strokeRect(destPortal.x - 2, destPortal.y - 2, dw + 4, dh + 4);
            ctx.restore();
          } else if (isSelected && destRoom && destRoom.id !== room.id) {
            // Static destination beacon badge
            ctx.save();
            const beaconText = `➔ Sector [${destRoom.coords[0]}, ${destRoom.coords[1]}]: ${destRoom.title}`;
            ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
            const bTw = ctx.measureText(beaconText).width;
            const bW = bTw + 12;
            const bH = 18;
            const bX = cx - bW * 0.5;
            const bY = y + h + 6;

            ctx.fillStyle = '#0a101d';
            ctx.strokeStyle = destColor;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(bX, bY, bW, bH, 3);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(beaconText, cx, bY + bH * 0.5);
            ctx.restore();
          }

          ctx.restore();
        }
      }

      // F. Player Spawn Point
      if (room.spawnPoint) {
        const [sx, sy] = room.spawnPoint;
        const isSelected = selectedEntity?.type === 'spawn';

        // Target Reticle
        ctx.strokeStyle = isSelected ? '#ffffff' : '#00ff88';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy, 14, 0, Math.PI * 2);
        ctx.moveTo(sx - 18, sy);
        ctx.lineTo(sx + 18, sy);
        ctx.moveTo(sx, sy - 18);
        ctx.lineTo(sx, sy + 18);
        ctx.stroke();

        // Player Avatar Box (standing height 36, width 24)
        ctx.fillStyle = isSelected ? '#00ff8888' : '#00ff8844';
        ctx.fillRect(sx - 12, sy - 36, 24, 36);
        ctx.strokeRect(sx - 12, sy - 36, 24, 36);

        // Spawn Label
        ctx.font = 'bold 9px monospace';
        ctx.fillStyle = '#00ff88';
        ctx.fillText('SPAWN', sx - 16, sy - 42);
      }
    }

    // 6.5. Exit Badges & Indicators Overlay (rendered on top of grid lines and entities for crisp visibility)
    const exitDirections: ('left' | 'right' | 'up' | 'down')[] = ['left', 'right', 'up', 'down'];
    for (const dir of exitDirections) {
      const ex = room.exits[dir];
      if (!ex) continue;
      const isGated = isGatedExit(ex);
      const col = isGated ? (ex.color || getGateColor(ex.id)) : room.themeColor;
      const ranges = getOpenExitRanges(dir);

      if (isGated) {
        const keyLabel = getGateKeyLabel(ex);
        const mainRange = ranges.length > 0
          ? ranges.reduce((prev, curr) => (curr[1] - curr[0] > prev[1] - prev[0] ? curr : prev), ranges[0])
          : [7, 12] as [number, number];
        const centerPos = (mainRange[0] + mainRange[1] + 1) * 0.5 * TILE_SIZE;

        const segments = getExitSegments(dir, mainRange[0], mainRange[1]);
        const allBlocked = segments.length > 0 && segments.every((s) => s.isBlocked);
        const someBlocked = segments.some((s) => s.isBlocked);
        const blockedStatus = allBlocked ? 'all' : someBlocked ? 'partial' : 'none';

        drawLockedGateBadge(dir, keyLabel, col, centerPos, blockedStatus);
      } else {
        // Regular exits: render blocked badges and exit arrows on top of grid lines
        for (const [start, end] of ranges) {
          const segments = getExitSegments(dir, start, end);
          for (const seg of segments) {
            const midPos = (seg.start + seg.end + 1) * 0.5 * TILE_SIZE;
            if (seg.isBlocked) {
              drawBlockedMarker(dir, midPos, seg.reason);
            } else {
              if (dir === 'left') drawExitArrow(14, midPos, Math.PI, col);
              else if (dir === 'right') drawExitArrow(ROOM_SIZE - 14, midPos, 0, col);
              else if (dir === 'up') drawExitArrow(midPos, 14, -Math.PI / 2, col);
              else if (dir === 'down') drawExitArrow(midPos, ROOM_SIZE - 14, Math.PI / 2, col);
            }
          }
        }
      }
    }

    // 7. Hover Cursor Indicator
    if (hoverPos && currentTool !== 'select') {
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      const bSize = (currentTool === 'pencil' || currentTool === 'eraser') ? brushSize : 1;
      ctx.strokeRect(
        hoverPos.col * TILE_SIZE,
        hoverPos.row * TILE_SIZE,
        TILE_SIZE * bSize,
        TILE_SIZE * bSize
      );
    }

    // 8. Hairline Coordinate Guidelines
    if (showCoordinates && hoverPos) {
      ctx.strokeStyle = '#00f0ff44';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      // Horizontal crosshair
      ctx.beginPath();
      ctx.moveTo(0, hoverPos.row * TILE_SIZE + TILE_SIZE / 2);
      ctx.lineTo(ROOM_SIZE, hoverPos.row * TILE_SIZE + TILE_SIZE / 2);
      ctx.stroke();

      // Vertical crosshair
      ctx.beginPath();
      ctx.moveTo(hoverPos.col * TILE_SIZE + TILE_SIZE / 2, 0);
      ctx.lineTo(hoverPos.col * TILE_SIZE + TILE_SIZE / 2, ROOM_SIZE);
      ctx.stroke();

      ctx.setLineDash([]);
    }
  }, [
    room,
    world,
    showGrid,
    showEntities,
    showCoordinates,
    currentTool,
    selectedGlyph,
    selectedEntity,
    hoverPos,
    isMouseDown,
    dragStart,
    brushSize,
  ]);

  const adjacent = getAdjacentSectors(room, world);

  return (
    <div className="flex-1 flex flex-col bg-cyber-bg overflow-hidden relative" ref={containerRef}>
      {/* Canvas Viewport Container */}
      <div className="flex-1 overflow-auto flex p-6 select-none">
        <div
          className="m-auto grid shrink-0"
          style={{
            gridTemplateColumns: '170px auto 170px',
            gridTemplateRows: '48px auto 48px',
          }}
        >
          {/* Top / North Adjacent Sector Navigation (Row 1, Col 2) */}
          <div className={`col-start-2 row-start-1 min-w-0 flex items-end justify-center pb-2.5 self-stretch ${showCoordinates ? 'pl-7' : ''}`}>
            {adjacent.up.room ? (
              <button
                type="button"
                onClick={() => onSelectRoom(adjacent.up.room!.id)}
                className={`flex items-center space-x-2 px-4 py-1.5 rounded-full border transition-all shadow-lg group max-w-full ${
                  adjacent.up.isConnected
                    ? 'bg-cyber-surface/95 border-cyber-cyan/60 hover:border-cyber-cyan hover:bg-cyber-card hover:shadow-cyber-cyan/20'
                    : 'bg-cyber-surface/60 border-cyber-border/60 hover:border-slate-400 hover:bg-cyber-card'
                }`}
                title={`Jump to Sector (${adjacent.up.room.coords[0]}, ${adjacent.up.room.coords[1]}): ${adjacent.up.room.title}`}
              >
                <ArrowUp className="w-3.5 h-3.5 text-cyber-cyan group-hover:-translate-y-0.5 transition-transform shrink-0" />
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: adjacent.up.room.themeColor || '#00e5ff' }}
                />
                <span className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                  Sector ({adjacent.up.room.coords[0]}, {adjacent.up.room.coords[1]}): {adjacent.up.room.title}
                </span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                    adjacent.up.isConnected
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-700/50 text-slate-400 border border-slate-600/30'
                  }`}
                >
                  {adjacent.up.isConnected ? 'Connected' : 'Exit Closed'}
                </span>
              </button>
            ) : adjacent.up.isExitOpen ? (
              <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs">
                <ArrowUp className="w-3.5 h-3.5 shrink-0" />
                <span>Up Exit Open (No Sector at [{adjacent.up.targetCoords[0]}, {adjacent.up.targetCoords[1]}])</span>
              </div>
            ) : null}
          </div>

          {/* Left / West Adjacent Sector Navigation (Row 2, Col 1) */}
          <div className={`col-start-1 row-start-2 min-h-0 flex items-center justify-end pr-3 self-stretch ${showCoordinates ? 'pt-6' : ''}`}>
            {adjacent.left.room ? (
              <button
                type="button"
                onClick={() => onSelectRoom(adjacent.left.room!.id)}
                className={`flex items-center space-x-2 p-2 rounded-xl border transition-all shadow-md group max-w-[150px] shrink-0 text-left ${
                  adjacent.left.isConnected
                    ? 'bg-cyber-surface/95 border-cyber-cyan/60 hover:border-cyber-cyan hover:bg-cyber-card hover:shadow-cyber-cyan/20'
                    : 'bg-cyber-surface/60 border-cyber-border/60 hover:border-slate-400 hover:bg-cyber-card'
                }`}
                title={`Jump to Sector (${adjacent.left.room.coords[0]}, ${adjacent.left.room.coords[1]}): ${adjacent.left.room.title}`}
              >
                <ArrowLeft className="w-4 h-4 text-cyber-cyan group-hover:-translate-x-0.5 transition-transform shrink-0" />
                <div className="flex flex-col truncate min-w-0">
                  <div className="flex items-center space-x-1">
                    <div
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: adjacent.left.room.themeColor || '#00e5ff' }}
                    />
                    <span className="text-[10px] text-slate-400 font-mono truncate">
                      ({adjacent.left.room.coords[0]}, {adjacent.left.room.coords[1]})
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-200 group-hover:text-white truncate">
                    {adjacent.left.room.title}
                  </span>
                  <span
                    className={`text-[8px] font-bold px-1 py-0.2 rounded uppercase tracking-wider w-fit mt-0.5 ${
                      adjacent.left.isConnected
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-slate-700/50 text-slate-400'
                    }`}
                  >
                    {adjacent.left.isConnected ? 'Connected' : 'Exit Closed'}
                  </span>
                </div>
              </button>
            ) : adjacent.left.isExitOpen ? (
              <div
                className="flex items-center space-x-1 p-2 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 text-[10px] max-w-[110px] shrink-0"
                title={`Left exit open, but no sector exists at [${adjacent.left.targetCoords[0]}, ${adjacent.left.targetCoords[1]}]`}
              >
                <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Open (Void)</span>
              </div>
            ) : null}
          </div>

          {/* Center Coordinate Grid Block (Row 2, Col 2) */}
          <div className="col-start-2 row-start-2 flex flex-col shrink-0">
            {/* Top Ruler Bar */}
            {showCoordinates && (
              <div
                className="flex items-center"
                style={{ width: `${(ROOM_SIZE * zoom) + 28}px` }}
              >
                {/* Corner Coordinate Label */}
                <div className="w-7 h-6 bg-cyber-card border-t border-l border-b border-cyber-border rounded-tl flex items-center justify-center text-[9px] font-mono font-bold text-slate-500">
                  R\C
                </div>

                {/* Column Numbers 0..19 */}
                <div
                  className="h-6 bg-cyber-card border-t border-b border-r border-cyber-border rounded-tr flex overflow-hidden font-mono text-[9px]"
                  style={{ width: `${ROOM_SIZE * zoom}px` }}
                >
                  {Array.from({ length: GRID_COLS }).map((_, c) => {
                    const isHovered = hoverPos?.col === c;
                    return (
                      <div
                        key={c}
                        className={`flex-1 flex flex-col items-center justify-center border-r border-cyber-border/40 transition-colors ${
                          isHovered
                            ? 'bg-cyber-cyan/20 text-cyber-cyan font-bold ring-1 ring-inset ring-cyber-cyan/50'
                            : 'text-slate-500'
                        }`}
                        title={`Column ${c} (Pixels ${c * 40}..${(c + 1) * 40})`}
                      >
                        <span>{c}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Canvas Row: Left Ruler + Canvas */}
            <div className="flex">
              {/* Left Ruler Bar (Row Numbers 0..19) */}
              {showCoordinates && (
                <div
                  className="w-7 bg-cyber-card border-l border-r border-b border-cyber-border rounded-bl flex flex-col overflow-hidden font-mono text-[9px]"
                  style={{ height: `${ROOM_SIZE * zoom}px` }}
                >
                  {Array.from({ length: GRID_ROWS }).map((_, r) => {
                    const isHovered = hoverPos?.row === r;
                    return (
                      <div
                        key={r}
                        className={`flex-1 flex items-center justify-center border-b border-cyber-border/40 transition-colors ${
                          isHovered
                            ? 'bg-cyber-cyan/20 text-cyber-cyan font-bold ring-1 ring-inset ring-cyber-cyan/50'
                            : 'text-slate-500'
                        }`}
                        title={`Row ${r} (Pixels ${r * 40}..${(r + 1) * 40})`}
                      >
                        <span>{r}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Canvas Box */}
              <div
                className={`relative shadow-2xl border border-cyber-border overflow-hidden bg-black ${
                  showCoordinates ? 'rounded-br' : 'rounded-lg'
                }`}
                style={{
                  width: `${ROOM_SIZE * zoom}px`,
                  height: `${ROOM_SIZE * zoom}px`,
                }}
              >
                <canvas
                  ref={canvasRef}
                  className="w-full h-full block cursor-crosshair"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={() => {
                    setIsMouseDown(false);
                    setHoverPos(null);
                  }}
                />
              </div>
            </div>
          </div>

          {/* Right / East Adjacent Sector Navigation (Row 2, Col 3) */}
          <div className={`col-start-3 row-start-2 min-h-0 flex items-center justify-start pl-3 self-stretch ${showCoordinates ? 'pt-6' : ''}`}>
            {adjacent.right.room ? (
              <button
                type="button"
                onClick={() => onSelectRoom(adjacent.right.room!.id)}
                className={`flex items-center space-x-2 p-2 rounded-xl border transition-all shadow-md group max-w-[150px] shrink-0 text-left ${
                  adjacent.right.isConnected
                    ? 'bg-cyber-surface/95 border-cyber-cyan/60 hover:border-cyber-cyan hover:bg-cyber-card hover:shadow-cyber-cyan/20'
                    : 'bg-cyber-surface/60 border-cyber-border/60 hover:border-slate-400 hover:bg-cyber-card'
                }`}
                title={`Jump to Sector (${adjacent.right.room.coords[0]}, ${adjacent.right.room.coords[1]}): ${adjacent.right.room.title}`}
              >
                <div className="flex flex-col truncate min-w-0">
                  <div className="flex items-center space-x-1">
                    <div
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: adjacent.right.room.themeColor || '#00e5ff' }}
                    />
                    <span className="text-[10px] text-slate-400 font-mono truncate">
                      ({adjacent.right.room.coords[0]}, {adjacent.right.room.coords[1]})
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-200 group-hover:text-white truncate">
                    {adjacent.right.room.title}
                  </span>
                  <span
                    className={`text-[8px] font-bold px-1 py-0.2 rounded uppercase tracking-wider w-fit mt-0.5 ${
                      adjacent.right.isConnected
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-slate-700/50 text-slate-400'
                    }`}
                  >
                    {adjacent.right.isConnected ? 'Connected' : 'Exit Closed'}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-cyber-cyan group-hover:translate-x-0.5 transition-transform shrink-0" />
              </button>
            ) : adjacent.right.isExitOpen ? (
              <div
                className="flex items-center space-x-1 p-2 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 text-[10px] max-w-[110px] shrink-0"
                title={`Right exit open, but no sector exists at [${adjacent.right.targetCoords[0]}, ${adjacent.right.targetCoords[1]}]`}
              >
                <span className="truncate">Open (Void)</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </div>
            ) : null}
          </div>

          {/* Down / South Adjacent Sector Navigation (Row 3, Col 2) */}
          <div className={`col-start-2 row-start-3 min-w-0 flex items-start justify-center pt-2.5 self-stretch ${showCoordinates ? 'pl-7' : ''}`}>
            {adjacent.down.room ? (
              <button
                type="button"
                onClick={() => onSelectRoom(adjacent.down.room!.id)}
                className={`flex items-center space-x-2 px-4 py-1.5 rounded-full border transition-all shadow-lg group max-w-full ${
                  adjacent.down.isConnected
                    ? 'bg-cyber-surface/95 border-cyber-cyan/60 hover:border-cyber-cyan hover:bg-cyber-card hover:shadow-cyber-cyan/20'
                    : 'bg-cyber-surface/60 border-cyber-border/60 hover:border-slate-400 hover:bg-cyber-card'
                }`}
                title={`Jump to Sector (${adjacent.down.room.coords[0]}, ${adjacent.down.room.coords[1]}): ${adjacent.down.room.title}`}
              >
                <ArrowDown className="w-3.5 h-3.5 text-cyber-cyan group-hover:translate-y-0.5 transition-transform" />
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: adjacent.down.room.themeColor || '#00e5ff' }}
                />
                <span className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                  Sector ({adjacent.down.room.coords[0]}, {adjacent.down.room.coords[1]}): {adjacent.down.room.title}
                </span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                    adjacent.down.isConnected
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-700/50 text-slate-400 border border-slate-600/30'
                  }`}
                >
                  {adjacent.down.isConnected ? 'Connected' : 'Exit Closed'}
                </span>
              </button>
            ) : adjacent.down.isExitOpen ? (
              <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs">
                <ArrowDown className="w-3.5 h-3.5 shrink-0" />
                <span>Down Exit Open (No Sector at [{adjacent.down.targetCoords[0]}, {adjacent.down.targetCoords[1]}])</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Bottom Canvas Status Bar */}
      <div className="h-8 bg-cyber-surface border-t border-cyber-border px-4 flex items-center justify-between text-xs text-slate-400 select-none shrink-0 font-mono">
        <div className="flex items-center space-x-4">
          <span>
            Sector: <strong className="text-white">({room.coords[0]}, {room.coords[1]})</strong>
          </span>
          {hoverPos && (
            <>
              <span>
                Grid: <strong className="text-cyber-cyan">Row {hoverPos.row}, Col {hoverPos.col}</strong>
              </span>
              <span>
                Pixel: <strong className="text-cyber-cyan">X {Math.round(hoverPos.pixelX)}, Y {Math.round(hoverPos.pixelY)}</strong>
              </span>
              <span>
                Tile: <strong className="text-white">'{room.grid[hoverPos.row]?.[hoverPos.col] || ' '}'</strong>
              </span>
            </>
          )}
        </div>

        {/* Zoom & Help Controls */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5">
            <span>Zoom:</span>
            <div className="flex bg-cyber-bg p-0.5 rounded border border-cyber-border">
              {[0.75, 1.0, 1.25, 1.5].map((z) => (
                <button
                  key={z}
                  onClick={() => setZoom(z)}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                    zoom === z ? 'bg-cyber-card text-cyber-cyan' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {Math.round(z * 100)}%
                </button>
              ))}
            </div>
          </div>

          {onOpenHelp && (
            <button
              onClick={onOpenHelp}
              className="flex items-center space-x-1 px-2 py-0.5 bg-cyber-bg hover:bg-cyber-card border border-cyber-border rounded text-[11px] text-slate-300 hover:text-cyber-cyan transition-colors"
              title="Editor Controls & Keyboard Shortcuts [?]"
            >
              <span className="font-bold text-cyber-cyan">?</span>
              <span>Shortcuts</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

