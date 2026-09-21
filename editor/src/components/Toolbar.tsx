import React from 'react';
import {
  Pencil,
  Minus,
  Square,
  PaintBucket,
  Eraser,
  Pipette,
  MousePointer,
  Grid,
  Eye,
  Crosshair,
} from 'lucide-react';
import { EditorTool, TileGlyph } from '../types/world';
import { TILE_DEFINITIONS } from '../utils/tileDefinitions';

interface ToolbarProps {
  currentTool: EditorTool;
  onSelectTool: (tool: EditorTool) => void;
  selectedGlyph: TileGlyph;
  onSelectGlyph: (glyph: TileGlyph) => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  showEntities: boolean;
  onToggleEntities: () => void;
  showCoordinates: boolean;
  onToggleCoordinates: () => void;
  brushSize: number;
  onChangeBrushSize: (size: number) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  currentTool,
  onSelectTool,
  selectedGlyph,
  onSelectGlyph,
  showGrid,
  onToggleGrid,
  showEntities,
  onToggleEntities,
  showCoordinates,
  onToggleCoordinates,
  brushSize,
  onChangeBrushSize,
}) => {
  const tools: { id: EditorTool; label: string; icon: React.ReactNode; hotkey: string }[] = [
    { id: 'select', label: 'Select / Move Entities', icon: <MousePointer className="w-4 h-4" />, hotkey: 'V' },
    { id: 'pencil', label: 'Pencil Brush', icon: <Pencil className="w-4 h-4" />, hotkey: 'B' },
    { id: 'line', label: 'Line Tool', icon: <Minus className="w-4 h-4" />, hotkey: 'L' },
    { id: 'rect', label: 'Rectangle Tool', icon: <Square className="w-4 h-4" />, hotkey: 'U' },
    { id: 'fill', label: 'Flood Fill Bucket', icon: <PaintBucket className="w-4 h-4" />, hotkey: 'F' },
    { id: 'eraser', label: 'Eraser', icon: <Eraser className="w-4 h-4" />, hotkey: 'E' },
    { id: 'eyedropper', label: 'Eyedropper', icon: <Pipette className="w-4 h-4" />, hotkey: 'I' },
  ];

  const glyphList: TileGlyph[] = ['#', '=', '^', 'v', '<', '>', 'B', 'C', 'G', ' '];

  return (
    <aside className="w-16 bg-cyber-surface border-r border-cyber-border flex flex-col items-center py-3 space-y-4 select-none shrink-0 z-10">
      {/* Tool Selection */}
      <div className="flex flex-col space-y-1 w-full px-2">
        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider text-center">Tools</span>
        {tools.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelectTool(t.id)}
            title={`${t.label} (${t.hotkey})`}
            className={`w-12 h-10 rounded flex items-center justify-center transition-all ${
              currentTool === t.id
                ? 'bg-cyber-cyan text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:bg-cyber-card hover:text-white'
            }`}
          >
            {t.icon}
          </button>
        ))}
      </div>

      <div className="w-8 h-px bg-cyber-border" />

      {/* Brush Size (1 or 2) */}
      <div className="flex flex-col items-center space-y-1">
        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Size</span>
        <div className="flex bg-cyber-bg p-0.5 rounded border border-cyber-border">
          <button
            onClick={() => onChangeBrushSize(1)}
            title="1x1 Brush"
            className={`w-5 h-5 text-[10px] font-bold rounded ${
              brushSize === 1 ? 'bg-cyber-card text-cyber-cyan' : 'text-slate-400 hover:text-white'
            }`}
          >
            1
          </button>
          <button
            onClick={() => onChangeBrushSize(2)}
            title="2x2 Brush"
            className={`w-5 h-5 text-[10px] font-bold rounded ${
              brushSize === 2 ? 'bg-cyber-card text-cyber-cyan' : 'text-slate-400 hover:text-white'
            }`}
          >
            2
          </button>
        </div>
      </div>

      <div className="w-8 h-px bg-cyber-border" />

      {/* Tile Palette */}
      <div className="flex flex-col space-y-1 w-full px-2 items-center flex-1 overflow-y-auto">
        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider text-center">Tiles</span>
        {glyphList.map((glyph) => {
          const def = TILE_DEFINITIONS[glyph];
          const isSelected = selectedGlyph === glyph && currentTool !== 'eraser' && currentTool !== 'select';

          return (
            <button
              key={glyph}
              onClick={() => {
                onSelectGlyph(glyph);
                if (currentTool === 'eraser' || currentTool === 'select') {
                  onSelectTool('pencil');
                }
              }}
              title={`${def.name} ['${glyph}'] - ${def.description}`}
              className={`w-11 h-9 rounded flex items-center justify-center font-mono font-bold text-sm transition-all border ${
                isSelected
                  ? 'border-cyber-cyan ring-2 ring-cyber-cyan/50 scale-105 bg-cyber-card text-white'
                  : 'border-cyber-border bg-cyber-bg text-slate-400 hover:border-slate-500 hover:text-white'
              }`}
              style={{
                color: def.color,
                borderColor: isSelected ? def.color : undefined,
              }}
            >
              {glyph === ' ' ? '·' : glyph}
            </button>
          );
        })}
      </div>

      <div className="w-8 h-px bg-cyber-border" />

      {/* View Layer Toggles */}
      <div className="flex flex-col space-y-1 w-full px-2 items-center">
        <button
          onClick={onToggleGrid}
          title="Toggle Grid Lines (G)"
          className={`w-11 h-8 rounded flex items-center justify-center text-xs transition-colors ${
            showGrid ? 'text-cyber-cyan bg-cyber-cyan/10 border border-cyber-cyan/30' : 'text-slate-500 hover:text-white'
          }`}
        >
          <Grid className="w-4 h-4" />
        </button>
        <button
          onClick={onToggleEntities}
          title="Toggle Dynamic Entities Overlay"
          className={`w-11 h-8 rounded flex items-center justify-center text-xs transition-colors ${
            showEntities ? 'text-cyber-cyan bg-cyber-cyan/10 border border-cyber-cyan/30' : 'text-slate-500 hover:text-white'
          }`}
        >
          <Eye className="w-4 h-4" />
        </button>
        <button
          onClick={onToggleCoordinates}
          title="Toggle Coordinates & Rulers"
          className={`w-11 h-8 rounded flex items-center justify-center text-xs transition-colors ${
            showCoordinates ? 'text-cyber-cyan bg-cyber-cyan/10 border border-cyber-cyan/30' : 'text-slate-500 hover:text-white'
          }`}
        >
          <Crosshair className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};

