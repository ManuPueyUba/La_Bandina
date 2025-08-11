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
    convert: (id: string) => `${API_V1}/midi/${id}/convert`,
  },
  keyMappings: {
    saveDefault: `${API_V1}/key-mappings/save-default`,
    getDefault: `${API_V1}/key-mappings/default`,
    getAll: `${API_V1}/key-mappings`,
    create: `${API_V1}/key-mappings`,
    update: (id: string) => `${API_V1}/key-mappings/${id}`,
    delete: (id: string) => `${API_V1}/key-mappings/${id}`,
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

  // MIDI methods
  static async uploadMidi(file: File): Promise<MidiUploadResponse> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(API_ENDPOINTS.midi.upload, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }))
      throw new Error(error.detail || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  static async convertMidi(id: string, req: MidiConversionRequest): Promise<MidiConversionResponse> {
    return this.request<MidiConversionResponse>(API_ENDPOINTS.midi.convert(id), {
      method: 'POST',
      body: JSON.stringify(req),
    })
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

export interface MidiUploadResponse {
  id: string
  filename: string
  file_size: number
  message: string
}

export interface MidiConversionRequest {
  title: string
  artist?: string
  category?: string
  key_signature?: string
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  description?: string
  options?: {
    min_octave?: number
    max_octave?: number
    min_note_duration?: number
    quantize_threshold?: number
    simplify_melody?: boolean
    remove_chords?: boolean
    max_notes_per_second?: number
  }
}

export interface MidiConversionResponse {
  success: boolean
  message: string
  song: SongResponse
  processing_info: {
    notes_count: number
    total_duration: number
    conversion_type: string
  }
}

// Key Mapping types
export interface KeyMappingData {
  [key: string]: {
    note: string
    octaveOffset: number
  }
}

export interface KeyMappingResponse {
  id: number
  name: string
  mapping_data: KeyMappingData
  user_id: number
}

export interface KeyMappingCreate {
  name: string
  mapping_data: KeyMappingData
}

// Add Key Mapping methods to ApiClient
export class KeyMappingApiClient {
  private static getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('authToken')
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }

  static async saveDefaultKeyMapping(mappingData: KeyMappingData): Promise<KeyMappingResponse> {
    const response = await fetch(API_ENDPOINTS.keyMappings.saveDefault, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(mappingData),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
      throw new Error(error.detail || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  static async getDefaultKeyMapping(): Promise<KeyMappingResponse> {
    const response = await fetch(API_ENDPOINTS.keyMappings.getDefault, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('No default key mapping found')
      }
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
      throw new Error(error.detail || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  static async getAllKeyMappings(): Promise<KeyMappingResponse[]> {
    const response = await fetch(API_ENDPOINTS.keyMappings.getAll, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
      throw new Error(error.detail || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }
}

export default ApiClient
