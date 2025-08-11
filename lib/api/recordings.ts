import { apiCall } from './auth'

// Tipos para las grabaciones (frontend - camelCase)
export interface RecordedNote {
  note: string
  octave: number
  startTime: number
  endTime?: number
  velocity: number
}

// Tipo para el backend (snake_case)
interface BackendRecordedNote {
  note: string
  octave: number
  start_time: number
  end_time?: number
  velocity: number
}

export interface CreateRecordingRequest {
  title: string
  description?: string
  notes: BackendRecordedNote[]  // Usar el tipo del backend
  duration: number
  tempo: number
  category: string
}

export interface Recording {
  id: number
  title: string
  description?: string
  notes: RecordedNote[]
  duration: number
  tempo: number
  category: string
  created_at: string
  updated_at: string
  user_id: number
}

export interface RecordingsResponse {
  recordings: Recording[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

// URL base del backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Función para guardar una grabación
export async function saveRecording(
  recordingData: CreateRecordingRequest,
  token: string
): Promise<Recording> {
  return apiCall<Recording>('/api/v1/recordings/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(recordingData),
  })
}

// Función para obtener grabaciones del usuario
export async function getUserRecordings(
  token: string,
  page = 1,
  perPage = 20
): Promise<RecordingsResponse> {
  return apiCall<RecordingsResponse>(`/api/v1/recordings/?page=${page}&per_page=${perPage}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

// Función para obtener una grabación específica
export async function getRecording(
  id: number,
  token: string
): Promise<Recording> {
  return apiCall<Recording>(`/api/v1/recordings/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

// Función para actualizar una grabación
export async function updateRecording(
  id: number,
  recordingData: Partial<CreateRecordingRequest>,
  token: string
): Promise<Recording> {
  return apiCall<Recording>(`/api/v1/recordings/${id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(recordingData),
  })
}

// Función para eliminar una grabación
export async function deleteRecording(
  id: number,
  token: string
): Promise<void> {
  return apiCall<void>(`/api/v1/recordings/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

// Función para verificar si el usuario tiene sesión iniciada
export function isUserLoggedIn(): boolean {
  if (typeof window === 'undefined') return false
  const token = localStorage.getItem('authToken')
  return !!token
}

// Función para obtener el token del usuario
export function getUserToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('authToken')
}
