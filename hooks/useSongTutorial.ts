'use client';

import { useState, useCallback } from 'react';
import { Song, SongProgress, TutorialState } from '@/types/song';

export const useSongTutorial = (audioFunctions?: {
  playNoteWithOctave: (note: string, octave: number) => Promise<void>;
  initAudio: () => Promise<void>;
  audioInitialized: boolean;
}) => {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [progress, setProgress] = useState<SongProgress | null>(null);
  const [tutorialState, setTutorialState] = useState<TutorialState>({
    isPlaying: false,
    isPaused: false,
    currentPosition: 0,
    playbackSpeed: 1.0,
    showUpcomingNotes: true,
    highlightColor: '#3B82F6' // blue-500
  });
  const [highlightedKeys, setHighlightedKeys] = useState<Set<string>>(new Set());
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [pressedKeysInChord, setPressedKeysInChord] = useState<Set<string>>(new Set());
  const [chordStartTime, setChordStartTime] = useState<number | null>(null);
  const [chordTimeoutId, setChordTimeoutId] = useState<NodeJS.Timeout | null>(null);

  // Función auxiliar para obtener todas las notas que empiezan al mismo tiempo
  const getNotesAtCurrentIndex = useCallback((notes: Song['notes'], index: number) => {
    if (index >= notes.length) return [];
    
    const currentNote = notes[index];
    const simultaneousNotes = [currentNote];
    
    // Buscar notas adicionales que empiecen al mismo tiempo (tolerancia de 100ms para mejor detección de acordes)
    for (let i = index + 1; i < notes.length; i++) {
      const nextNote = notes[i];
      if (Math.abs(nextNote.startTime - currentNote.startTime) <= 100) {
        simultaneousNotes.push(nextNote);
      } else {
        break; // Las siguientes notas ya no son simultáneas
      }
    }
    
    return simultaneousNotes;
  }, []);

  const startTutorial = useCallback((song: Song) => {
    // Limpiar timeout anterior si existe
    if (chordTimeoutId) {
      clearTimeout(chordTimeoutId);
      setChordTimeoutId(null);
    }

    setCurrentSong(song);
    setProgress({
      songId: song.id,
      completedNotes: 0,
      totalNotes: song.notes.length,
      accuracy: 0,
      bestScore: 0,
      lastPlayedAt: new Date()
    });
    setTutorialState({
      isPlaying: false,
      isPaused: false,
      currentPosition: 0,
      playbackSpeed: 1.0,
      showUpcomingNotes: true,
      highlightColor: '#3B82F6'
    });
    
    // Mostrar las primeras notas a tocar (pueden ser un acorde)
    setCurrentNoteIndex(0);
    setIsCompleted(false);
    setPressedKeysInChord(new Set());
    setChordStartTime(null);
    
    if (song.notes.length > 0) {
      // Agrupar notas que empiezan al mismo tiempo
      const firstNotes = getNotesAtCurrentIndex(song.notes, 0);
      const keysToHighlight = new Set(firstNotes.map(note => note.key));
      setHighlightedKeys(keysToHighlight);
      console.log('Tutorial iniciado - Notas a tocar:', Array.from(keysToHighlight));
      
      if (firstNotes.length > 1) {
        console.log('🎹 Primera instrucción es un ACORDE con', firstNotes.length, 'notas');
      } else {
        console.log('🎹 Primera instrucción es una nota individual');
      }
    }
  }, [chordTimeoutId, getNotesAtCurrentIndex]);

  const playTutorial = useCallback(async () => {
    if (!currentSong || !audioFunctions) {
      console.log('🎵 No hay canción o funciones de audio disponibles');
      return;
    }
    
    console.log('🎵 Reproduciendo soundtrack de la canción');
    
    setTutorialState(prev => ({
      ...prev,
      isPlaying: true,
      isPaused: false
    }));
    
    // Inicializar audio si no está inicializado
    if (!audioFunctions.audioInitialized) {
      try {
        await audioFunctions.initAudio();
      } catch (error) {
        console.error('Error initializing audio:', error);
        return;
      }
    }
    
    console.log('🎶 Reproduciendo soundtrack con', currentSong.notes.length, 'notas');
    
    // Crear una copia de las notas ordenadas por tiempo
    const sortedNotes = [...currentSong.notes].sort((a, b) => a.startTime - b.startTime);
    
    // Función para reproducir una nota
    const playNoteAtTime = (note: any, delay: number) => {
      setTimeout(async () => {
        try {
          // Extraer la nota y octava del key (ej: "C4" -> note="C", octave=4)
          const match = note.key.match(/^([A-G]#?)(\d+)$/);
          if (match) {
            const noteName = match[1];
            const octave = parseInt(match[2]);
            console.log(`🎹 Reproduciendo: ${noteName}${octave}`);
            await audioFunctions.playNoteWithOctave(noteName, octave);
          }
        } catch (error) {
          console.error('Error playing note:', error);
        }
      }, delay);
    };
    
    // Programar todas las notas para reproducirse en su momento
    const adjustedSpeed = 1 / tutorialState.playbackSpeed;
    
    sortedNotes.forEach((note) => {
      const delay = note.startTime * adjustedSpeed;
      playNoteAtTime(note, delay);
    });
    
    // Calcular duración total y programar parada automática
    if (sortedNotes.length > 0) {
      const totalDuration = sortedNotes[sortedNotes.length - 1].startTime + 
                           sortedNotes[sortedNotes.length - 1].duration;
      const adjustedTotalDuration = totalDuration * adjustedSpeed;
      
      setTimeout(() => {
        console.log('🎉 Soundtrack completado');
        setTutorialState(prev => ({
          ...prev,
          isPlaying: false
        }));
      }, adjustedTotalDuration + 1000);
    }
  }, [currentSong, tutorialState.playbackSpeed, audioFunctions]);

  const pauseTutorial = useCallback(() => {
    setTutorialState(prev => ({
      ...prev,
      isPlaying: false,
      isPaused: true
    }));
  }, []);

  const stopTutorial = useCallback(() => {
    setTutorialState(prev => ({
      ...prev,
      isPlaying: false,
      isPaused: false,
      currentPosition: 0
    }));
  }, []);

  const setPlaybackSpeed = useCallback((speed: number) => {
    setTutorialState(prev => ({
      ...prev,
      playbackSpeed: speed
    }));
  }, []);

  const updatePosition = useCallback((position: number) => {
    setTutorialState(prev => ({
      ...prev,
      currentPosition: position
    }));
  }, []);

  const handleKeyPress = useCallback((key: string) => {
    if (!currentSong || !progress) {
      console.log('🚫 No song or progress available');
      return;
    }

    // Obtener las notas actuales (pueden ser un acorde)
    const currentNotes = getNotesAtCurrentIndex(currentSong.notes, currentNoteIndex);
    const expectedKeys = new Set(currentNotes.map(note => note.key));
    
    console.log('🎹 ============ TUTORIAL DEBUG ============');
    console.log('Key pressed:', key);
    console.log('Current note index:', currentNoteIndex);
    console.log('Expected keys:', Array.from(expectedKeys));
    console.log('Current notes count:', currentNotes.length);
    console.log('Current notes:', currentNotes.map(n => ({ key: n.key, startTime: n.startTime, duration: n.duration })));
    console.log('Pressed keys in chord so far:', Array.from(pressedKeysInChord));
    console.log('==========================================');
    
    if (expectedKeys.has(key)) {
      // Tecla correcta presionada
      console.log('✅ Tecla correcta presionada:', key);
      
      const now = Date.now();
      
      // Si es la primera tecla del acorde, iniciar el timer
      if (pressedKeysInChord.size === 0) {
        setChordStartTime(now);
        console.log('🎹 Iniciando acorde - Primera tecla:', key);
      }
      
      // Agregar la tecla a las teclas presionadas del acorde actual
      const newPressedKeys = new Set(pressedKeysInChord);
      newPressedKeys.add(key);
      setPressedKeysInChord(newPressedKeys);
      
      console.log('Teclas presionadas en el acorde:', Array.from(newPressedKeys));
      console.log('Teclas requeridas:', Array.from(expectedKeys));
      
      // Limpiar timeout previo si existe
      if (chordTimeoutId) {
        clearTimeout(chordTimeoutId);
        setChordTimeoutId(null);
        console.log('⏰ Timeout previo limpiado');
      }
      
      // Verificar si se han presionado todas las teclas del acorde
      const allKeysPressed = Array.from(expectedKeys).every(k => newPressedKeys.has(k));
      
      if (allKeysPressed) {
        // Todas las teclas del acorde han sido presionadas
        console.log('🎉 ¡Acorde completado! Todas las teclas presionadas');
        advanceToNextChord(currentNotes);
      } else {
        // Aún faltan teclas, configurar timeout para completar el acorde
        const remainingKeys = Array.from(expectedKeys).filter(k => !newPressedKeys.has(k));
        console.log('⏳ Faltan teclas del acorde:', remainingKeys);
        
        // Dar tiempo adicional para completar el acorde (2 segundos)
        const timeoutId = setTimeout(() => {
          console.log('⏰ Timeout del acorde - verificando si está completo...');
          // Verificar nuevamente si el acorde está completo
          const currentPressedKeys = pressedKeysInChord;
          const stillAllPressed = Array.from(expectedKeys).every(k => currentPressedKeys.has(k));
          
          if (stillAllPressed) {
            console.log('✅ Acorde completo después del timeout');
            advanceToNextChord(currentNotes);
          } else {
            // Si aún faltan teclas después del timeout, avanzar de todas formas
            // pero con menor puntaje
            console.log('⚠️ Acorde incompleto pero avanzando...');
            advanceToNextChord(currentNotes);
          }
        }, 2000);
        
        setChordTimeoutId(timeoutId);
        console.log('⏰ Nuevo timeout configurado para 2 segundos');
      }
    } else {
      console.log('❌ Tecla incorrecta. Esperada:', Array.from(expectedKeys), 'Recibida:', key);
    }
  }, [currentSong, progress, currentNoteIndex, pressedKeysInChord, chordTimeoutId, getNotesAtCurrentIndex]);

  // Función auxiliar para avanzar al siguiente acorde
  const advanceToNextChord = useCallback((currentNotes: any[]) => {
    if (!currentSong || !progress) return;

    const notesCompleted = currentNotes.length;
    const newCompletedNotes = progress.completedNotes + notesCompleted;
    const newAccuracy = (newCompletedNotes / currentSong.notes.length) * 100;
    
    setProgress(prev => prev ? {
      ...prev,
      completedNotes: newCompletedNotes,
      accuracy: newAccuracy,
      bestScore: Math.max(prev.bestScore, newAccuracy),
      lastPlayedAt: new Date()
    } : null);
    
    // Resetear el estado del acorde
    setPressedKeysInChord(new Set());
    setChordStartTime(null);
    if (chordTimeoutId) {
      clearTimeout(chordTimeoutId);
      setChordTimeoutId(null);
    }
    
    // Avanzar al siguiente grupo de notas
    const nextIndex = currentNoteIndex + currentNotes.length;
    setCurrentNoteIndex(nextIndex);
    
    console.log('✅ Acorde/nota completado. Avanzando al índice:', nextIndex);
    
    // Mostrar las siguientes notas a tocar
    if (nextIndex < currentSong.notes.length) {
      const nextNotes = getNotesAtCurrentIndex(currentSong.notes, nextIndex);
      const nextKeysToHighlight = new Set(nextNotes.map(note => note.key));
      setHighlightedKeys(nextKeysToHighlight);
      console.log('⏭️ Siguientes notas a tocar:', Array.from(nextKeysToHighlight));
    } else {
      // Tutorial completado
      setHighlightedKeys(new Set());
      setIsCompleted(true);
      console.log('🎉 ¡Tutorial completado!');
    }
  }, [currentSong, progress, currentNoteIndex, chordTimeoutId, getNotesAtCurrentIndex]);

  const reset = useCallback(() => {
    // Limpiar timeout si existe
    if (chordTimeoutId) {
      clearTimeout(chordTimeoutId);
      setChordTimeoutId(null);
    }

    setCurrentSong(null);
    setProgress(null);
    setTutorialState({
      isPlaying: false,
      isPaused: false,
      currentPosition: 0,
      playbackSpeed: 1.0,
      showUpcomingNotes: true,
      highlightColor: '#3B82F6'
    });
    setHighlightedKeys(new Set());
    setCurrentNoteIndex(0);
    setIsCompleted(false);
    setPressedKeysInChord(new Set());
    setChordStartTime(null);
  }, [chordTimeoutId]);

  return {
    currentSong,
    progress,
    tutorialState,
    highlightedKeys,
    currentNoteIndex,
    isCompleted,
    upcomingNotes: [], // Simplificado, no se usan notas próximas
    startTutorial,
    playTutorial,
    pauseTutorial,
    stopTutorial,
    setPlaybackSpeed,
    updatePosition,
    handleKeyPress,
    reset
  };
};
