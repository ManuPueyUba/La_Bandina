'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useMidiImport } from '@/hooks/useMidiImport';
import { MidiMetadata } from '@/lib/midi-parser';
import { Song } from '@/types/song';
import { Upload, File, Music, Info, AlertCircle, Check, Settings } from 'lucide-react';

interface MidiImportDialogProps {
  onSongsImported: (songs: Song[]) => void;
  onClose: () => void;
  isOpen: boolean;
}

interface FileWithInfo {
  file: File;
  info?: {
    tracks: number;
    notes: number;
    duration: number;
    bpm: number;
    timeSignature: string;
  };
  metadata: MidiMetadata;
  status: 'pending' | 'analyzing' | 'ready' | 'error';
  error?: string;
}

interface ImportOptions {
  simplifyMelody: boolean;
  removeChords: boolean;
  maxNotesPerSecond: number;
  minNoteDuration: number;
}

export function MidiImportDialog({ onSongsImported, onClose, isOpen }: MidiImportDialogProps) {
  const [files, setFiles] = useState<FileWithInfo[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    simplifyMelody: true,
    removeChords: true,
    maxNotesPerSecond: 3,
    minNoteDuration: 200
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { analyzeMidiFile, convertMultipleMidiFiles, isLoading, error, progress } = useMidiImport();

  if (!isOpen) return null;

  const handleFileSelect = async (selectedFiles: FileList) => {
    const newFiles: FileWithInfo[] = Array.from(selectedFiles).map((file, index) => ({
      file,
      metadata: {
        id: `midi-${Date.now()}-${index}`,
        title: file.name.replace(/\.(mid|midi)$/i, ''),
        artist: 'Unknown',
        category: 'Importada'
      },
      status: 'pending'
    }));

    setFiles(newFiles);

    // Analizar cada archivo
    for (const fileWithInfo of newFiles) {
      try {
        fileWithInfo.status = 'analyzing';
        setFiles(prev => [...prev]);

        const info = await analyzeMidiFile(fileWithInfo.file);
        fileWithInfo.info = info;
        fileWithInfo.status = 'ready';
        setFiles(prev => [...prev]);
      } catch (error) {
        fileWithInfo.status = 'error';
        fileWithInfo.error = error instanceof Error ? error.message : 'Error desconocido';
        setFiles(prev => [...prev]);
      }
    }
  };

  const handleMetadataChange = (index: number, field: keyof MidiMetadata, value: string) => {
    setFiles(prev => prev.map((file, i) => 
      i === index 
        ? { ...file, metadata: { ...file.metadata, [field]: value } }
        : file
    ));
  };

  const handleConvert = async () => {
    const validFiles = files.filter(f => f.status === 'ready');
    if (validFiles.length === 0) return;

    setIsConverting(true);
    
    try {
      const songs = await convertMultipleMidiFiles(
        validFiles.map(f => f.file),
        (file, index) => validFiles[index].metadata,
        {
          minOctave: 4,
          maxOctave: 6,
          minNoteDuration: importOptions.minNoteDuration,
          simplifyMelody: importOptions.simplifyMelody,
          removeChords: importOptions.removeChords,
          maxNotesPerSecond: importOptions.maxNotesPerSecond
        }
      );

      onSongsImported(songs);
      onClose();
    } catch (error) {
      console.error('Error converting MIDI files:', error);
    } finally {
      setIsConverting(false);
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.round(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Music className="h-6 w-6" />
              Importar Archivos MIDI
            </h2>
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </div>

          {/* File Upload Area */}
          <div className="mb-6">
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg mb-2">Arrastra archivos MIDI aquí o haz click para seleccionar</p>
              <p className="text-sm text-gray-500">Soporta archivos .mid y .midi</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".mid,.midi"
              multiple
              onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
              className="hidden"
            />
          </div>

          {/* Progress Bar */}
          {(isLoading || isConverting) && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-2 bg-gray-200 rounded-full flex-1">
                  <div 
                    className="h-2 bg-blue-600 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600">{progress}%</span>
              </div>
              <p className="text-sm text-gray-600">
                {isConverting ? 'Convirtiendo archivos...' : 'Analizando archivos...'}
              </p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          {/* Advanced Options */}
          {files.length > 0 && (
            <div className="mb-6">
              <Button
                variant="outline"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 mb-4"
              >
                <Settings className="h-4 w-4" />
                {showAdvanced ? 'Ocultar' : 'Mostrar'} Opciones Avanzadas
              </Button>

              {showAdvanced && (
                <Card className="p-4 bg-gray-50">
                  <h4 className="font-medium mb-4">Configuración de Importación</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={importOptions.simplifyMelody}
                          onChange={(e) => setImportOptions(prev => ({
                            ...prev,
                            simplifyMelody: e.target.checked
                          }))}
                        />
                        <span className="text-sm">Simplificar melodía</span>
                      </label>
                      <p className="text-xs text-gray-500 ml-6">
                        Elimina repeticiones y hace la canción más fácil de tocar
                      </p>
                    </div>

                    <div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={importOptions.removeChords}
                          onChange={(e) => setImportOptions(prev => ({
                            ...prev,
                            removeChords: e.target.checked
                          }))}
                        />
                        <span className="text-sm">Eliminar acordes</span>
                      </label>
                      <p className="text-xs text-gray-500 ml-6">
                        Solo mantiene la melodía principal (recomendado)
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Máximo notas por segundo: {importOptions.maxNotesPerSecond}
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="8"
                        step="0.5"
                        value={importOptions.maxNotesPerSecond}
                        onChange={(e) => setImportOptions(prev => ({
                          ...prev,
                          maxNotesPerSecond: parseFloat(e.target.value)
                        }))}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-500">
                        Controla qué tan rápida será la canción
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Duración mínima de nota: {importOptions.minNoteDuration}ms
                      </label>
                      <input
                        type="range"
                        min="100"
                        max="500"
                        step="50"
                        value={importOptions.minNoteDuration}
                        onChange={(e) => setImportOptions(prev => ({
                          ...prev,
                          minNoteDuration: parseInt(e.target.value)
                        }))}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-500">
                        Notas más largas son más fáciles de tocar
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                    <p className="text-blue-800">
                      <strong>💡 Recomendación:</strong> Para mejores resultados en el tutorial, 
                      mantén activadas "Simplificar melodía" y "Eliminar acordes", 
                      y usa máximo 3-4 notas por segundo.
                    </p>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Files List */}
          {files.length > 0 && (
            <div className="space-y-4 mb-6">
              <h3 className="text-lg font-semibold">Archivos Seleccionados</h3>
              {files.map((fileWithInfo, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      {fileWithInfo.status === 'analyzing' && (
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                      )}
                      {fileWithInfo.status === 'ready' && (
                        <Check className="h-6 w-6 text-green-600" />
                      )}
                      {fileWithInfo.status === 'error' && (
                        <AlertCircle className="h-6 w-6 text-red-600" />
                      )}
                      {fileWithInfo.status === 'pending' && (
                        <File className="h-6 w-6 text-gray-400" />
                      )}
                    </div>

                    <div className="flex-1 space-y-3">
                      <div>
                        <p className="font-medium">{fileWithInfo.file.name}</p>
                        <p className="text-sm text-gray-500">
                          {formatFileSize(fileWithInfo.file.size)}
                          {fileWithInfo.info && (
                            <span className="ml-2">
                              • {fileWithInfo.info.tracks} tracks • {fileWithInfo.info.notes} notas 
                              • {formatDuration(fileWithInfo.info.duration)} • {fileWithInfo.info.bpm} BPM
                            </span>
                          )}
                        </p>
                      </div>

                      {fileWithInfo.status === 'error' && (
                        <p className="text-sm text-red-600">{fileWithInfo.error}</p>
                      )}

                      {fileWithInfo.status === 'ready' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Título
                            </label>
                            <input
                              type="text"
                              value={fileWithInfo.metadata.title}
                              onChange={(e) => handleMetadataChange(index, 'title', e.target.value)}
                              className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Artista
                            </label>
                            <input
                              type="text"
                              value={fileWithInfo.metadata.artist}
                              onChange={(e) => handleMetadataChange(index, 'artist', e.target.value)}
                              className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Categoría
                            </label>
                            <select
                              value={fileWithInfo.metadata.category}
                              onChange={(e) => handleMetadataChange(index, 'category', e.target.value)}
                              className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                            >
                              <option value="Importada">Importada</option>
                              <option value="Clásica">Clásica</option>
                              <option value="Popular">Popular</option>
                              <option value="Jazz">Jazz</option>
                              <option value="Blues">Blues</option>
                              <option value="Rock">Rock</option>
                              <option value="Tradicional">Tradicional</option>
                              <option value="Infantil">Infantil</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConvert}
              disabled={files.filter(f => f.status === 'ready').length === 0 || isConverting}
              className="min-w-32"
            >
              {isConverting ? 'Convirtiendo...' : `Importar ${files.filter(f => f.status === 'ready').length} canciones`}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
