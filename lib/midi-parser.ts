import { Midi } from '@tonejs/midi';
import { Song, Note } from '@/types/song';

/**
 * Metadata para archivos MIDI importados
 */
export interface MidiMetadata {
  id: string;
  title: string;
  artist: string;
  category: string;
  keySignature?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  description?: string;
}

/**
 * Opciones para la conversión de MIDI
 */
export interface MidiConversionOptions {
  /** Octava mínima permitida (default: 4) */
  minOctave?: number;
  /** Octava máxima permitida (default: 6) */
  maxOctave?: number;
  /** Duración mínima de nota en ms (default: 100) */
  minNoteDuration?: number;
  /** Combinar notas muy cercanas en tiempo (default: 50ms) */
  quantizeThreshold?: number;
  /** Simplificar melodía eliminando repeticiones (default: true) */
  simplifyMelody?: boolean;
  /** Eliminar acordes y tomar solo melodía principal (default: true) */
  removeChords?: boolean;
  /** Máximo de notas por segundo (default: 4) */
  maxNotesPerSecond?: number;
}

/**
 * Calcula la dificultad basada en las características de la canción
 */
function calculateDifficulty(notes: Note[], bpm: number): 'beginner' | 'intermediate' | 'advanced' {
  const noteCount = notes.length;
  const avgNoteDuration = notes.reduce((sum, note) => sum + note.duration, 0) / noteCount;
  const uniqueKeys = new Set(notes.map(note => note.key)).size;
  
  // Factores para determinar dificultad
  const density = noteCount / (notes[notes.length - 1]?.startTime + notes[notes.length - 1]?.duration || 1) * 1000; // notas por segundo
  const hasSharpFlats = notes.some(note => note.key.includes('#'));
  const fastTempo = bpm > 140;
  const shortNotes = avgNoteDuration < 300;
  
  let difficultyScore = 0;
  
  // Scoring system
  if (noteCount > 50) difficultyScore += 2;
  else if (noteCount > 25) difficultyScore += 1;
  
  if (uniqueKeys > 8) difficultyScore += 2;
  else if (uniqueKeys > 5) difficultyScore += 1;
  
  if (density > 2) difficultyScore += 2;
  else if (density > 1) difficultyScore += 1;
  
  if (hasSharpFlats) difficultyScore += 1;
  if (fastTempo) difficultyScore += 1;
  if (shortNotes) difficultyScore += 1;
  
  if (difficultyScore >= 5) return 'advanced';
  if (difficultyScore >= 2) return 'intermediate';
  return 'beginner';
}

/**
 * Filtra notas para mantener solo las que están en el rango de octavas del piano
 */
function filterNotesInRange(notes: Note[], minOctave: number = 4, maxOctave: number = 6): Note[] {
  return notes.filter(note => {
    const octave = parseInt(note.key.slice(-1));
    return octave >= minOctave && octave <= maxOctave;
  });
}

/**
 * Simplifica la melodía eliminando repeticiones cercanas y acordes
 */
function simplifyMelodyNotes(notes: Note[], options: {
  removeRepeats?: boolean;
  removeChords?: boolean;
  minInterval?: number;
  maxNotesPerSecond?: number;
} = {}): Note[] {
  const {
    removeRepeats = true,
    removeChords = true,
    minInterval = 100, // mínimo tiempo entre notas diferentes
    maxNotesPerSecond = 4 // máximo 4 notas por segundo
  } = options;

  if (notes.length === 0) return notes;
  
  let simplified = [...notes].sort((a, b) => a.startTime - b.startTime);
  
  // 1. Eliminar acordes (notas que suenan al mismo tiempo)
  if (removeChords) {
    const melodicNotes: Note[] = [];
    const grouped = new Map<number, Note[]>();
    
    // Agrupar notas por tiempo de inicio (±50ms)
    simplified.forEach(note => {
      const timeKey = Math.round(note.startTime / 50) * 50;
      if (!grouped.has(timeKey)) {
        grouped.set(timeKey, []);
      }
      grouped.get(timeKey)!.push(note);
    });
    
    // De cada grupo, tomar solo la nota más aguda (melodía principal)
    grouped.forEach(group => {
      if (group.length === 1) {
        melodicNotes.push(group[0]);
      } else {
        // Ordenar por nota (C4 < C5, etc.) y tomar la más aguda
        const sorted = group.sort((a, b) => {
          const noteA = a.key.slice(0, -1);
          const octaveA = parseInt(a.key.slice(-1));
          const noteB = b.key.slice(0, -1);
          const octaveB = parseInt(b.key.slice(-1));
          
          if (octaveA !== octaveB) return octaveB - octaveA; // Octava más alta
          
          // Dentro de la misma octava, preferir notas naturales sobre sostenidos
          const noteOrder = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
          const indexA = noteOrder.indexOf(noteA.replace('#', ''));
          const indexB = noteOrder.indexOf(noteB.replace('#', ''));
          return indexB - indexA;
        });
        
        melodicNotes.push(sorted[0]);
      }
    });
    
    simplified = melodicNotes.sort((a, b) => a.startTime - b.startTime);
  }
  
  // 2. Eliminar repeticiones cercanas de la misma nota
  if (removeRepeats) {
    const withoutRepeats: Note[] = [];
    
    for (const note of simplified) {
      const lastNote = withoutRepeats[withoutRepeats.length - 1];
      
      if (!lastNote || 
          lastNote.key !== note.key || 
          note.startTime - lastNote.startTime > minInterval) {
        withoutRepeats.push(note);
      } else {
        // Extender la duración de la nota anterior en lugar de repetir
        lastNote.duration = Math.max(lastNote.duration, 
          note.startTime + note.duration - lastNote.startTime);
      }
    }
    
    simplified = withoutRepeats;
  }
  
  // 3. Limitar la densidad de notas
  if (maxNotesPerSecond > 0) {
    const filtered: Note[] = [];
    const minTimeBetweenNotes = 1000 / maxNotesPerSecond;
    
    for (const note of simplified) {
      const lastNote = filtered[filtered.length - 1];
      
      if (!lastNote || note.startTime - lastNote.startTime >= minTimeBetweenNotes) {
        filtered.push(note);
      }
    }
    
    simplified = filtered;
  }
  
  return simplified;
}

/**
 * Cuantiza las notas para evitar overlaps y normalizar timing
 */
function quantizeNotes(notes: Note[], threshold: number = 50): Note[] {
  if (notes.length === 0) return notes;
  
  const sortedNotes = [...notes].sort((a, b) => a.startTime - b.startTime);
  const quantized: Note[] = [];
  
  for (let i = 0; i < sortedNotes.length; i++) {
    const currentNote = { ...sortedNotes[i] };
    
    // Ajustar si hay overlap con la nota anterior
    if (quantized.length > 0) {
      const prevNote = quantized[quantized.length - 1];
      const prevEnd = prevNote.startTime + prevNote.duration;
      
      if (currentNote.startTime < prevEnd) {
        // Si hay overlap, ajustar el start time
        if (prevEnd - currentNote.startTime < threshold) {
          currentNote.startTime = prevEnd;
        }
      }
    }
    
    // Ajustar duración mínima
    if (currentNote.duration < threshold) {
      currentNote.duration = threshold;
    }
    
    quantized.push(currentNote);
  }
  
  return quantized;
}

/**
 * Convierte un archivo MIDI a formato Song
 */
export async function parseMidiToSong(
  midiBuffer: ArrayBuffer,
  metadata: MidiMetadata,
  options: MidiConversionOptions = {}
): Promise<Song> {
  const {
    minOctave = 4,
    maxOctave = 6,
    minNoteDuration = 100,
    quantizeThreshold = 50,
    simplifyMelody = true,
    removeChords = true,
    maxNotesPerSecond = 4
  } = options;
  
  try {
    // Parsear el archivo MIDI
    const midi = new Midi(midiBuffer);
    
    if (midi.tracks.length === 0) {
      throw new Error('El archivo MIDI no contiene tracks');
    }
    
    // Buscar el track con más notas (usualmente la melodía principal)
    let mainTrack = midi.tracks[0];
    for (const track of midi.tracks) {
      if (track.notes.length > mainTrack.notes.length) {
        mainTrack = track;
      }
    }
    
    // También considerar tracks por nombre (buscar melodía, lead, etc.)
    const melodyKeywords = ['melody', 'lead', 'vocal', 'main', 'piano'];
    const melodyTrack = midi.tracks.find(track => 
      track.name && melodyKeywords.some(keyword => 
        track.name!.toLowerCase().includes(keyword)
      )
    );
    
    if (melodyTrack && melodyTrack.notes.length > 0) {
      mainTrack = melodyTrack;
    }
    
    if (mainTrack.notes.length === 0) {
      throw new Error('No se encontraron notas en el archivo MIDI');
    }
    
    // Convertir notas MIDI a nuestro formato
    let notes: Note[] = mainTrack.notes.map(midiNote => ({
      key: midiNote.name, // Ya viene en formato "C4", "F#4", etc.
      startTime: Math.round(midiNote.time * 1000), // Convertir a milisegundos
      duration: Math.max(Math.round(midiNote.duration * 1000), minNoteDuration)
    }));
    
    // Filtrar notas fuera del rango del piano
    notes = filterNotesInRange(notes, minOctave, maxOctave);
    
    if (notes.length === 0) {
      throw new Error(`No se encontraron notas en el rango de octavas ${minOctave}-${maxOctave}`);
    }
    
    // Simplificar melodía si está habilitado
    if (simplifyMelody) {
      notes = simplifyMelodyNotes(notes, {
        removeRepeats: true,
        removeChords,
        minInterval: quantizeThreshold * 2,
        maxNotesPerSecond
      });
      
      if (notes.length === 0) {
        throw new Error('No se encontraron notas válidas después de simplificar la melodía');
      }
    }
    
    // Cuantizar las notas
    notes = quantizeNotes(notes, quantizeThreshold);
    
    // Obtener información del tempo
    const bpm = Math.round(midi.header.tempos[0]?.bpm || 120);
    
    // Calcular duración total
    const lastNote = notes[notes.length - 1];
    const duration = lastNote.startTime + lastNote.duration;
    
    // Obtener time signature
    const timeSignature = midi.header.timeSignatures[0]?.timeSignature.join('/') || '4/4';
    
    // Calcular dificultad si no se especificó
    const difficulty = metadata.difficulty || calculateDifficulty(notes, bpm);
    
    // Crear el objeto Song
    const song: Song = {
      id: metadata.id,
      title: metadata.title,
      artist: metadata.artist,
      difficulty,
      category: metadata.category,
      bpm,
      duration,
      notes,
      keySignature: metadata.keySignature || 'C major',
      timeSignature,
      description: metadata.description || `Canción importada desde MIDI con ${notes.length} notas.`
    };
    
    return song;
    
  } catch (error) {
    console.error('Error parsing MIDI file:', error);
    throw new Error(`Error al procesar archivo MIDI: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

/**
 * Valida si un archivo es un MIDI válido
 */
export function validateMidiFile(buffer: ArrayBuffer): boolean {
  try {
    // Los archivos MIDI empiezan con "MThd"
    const view = new DataView(buffer);
    const header = String.fromCharCode(
      view.getUint8(0),
      view.getUint8(1),
      view.getUint8(2),
      view.getUint8(3)
    );
    return header === 'MThd';
  } catch {
    return false;
  }
}

/**
 * Obtiene información básica de un archivo MIDI sin parsearlo completamente
 */
export async function getMidiInfo(midiBuffer: ArrayBuffer): Promise<{
  tracks: number;
  notes: number;
  duration: number;
  bpm: number;
  timeSignature: string;
}> {
  try {
    const midi = new Midi(midiBuffer);
    
    const totalNotes = midi.tracks.reduce((sum, track) => sum + track.notes.length, 0);
    const bpm = Math.round(midi.header.tempos[0]?.bpm || 120);
    const timeSignature = midi.header.timeSignatures[0]?.timeSignature.join('/') || '4/4';
    
    return {
      tracks: midi.tracks.length,
      notes: totalNotes,
      duration: Math.round(midi.duration * 1000),
      bpm,
      timeSignature
    };
  } catch (error) {
    throw new Error(`Error al obtener información del MIDI: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}
