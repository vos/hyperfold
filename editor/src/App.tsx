import React, { useState, useEffect, useCallback, useRef } from 'react';
import { WorldData, RoomData, EditorTool, TileGlyph, SelectedEntity } from './types/world';
import { PRESET_WORLDS } from './utils/presets';
import { createEmptyWorld } from './utils/serialization';
import { validateWorld } from './utils/validator';
import { WorldHeader } from './components/WorldHeader';
import { Toolbar } from './components/Toolbar';
import { GridCanvas } from './components/GridCanvas';
import { InspectorPanel } from './components/InspectorPanel';
import { WorldGraphView } from './components/WorldGraphView';
import { ExportModal } from './components/ExportModal';
import { ImportModal } from './components/ImportModal';
import { HelpModal } from './components/HelpModal';
import { getAdjacentSectors } from './utils/navigation.ts';
import { TILE_HOTKEYS } from './utils/tileDefinitions';
import { launchGameTest } from './utils/testInGame';

export const App: React.FC = () => {
  // World State
  const [world, setWorld] = useState<WorldData>(() => PRESET_WORLDS[0].get());
  const [activeRoomId, setActiveRoomId] = useState<string>(() => world.rooms[0]?.id || 'room_0_0');
  const [activeView, setActiveView] = useState<'editor' | 'graph'>('editor');

  // History for Undo / Redo
  const [history, setHistory] = useState<WorldData[]>([]);
  const [future, setFuture] = useState<WorldData[]>([]);

  // Editor Tools & Settings
  const [currentTool, setCurrentTool] = useState<EditorTool>('pencil');
  const [selectedGlyph, setSelectedGlyph] = useState<TileGlyph>('#');
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity>(null);
  const [brushSize, setBrushSize] = useState<number>(1);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showEntities, setShowEntities] = useState<boolean>(true);
  const [showCoordinates, setShowCoordinates] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'room' | 'entities' | 'world'>('room');

  // Modals
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);

  // Live Diagnostics
  const diagnostics = validateWorld(world);

  // Playtest in Game state & launcher
  const [testingStatus, setTestingStatus] = useState<'idle' | 'opening' | 'connected'>('idle');
  const testCleanupRef = useRef<(() => void) | null>(null);

  const handleTestInGame = useCallback(
    (port?: string) => {
      if (testCleanupRef.current) {
        testCleanupRef.current();
      }
      testCleanupRef.current = launchGameTest(world, port, (status) => {
        setTestingStatus(status);
      });
    },
    [world]
  );

  useEffect(() => {
    return () => {
      if (testCleanupRef.current) {
        testCleanupRef.current();
      }
    };
  }, []);

  // Active Room Resolution
  const activeRoom = world.rooms.find((r) => r.id === activeRoomId) || world.rooms[0];

  // Track active stroke snapshot
  const strokeSnapshotRef = useRef<WorldData | null>(null);

  // Helper to commit world changes with optional history tracking
  const updateWorldWithHistory = useCallback(
    (updater: (prev: WorldData) => WorldData, addToHistory: boolean = true) => {
      setWorld((current) => {
        const next = updater(current);
        if (addToHistory && !strokeSnapshotRef.current && next !== current) {
          setHistory((h) => [...h.slice(-30), current]);
          setFuture([]);
        }
        return next;
      });
    },
    []
  );

  // Helper to update current room
  const updateActiveRoom = useCallback(
    (updater: (prev: RoomData) => RoomData, addToHistory: boolean = true) => {
      updateWorldWithHistory((prevWorld) => {
        const updatedRooms = prevWorld.rooms.map((r) =>
          r.id === activeRoom.id ? updater(r) : r
        );
        return { ...prevWorld, rooms: updatedRooms };
      }, addToHistory);
    },
    [activeRoom.id, updateWorldWithHistory]
  );

  // Stroke lifecycle handlers
  const handleBeginStroke = useCallback(() => {
    if (!strokeSnapshotRef.current) {
      strokeSnapshotRef.current = world;
    }
  }, [world]);

  const handleEndStroke = useCallback(() => {
    if (strokeSnapshotRef.current) {
      const snapshot = strokeSnapshotRef.current;
      strokeSnapshotRef.current = null;
      setWorld((current) => {
        if (current !== snapshot) {
          setHistory((h) => [...h.slice(-30), snapshot]);
          setFuture([]);
        }
        return current;
      });
    }
  }, []);

  // Undo / Redo Handlers
  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    strokeSnapshotRef.current = null;
    const previous = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setFuture((f) => [world, ...f]);
    setWorld(previous);
  }, [history, world]);

  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    strokeSnapshotRef.current = null;
    const next = future[0];
    setFuture((f) => f.slice(1));
    setHistory((h) => [...h, world]);
    setWorld(next);
  }, [future, world]);

  // Load Preset
  const handleLoadPreset = (presetId: string) => {
    const preset = PRESET_WORLDS.find((p) => p.id === presetId);
    if (preset) {
      const newWorld = preset.get();
      updateWorldWithHistory(() => newWorld);
      setActiveRoomId(newWorld.rooms[0]?.id || 'room_0_0');
    }
  };

  // Create New Empty World
  const handleNewWorld = () => {
    if (confirm('Create a new blank world? Any unsaved edits to the current world will be overwritten.')) {
      const blank = createEmptyWorld();
      updateWorldWithHistory(() => blank);
      setActiveRoomId(blank.rooms[0]?.id || 'room_0_0');
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Quick Access Playtest: F5
      if (e.key === 'F5') {
        e.preventDefault();
        handleTestInGame();
        return;
      }

      // Don't intercept when user is typing in inputs or textareas
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Ignore shortcuts if Ctrl or Meta is held
      if (e.ctrlKey || e.metaKey) {
        return;
      }

      // Adjacent Sector Navigation: Alt + Arrow Keys
      if (e.altKey) {
        if (activeRoom) {
          const adjacent = getAdjacentSectors(activeRoom, world);
          let targetRoom: RoomData | undefined;
          if (e.key === 'ArrowUp') targetRoom = adjacent.up.room;
          if (e.key === 'ArrowDown') targetRoom = adjacent.down.room;
          if (e.key === 'ArrowLeft') targetRoom = adjacent.left.room;
          if (e.key === 'ArrowRight') targetRoom = adjacent.right.room;

          if (targetRoom) {
            e.preventDefault();
            setActiveRoomId(targetRoom.id);
            setSelectedEntity(null);
          }
        }
        return;
      }

      // Tile Selection Hotkeys (1-9, 0)
      if (e.key in TILE_HOTKEYS) {
        setSelectedGlyph(TILE_HOTKEYS[e.key]);
        setCurrentTool((prev) => (prev === 'eraser' || prev === 'select' ? 'pencil' : prev));
        return;
      }

      // Tool Hotkeys
      if (e.key.toLowerCase() === 'b') setCurrentTool('pencil');
      if (e.key.toLowerCase() === 'l') setCurrentTool('line');
      if (e.key.toLowerCase() === 'u') setCurrentTool('rect');
      if (e.key.toLowerCase() === 'f') setCurrentTool('fill');
      if (e.key.toLowerCase() === 'e') setCurrentTool('eraser');
      if (e.key.toLowerCase() === 'i') setCurrentTool('eyedropper');
      if (e.key.toLowerCase() === 'v') setCurrentTool('select');

      // Escape to close help modal or deselect
      if (e.key === 'Escape') {
        if (showHelpModal) {
          e.preventDefault();
          setShowHelpModal(false);
          return;
        }
        if (selectedEntity) {
          setSelectedEntity(null);
          return;
        }
      }

      // Help Shortcut (? or H)
      if (e.key === '?' || (e.shiftKey && e.code === 'Slash') || e.code === 'KeyH') {
        e.preventDefault();
        setShowHelpModal((prev) => !prev);
        return;
      }

      // Layer Toggles
      if (e.key.toLowerCase() === 'g') setShowGrid((prev) => !prev);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleTestInGame, activeRoom, world, showHelpModal, selectedEntity]);

  return (
    <div className="h-screen w-screen flex flex-col bg-cyber-bg text-slate-100 overflow-hidden font-sans">
      {/* Top Header */}
      <WorldHeader
        world={world}
        onUpdateWorld={updateWorldWithHistory}
        canUndo={history.length > 0}
        canRedo={future.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onNewWorld={handleNewWorld}
        onOpenImport={() => setShowImportModal(true)}
        onOpenExport={() => setShowExportModal(true)}
        onOpenHelp={() => setShowHelpModal(true)}
        onTestInGame={() => handleTestInGame()}
        testingStatus={testingStatus}
        onLoadPreset={handleLoadPreset}
        diagnostics={diagnostics}
        onOpenDiagnostics={() => {
          setActiveTab('world');
          if (activeView !== 'editor') setActiveView('editor');
        }}
        activeView={activeView}
        setActiveView={setActiveView}
        activeRoomId={activeRoom?.id}
        onSelectRoom={(id) => {
          setActiveRoomId(id);
          setSelectedEntity(null);
        }}
      />

      {/* Main View Area */}
      <div className="flex-1 flex overflow-hidden">
        {activeView === 'editor' ? (
          <>
            {/* Left Toolbar */}
            <Toolbar
              currentTool={currentTool}
              onSelectTool={setCurrentTool}
              selectedGlyph={selectedGlyph}
              onSelectGlyph={setSelectedGlyph}
              showGrid={showGrid}
              onToggleGrid={() => setShowGrid((p) => !p)}
              showEntities={showEntities}
              onToggleEntities={() => setShowEntities((p) => !p)}
              showCoordinates={showCoordinates}
              onToggleCoordinates={() => setShowCoordinates((p) => !p)}
              brushSize={brushSize}
              onChangeBrushSize={setBrushSize}
            />

            {/* Center Grid Canvas */}
            {activeRoom && (
              <GridCanvas
                room={activeRoom}
                world={world}
                onSelectRoom={(id) => {
                  setActiveRoomId(id);
                  setSelectedEntity(null);
                }}
                onUpdateRoom={updateActiveRoom}
                onBeginStroke={handleBeginStroke}
                onEndStroke={handleEndStroke}
                currentTool={currentTool}
                selectedGlyph={selectedGlyph}
                onSelectGlyph={setSelectedGlyph}
                selectedEntity={selectedEntity}
                onSelectEntity={setSelectedEntity}
                showGrid={showGrid}
                showEntities={showEntities}
                showCoordinates={showCoordinates}
                brushSize={brushSize}
                onOpenHelp={() => setShowHelpModal(true)}
              />
            )}

            {/* Right Inspector Panel */}
            {activeRoom && (
              <InspectorPanel
                world={world}
                onUpdateWorld={updateWorldWithHistory}
                room={activeRoom}
                onUpdateRoom={updateActiveRoom}
                selectedEntity={selectedEntity}
                onSelectEntity={setSelectedEntity}
                diagnostics={diagnostics}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onSelectRoom={(id) => {
                  setActiveRoomId(id);
                  setSelectedEntity(null);
                }}
              />
            )}
          </>
        ) : (
          /* World Graph / Matrix View */
          <WorldGraphView
            world={world}
            onUpdateWorld={updateWorldWithHistory}
            activeRoomId={activeRoom?.id || ''}
            onSelectRoom={(id) => {
              setActiveRoomId(id);
              setSelectedEntity(null);
            }}
            onOpenEditor={() => setActiveView('editor')}
          />
        )}
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          world={world}
          onClose={() => setShowExportModal(false)}
          onTestInGame={handleTestInGame}
          testingStatus={testingStatus}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImport={(importedWorld) => {
            updateWorldWithHistory(() => importedWorld);
            setActiveRoomId(importedWorld.rooms[0]?.id || 'room_0_0');
            setSelectedEntity(null);
          }}
        />
      )}

      {/* Help / Controls Shortcuts Modal */}
      {showHelpModal && (
        <HelpModal
          onClose={() => setShowHelpModal(false)}
        />
      )}
    </div>
  );
};

