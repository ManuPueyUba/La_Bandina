import { useState, useEffect } from 'react'
import { ApiClient, SongResponse } from '@/lib/api'
import { Song } from '@/types/song'

// Función para convertir SongResponse del backend a Song del frontend
const convertBackendSongToFrontend = (backendSong: SongResponse): Song => {
  return {
    id: backendSong.id,
    title: backendSong.title,
    artist: backendSong.artist,
    difficulty: backendSong.difficulty as 'beginner' | 'intermediate' | 'advanced',
    category: backendSong.category,
    bpm: backendSong.bpm,
    duration: backendSong.duration,
    notes: backendSong.notes.map(note => ({
      key: note.key,
      duration: note.duration,
      startTime: note.start_time
    })),
    keySignature: backendSong.key_signature,
    timeSignature: backendSong.time_signature,
    description: backendSong.description || undefined
  }
}

interface UseSongsFromBackend {
  songs: Song[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const useSongsFromBackend = (): UseSongsFromBackend => {
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSongs = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Primero verificar que el backend esté disponible
      await ApiClient.healthCheck()
      
      // Luego obtener las canciones
      const backendSongs = await ApiClient.getSongs()
      const convertedSongs = backendSongs.map(convertBackendSongToFrontend)
      
      setSongs(convertedSongs)
      console.log(`Loaded ${convertedSongs.length} songs from backend`)
      
    } catch (err) {
      console.error('Error fetching songs from backend:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setSongs([]) // Resetear canciones en caso de error
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSongs()
  }, [])

  return {
    songs,
    loading,
    error,
    refetch: fetchSongs
  }
}

export default useSongsFromBackend
