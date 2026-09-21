import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import {
  GRID_COLS,
  GRID_ROWS,
  ROOM_PIXEL_SIZE,
  TILE_PIXEL_SIZE,
  RoomData,
  WorldData,
  TileGlyph,
  EditorTool,
  SelectedEntity,
} from '../types/world';
import { TILE_DEFINITIONS } from '../utils/tileDefinitions';
import { getAdjacentSectors } from '../utils/navigation.ts';

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
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [zoom, setZoom] = useState<number>(1.0);
  const [hoverPos, setHoverPos] = useState<{ col: number; row: number; pixelX: number; pixelY: number } | null>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [dragStart, setDragStart] = useState<{ col: number; row: number; pixelX: number; pixelY: number } | null>(null);

  // Dragging dynamic entity handle
  const [draggingEntityHandle, setDraggingEntityHandle] = useState<{
    entityType: 'spawn' | 'collectible' | 'movingPlatformStart' | 'movingPlatformEnd' | 'laserBarrier1' | 'laserBarrier2' | 'laserTurret';
    id?: string;
  } | null>(null);

  // Helper to get exact canvas coordinates from mouse event
  const getCanvasCoords = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = ROOM_PIXEL_SIZE / rect.width;
      const scaleY = ROOM_PIXEL_SIZE / rect.height;

      const pixelX = Math.max(0, Math.min(ROOM_PIXEL_SIZE - 1, (e.clientX - rect.left) * scaleX));
      const pixelY = Math.max(0, Math.min(ROOM_PIXEL_SIZE - 1, (e.clientY - rect.top) * scaleY));

      const col = Math.floor(pixelX / TILE_PIXEL_SIZE);
      const row = Math.floor(pixelY / TILE_PIXEL_SIZE);

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
        if (draggingEntityHandle.entityType === 'laserTurret') {
          return {
            ...prev,
            laserTurrets: prev.laserTurrets?.map((t) =>
              t.id === draggingEntityHandle.id ? { ...t, x: snapX, y: snapY } : t
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
    canvas.width = ROOM_PIXEL_SIZE * dpr;
    canvas.height = ROOM_PIXEL_SIZE * dpr;
    ctx.resetTransform();
    ctx.scale(dpr, dpr);

    // 1. Dark Void Background
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, ROOM_PIXEL_SIZE, ROOM_PIXEL_SIZE);

    // Subtle Room Theme Glow in Center
    const gradient = ctx.createRadialGradient(400, 400, 50, 400, 400, 450);
    gradient.addColorStop(0, `${room.themeColor}12`);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, ROOM_PIXEL_SIZE, ROOM_PIXEL_SIZE);

    // 2. Render Exit Indicators
    const borderThickness = 6;
    if (room.exits.left) {
      ctx.fillStyle = room.themeColor;
      ctx.fillRect(0, 10 * TILE_PIXEL_SIZE, borderThickness, 6 * TILE_PIXEL_SIZE);
    }
    if (room.exits.right) {
      ctx.fillStyle = room.themeColor;
      ctx.fillRect(ROOM_PIXEL_SIZE - borderThickness, 10 * TILE_PIXEL_SIZE, borderThickness, 6 * TILE_PIXEL_SIZE);
    }
    if (room.exits.up) {
      ctx.fillStyle = room.themeColor;
      ctx.fillRect(7 * TILE_PIXEL_SIZE, 0, 6 * TILE_PIXEL_SIZE, borderThickness);
    }
    if (room.exits.down) {
      ctx.fillStyle = room.themeColor;
      ctx.fillRect(7 * TILE_PIXEL_SIZE, ROOM_PIXEL_SIZE - borderThickness, 6 * TILE_PIXEL_SIZE, borderThickness);
    }

    // 3. Render Tiles
    for (let r = 0; r < GRID_ROWS; r++) {
      const rowStr = room.grid[r] || '';
      for (let c = 0; c < GRID_COLS; c++) {
        const glyph = rowStr[c] || ' ';
        const x = c * TILE_PIXEL_SIZE;
        const y = r * TILE_PIXEL_SIZE;

        if (glyph === '#') {
          // Solid Block
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(x, y, TILE_PIXEL_SIZE, TILE_PIXEL_SIZE);
          ctx.strokeStyle = room.themeColor;
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, y + 1, TILE_PIXEL_SIZE - 2, TILE_PIXEL_SIZE - 2);

          // Inner bevel
          ctx.strokeStyle = `${room.accentColor}55`;
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 4, y + 4, TILE_PIXEL_SIZE - 8, TILE_PIXEL_SIZE - 8);
        } else if (glyph === '=') {
          // One-Way Platform
          ctx.fillStyle = '#00ffaa33';
          ctx.fillRect(x, y, TILE_PIXEL_SIZE, 8);
          ctx.fillStyle = '#00ffaa';
          ctx.fillRect(x, y, TILE_PIXEL_SIZE, 4);

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
          ctx.moveTo(x + 5, y + TILE_PIXEL_SIZE);
          ctx.lineTo(x + 20, y + 6);
          ctx.lineTo(x + 35, y + TILE_PIXEL_SIZE);
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
          ctx.lineTo(x + 20, y + TILE_PIXEL_SIZE - 6);
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
          ctx.moveTo(x + TILE_PIXEL_SIZE, y + 5);
          ctx.lineTo(x + 6, y + 20);
          ctx.lineTo(x + TILE_PIXEL_SIZE, y + 35);
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
          ctx.lineTo(x + TILE_PIXEL_SIZE - 6, y + 20);
          ctx.lineTo(x, y + 35);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();
        } else if (glyph === 'B') {
          // Bounce Pad
          ctx.fillStyle = '#ff00d433';
          ctx.fillRect(x, y + 26, TILE_PIXEL_SIZE, 14);
          ctx.fillStyle = '#ff00d4';
          ctx.fillRect(x, y + 22, TILE_PIXEL_SIZE, 6);

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
          ctx.fillRect(x, y, TILE_PIXEL_SIZE, TILE_PIXEL_SIZE);
          ctx.strokeStyle = '#ffaa00';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 2, y + 2, TILE_PIXEL_SIZE - 4, TILE_PIXEL_SIZE - 4);

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
          ctx.fillRect(x, y, TILE_PIXEL_SIZE, TILE_PIXEL_SIZE);
          ctx.strokeStyle = '#ffff00';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 6, y + 6, TILE_PIXEL_SIZE - 12, TILE_PIXEL_SIZE - 12);

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
          ctx.fillRect(c.c * TILE_PIXEL_SIZE, c.r * TILE_PIXEL_SIZE, TILE_PIXEL_SIZE, TILE_PIXEL_SIZE);
          ctx.strokeRect(c.c * TILE_PIXEL_SIZE, c.r * TILE_PIXEL_SIZE, TILE_PIXEL_SIZE, TILE_PIXEL_SIZE);
        }
      } else if (currentTool === 'rect') {
        const cells = getRectCells(dragStart.row, dragStart.col, hoverPos.row, hoverPos.col);
        for (const c of cells) {
          ctx.fillRect(c.c * TILE_PIXEL_SIZE, c.r * TILE_PIXEL_SIZE, TILE_PIXEL_SIZE, TILE_PIXEL_SIZE);
          ctx.strokeRect(c.c * TILE_PIXEL_SIZE, c.r * TILE_PIXEL_SIZE, TILE_PIXEL_SIZE, TILE_PIXEL_SIZE);
        }
      }
    }

    // 5. Grid Lines
    if (showGrid) {
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;

      for (let i = 0; i <= GRID_COLS; i++) {
        ctx.beginPath();
        ctx.moveTo(i * TILE_PIXEL_SIZE, 0);
        ctx.lineTo(i * TILE_PIXEL_SIZE, ROOM_PIXEL_SIZE);
        ctx.stroke();
      }
      for (let i = 0; i <= GRID_ROWS; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * TILE_PIXEL_SIZE);
        ctx.lineTo(ROOM_PIXEL_SIZE, i * TILE_PIXEL_SIZE);
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
            ctx.fillStyle = `${color}aa`;
            ctx.beginPath();
            ctx.arc(bar.endX1, bar.endY1, 4, 0, Math.PI * 2);
            ctx.arc(bar.endX2, bar.endY2, 4, 0, Math.PI * 2);
            ctx.fill();
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
          let angleRad = 0;
          if (tur.angle !== undefined) {
            angleRad = (tur.angle * Math.PI) / 180;
          } else if (tur.direction === 'down') {
            angleRad = Math.PI / 2;
          } else if (tur.direction === 'up') {
            angleRad = -Math.PI / 2;
          } else if (tur.direction === 'left') {
            angleRad = Math.PI;
          } else {
            angleRad = 0; // right
          }

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
            // key
            ctx.fillStyle = '#ffcc00';
            ctx.beginPath();
            ctx.arc(col.x - 4, col.y - 4, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(col.x, col.y - 2, 10, 4);
          }
        }
      }

      // E. Player Spawn Point
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

    // 7. Hover Cursor Indicator
    if (hoverPos && currentTool !== 'select') {
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      const bSize = (currentTool === 'pencil' || currentTool === 'eraser') ? brushSize : 1;
      ctx.strokeRect(
        hoverPos.col * TILE_PIXEL_SIZE,
        hoverPos.row * TILE_PIXEL_SIZE,
        TILE_PIXEL_SIZE * bSize,
        TILE_PIXEL_SIZE * bSize
      );
    }

    // 8. Hairline Coordinate Guidelines
    if (showCoordinates && hoverPos) {
      ctx.strokeStyle = '#00f0ff44';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      // Horizontal crosshair
      ctx.beginPath();
      ctx.moveTo(0, hoverPos.row * TILE_PIXEL_SIZE + TILE_PIXEL_SIZE / 2);
      ctx.lineTo(ROOM_PIXEL_SIZE, hoverPos.row * TILE_PIXEL_SIZE + TILE_PIXEL_SIZE / 2);
      ctx.stroke();

      // Vertical crosshair
      ctx.beginPath();
      ctx.moveTo(hoverPos.col * TILE_PIXEL_SIZE + TILE_PIXEL_SIZE / 2, 0);
      ctx.lineTo(hoverPos.col * TILE_PIXEL_SIZE + TILE_PIXEL_SIZE / 2, ROOM_PIXEL_SIZE);
      ctx.stroke();

      ctx.setLineDash([]);
    }
  }, [
    room,
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
        <div className="m-auto flex flex-col items-center shrink-0">
          {/* Top / North Adjacent Sector Navigation */}
          {adjacent.up.room ? (
            <button
              type="button"
              onClick={() => onSelectRoom(adjacent.up.room!.id)}
              className={`mb-2.5 flex items-center space-x-2 px-4 py-1.5 rounded-full border transition-all shadow-lg group ${
                adjacent.up.isConnected
                  ? 'bg-cyber-surface/95 border-cyber-cyan/60 hover:border-cyber-cyan hover:bg-cyber-card hover:shadow-cyber-cyan/20'
                  : 'bg-cyber-surface/60 border-cyber-border/60 hover:border-slate-400 hover:bg-cyber-card'
              }`}
              title={`Jump to Sector (${adjacent.up.room.coords[0]}, ${adjacent.up.room.coords[1]}): ${adjacent.up.room.title}`}
            >
              <ArrowUp className="w-3.5 h-3.5 text-cyber-cyan group-hover:-translate-y-0.5 transition-transform" />
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: adjacent.up.room.themeColor || '#00e5ff' }}
              />
              <span className="text-xs font-semibold text-slate-200 group-hover:text-white">
                Sector ({adjacent.up.room.coords[0]}, {adjacent.up.room.coords[1]}): {adjacent.up.room.title}
              </span>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                  adjacent.up.isConnected
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-700/50 text-slate-400 border border-slate-600/30'
                }`}
              >
                {adjacent.up.isConnected ? 'Connected' : 'Exit Closed'}
              </span>
            </button>
          ) : adjacent.up.isExitOpen ? (
            <div className="mb-2.5 flex items-center space-x-1.5 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs">
              <ArrowUp className="w-3.5 h-3.5" />
              <span>Up Exit Open (No Sector at [{adjacent.up.targetCoords[0]}, {adjacent.up.targetCoords[1]}])</span>
            </div>
          ) : null}

          {/* Top Ruler Bar */}
          {showCoordinates && (
            <div
              className="flex items-center"
              style={{ width: `${(ROOM_PIXEL_SIZE * zoom) + 28}px` }}
            >
              {/* Corner Coordinate Label */}
              <div className="w-7 h-6 bg-cyber-card border-t border-l border-b border-cyber-border rounded-tl flex items-center justify-center text-[9px] font-mono font-bold text-slate-500">
                R\C
              </div>

              {/* Column Numbers 0..19 */}
              <div
                className="h-6 bg-cyber-card border-t border-b border-r border-cyber-border rounded-tr flex overflow-hidden font-mono text-[9px]"
                style={{ width: `${ROOM_PIXEL_SIZE * zoom}px` }}
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

          <div className="flex items-center">
            {/* Left / West Adjacent Sector */}
            {adjacent.left.room ? (
              <button
                type="button"
                onClick={() => onSelectRoom(adjacent.left.room!.id)}
                className={`mr-3 flex items-center space-x-2 p-2 rounded-xl border transition-all shadow-md group max-w-[150px] shrink-0 text-left ${
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
                className="mr-3 flex items-center space-x-1 p-2 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 text-[10px] max-w-[110px] shrink-0"
                title={`Left exit open, but no sector exists at [${adjacent.left.targetCoords[0]}, ${adjacent.left.targetCoords[1]}]`}
              >
                <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Open (Void)</span>
              </div>
            ) : null}

            {/* Left Ruler Bar (Row Numbers 0..19) */}
            {showCoordinates && (
              <div
                className="w-7 bg-cyber-card border-l border-r border-b border-cyber-border rounded-bl flex flex-col overflow-hidden font-mono text-[9px]"
                style={{ height: `${ROOM_PIXEL_SIZE * zoom}px` }}
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
                width: `${ROOM_PIXEL_SIZE * zoom}px`,
                height: `${ROOM_PIXEL_SIZE * zoom}px`,
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

            {/* Right / East Adjacent Sector */}
            {adjacent.right.room ? (
              <button
                type="button"
                onClick={() => onSelectRoom(adjacent.right.room!.id)}
                className={`ml-3 flex items-center space-x-2 p-2 rounded-xl border transition-all shadow-md group max-w-[150px] shrink-0 text-left ${
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
                className="ml-3 flex items-center space-x-1 p-2 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 text-[10px] max-w-[110px] shrink-0"
                title={`Right exit open, but no sector exists at [${adjacent.right.targetCoords[0]}, ${adjacent.right.targetCoords[1]}]`}
              >
                <span className="truncate">Open (Void)</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </div>
            ) : null}
          </div>

          {/* Down / South Adjacent Sector Navigation */}
          {adjacent.down.room ? (
            <button
              type="button"
              onClick={() => onSelectRoom(adjacent.down.room!.id)}
              className={`mt-2.5 flex items-center space-x-2 px-4 py-1.5 rounded-full border transition-all shadow-lg group ${
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
              <span className="text-xs font-semibold text-slate-200 group-hover:text-white">
                Sector ({adjacent.down.room.coords[0]}, {adjacent.down.room.coords[1]}): {adjacent.down.room.title}
              </span>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                  adjacent.down.isConnected
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-700/50 text-slate-400 border border-slate-600/30'
                }`}
              >
                {adjacent.down.isConnected ? 'Connected' : 'Exit Closed'}
              </span>
            </button>
          ) : adjacent.down.isExitOpen ? (
            <div className="mt-2.5 flex items-center space-x-1.5 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs">
              <ArrowDown className="w-3.5 h-3.5" />
              <span>Down Exit Open (No Sector at [{adjacent.down.targetCoords[0]}, {adjacent.down.targetCoords[1]}])</span>
            </div>
          ) : null}
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

        {/* Zoom Controls */}
        <div className="flex items-center space-x-2">
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
      </div>
    </div>
  );
};

