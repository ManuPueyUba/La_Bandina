import { useState } from 'react';
import { Song } from '@/types/song';
import { MidiMetadata } from '@/lib/midi-parser';
import ApiClient, { MidiConversionRequest, MidiUploadResponse, MidiConversionResponse, SongResponse } from '@/lib/api';

interface MidiImportState {
  isLoading: boolean;
  error: string | null;
  progress: number;
}

export function useMidiImport() {
  const [state, setState] = useState<MidiImportState>({
    isLoading: false,
    error: null,
    progress: 0
  });

  /**
   * Convierte un archivo MIDI directamente a Song usando el backend
   */
  const convertMidiToSong = async (
    file: File,
    metadata: MidiMetadata,
    options?: any
  ): Promise<Song> => {
    setState(prev => ({ ...prev, isLoading: true, error: null, progress: 0 }));
    
    try {
      // 1) Subir archivo al backend
      setState(prev => ({ ...prev, progress: 20 }));
      const uploaded: MidiUploadResponse = await ApiClient.uploadMidi(file);
      
      // 2) Convertir directamente a canción
      setState(prev => ({ ...prev, progress: 50 }));
      const req: MidiConversionRequest = {
        title: metadata.title,
        artist: metadata.artist || 'Desconocido',
        category: metadata.category || 'Importada',
        description: metadata.description,
        options: {
          // Configuración simple: mantener notas tal como están
          min_octave: 3,
          max_octave: 7,
          min_note_duration: 100,
          quantize_threshold: 50,
          simplify_melody: false,
          remove_chords: false,
          max_notes_per_second: 10,
        }
      };

      const conversion: MidiConversionResponse = await ApiClient.convertMidi(uploaded.id, req);
      setState(prev => ({ ...prev, progress: 100, isLoading: false }));

      // Mapear respuesta del backend a formato frontend
      const saved: SongResponse = conversion.song;
      const converted: Song = {
        id: saved.id,
        title: saved.title,
        artist: saved.artist,
        difficulty: saved.difficulty as any,
        category: saved.category,
        bpm: saved.bpm,
        duration: saved.duration,
        notes: saved.notes.map(n => ({ key: n.key, duration: n.duration, startTime: n.start_time })),
        keySignature: saved.key_signature,
        timeSignature: saved.time_signature,
        description: saved.description,
      };
      
      return converted;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al convertir archivo MIDI';
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false, progress: 0 }));
      throw error;
    }
  };

  /**
   * Procesa múltiples archivos MIDI en lote
   */
  const convertMultipleMidiFiles = async (
    files: File[],
    getMetadata: (file: File, index: number) => MidiMetadata,
    options?: any
  ): Promise<Song[]> => {
    setState(prev => ({ ...prev, isLoading: true, error: null, progress: 0 }));
    
    const songs: Song[] = [];
    const totalFiles = files.length;
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const metadata = getMetadata(file, i);
        
        setState(prev => ({ 
          ...prev, 
          progress: Math.round((i / totalFiles) * 90)
        }));
        
        try {
          const song = await convertMidiToSong(file, metadata, options);
          songs.push(song);
        } catch (error) {
          console.error(`Error procesando ${file.name}:`, error);
          // Continuar con el siguiente archivo en lugar de fallar completamente
        }
      }
      
      setState(prev => ({ ...prev, progress: 100, isLoading: false }));
      
      return songs;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error procesando archivos MIDI';
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false, progress: 0 }));
      throw error;
    }
  };

  /**
   * Resetea el estado del hook
   */
  const resetState = () => {
    setState({
      isLoading: false,
      error: null,
      progress: 0
    });
  };

  return {
    ...state,
    convertMidiToSong,
    convertMultipleMidiFiles,
    resetState
  };
}
