'use client';

import { useState, useMemo } from 'react';
import { Song } from '@/types/song';
import { sampleSongs, songCategories, difficultyLevels } from '@/data/songs';
import { useSongsFromBackend } from '@/hooks/useSongsFromBackend';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Play, Star, Clock, BarChart3, Upload, Music, RefreshCw, AlertCircle } from 'lucide-react';
import { MidiImportDialog } from './MidiImportDialog';

interface SongLibraryProps {
  onSelectSong: (song: Song) => void;
  favorites: string[];
  onToggleFavorite: (songId: string) => void;
  customSongs?: Song[];
  onAddCustomSongs?: (songs: Song[]) => void;
}

export default function SongLibrary({ 
  onSelectSong, 
  favorites, 
  onToggleFavorite, 
  customSongs = [], 
  onAddCustomSongs 
}: SongLibraryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [showMidiImport, setShowMidiImport] = useState(false);
  
  // Obtener canciones del backend
  const { songs: backendSongs, loading, error, refetch } = useSongsFromBackend();

  // Combinar canciones del backend con canciones locales y custom
  const allSongs = useMemo(() => {
    const fallbackSongs = error ? sampleSongs : []; // Solo usar canciones locales si hay error
    return [...backendSongs, ...fallbackSongs, ...customSongs];
  }, [backendSongs, customSongs, error]);

  const filteredSongs = useMemo(() => {
    return allSongs.filter(song => {
      const matchesSearch = song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           song.artist.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'Todas' || song.category === selectedCategory;
      const matchesDifficulty = selectedDifficulty === 'all' || song.difficulty === selectedDifficulty;
      
      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  }, [allSongs, searchTerm, selectedCategory, selectedDifficulty]);

  const getDifficultyInfo = (difficulty: string) => {
    return difficultyLevels.find(level => level.value === difficulty) || difficultyLevels[0];
  };

  const formatDuration = (duration: number) => {
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleMidiImport = (songs: Song[]) => {
    if (onAddCustomSongs) {
      onAddCustomSongs(songs);
    }
    setShowMidiImport(false);
  };

  return (
    <div className="space-y-6">
      {/* Header with Import Button and Backend Status */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Biblioteca de Canciones</h2>
          <div className="flex items-center gap-4">
            <p className="text-gray-600">
              {allSongs.length} canciones disponibles
              {customSongs.length > 0 && (
                <span className="ml-2 text-blue-600">
                  ({customSongs.length} importadas)
                </span>
              )}
              {backendSongs.length > 0 && (
                <span className="ml-2 text-green-600">
                  ({backendSongs.length} del servidor)
                </span>
              )}
            </p>
            
            {/* Estado del backend */}
            {loading && (
              <div className="flex items-center text-blue-600 text-sm">
                <RefreshCw className="w-4 h-4 animate-spin mr-1" />
                Cargando del servidor...
              </div>
            )}
            
            {error && (
              <div className="flex items-center text-amber-600 text-sm">
                <AlertCircle className="w-4 h-4 mr-1" />
                Modo offline (usando canciones locales)
              </div>
            )}
            
            {!loading && !error && backendSongs.length > 0 && (
              <div className="flex items-center text-green-600 text-sm">
                <Music className="w-4 h-4 mr-1" />
                Conectado al servidor
              </div>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          {/* Botón para recargar desde backend */}
          <Button 
            onClick={refetch}
            variant="outline"
            size="sm"
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Recargar
          </Button>
          
          {onAddCustomSongs && (
            <Button 
              onClick={() => setShowMidiImport(true)}
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Importar MIDI
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar canciones..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoría
            </label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {songCategories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dificultad
            </label>
            <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {difficultyLevels.map(level => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Songs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSongs.map(song => {
          const difficultyInfo = getDifficultyInfo(song.difficulty);
          const isFavorite = favorites.includes(song.id);

          return (
            <Card key={song.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {song.title}
                    </h3>
                    <p className="text-sm text-gray-600 truncate">
                      {song.artist}
                    </p>
                    {customSongs.includes(song) && (
                      <div className="flex items-center gap-1 mt-1">
                        <Music className="w-3 h-3 text-blue-500" />
                        <span className="text-xs text-blue-500">Importada</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => onToggleFavorite(song.id)}
                    className={`ml-2 p-1 rounded-full transition-colors ${
                      isFavorite 
                        ? 'text-yellow-500 hover:text-yellow-600' 
                        : 'text-gray-400 hover:text-yellow-500'
                    }`}
                  >
                    <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                  </button>
                </div>

                {/* Info */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className={`font-medium ${difficultyInfo.color}`}>
                      {difficultyInfo.label}
                    </span>
                    <span className="text-gray-500">
                      {song.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(song.duration)}
                    </div>
                    <div className="flex items-center gap-1">
                      <BarChart3 className="w-3 h-3" />
                      {song.bpm} BPM
                    </div>
                  </div>

                  {song.description && (
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {song.description}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <Button
                  onClick={() => onSelectSong(song)}
                  className="w-full"
                  size="sm"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Comenzar Tutorial
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredSongs.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">
            No se encontraron canciones que coincidan con los filtros.
          </p>
          {searchTerm === '' && selectedCategory === 'Todas' && selectedDifficulty === 'all' && allSongs.length === 0 && (
            <div className="mt-4">
              <p className="text-gray-400 mb-4">
                ¡Comienza importando archivos MIDI para expandir tu biblioteca!
              </p>
              {onAddCustomSongs && (
                <Button 
                  onClick={() => setShowMidiImport(true)}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Importar MIDI
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* MIDI Import Dialog */}
      {showMidiImport && (
        <MidiImportDialog
          isOpen={showMidiImport}
          onClose={() => setShowMidiImport(false)}
          onSongsImported={handleMidiImport}
        />
      )}
    </div>
  );
}
