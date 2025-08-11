import { useState, useEffect } from 'react'
import { ApiClient, SongResponse } from '@/lib/api'
import { Song } from '@/types/song'

/**
 * Función para transponer notas automáticamente al rango C4-B6
 */
function transposeNotesToPianoRange(notes: any[]): any[] {
  // Rango del piano: C4 (60) hasta B6 (95)
  const MIN_MIDI = 60; // C4
  const MAX_MIDI = 95; // B6
  
  const noteNameToMidi: { [key: string]: number } = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4,
    'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9,
    'A#': 10, 'Bb': 10, 'B': 11
  };
  
  const midiToNoteName = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  
  function parseNote(noteKey: string): { note: string, octave: number, midi: number } {
    const match = noteKey.match(/^([A-G][#b]?)(\d+)$/);
    if (!match) {
      return { note: 'C', octave: 4, midi: 60 };
    }
    
    const [, noteName, octaveStr] = match;
    const octave = parseInt(octaveStr);
    const noteValue = noteNameToMidi[noteName] || 0;
    const midi = (octave * 12) + noteValue + 12;
    
    return { note: noteName, octave, midi };
  }
  
  function midiToNoteKey(midi: number): string {
    const octave = Math.floor((midi - 12) / 12);
    const noteIndex = midi % 12;
    return midiToNoteName[noteIndex] + octave;
  }
  
  return notes.map(note => {
    const parsed = parseNote(note.key);
    let targetMidi = parsed.midi;
    
    // Si está fuera del rango, transponer por octavas
    if (targetMidi < MIN_MIDI) {
      while (targetMidi < MIN_MIDI) {
        targetMidi += 12;
      }
    } else if (targetMidi > MAX_MIDI) {
      while (targetMidi > MAX_MIDI) {
        targetMidi -= 12;
      }
    }
    
    return {
      ...note,
      key: midiToNoteKey(targetMidi)
    };
  });
}

// Función para convertir SongResponse del backend a Song del frontend
const convertBackendSongToFrontend = (backendSong: SongResponse): Song => {
  // Transponer las notas automáticamente al rango del piano
  const originalNotes = backendSong.notes.map(note => ({
    key: note.key,
    duration: note.duration,
    start_time: note.start_time
  }));
  
  const transposedNotes = transposeNotesToPianoRange(originalNotes);
  console.log(`🎹 [${backendSong.title}] Transposed ${transposedNotes.length} notes to piano range`);
  
  return {
    id: backendSong.id,
    title: backendSong.title,
    artist: backendSong.artist,
    difficulty: backendSong.difficulty as 'beginner' | 'intermediate' | 'advanced',
    category: backendSong.category,
    bpm: backendSong.bpm,
    duration: backendSong.duration,
    notes: transposedNotes.map(note => ({
      key: note.key,
      duration: note.duration,
      startTime: note.start_time
    })),
    keySignature: backendSong.key_signature,
    timeSignature: backendSong.time_signature,
    description: backendSong.description || undefined
  }
}

interface UseSongsFromBackend {
  songs: Song[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const useSongsFromBackend = (): UseSongsFromBackend => {
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSongs = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Primero verificar que el backend esté disponible
      await ApiClient.healthCheck()
      
      // Luego obtener las canciones
      const backendSongs = await ApiClient.getSongs()
      const convertedSongs = backendSongs.map(convertBackendSongToFrontend)
      
      setSongs(convertedSongs)
      console.log(`Loaded ${convertedSongs.length} songs from backend`)
      
    } catch (err) {
      console.error('Error fetching songs from backend:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setSongs([]) // Resetear canciones en caso de error
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSongs()
  }, [])

  return {
    songs,
    loading,
    error,
    refetch: fetchSongs
  }
}

export default useSongsFromBackend
