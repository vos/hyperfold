import React, { useState, useRef } from 'react';
import { X, Upload, FolderOpen, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { WorldData } from '../types/world';
import { parseWorldJson, parseRoomData } from '../utils/serialization';

interface ImportModalProps {
  onClose: () => void;
  onImport: (world: WorldData) => void;
}

interface UploadedFileRecord {
  name: string;
  path: string;
  content: string;
}

export const ImportModal: React.FC<ImportModalProps> = ({ onClose, onImport }) => {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleProcessSingleJson = (raw: string) => {
    try {
      setError(null);
      const parsed = parseWorldJson(raw);
      onImport(parsed);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to parse world JSON.');
    }
  };

  const handleProcessUploadedFiles = (files: UploadedFileRecord[]) => {
    try {
      setError(null);
      if (files.length === 0) return;

      // Single file upload
      if (files.length === 1) {
        setJsonText(files[0].content);
        handleProcessSingleJson(files[0].content);
        return;
      }

      // Multiple files upload (e.g. world.json + rooms/*.json)
      let manifestFile: UploadedFileRecord | undefined;
      const roomRecords: UploadedFileRecord[] = [];

      for (const f of files) {
        let parsed: any;
        try {
          parsed = JSON.parse(f.content);
        } catch {
          continue;
        }

        const isWorldManifest =
          f.name.toLowerCase() === 'world.json' ||
          (parsed && typeof parsed === 'object' && Array.isArray(parsed.rooms));

        if (isWorldManifest && !manifestFile) {
          manifestFile = f;
        } else {
          roomRecords.push(f);
        }
      }

      // Build external rooms lookup map
      const externalRoomsMap: Record<string, any> = {};
      for (const rec of roomRecords) {
        try {
          const parsed = JSON.parse(rec.content);
          if (parsed && typeof parsed === 'object') {
            const cleanPath = rec.path.replace(/^\.\//, '');
            externalRoomsMap[rec.path] = parsed;
            externalRoomsMap[cleanPath] = parsed;
            externalRoomsMap[rec.name] = parsed;
            externalRoomsMap[`./${cleanPath}`] = parsed;
            externalRoomsMap[`./rooms/${rec.name}`] = parsed;
            externalRoomsMap[`rooms/${rec.name}`] = parsed;
            if (parsed.id) {
              externalRoomsMap[parsed.id] = parsed;
            }
          }
        } catch {
          // ignore non-json
        }
      }

      if (manifestFile) {
        setJsonText(manifestFile.content);
        const parsedWorld = parseWorldJson(manifestFile.content, externalRoomsMap);
        onImport(parsedWorld);
        onClose();
        return;
      }

      // If no manifest file found, but multiple room JSON files exist, bundle them together
      const parsedRooms = Object.values(externalRoomsMap)
        // Deduplicate by room ID or coords
        .filter((rm, index, arr) => arr.findIndex((r) => r.id === rm.id) === index)
        .map((rm, idx) => parseRoomData(rm, [idx, 0]));

      if (parsedRooms.length > 0) {
        const assembledWorld: WorldData = {
          $schema: './schemas/world.schema.json',
          id: 'imported_room_collection',
          title: `Imported Collection (${parsedRooms.length} Sectors)`,
          startingCoords: parsedRooms[0]?.coords || [0, 0],
          rooms: parsedRooms,
        };
        onImport(assembledWorld);
        onClose();
        return;
      }

      throw new Error(
        'Could not find a world manifest (world.json) or valid room files in the selected upload.'
      );
    } catch (err: any) {
      setError(err?.message || 'Failed to process uploaded files.');
    } finally {
      setIsLoading(false);
    }
  };

  const readFilesList = async (fileList: FileList): Promise<UploadedFileRecord[]> => {
    const records: UploadedFileRecord[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (!file.name.endsWith('.json')) continue;
      const text = await file.text();
      records.push({
        name: file.name,
        path: file.webkitRelativePath || file.name,
        content: text,
      });
    }
    return records;
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsLoading(true);
    try {
      const records = await readFilesList(files);
      handleProcessUploadedFiles(records);
    } catch (err: any) {
      setError(err?.message || 'Error reading files.');
      setIsLoading(false);
    }
  };

  const readDataTransferEntries = async (
    items: DataTransferItemList
  ): Promise<UploadedFileRecord[]> => {
    const records: UploadedFileRecord[] = [];

    const traverseEntry = async (entry: any, basePath: string = ''): Promise<void> => {
      if (!entry) return;
      if (entry.isFile) {
        if (!entry.name.endsWith('.json')) return;
        await new Promise<void>((resolve) => {
          entry.file(async (file: File) => {
            const text = await file.text();
            records.push({
              name: file.name,
              path: basePath ? `${basePath}/${file.name}` : file.name,
              content: text,
            });
            resolve();
          }, () => resolve());
        });
      } else if (entry.isDirectory) {
        const reader = entry.createReader();
        const dirPath = basePath ? `${basePath}/${entry.name}` : entry.name;
        await new Promise<void>((resolve) => {
          const readBatch = () => {
            reader.readEntries(async (entries: any[]) => {
              if (entries.length === 0) {
                resolve();
              } else {
                for (const sub of entries) {
                  await traverseEntry(sub, dirPath);
                }
                readBatch();
              }
            }, () => resolve());
          };
          readBatch();
        });
      }
    };

    const promises: Promise<void>[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const entry = (item as any).webkitGetAsEntry ? (item as any).webkitGetAsEntry() : null;
      if (entry) {
        promises.push(traverseEntry(entry));
      } else {
        const file = item.getAsFile();
        if (file && file.name.endsWith('.json')) {
          promises.push(
            file.text().then((text) => {
              records.push({
                name: file.name,
                path: file.webkitRelativePath || file.name,
                content: text,
              });
            })
          );
        }
      }
    }

    await Promise.all(promises);
    return records;
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setIsLoading(true);

    try {
      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        const records = await readDataTransferEntries(e.dataTransfer.items);
        handleProcessUploadedFiles(records);
      } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const records = await readFilesList(e.dataTransfer.files);
        handleProcessUploadedFiles(records);
      }
    } catch (err: any) {
      setError(err?.message || 'Error reading dropped files.');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 select-none animate-in fade-in duration-200">
      <div className="bg-cyber-surface border border-cyber-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="h-14 px-6 border-b border-cyber-border flex items-center justify-between bg-cyber-bg/50 shrink-0">
          <div>
            <h3 className="text-base font-bold text-white">Import World JSON</h3>
            <p className="text-xs text-slate-400">
              Upload files, a folder (e.g. demo), or paste a Hyperfold world bundle
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
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragging(false);
            }}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 transition-all ${
              isDragging
                ? 'border-cyber-cyan bg-cyber-cyan/10'
                : 'border-cyber-border hover:border-cyber-cyan/60 bg-cyber-bg/30 hover:bg-cyber-card/40'
            }`}
          >
            {isLoading ? (
              <div className="flex flex-col items-center py-2 space-y-2">
                <Loader2 className="w-8 h-8 text-cyber-cyan animate-spin" />
                <span className="text-xs text-slate-300 font-mono">Reading files...</span>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 text-slate-400 mb-2 transition-colors group-hover:text-cyber-cyan" />
                <span className="text-sm font-semibold text-slate-200">
                  Drag & drop files or a folder here
                </span>
                <span className="text-xs text-slate-500 mt-1 mb-4 text-center">
                  Supports modular world folders (world.json + rooms/), single-file bundles, or individual sectors
                </span>

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-cyber-card hover:bg-cyber-hover border border-cyber-border rounded-lg text-xs font-semibold text-slate-200 hover:text-white transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-cyber-cyan" />
                    <span>Choose File(s)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => folderInputRef.current?.click()}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-cyber-card hover:bg-cyber-hover border border-cyber-border rounded-lg text-xs font-semibold text-slate-200 hover:text-white transition-colors"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-cyber-neonBlue" />
                    <span>Choose Folder</span>
                  </button>
                </div>
              </>
            )}

            {/* Hidden native inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              multiple
              onChange={handleFileInputChange}
              className="hidden"
            />
            <input
              ref={folderInputRef}
              type="file"
              // @ts-ignore - webkitdirectory is standard across modern Chromium, Gecko & WebKit
              webkitdirectory=""
              directory=""
              multiple
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>

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
            disabled={!jsonText.trim() || isLoading}
            onClick={() => handleProcessSingleJson(jsonText)}
            className="px-4 py-2 bg-cyber-cyan text-slate-950 font-bold rounded-lg text-xs hover:brightness-110 disabled:opacity-40 disabled:hover:brightness-100 transition-all shadow-md"
          >
            Import JSON
          </button>
        </div>
      </div>
    </div>
  );
};
