import { useState } from 'react';
import { Song } from '@/types/song';
import { parseMidiToSong, validateMidiFile, getMidiInfo, MidiMetadata, MidiConversionOptions } from '@/lib/midi-parser';

interface MidiImportState {
  isLoading: boolean;
  error: string | null;
  progress: number;
}

interface MidiFileInfo {
  name: string;
  size: number;
  tracks: number;
  notes: number;
  duration: number;
  bpm: number;
  timeSignature: string;
}

export function useMidiImport() {
  const [state, setState] = useState<MidiImportState>({
    isLoading: false,
    error: null,
    progress: 0
  });

  /**
   * Analiza un archivo MIDI y devuelve información básica
   */
  const analyzeMidiFile = async (file: File): Promise<MidiFileInfo> => {
    setState(prev => ({ ...prev, isLoading: true, error: null, progress: 10 }));
    
    try {
      const buffer = await file.arrayBuffer();
      
      setState(prev => ({ ...prev, progress: 30 }));
      
      if (!validateMidiFile(buffer)) {
        throw new Error('El archivo no es un MIDI válido');
      }
      
      setState(prev => ({ ...prev, progress: 60 }));
      
      const info = await getMidiInfo(buffer);
      
      setState(prev => ({ ...prev, progress: 100, isLoading: false }));
      
      return {
        name: file.name,
        size: file.size,
        ...info
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al analizar archivo MIDI';
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false, progress: 0 }));
      throw error;
    }
  };

  /**
   * Convierte un archivo MIDI a Song
   */
  const convertMidiToSong = async (
    file: File,
    metadata: MidiMetadata,
    options?: MidiConversionOptions
  ): Promise<Song> => {
    setState(prev => ({ ...prev, isLoading: true, error: null, progress: 0 }));
    
    try {
      const buffer = await file.arrayBuffer();
      
      setState(prev => ({ ...prev, progress: 20 }));
      
      if (!validateMidiFile(buffer)) {
        throw new Error('El archivo no es un MIDI válido');
      }
      
      setState(prev => ({ ...prev, progress: 40 }));
      
      const song = await parseMidiToSong(buffer, metadata, options);
      
      setState(prev => ({ ...prev, progress: 100, isLoading: false }));
      
      return song;
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
    options?: MidiConversionOptions
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
          const buffer = await file.arrayBuffer();
          
          if (!validateMidiFile(buffer)) {
            console.warn(`Archivo ${file.name} no es un MIDI válido, saltando...`);
            continue;
          }
          
          const song = await parseMidiToSong(buffer, metadata, options);
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
    analyzeMidiFile,
    convertMidiToSong,
    convertMultipleMidiFiles,
    resetState
  };
}
