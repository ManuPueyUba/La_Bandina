// API configuration for backend connection
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const API_V1 = `${API_BASE_URL}/api/v1`

// API endpoints
export const API_ENDPOINTS = {
  songs: {
    create: `${API_V1}/songs`,
    getAll: `${API_V1}/songs`,
    getById: (id: string) => `${API_V1}/songs/${id}`,
    delete: (id: string) => `${API_V1}/songs/${id}`,
  },
  recordings: {
    create: `${API_V1}/recordings`,
    getAll: `${API_V1}/recordings`,
    getById: (id: string) => `${API_V1}/recordings/${id}`,
    delete: (id: string) => `${API_V1}/recordings/${id}`,
    exportMidi: (id: string) => `${API_V1}/recordings/${id}/export-midi`,
    convertToSong: (id: string) => `${API_V1}/recordings/${id}/convert-to-song`,
  },
  midi: {
    upload: `${API_V1}/midi/upload`,
    analyze: (id: string) => `${API_V1}/midi/${id}/analyze`,
    convert: (id: string) => `${API_V1}/midi/${id}/convert`,
  },
  health: `${API_BASE_URL}/health`,
}

// API client utility functions
export class ApiClient {
  private static async request<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
      throw new Error(error.detail || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  // Song methods
  static async createSong(songData: CreateSongRequest): Promise<SongResponse> {
    return this.request<SongResponse>(API_ENDPOINTS.songs.create, {
      method: 'POST',
      body: JSON.stringify(songData),
    })
  }

  static async getSongs(): Promise<SongResponse[]> {
    return this.request<SongResponse[]>(API_ENDPOINTS.songs.getAll)
  }

  static async getSongById(id: string): Promise<SongResponse> {
    return this.request<SongResponse>(API_ENDPOINTS.songs.getById(id))
  }

  static async deleteSong(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(API_ENDPOINTS.songs.delete(id), {
      method: 'DELETE',
    })
  }

  // Recording methods
  static async createRecording(recordingData: CreateRecordingRequest): Promise<RecordingResponse> {
    return this.request<RecordingResponse>(API_ENDPOINTS.recordings.create, {
      method: 'POST',
      body: JSON.stringify(recordingData),
    })
  }

  static async getRecordings(): Promise<RecordingResponse[]> {
    return this.request<RecordingResponse[]>(API_ENDPOINTS.recordings.getAll)
  }

  static async exportRecordingAsMidi(id: string): Promise<Blob> {
    const response = await fetch(API_ENDPOINTS.recordings.exportMidi(id), {
      method: 'POST',
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.blob()
  }

  static async convertRecordingToSong(
    id: string, 
    options: { 
      title?: string, 
      difficulty?: string, 
      category?: string 
    } = {}
  ): Promise<SongResponse> {
    const searchParams = new URLSearchParams()
    if (options.title) searchParams.set('title', options.title)
    if (options.difficulty) searchParams.set('difficulty', options.difficulty)
    if (options.category) searchParams.set('category', options.category)
    
    const url = `${API_ENDPOINTS.recordings.convertToSong(id)}?${searchParams.toString()}`
    return this.request<SongResponse>(url, { method: 'POST' })
  }

  // Health check
  static async healthCheck(): Promise<{ status: string }> {
    return this.request<{ status: string }>(API_ENDPOINTS.health)
  }
}

// Types for API requests and responses
export interface NoteSchema {
  key: string
  start_time: number
  duration: number
}

export interface RecordedNoteSchema {
  note: string
  octave: number
  start_time: number
  end_time?: number
  velocity: number
}

export interface CreateSongRequest {
  title: string
  artist: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  category: string
  bpm: number
  key_signature?: string
  time_signature?: string
  description?: string
  notes: NoteSchema[]
}

export interface CreateRecordingRequest {
  title: string
  artist: string
  bpm?: number
  key_signature?: string
  description?: string
  notes: RecordedNoteSchema[]
}

export interface SongResponse {
  id: string
  title: string
  artist: string
  difficulty: string
  category: string
  bpm: number
  duration: number
  notes: NoteSchema[]
  key_signature: string
  time_signature: string
  description?: string
  created_at: string
  updated_at?: string
}

export interface RecordingResponse {
  id: string
  title: string
  artist: string
  bpm: number
  duration: number
  notes: RecordedNoteSchema[]
  key_signature: string
  description?: string
  created_at: string
  updated_at?: string
}

export default ApiClient
