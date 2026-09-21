import React, { useState } from 'react';
import { X, Upload, FileText, AlertCircle } from 'lucide-react';
import { WorldData } from '../types/world';
import { parseWorldJson } from '../utils/serialization';

interface ImportModalProps {
  onClose: () => void;
  onImport: (world: WorldData) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ onClose, onImport }) => {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleProcessJson = (raw: string) => {
    try {
      setError(null);
      const parsed = parseWorldJson(raw);
      onImport(parsed);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to parse world JSON.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setJsonText(content);
        handleProcessJson(content);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 select-none animate-in fade-in duration-200">
      <div className="bg-cyber-surface border border-cyber-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="h-14 px-6 border-b border-cyber-border flex items-center justify-between bg-cyber-bg/50 shrink-0">
          <div>
            <h3 className="text-base font-bold text-white">Import World JSON</h3>
            <p className="text-xs text-slate-400">
              Upload or paste a Hyperfold world bundle or single sector file
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-cyber-card"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {/* File Upload Drop Zone */}
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-cyber-border hover:border-cyber-cyan/60 rounded-xl p-6 bg-cyber-bg/30 hover:bg-cyber-card/40 cursor-pointer transition-all group">
            <Upload className="w-8 h-8 text-slate-400 group-hover:text-cyber-cyan transition-colors mb-2" />
            <span className="text-sm font-semibold text-slate-200 group-hover:text-white">
              Choose a .json file or drag & drop here
            </span>
            <span className="text-xs text-slate-500 mt-1">Supports World bundles and Sector JSON</span>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <div className="flex items-center space-x-3">
            <div className="h-px bg-cyber-border flex-1" />
            <span className="text-xs uppercase font-mono text-slate-500">OR PASTE JSON</span>
            <div className="h-px bg-cyber-border flex-1" />
          </div>

          {/* Paste JSON Textarea */}
          <div>
            <textarea
              rows={8}
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
                setError(null);
              }}
              placeholder='Paste { "$schema": "./schemas/world.schema.json", "id": "my_world", ... }'
              className="w-full bg-black border border-cyber-border rounded-lg p-3 text-xs font-mono text-slate-300 focus:border-cyber-cyan focus:outline-none"
            />
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-300 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="h-16 px-6 border-t border-cyber-border bg-cyber-bg/50 flex items-center justify-end space-x-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-cyber-card hover:bg-cyber-hover border border-cyber-border text-slate-300 rounded-lg text-xs font-medium"
          >
            Cancel
          </button>
          <button
            disabled={!jsonText.trim()}
            onClick={() => handleProcessJson(jsonText)}
            className="px-4 py-2 bg-cyber-cyan text-slate-950 font-bold rounded-lg text-xs hover:brightness-110 disabled:opacity-40 disabled:hover:brightness-100 transition-all shadow-md"
          >
            Import JSON
          </button>
        </div>
      </div>
    </div>
  );
};

