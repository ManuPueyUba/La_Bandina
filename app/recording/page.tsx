'use client';

import { useState, useEffect, useCallback } from 'react';
import { Recording, Song } from '@/types/song';
import { useSongTutorial } from '@/hooks/useSongTutorial';
import RecordingControls from '@/components/recording/RecordingControls';
import RecordingLibrary from '@/components/recording/RecordingLibrary';
import TutorialControls from '@/components/songs/TutorialControls';
import TutorialPiano from '@/components/songs/TutorialPiano';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Mic, Music, BookOpen } from 'lucide-react';
import Link from 'next/link';

type ViewMode = 'recording' | 'library' | 'practicing';

export default function RecordingPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('recording');
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [practiceRecording, setPracticeRecording] = useState<Recording | null>(null);

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
    handleKeyPress: tutorialKeyPress,
    reset
  } = useSongTutorial();

  // Load recordings from localStorage
  useEffect(() => {
    const savedRecordings = localStorage.getItem('userRecordings');
    if (savedRecordings) {
      const parsed = JSON.parse(savedRecordings);
      // Convertir fechas de string a Date
      const recordingsWithDates = parsed.map((recording: any) => ({
        ...recording,
        createdAt: new Date(recording.createdAt)
      }));
      setRecordings(recordingsWithDates);
    }
  }, []);

  // Save recordings to localStorage
  useEffect(() => {
    localStorage.setItem('userRecordings', JSON.stringify(recordings));
  }, [recordings]);

  const handleRecordingSaved = useCallback((recording: Recording) => {
    setRecordings(prev => [recording, ...prev]);
    setViewMode('library');
  }, []);

  const handlePlayRecording = useCallback((recording: Recording) => {
    // Convertir Recording a Song para usar con el tutorial
    const song: Song = {
      id: recording.id,
      title: recording.title,
      artist: recording.artist,
      difficulty: 'intermediate', // Las grabaciones son nivel intermedio por defecto
      category: 'Grabación Personal',
      bpm: recording.bpm || 120,
      duration: recording.duration,
      notes: recording.notes,
      keySignature: recording.keySignature || 'C major',
      description: recording.description
    };

    startTutorial(song);
    setPracticeRecording(recording);
    setViewMode('practicing');
  }, [startTutorial]);

  const handleDeleteRecording = useCallback((recordingId: string) => {
    setRecordings(prev => prev.filter(r => r.id !== recordingId));
  }, []);

  const handleUpdateRecording = useCallback((updatedRecording: Recording) => {
    setRecordings(prev => prev.map(r => 
      r.id === updatedRecording.id ? updatedRecording : r
    ));
  }, []);

  const handleBackToLibrary = useCallback(() => {
    if (tutorialState.isPlaying) {
      stopTutorial();
    }
    reset();
    setPracticeRecording(null);
    setViewMode('library');
  }, [tutorialState.isPlaying, stopTutorial, reset]);

  const handlePositionChange = useCallback((position: number) => {
    updatePosition(position);
  }, [updatePosition]);

  const handlePlayAgain = useCallback(() => {
    if (practiceRecording) {
      handlePlayRecording(practiceRecording);
    }
  }, [practiceRecording, handlePlayRecording]);

  const handleGoHome = useCallback(() => {
    window.location.href = '/';
  }, []);

  const handleViewOtherRecordings = useCallback(() => {
    handleBackToLibrary();
  }, [handleBackToLibrary]);

  // Manejar teclas del piano con conexión a grabación
  const [recordingHandlers, setRecordingHandlers] = useState<{
    onKeyPress: (key: string) => void;
    onKeyRelease: (key: string) => void;
  } | null>(null);

  const handleKeyPress = useCallback((key: string) => {
    console.log('RecordingPage - Key press:', key, 'View mode:', viewMode); // Debug
    if (viewMode === 'practicing') {
      tutorialKeyPress(key);
    } else if (viewMode === 'recording' && recordingHandlers) {
      recordingHandlers.onKeyPress(key);
    }
  }, [viewMode, tutorialKeyPress, recordingHandlers]);

  const handleKeyRelease = useCallback((key: string) => {
    console.log('RecordingPage - Key release:', key, 'View mode:', viewMode); // Debug
    if (viewMode === 'recording' && recordingHandlers) {
      recordingHandlers.onKeyRelease(key);
    }
  }, [viewMode, recordingHandlers]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="sm" className="border-gray-600 text-gray-200 hover:bg-gray-800">
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Piano
            </Link>
          </Button>
            <div className="flex items-center gap-2">
              <Mic className="w-6 h-6 text-red-400" />
              <h1 className="text-2xl font-bold text-white">
                {viewMode === 'recording' && 'Grabación de Piano'}
                {viewMode === 'library' && 'Mis Grabaciones'}
                {viewMode === 'practicing' && 'Practicar Grabación'}
              </h1>
            </div>
          </div>

          <div className="flex gap-2">
            {viewMode !== 'recording' && (
              <Button 
                onClick={() => setViewMode('recording')} 
                variant="outline"
                className="flex items-center gap-2 border-gray-600 text-gray-200 hover:bg-gray-800"
              >
                <Mic className="w-4 h-4" />
                Nueva Grabación
              </Button>
            )}
            {viewMode !== 'library' && recordings.length > 0 && (
              <Button 
                onClick={() => setViewMode('library')} 
                variant="outline"
                className="flex items-center gap-2 border-gray-600 text-gray-200 hover:bg-gray-800"
              >
                <Music className="w-4 h-4" />
                Ver Grabaciones
              </Button>
            )}
            {viewMode === 'practicing' && (
              <Button onClick={handleBackToLibrary} variant="outline" className="border-gray-600 text-gray-200 hover:bg-gray-800">
                <BookOpen className="w-4 h-4 mr-2" />
                Ver Grabaciones
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {viewMode === 'recording' && (
            <>
              <RecordingControls
                onRecordingSaved={handleRecordingSaved}
                onSetRecordingHandlers={setRecordingHandlers}
              />
              
              <TutorialPiano
                highlightedKeys={new Set()} // No highlighting during recording
                onKeyPress={handleKeyPress}
                onKeyRelease={handleKeyRelease}
              />

              <div className="bg-green-900/30 backdrop-blur-sm border border-green-700 rounded-xl p-4">
                <h3 className="font-semibold text-green-300 mb-2">
                  💡 Consejos para una buena grabación:
                </h3>
                <ul className="text-green-200 text-sm space-y-1">
                  <li>• Graba a un tempo cómodo, luego puedes ajustar la velocidad en la práctica</li>
                  <li>• Mantén pulsadas las teclas el tiempo que quieras que duren las notas</li>
                  <li>• Puedes pausar y continuar la grabación cuando necesites</li>
                  <li>• No te preocupes por pequeños errores, puedes editarlos después</li>
                  <li>• Las grabaciones se guardan automáticamente en tu navegador</li>
                </ul>
              </div>
            </>
          )}

          {viewMode === 'library' && (
            <RecordingLibrary
              recordings={recordings}
              onPlayRecording={handlePlayRecording}
              onDeleteRecording={handleDeleteRecording}
              onUpdateRecording={handleUpdateRecording}
            />
          )}

          {viewMode === 'practicing' && practiceRecording && (
            <>
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
                onViewOtherSongs={handleViewOtherRecordings}
              />

              <TutorialPiano
                highlightedKeys={highlightedKeys}
                onKeyPress={handleKeyPress}
                onKeyRelease={handleKeyRelease}
              />

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-semibold text-purple-900 mb-2">
                  🎵 Practicando tu grabación "{practiceRecording.title}"
                </h3>
                <ul className="text-purple-800 text-sm space-y-1">
                  <li>• Sigue las teclas iluminadas igual que en los tutoriales normales</li>
                  <li>• Puedes ajustar la velocidad para practicar más lento</li>
                  <li>• Tu grabación original se mantiene intacta</li>
                  <li>• Usa esto para mejorar tu interpretación original</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
