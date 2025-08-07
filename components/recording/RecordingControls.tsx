'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useRecording } from '@/hooks/useRecording';
import { Recording, Note } from '@/types/song';
import { downloadMidiFile } from '@/lib/midi-export';
import { 
  Mic, 
  Square, 
  Play, 
  Pause, 
  Save, 
  Trash2, 
  Clock,
  Music2,
  Download
} from 'lucide-react';

interface RecordingControlsProps {
  onRecordingSaved: (recording: Recording) => void;
  onSetRecordingHandlers: (handlers: { onKeyPress: (key: string) => void; onKeyRelease: (key: string) => void; }) => void;
}

export default function RecordingControls({ 
  onRecordingSaved, 
  onSetRecordingHandlers
}: RecordingControlsProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('Usuario');
  const [description, setDescription] = useState('');
  
  // Estado para mostrar información de la grabación detenida
  const [stoppedRecordingInfo, setStoppedRecordingInfo] = useState<{
    notes: Note[];
    duration: number;
  } | null>(null);

  const {
    recordingState,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    handleKeyPress,
    handleKeyRelease,
    saveRecording,
    clearRecording,
    getActiveKeys
  } = useRecording();

  // Proporcionar handlers al componente padre
  React.useEffect(() => {
    onSetRecordingHandlers({
      onKeyPress: handleKeyPress,
      onKeyRelease: handleKeyRelease
    });
  }, [handleKeyPress, handleKeyRelease, onSetRecordingHandlers]);

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const centiseconds = Math.floor((ms % 1000) / 10);
    
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = () => {
    startRecording();
    setTitle('');
    setArtist('Usuario');
    setDescription('');
  };

  const handleStopRecording = () => {
    console.log('RecordingControls - Deteniendo grabación...');
    
    // Guardar información ANTES de detener (para mostrar en el modal)
    const currentDuration = recordingState.duration;
    
    const notes = stopRecording();
    console.log('Notas grabadas al detener:', notes.length); // Debug
    console.log('Notas completas:', notes); // Debug detallado
    
    if (notes.length > 0) {
      // Guardar información para mostrar en el modal
      setStoppedRecordingInfo({
        notes,
        duration: currentDuration
      });
      setShowSaveDialog(true);
    } else {
      // Mostrar mensaje cuando no hay notas
      alert(`❌ No se grabaron notas válidas.

🔍 Abre la consola (F12) para ver logs de debug.

🎹 Usa estas teclas: a, s, d, f, g, h, j
🎵 Mantén las teclas presionadas al menos medio segundo.`);
    }
  };

  const handleSaveRecording = () => {
    if (!title.trim()) {
      alert('Por favor ingresa un título para la grabación');
      return;
    }

    if (!stoppedRecordingInfo) {
      alert('No hay grabación para guardar');
      return;
    }

    try {
      // Crear grabación manualmente con las notas guardadas
      const recording: Recording = {
        id: `recording-${Date.now()}`,
        title: title.trim(),
        artist: artist.trim() || 'Usuario',
        createdAt: new Date(),
        duration: stoppedRecordingInfo.duration,
        notes: stoppedRecordingInfo.notes,
        bpm: 120, // BPM por defecto
        keySignature: 'C major',
        description: description.trim() || `Grabación personal de ${stoppedRecordingInfo.notes.length} notas`
      };

      onRecordingSaved(recording);
      setShowSaveDialog(false);
      setStoppedRecordingInfo(null);
      setTitle('');
      setArtist('Usuario');
      setDescription('');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error al guardar la grabación');
    }
  };

  const handleSaveAndDownload = () => {
    if (!title.trim()) {
      alert('Por favor ingresa un título para la grabación');
      return;
    }

    if (!stoppedRecordingInfo) {
      alert('No hay grabación para guardar');
      return;
    }

    try {
      // Crear grabación manualmente con las notas guardadas
      const recording: Recording = {
        id: `recording-${Date.now()}`,
        title: title.trim(),
        artist: artist.trim() || 'Usuario',
        createdAt: new Date(),
        duration: stoppedRecordingInfo.duration,
        notes: stoppedRecordingInfo.notes,
        bpm: 120, // BPM por defecto
        keySignature: 'C major',
        description: description.trim() || `Grabación personal de ${stoppedRecordingInfo.notes.length} notas`
      };

      onRecordingSaved(recording);
      
      // Descargar como MIDI
      downloadMidiFile(recording);
      
      setShowSaveDialog(false);
      setStoppedRecordingInfo(null);
      setTitle('');
      setArtist('Usuario');
      setDescription('');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error al guardar la grabación');
    }
  };

  const handleDiscardRecording = () => {
    clearRecording();
    setShowSaveDialog(false);
    setStoppedRecordingInfo(null);
    setTitle('');
    setArtist('Usuario');
    setDescription('');
  };

  return (
    <div className="space-y-4">
      {/* Recording Status */}
      <Card className={`p-4 ${recordingState.isRecording ? 'bg-red-50 border-red-200' : 'bg-gray-50'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              recordingState.isRecording && !recordingState.isPaused 
                ? 'bg-red-500 animate-pulse' 
                : recordingState.isRecording 
                  ? 'bg-yellow-500' 
                  : 'bg-gray-400'
            }`} />
            <span className="font-medium">
              {recordingState.isRecording 
                ? recordingState.isPaused 
                  ? 'Grabación Pausada' 
                  : 'Grabando...'
                : 'Listo para Grabar'
              }
            </span>
            {recordingState.isRecording && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                {formatDuration(recordingState.duration)}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!recordingState.isRecording ? (
              <Button onClick={handleStartRecording} className="flex items-center gap-2">
                <Mic className="w-4 h-4" />
                Iniciar Grabación
              </Button>
            ) : (
              <>
                {recordingState.isPaused ? (
                  <Button onClick={resumeRecording} variant="outline" className="flex items-center gap-2">
                    <Play className="w-4 h-4" />
                    Continuar
                  </Button>
                ) : (
                  <Button onClick={pauseRecording} variant="outline" className="flex items-center gap-2">
                    <Pause className="w-4 h-4" />
                    Pausar
                  </Button>
                )}
                <Button onClick={handleStopRecording} variant="destructive" className="flex items-center gap-2">
                  <Square className="w-4 h-4" />
                  Detener
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Recording Info */}
        {recordingState.isRecording && (
          <div className="mt-3 text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <span>Notas grabadas: {recordingState.currentNotes.length}</span>
              {getActiveKeys().length > 0 && (
                <span>Teclas activas: {getActiveKeys().join(', ')}</span>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Instructions */}
      {!recordingState.isRecording && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <Music2 className="w-5 h-5" />
            ¿Cómo grabar?
          </h3>
          <ul className="text-blue-800 text-sm space-y-1">
            <li>• Haz click en "Iniciar Grabación"</li>
            <li>• Toca las teclas del piano normalmente</li>
            <li>• La grabación captura tanto el timing como la duración de cada nota</li>
            <li>• Puedes pausar y continuar cuando quieras</li>
            <li>• Al terminar, guarda tu grabación con un nombre</li>
            <li>• Podrás practicar tu grabación como cualquier otra canción</li>
          </ul>
        </Card>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Save className="w-5 h-5" />
                Guardar Grabación
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Título *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Mi nueva grabación"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Artista
                  </label>
                  <input
                    type="text"
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Tu nombre"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Descripción opcional..."
                    rows={3}
                  />
                </div>

                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                  <p><strong>Duración:</strong> {stoppedRecordingInfo ? formatDuration(stoppedRecordingInfo.duration) : '0:00.00'}</p>
                  <p><strong>Notas:</strong> {stoppedRecordingInfo ? stoppedRecordingInfo.notes.length : 0}</p>
                </div>

                <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded border border-blue-200">
                  <p className="font-medium mb-1">💡 Exportar como MIDI</p>
                  <p>Al descargar como MIDI, podrás:</p>
                  <ul className="text-xs mt-1 space-y-1 ml-4">
                    <li>• Abrir en cualquier software de música</li>
                    <li>• Compartir con otros músicos</li>
                    <li>• Editar en programas como GarageBand, FL Studio, etc.</li>
                    <li>• Convertir a otros formatos de audio</li>
                  </ul>
                </div>
              </div>

          <div className="flex justify-end gap-3 mt-6">
            {/* Botón de debug en desarrollo */}
            {process.env.NODE_ENV === 'development' && (
              <Button 
                onClick={() => {
                  console.log('🔍 Debug - Estado actual de grabación:', recordingState);
                  console.log('🔍 Debug - Información de grabación detenida:', stoppedRecordingInfo);
                  console.log('🔍 Debug - Notas activas:', getActiveKeys());
                  alert(`Debug Info:
• isRecording: ${recordingState.isRecording}
• isPaused: ${recordingState.isPaused} 
• currentNotes (estado actual): ${recordingState.currentNotes.length}
• stoppedRecording notas: ${stoppedRecordingInfo?.notes.length || 'N/A'}
• stoppedRecording duración: ${stoppedRecordingInfo?.duration || 'N/A'}
• activeKeys: ${getActiveKeys().join(', ') || 'ninguna'}
• startTime: ${recordingState.startTime ? new Date(recordingState.startTime).toLocaleTimeString() : 'null'}

Revisa la consola para más detalles.`);
                }}
                variant="outline" 
                size="sm"
                className="text-xs"
              >
                🔍 Debug
              </Button>
            )}
            <Button onClick={handleDiscardRecording} variant="outline" className="flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              Descartar
            </Button>
            <Button onClick={handleSaveRecording} variant="outline" className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              Solo Guardar
            </Button>
            <Button onClick={handleSaveAndDownload} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Guardar y Descargar MIDI
            </Button>
          </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
