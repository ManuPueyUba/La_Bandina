import { Note } from '@/types/song';

/**
 * Agrupa notas que empiezan al mismo tiempo (o casi) como acordes
 */
export function processNotesForChords(notes: Note[], toleranceMs: number = 100): Note[] {
  if (notes.length === 0) return notes;

  // Ordenar notas por tiempo de inicio
  const sortedNotes = [...notes].sort((a, b) => a.startTime - b.startTime);
  
  const processedNotes: Note[] = [];
  let i = 0;

  while (i < sortedNotes.length) {
    const currentNote = sortedNotes[i];
    const simultaneousNotes = [currentNote];
    
    // Buscar notas que empiecen al mismo tiempo (dentro de la tolerancia)
    for (let j = i + 1; j < sortedNotes.length; j++) {
      const nextNote = sortedNotes[j];
      const timeDifference = Math.abs(nextNote.startTime - currentNote.startTime);
      
      if (timeDifference <= toleranceMs) {
        simultaneousNotes.push(nextNote);
      } else {
        break; // Las siguientes notas ya no son simultáneas
      }
    }

    if (simultaneousNotes.length > 1) {
      // Es un acorde - ajustar todas las notas para que empiecen exactamente al mismo tiempo
      const earliestStartTime = Math.min(...simultaneousNotes.map(n => n.startTime));
      const longestDuration = Math.max(...simultaneousNotes.map(n => n.duration));
      
      // Crear notas del acorde con el mismo startTime y duración
      simultaneousNotes.forEach(note => {
        processedNotes.push({
          key: note.key,
          startTime: earliestStartTime,
          duration: longestDuration // Usar la duración más larga para el acorde
        });
      });
    } else {
      // Nota individual
      processedNotes.push(currentNote);
    }

    i += simultaneousNotes.length;
  }

  return processedNotes.sort((a, b) => a.startTime - b.startTime);
}

/**
 * Detecta acordes en una lista de notas procesadas
 */
export function detectChords(notes: Note[]): Array<{
  startTime: number;
  notes: string[];
  duration: number;
}> {
  const chords: Array<{
    startTime: number;
    notes: string[];
    duration: number;
  }> = [];

  // Agrupar notas por tiempo de inicio
  const notesByTime = new Map<number, Note[]>();
  
  notes.forEach(note => {
    const existing = notesByTime.get(note.startTime) || [];
    existing.push(note);
    notesByTime.set(note.startTime, existing);
  });

  // Convertir grupos a acordes
  notesByTime.forEach((notesAtTime, startTime) => {
    chords.push({
      startTime,
      notes: notesAtTime.map(n => n.key).sort(),
      duration: Math.max(...notesAtTime.map(n => n.duration))
    });
  });

  return chords.sort((a, b) => a.startTime - b.startTime);
}

/**
 * Convierte acordes de vuelta a notas individuales para el tutorial
 */
export function chordsToNotes(chords: Array<{
  startTime: number;
  notes: string[];
  duration: number;
}>): Note[] {
  const notes: Note[] = [];
  
  chords.forEach(chord => {
    chord.notes.forEach(noteKey => {
      notes.push({
        key: noteKey,
        startTime: chord.startTime,
        duration: chord.duration
      });
    });
  });

  return notes.sort((a, b) => a.startTime - b.startTime);
}
