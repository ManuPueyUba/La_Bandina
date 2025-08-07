'use client';

import { useState, useEffect, useCallback } from 'react';
import { Song } from '@/types/song';
import { useSongTutorial } from '@/hooks/useSongTutorial';
import SongLibrary from '@/components/songs/SongLibrary';
import TutorialControls from '@/components/songs/TutorialControls';
import TutorialPiano from '@/components/songs/TutorialPiano';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Music } from 'lucide-react';
import Link from 'next/link';
import * as Tone from 'tone';

export default function SongsPage() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showTutorial, setShowTutorial] = useState(false);
  const [customSongs, setCustomSongs] = useState<Song[]>([]);
  const [synth, setSynth] = useState<Tone.PolySynth | null>(null);
  const [audioInitialized, setAudioInitialized] = useState(false);

  // Initialize audio
  const initAudio = useCallback(async () => {
    try {
      await Tone.start();
      console.log('Audio context started');
      
      // Create synth
      const polySynth = new Tone.PolySynth(Tone.Synth).toDestination();
      setSynth(polySynth);
      setAudioInitialized(true);
      
      console.log('Synth initialized');
    } catch (error) {
      console.error('Error initializing audio:', error);
    }
  }, []);

  // Play note with octave
  const playNoteWithOctave = useCallback(async (note: string, octave: number) => {
    if (!synth) {
      console.log('Synth not initialized');
      return;
    }

    // Ensure audio context is active
    if (Tone.context.state === 'suspended') {
      await Tone.start();
    }

    const noteWithOctave = `${note}${octave}`;
    console.log('Playing note:', noteWithOctave);
    synth.triggerAttack(noteWithOctave);
    
    // Release note after a short duration to avoid hanging notes
    setTimeout(() => {
      synth.triggerRelease(noteWithOctave);
    }, 200);
  }, [synth]);

  const {
    currentSong,
    progress,
    tutorialState,
    highlightedKeys,
    isCompleted,
    startTutorial,
    playTutorial,
    pauseTutorial,
    stopTutorial,
    setPlaybackSpeed,
    updatePosition,
    handleKeyPress,
    reset
  } = useSongTutorial({
    playNoteWithOctave,
    initAudio,
    audioInitialized
  });

  // Load favorites from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('songFavorites');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }

    // Load custom songs from localStorage
    const savedCustomSongs = localStorage.getItem('customSongs');
    if (savedCustomSongs) {
      setCustomSongs(JSON.parse(savedCustomSongs));
    }

    // Initialize audio automatically
    if (!audioInitialized) {
      initAudio();
    }
  }, [audioInitialized, initAudio]);

  // Save favorites to localStorage
  useEffect(() => {
    localStorage.setItem('songFavorites', JSON.stringify(favorites));
  }, [favorites]);

  // Save custom songs to localStorage
  useEffect(() => {
    localStorage.setItem('customSongs', JSON.stringify(customSongs));
  }, [customSongs]);

  // Exponer las teclas resaltadas para el piano
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).tutorialHighlightedKeys = highlightedKeys;
    }
  }, [highlightedKeys]);

  const handleSelectSong = useCallback((song: Song) => {
    startTutorial(song);
    setShowTutorial(true);
  }, [startTutorial]);

  const handleToggleFavorite = useCallback((songId: string) => {
    setFavorites(prev => {
      if (prev.includes(songId)) {
        return prev.filter(id => id !== songId);
      } else {
        return [...prev, songId];
      }
    });
  }, []);

  const handleBackToLibrary = useCallback(() => {
    if (tutorialState.isPlaying) {
      stopTutorial();
    }
    reset();
    setShowTutorial(false);
  }, [tutorialState.isPlaying, stopTutorial, reset]);

  const handlePositionChange = useCallback((position: number) => {
    updatePosition(position);
  }, [updatePosition]);

  // Expose highlighted keys for piano component (this will be used in the main page)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).tutorialHighlightedKeys = highlightedKeys;
    }
  }, [highlightedKeys]);

  const handlePlayAgain = useCallback(() => {
    if (currentSong) {
      startTutorial(currentSong);
    }
  }, [currentSong, startTutorial]);

  const handleGoHome = useCallback(() => {
    // Navegar a la página principal
    window.location.href = '/';
  }, []);

  const handleViewOtherSongs = useCallback(() => {
    handleBackToLibrary();
  }, [handleBackToLibrary]);

  const handleAddCustomSongs = useCallback((newSongs: Song[]) => {
    setCustomSongs(prev => {
      // Evitar duplicados basándose en el ID
      const existingIds = new Set(prev.map(song => song.id));
      const uniqueNewSongs = newSongs.filter(song => !existingIds.has(song.id));
      return [...prev, ...uniqueNewSongs];
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver al Piano
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Music className="w-6 h-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">
                {showTutorial ? 'Tutorial de Canción' : 'Biblioteca de Canciones'}
              </h1>
            </div>
          </div>

          {showTutorial && (
            <Button onClick={handleBackToLibrary} variant="outline">
              <BookOpen className="w-4 h-4 mr-2" />
              Ver Biblioteca
            </Button>
          )}
        </div>

        {/* Content */}
        <div className="space-y-6">
          {showTutorial ? (
            <>
              {/* Tutorial Controls */}
              <TutorialControls
                song={currentSong}
                tutorialState={tutorialState}
                progress={progress}
                isCompleted={isCompleted}
                onPlay={playTutorial}
                onPause={pauseTutorial}
                onStop={stopTutorial}
                onSpeedChange={setPlaybackSpeed}
                onPositionChange={handlePositionChange}
                onPlayAgain={handlePlayAgain}
                onGoHome={handleGoHome}
                onViewOtherSongs={handleViewOtherSongs}
              />

              {/* Piano Tutorial */}
              <TutorialPiano
                highlightedKeys={highlightedKeys}
                onKeyPress={handleKeyPress}
              />

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">
                  ¿Cómo usar el tutorial?
                </h3>
                <ul className="text-blue-800 text-sm space-y-1">
                  <li>• La tecla se iluminará en <span className="text-blue-600 font-semibold">azul</span> cuando debas tocarla</li>
                  <li>• Toca solo la tecla resaltada en azul para avanzar</li>
                  <li>• Puedes usar las teclas del piano o tu teclado físico</li>
                  <li>• Tu progreso se mostrará en las estadísticas de arriba</li>
                  <li>• ¡Al completar todas las notas recibirás una felicitación!</li>
                </ul>
              </div>
            </>
          ) : (
            <SongLibrary
              onSelectSong={handleSelectSong}
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
              customSongs={customSongs}
              onAddCustomSongs={handleAddCustomSongs}
            />
          )}
        </div>
      </div>
    </div>
  );
}
