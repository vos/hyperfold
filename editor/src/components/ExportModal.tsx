import React, { useState, useEffect, useRef } from 'react';
import { X, Download, Copy, Check, Play, ExternalLink } from 'lucide-react';
import { WorldData } from '../types/world';
import { exportWorldJson } from '../utils/serialization';

interface ExportModalProps {
  world: WorldData;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ world, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [gamePort, setGamePort] = useState(
    window.location.port === '5174' ? '3000' : (window.location.port || '')
  );
  const [testingStatus, setTestingStatus] = useState<'idle' | 'opening' | 'connected'>('idle');
  const postIntervalRef = useRef<number | null>(null);

  const jsonContent = exportWorldJson(world);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'HYPERFOLD_GAME_READY') {
        (event.source as Window)?.postMessage(
          { type: 'HYPERFOLD_LOAD_WORLD', json: jsonContent },
          '*'
        );
      } else if (event.data?.type === 'HYPERFOLD_WORLD_LOADED') {
        setTestingStatus('connected');
        if (postIntervalRef.current) {
          window.clearInterval(postIntervalRef.current);
          postIntervalRef.current = null;
        }
        setTimeout(() => setTestingStatus('idle'), 3000);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      if (postIntervalRef.current) {
        window.clearInterval(postIntervalRef.current);
      }
    };
  }, [jsonContent]);

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
    try {
      localStorage.setItem('hyperfold_custom_world', jsonContent);
    } catch {
      // LocalStorage fallback
    }

    const protocol = window.location.protocol;
    const host = window.location.hostname || 'localhost';
    const currentPort = window.location.port;
    const port = gamePort.trim();

    // Determine the game base path by stripping '/editor' (and anything after it) from the current pathname
    const gameBasePath = window.location.pathname.replace(/\/editor(\/.*)?$/i, '') || '/';
    const normalizedBasePath = gameBasePath.endsWith('/') ? gameBasePath : `${gameBasePath}/`;

    // If a different port is specified (e.g. 3000 while editor is on 5174):
    let targetUrl: string;
    if (port && port !== currentPort && port !== '80' && port !== '443') {
      targetUrl = `${protocol}//${host}:${port}${normalizedBasePath}?load_custom=1`;
    } else {
      // Deployed or same-port: use origin-relative path preserving the subfolder
      targetUrl = `${normalizedBasePath}?load_custom=1`;
    }

    setTestingStatus('opening');

    try {
      const gameWin = window.open(targetUrl, '_blank');
      if (!gameWin) {
        setTestingStatus('idle');
        alert('Popup was blocked by your browser. Please allow popups for this page or download the JSON.');
        return;
      }

      // Periodically postMessage in case game loads or is already ready
      let attempts = 0;
      if (postIntervalRef.current) {
        window.clearInterval(postIntervalRef.current);
      }
      postIntervalRef.current = window.setInterval(() => {
        attempts++;
        if (gameWin.closed) {
          if (postIntervalRef.current) window.clearInterval(postIntervalRef.current);
          setTestingStatus('idle');
          return;
        }
        try {
          gameWin.postMessage({ type: 'HYPERFOLD_LOAD_WORLD', json: jsonContent }, '*');
        } catch {
          // Cross-origin warning suppression
        }
        if (attempts > 25) { // 5s timeout
          if (postIntervalRef.current) window.clearInterval(postIntervalRef.current);
          setTestingStatus('idle');
        }
      }, 200);
    } catch {
      setTestingStatus('idle');
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
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePlayInGame}
              disabled={testingStatus === 'opening'}
              className="flex items-center space-x-2 px-3.5 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
              title={`Send and launch world directly in game on port ${gamePort || '3000'}`}
            >
              {testingStatus === 'connected' ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Loaded in Game!</span>
                </>
              ) : (
                <>
                  <Play className={`w-4 h-4 fill-current ${testingStatus === 'opening' ? 'animate-pulse text-cyber-cyan' : ''}`} />
                  <span>{testingStatus === 'opening' ? 'Launching Game...' : 'Test in Game'}</span>
                </>
              )}
            </button>

            <div className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-cyber-card border border-cyber-border rounded-lg text-xs text-slate-400 font-mono">
              <span className="text-slate-500 text-[11px]">Port:</span>
              <input
                type="text"
                value={gamePort}
                onChange={(e) => setGamePort(e.target.value.replace(/\D/g, ''))}
                className="w-12 bg-black/70 border border-cyber-border/70 rounded px-1.5 py-0.5 text-xs text-cyber-cyan font-bold text-center focus:outline-none focus:border-cyber-cyan"
                placeholder="3000"
                title="Port where Hyperfold game is running (default 3000)"
              />
            </div>
          </div>

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

