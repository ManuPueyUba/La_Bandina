'use client';

import { useEffect, useCallback } from 'react';
import { Song, TutorialState, SongProgress } from '@/types/song';
import { Button } from '@/components/ui/button';
import { Play, Pause, Square, SkipBack, SkipForward, Volume2 } from 'lucide-react';

interface TutorialControlsProps {
  song: Song | null;
  tutorialState: TutorialState;
  progress: SongProgress | null;
  isCompleted?: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSpeedChange: (speed: number) => void;
  onPositionChange: (position: number) => void;
  onPlayAgain?: () => void;
  onGoHome?: () => void;
  onViewOtherSongs?: () => void;
}

export default function TutorialControls({
  song,
  tutorialState,
  progress,
  isCompleted = false,
  onPlay,
  onPause,
  onStop,
  onSpeedChange,
  onPositionChange,
  onPlayAgain,
  onGoHome,
  onViewOtherSongs
}: TutorialControlsProps) {
  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5];

  const formatTime = useCallback((milliseconds: number) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  const handleProgressBarClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!song) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newPosition = percentage * song.duration;
    
    onPositionChange(Math.max(0, Math.min(newPosition, song.duration)));
  }, [song, onPositionChange]);

  const skipBackward = useCallback(() => {
    const newPosition = Math.max(0, tutorialState.currentPosition - 5000); // 5 seconds back
    onPositionChange(newPosition);
  }, [tutorialState.currentPosition, onPositionChange]);

  const skipForward = useCallback(() => {
    if (!song) return;
    const newPosition = Math.min(song.duration, tutorialState.currentPosition + 5000); // 5 seconds forward
    onPositionChange(newPosition);
  }, [song, tutorialState.currentPosition, onPositionChange]);

  if (!song) {
    return (
      <div className="bg-black/50 backdrop-blur-md rounded-xl border border-gray-800 p-6">
        <div className="text-center text-gray-400">
          Selecciona una canción para comenzar el tutorial
        </div>
      </div>
    );
  }

  // Pantalla de felicitación al completar la canción
  if (isCompleted) {
    return (
      <div className="bg-black/50 backdrop-blur-md rounded-xl border border-gray-800 p-6">
        <div className="text-center space-y-4">
          {/* Mensaje de felicitación */}
          <div className="space-y-2">
            <div className="text-4xl">🎉</div>
            <h2 className="text-2xl font-bold text-green-400">¡Muy Bien!</h2>
            <p className="text-lg text-gray-300">
              Has completado "{song.title}" exitosamente
            </p>
          </div>

          {/* Estadísticas finales */}
          {progress && (
            <div className="bg-green-900/30 backdrop-blur-sm rounded-xl border border-green-700 p-4 space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-xl font-bold text-green-400">
                    {progress.completedNotes}/{progress.totalNotes}
                  </div>
                  <div className="text-sm text-gray-400">Notas completadas</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-green-400">
                    {progress.accuracy.toFixed(0)}%
                  </div>
                  <div className="text-sm text-gray-400">Precisión final</div>
                </div>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {onPlayAgain && (
              <Button
                onClick={onPlayAgain}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                🔄 Tocar de Nuevo
              </Button>
            )}
            {onGoHome && (
              <Button
                onClick={onGoHome}
                variant="outline"
                className="flex-1 border-gray-600 text-gray-200 hover:bg-gray-800"
              >
                🏠 Volver al Inicio
              </Button>
            )}
            {onViewOtherSongs && (
              <Button
                onClick={onViewOtherSongs}
                variant="outline"
                className="flex-1 border-gray-600 text-gray-200 hover:bg-gray-800"
              >
                🎵 Ver Otras Canciones
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black/50 backdrop-blur-md rounded-xl border border-gray-800 p-4 space-y-4">
      {/* Song Info */}
      <div className="text-center">
        <h3 className="font-semibold text-lg text-white">{song.title}</h3>
        <p className="text-gray-400">{song.artist}</p>
      </div>

      {/* Progress Stats */}
      {progress && (
        <div className="grid grid-cols-3 gap-4 py-3 bg-gray-900/50 backdrop-blur-sm rounded-xl">
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-400">
              {progress.completedNotes}/{progress.totalNotes}
            </div>
            <div className="text-xs text-gray-400">Progreso</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-green-400">
              {progress.accuracy.toFixed(0)}%
            </div>
            <div className="text-xs text-gray-400">Precisión</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-purple-400">
              {progress.bestScore.toFixed(0)}%
            </div>
            <div className="text-xs text-gray-400">Mejor puntaje</div>
          </div>
        </div>
      )}

      {/* Main Controls */}
      <div className="flex items-center justify-center gap-2">
        {tutorialState.isPlaying ? (
          <Button
            onClick={onPause}
            className="p-3 bg-orange-600 hover:bg-orange-700"
          >
            <Pause className="w-5 h-5" />
          </Button>
        ) : (
          <Button
            onClick={onPlay}
            className="p-3 bg-green-600 hover:bg-green-700"
          >
            <Play className="w-5 h-5" />
          </Button>
        )}

        <Button
          onClick={onStop}
          variant="outline"
          size="sm"
          className="p-2 border-gray-600 text-gray-200 hover:bg-gray-800"
        >
          <Square className="w-4 h-4" />
        </Button>
      </div>

      {/* Speed Control */}
      <div className="flex items-center justify-center gap-2">
        <Volume2 className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-400">Velocidad:</span>
        <div className="flex gap-1">
          {speedOptions.map(speed => (
            <Button
              key={speed}
              onClick={() => onSpeedChange(speed)}
              variant={tutorialState.playbackSpeed === speed ? "default" : "outline"}
              size="sm"
              className={`px-2 py-1 text-xs ${
                tutorialState.playbackSpeed === speed 
                  ? "bg-blue-600 hover:bg-blue-700" 
                  : "border-gray-600 text-gray-300 hover:bg-gray-800"
              }`}
            >
              {speed}x
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
