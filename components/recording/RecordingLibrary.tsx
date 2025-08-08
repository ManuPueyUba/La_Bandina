'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Recording } from '@/types/song';
import { downloadMidiFile, getMidiExportInfo } from '@/lib/midi-export';
import { 
  Play, 
  Trash2, 
  Edit, 
  Clock, 
  Music, 
  Calendar,
  Save,
  X,
  Download
} from 'lucide-react';

interface RecordingLibraryProps {
  recordings: Recording[];
  onPlayRecording: (recording: Recording) => void;
  onDeleteRecording: (recordingId: string) => void;
  onUpdateRecording: (recording: Recording) => void;
}

export default function RecordingLibrary({ 
  recordings, 
  onPlayRecording, 
  onDeleteRecording,
  onUpdateRecording 
}: RecordingLibraryProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', artist: '', description: '' });

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const handleEditStart = (recording: Recording) => {
    setEditingId(recording.id);
    setEditForm({
      title: recording.title,
      artist: recording.artist,
      description: recording.description || ''
    });
  };

  const handleEditSave = (recording: Recording) => {
    const updatedRecording: Recording = {
      ...recording,
      title: editForm.title.trim(),
      artist: editForm.artist.trim(),
      description: editForm.description.trim()
    };
    
    onUpdateRecording(updatedRecording);
    setEditingId(null);
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditForm({ title: '', artist: '', description: '' });
  };

  const handleDelete = (recording: Recording) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar "${recording.title}"?`)) {
      onDeleteRecording(recording.id);
    }
  };

  const handleDownloadMidi = async (recording: Recording) => {
    try {
      downloadMidiFile(recording);
    } catch (error) {
      alert('Error al generar archivo MIDI: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  };

  if (recordings.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Music className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-600 mb-2">
          No hay grabaciones
        </h3>
        <p className="text-gray-500">
          Graba tu primera interpretación para comenzar tu biblioteca personal
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">
          Mis Grabaciones ({recordings.length})
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recordings.map(recording => (
          <Card key={recording.id} className="p-4 hover:shadow-md transition-shadow">
            <div className="space-y-3">
              {editingId === recording.id ? (
                // Modo edición
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-2 py-1 border border-gray-300 rounded font-semibold"
                    placeholder="Título"
                  />
                  <input
                    type="text"
                    value={editForm.artist}
                    onChange={(e) => setEditForm(prev => ({ ...prev, artist: e.target.value }))}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="Artista"
                  />
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                    placeholder="Descripción"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => handleEditSave(recording)} 
                      size="sm" 
                      className="flex-1"
                    >
                      <Save className="w-3 h-3 mr-1" />
                      Guardar
                    </Button>
                    <Button 
                      onClick={handleEditCancel} 
                      variant="outline" 
                      size="sm"
                      className="border-gray-600 text-gray-200 hover:bg-gray-800"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                // Modo visualización
                <>
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {recording.title}
                      </h3>
                      <p className="text-sm text-gray-600 truncate">
                        {recording.artist}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        onClick={() => handleEditStart(recording)}
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        onClick={() => handleDelete(recording)}
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(recording.duration)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Music className="w-3 h-3" />
                        {recording.notes.length} notas
                      </div>
                      {recording.bpm && (
                        <div>{recording.bpm} BPM</div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      {formatDate(recording.createdAt)}
                    </div>

                    {recording.description && (
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {recording.description}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => onPlayRecording(recording)}
                      className="flex-1"
                      size="sm"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Practicar
                    </Button>
                    <Button
                      onClick={() => handleDownloadMidi(recording)}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1 border-gray-600 text-gray-200 hover:bg-gray-800"
                      title="Descargar como MIDI"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
