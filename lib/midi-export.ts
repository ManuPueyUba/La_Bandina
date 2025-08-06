import MidiWriter from 'midi-writer-js';
import { Recording, Note } from '@/types/song';

/**
 * Convierte una nota en formato de string (ej: "C4") a formato MIDI
 */
function noteToMidi(noteString: string): string {
  // Extraer la nota y la octava
  const match = noteString.match(/^([A-G][#b]?)(\d+)$/);
  if (!match) {
    throw new Error(`Formato de nota inválido: ${noteString}`);
  }
  
  const [, note, octave] = match;
  
  // Mapear notas con sostenidos/bemoles
  const noteMap: { [key: string]: string } = {
    'C': 'C',
    'C#': 'C#', 'Db': 'C#',
    'D': 'D',
    'D#': 'D#', 'Eb': 'D#',
    'E': 'E',
    'F': 'F',
    'F#': 'F#', 'Gb': 'F#',
    'G': 'G',
    'G#': 'G#', 'Ab': 'G#',
    'A': 'A',
    'A#': 'A#', 'Bb': 'A#',
    'B': 'B'
  };
  
  const mappedNote = noteMap[note];
  if (!mappedNote) {
    throw new Error(`Nota no reconocida: ${note}`);
  }
  
  return `${mappedNote}${octave}`;
}

/**
 * Convierte milisegundos a ticks MIDI
 */
function msToTicks(ms: number, ticksPerQuarter: number = 480, bpm: number = 120): number {
  // Calcular ticks por milisegundo
  const ticksPerSecond = (bpm / 60) * ticksPerQuarter;
  const ticksPerMs = ticksPerSecond / 1000;
  return Math.round(ms * ticksPerMs);
}

/**
 * Agrupa notas que suenan al mismo tiempo para crear acordes
 */
function groupSimultaneousNotes(notes: Note[], tolerance: number = 10): Note[][] {
  if (notes.length === 0) return [];
  
  const sorted = [...notes].sort((a, b) => a.startTime - b.startTime);
  const groups: Note[][] = [];
  let currentGroup: Note[] = [sorted[0]];
  
  for (let i = 1; i < sorted.length; i++) {
    const currentNote = sorted[i];
    const lastNoteInGroup = currentGroup[currentGroup.length - 1];
    
    // Si la nota actual empieza dentro de la tolerancia, agregar al grupo actual
    if (Math.abs(currentNote.startTime - lastNoteInGroup.startTime) <= tolerance) {
      currentGroup.push(currentNote);
    } else {
      // Iniciar nuevo grupo
      groups.push(currentGroup);
      currentGroup = [currentNote];
    }
  }
  
  // Agregar el último grupo
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }
  
  return groups;
}

/**
 * Exporta una grabación como archivo MIDI
 */
export function exportRecordingToMidi(recording: Recording): Blob {
  try {
    const track = new MidiWriter.Track();
    
    // Configurar información del track
    track.addTrackName(recording.title);
    track.addText(`Artist: ${recording.artist}`);
    
    if (recording.description) {
      track.addText(`Description: ${recording.description}`);
    }
    
    // Configurar tempo
    const bpm = recording.bpm || 120;
    track.setTempo(bpm);
    
    // Configurar time signature (4/4 por defecto)
    track.setTimeSignature(4, 4, 24, 8);
    
    // Agrupar notas simultáneas
    const noteGroups = groupSimultaneousNotes(recording.notes);
    
    let currentTime = 0;
    
    for (const group of noteGroups) {
      // Calcular el tiempo de inicio del grupo
      const groupStartTime = group[0].startTime;
      
      // Agregar silencio si es necesario
      if (groupStartTime > currentTime) {
        const waitDuration = groupStartTime - currentTime;
        const waitTicks = msToTicks(waitDuration, 480, bpm);
        if (waitTicks > 0) {
          track.addEvent(new MidiWriter.NoteEvent({
            pitch: ['C4'], // Nota muda
            duration: 'T' + waitTicks,
            velocity: 0 // Silencio
          }));
        }
        currentTime = groupStartTime;
      }
      
      // Determinar la duración del grupo (usar la nota más larga)
      const maxDuration = Math.max(...group.map(note => note.duration));
      const durationTicks = msToTicks(maxDuration, 480, bpm);
      
      if (group.length === 1) {
        // Nota individual
        const note = group[0];
        try {
          const midiNote = noteToMidi(note.key);
          track.addEvent(new MidiWriter.NoteEvent({
            pitch: [midiNote],
            duration: 'T' + durationTicks,
            velocity: 80
          }));
        } catch (error) {
          console.warn(`Error procesando nota ${note.key}:`, error);
          // Agregar silencio en lugar de la nota problemática
          track.addEvent(new MidiWriter.NoteEvent({
            pitch: ['C4'],
            duration: 'T' + durationTicks,
            velocity: 0
          }));
        }
      } else {
        // Acorde
        const chord = group.map(note => {
          try {
            return noteToMidi(note.key);
          } catch (error) {
            console.warn(`Error procesando nota en acorde ${note.key}:`, error);
            return null;
          }
        }).filter(Boolean) as string[];
        
        if (chord.length > 0) {
          track.addEvent(new MidiWriter.NoteEvent({
            pitch: chord,
            duration: 'T' + durationTicks,
            velocity: 80
          }));
        } else {
          // Si todas las notas del acorde fallaron, agregar silencio
          track.addEvent(new MidiWriter.NoteEvent({
            pitch: ['C4'],
            duration: 'T' + durationTicks,
            velocity: 0
          }));
        }
      }
      
      currentTime += maxDuration;
    }
    
    // Crear el archivo MIDI
    const write = new MidiWriter.Writer(track);
    const midiData = write.buildFile();
    
    // Convertir a Blob
    const uint8Array = new Uint8Array(midiData);
    return new Blob([uint8Array], { type: 'audio/midi' });
    
  } catch (error) {
    console.error('Error exportando a MIDI:', error);
    throw new Error(`Error al generar archivo MIDI: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

/**
 * Descarga un archivo MIDI
 */
export function downloadMidiFile(recording: Recording): void {
  try {
    const blob = exportRecordingToMidi(recording);
    const url = URL.createObjectURL(blob);
    
    // Crear elemento de descarga
    const a = document.createElement('a');
    a.href = url;
    a.download = `${recording.title.replace(/[^a-zA-Z0-9]/g, '_')}.mid`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Limpiar URL
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error descargando archivo MIDI:', error);
    throw error;
  }
}

/**
 * Obtiene información del archivo MIDI que se generaría
 */
export function getMidiExportInfo(recording: Recording): {
  filename: string;
  filesize: string;
  notes: number;
  duration: string;
  bpm: number;
} {
  const filename = `${recording.title.replace(/[^a-zA-Z0-9]/g, '_')}.mid`;
  
  // Estimar tamaño del archivo (aproximado)
  const estimatedSize = Math.max(1024, recording.notes.length * 8 + 512); // bytes
  const filesize = estimatedSize < 1024 
    ? `${estimatedSize} B` 
    : `${Math.round(estimatedSize / 1024)} KB`;
  
  const duration = formatDuration(recording.duration);
  
  return {
    filename,
    filesize,
    notes: recording.notes.length,
    duration,
    bpm: recording.bpm || 120
  };
}

/**
 * Formatea duración en milisegundos a formato mm:ss
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
