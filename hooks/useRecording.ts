import { useState, useCallback, useRef, useEffect } from 'react';
import { Note, Recording, RecordingState } from '@/types/song';

interface ActiveNote {
  key: string;
  startTime: number;
}

export function useRecording() {
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    startTime: null,
    currentNotes: [],
    duration: 0
  });

  const activeNotesRef = useRef<Map<string, ActiveNote>>(new Map());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Actualizar duración durante la grabación
  useEffect(() => {
    if (recordingState.isRecording && !recordingState.isPaused && recordingState.startTime) {
      intervalRef.current = setInterval(() => {
        setRecordingState(prev => ({
          ...prev,
          duration: Date.now() - prev.startTime!
        }));
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [recordingState.isRecording, recordingState.isPaused, recordingState.startTime]);

  const startRecording = useCallback(() => {
    const now = Date.now();
    console.log('useRecording - Iniciando grabación a las:', now);
    setRecordingState({
      isRecording: true,
      isPaused: false,
      startTime: now,
      currentNotes: [],
      duration: 0
    });
    activeNotesRef.current.clear();
  }, []);

  const pauseRecording = useCallback(() => {
    setRecordingState(prev => ({
      ...prev,
      isPaused: true
    }));
    // Finalizar todas las notas activas
    const currentTime = Date.now();
    const notes: Note[] = [];
    
    activeNotesRef.current.forEach((activeNote, key) => {
      const duration = currentTime - activeNote.startTime;
      if (duration > 50) { // Mínimo 50ms
        notes.push({
          key,
          startTime: activeNote.startTime - recordingState.startTime!,
          duration
        });
      }
    });

    if (notes.length > 0) {
      setRecordingState(prev => ({
        ...prev,
        currentNotes: [...prev.currentNotes, ...notes]
      }));
    }

    activeNotesRef.current.clear();
  }, [recordingState.startTime]);

  const resumeRecording = useCallback(() => {
    setRecordingState(prev => ({
      ...prev,
      isPaused: false
    }));
  }, []);

  const stopRecording = useCallback((): Note[] => {
    console.log('useRecording - Deteniendo grabación');
    console.log('useRecording - Estado actual:', {
      isRecording: recordingState.isRecording,
      startTime: recordingState.startTime,
      currentNotesCount: recordingState.currentNotes.length,
      activeNotesCount: activeNotesRef.current.size
    });
    
    const currentTime = Date.now();
    const finalNotes: Note[] = [...recordingState.currentNotes];
    
    // Verificar que tenemos un startTime válido
    if (!recordingState.startTime) {
      console.warn('useRecording - No hay startTime válido, retornando notas actuales solamente');
      setRecordingState({
        isRecording: false,
        isPaused: false,
        startTime: null,
        currentNotes: [],
        duration: 0
      });
      activeNotesRef.current.clear();
      return finalNotes;
    }
    
    // Finalizar todas las notas activas
    console.log('useRecording - Finalizando', activeNotesRef.current.size, 'notas activas');
    activeNotesRef.current.forEach((activeNote, key) => {
      const duration = currentTime - activeNote.startTime;
      console.log('useRecording - Finalizando nota:', key, 'duración:', duration, 'ms');
      if (duration > 50) { // Mínimo 50ms
        const note: Note = {
          key,
          startTime: activeNote.startTime - recordingState.startTime!,
          duration
        };
        finalNotes.push(note);
        console.log('useRecording - Nota añadida a finalNotes:', note);
      } else {
        console.log('useRecording - Nota muy corta, no añadida:', duration, 'ms');
      }
    });

    console.log('useRecording - Total de notas finales:', finalNotes.length);

    setRecordingState({
      isRecording: false,
      isPaused: false,
      startTime: null,
      currentNotes: [],
      duration: 0
    });

    activeNotesRef.current.clear();
    
    // Ordenar notas por tiempo de inicio
    const sortedNotes = finalNotes.sort((a, b) => a.startTime - b.startTime);
    console.log('useRecording - Notas ordenadas:', sortedNotes);
    return sortedNotes;
  }, [recordingState.currentNotes, recordingState.startTime, recordingState.isRecording]);

  const handleKeyPress = useCallback((key: string) => {
    console.log('useRecording - Key press:', key, 'isRecording:', recordingState.isRecording, 'isPaused:', recordingState.isPaused);
    if (!recordingState.isRecording || recordingState.isPaused || !recordingState.startTime) {
      return;
    }

    const currentTime = Date.now();
    
    // Si la nota ya está activa, no hacer nada (evitar repeticiones)
    if (activeNotesRef.current.has(key)) {
      return;
    }

    // Iniciar nueva nota
    activeNotesRef.current.set(key, {
      key,
      startTime: currentTime
    });
    console.log('useRecording - Nota iniciada:', key, 'Notas activas:', activeNotesRef.current.size);
  }, [recordingState.isRecording, recordingState.isPaused, recordingState.startTime]);

  const handleKeyRelease = useCallback((key: string) => {
    console.log('useRecording - Key release:', key, 'isRecording:', recordingState.isRecording);
    if (!recordingState.isRecording || !recordingState.startTime) {
      return;
    }

    const activeNote = activeNotesRef.current.get(key);
    if (!activeNote) {
      console.log('useRecording - No hay nota activa para:', key);
      return;
    }

    const currentTime = Date.now();
    const duration = currentTime - activeNote.startTime;
    
    // Solo grabar notas que duraron al menos 50ms
    if (duration >= 50) {
      const note: Note = {
        key,
        startTime: activeNote.startTime - recordingState.startTime,
        duration
      };

      console.log('useRecording - Nota grabada:', note);
      setRecordingState(prev => ({
        ...prev,
        currentNotes: [...prev.currentNotes, note]
      }));
    } else {
      console.log('useRecording - Nota muy corta, no grabada:', duration, 'ms');
    }

    activeNotesRef.current.delete(key);
  }, [recordingState.isRecording, recordingState.startTime]);

  const saveRecording = useCallback((title: string, artist: string = 'Usuario', description?: string): Recording => {
    const notes = stopRecording();
    
    if (notes.length === 0) {
      throw new Error('No se grabaron notas válidas');
    }

    const lastNote = notes[notes.length - 1];
    const totalDuration = lastNote.startTime + lastNote.duration;
    
    // Calcular BPM aproximado basándose en la densidad de notas
    const averageInterval = totalDuration / notes.length;
    const estimatedBPM = Math.round(60000 / (averageInterval * 4)); // Asumiendo negras

    const recording: Recording = {
      id: `recording-${Date.now()}`,
      title,
      artist,
      createdAt: new Date(),
      duration: totalDuration,
      notes,
      bpm: Math.max(60, Math.min(200, estimatedBPM)), // Limitar BPM entre 60-200
      keySignature: 'C major', // Por defecto
      description: description || `Grabación personal de ${notes.length} notas`
    };

    return recording;
  }, [stopRecording]);

  const clearRecording = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    setRecordingState({
      isRecording: false,
      isPaused: false,
      startTime: null,
      currentNotes: [],
      duration: 0
    });
    
    activeNotesRef.current.clear();
  }, []);

  const getActiveKeys = useCallback((): string[] => {
    return Array.from(activeNotesRef.current.keys());
  }, []);

  return {
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
  };
}
