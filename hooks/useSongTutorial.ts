'use client';

import { useState, useCallback } from 'react';
import { Song, SongProgress, TutorialState } from '@/types/song';

export const useSongTutorial = () => {
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

  const startTutorial = useCallback((song: Song) => {
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
    
    // Mostrar la primera nota a tocar
    setCurrentNoteIndex(0);
    setIsCompleted(false);
    if (song.notes.length > 0) {
      const firstNote = song.notes[0];
      setHighlightedKeys(new Set([firstNote.key]));
    }
  }, []);

  const playTutorial = useCallback(() => {
    setTutorialState(prev => ({
      ...prev,
      isPlaying: true,
      isPaused: false
    }));
  }, []);

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
    if (!currentSong || !progress) return;

    const currentNote = currentSong.notes[currentNoteIndex];
    
    console.log('Key pressed:', key);
    console.log('Current note index:', currentNoteIndex);
    console.log('Expected note:', currentNote?.key);
    console.log('Total notes:', currentSong.notes.length);
    
    if (currentNote && currentNote.key === key) {
      // Nota correcta
      const newCompletedNotes = progress.completedNotes + 1;
      const newAccuracy = (newCompletedNotes / currentSong.notes.length) * 100;
      
      setProgress(prev => prev ? {
        ...prev,
        completedNotes: newCompletedNotes,
        accuracy: newAccuracy,
        bestScore: Math.max(prev.bestScore, newAccuracy),
        lastPlayedAt: new Date()
      } : null);
      
      // Avanzar al siguiente índice
      const nextIndex = currentNoteIndex + 1;
      setCurrentNoteIndex(nextIndex);
      
      console.log('Advancing to next note:', nextIndex);
      
      // Mostrar la siguiente nota a tocar
      if (nextIndex < currentSong.notes.length) {
        const nextNote = currentSong.notes[nextIndex];
        console.log('Next note to highlight:', nextNote.key);
        setHighlightedKeys(new Set([nextNote.key]));
      } else {
        // Tutorial completado
        setHighlightedKeys(new Set());
        setIsCompleted(true);
        console.log('¡Tutorial completado!');
      }
    } else {
      console.log('Incorrect key. Expected:', currentNote?.key, 'Got:', key);
    }
  }, [currentSong, progress, currentNoteIndex]);

  const reset = useCallback(() => {
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
  }, []);

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
