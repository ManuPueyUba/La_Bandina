// Tipos para las APIs
export interface LoginRequest {
  username: string // FastAPI espera username, no email
  password: string
}

export interface RegisterRequest {
  email: string
  username: string
  full_name: string | null
  password: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
}

export interface User {
  id: number
  email: string
  username: string
  full_name: string | null
  is_active: boolean
}

// URL base del backend (ajustar según tu configuración de Docker)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Función para hacer llamadas HTTP
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  }

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  }

  try {
    const response = await fetch(url, config)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('API call failed:', error)
    throw error
  }
}

// Función para login
export async function loginUser(email: string, password: string): Promise<LoginResponse> {
  // FastAPI OAuth2PasswordRequestForm espera form-data, no JSON
  const formData = new FormData()
  formData.append('username', email) // FastAPI usa username pero enviamos email
  formData.append('password', password)

  const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Error al iniciar sesión')
  }

  return await response.json()
}

// Función para registro
export async function registerUser(
  email: string,
  password: string,
  name: string
): Promise<User> {
  const registerData: RegisterRequest = {
    email,
    username: email, // Usar email como username por simplicidad
    full_name: name,
    password,
  }

  return apiCall<User>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(registerData),
  })
}

// Función para obtener usuario actual
export async function getCurrentUser(token: string): Promise<User> {
  return apiCall<User>('/api/v1/users/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

// Función para validar token
export async function validateToken(token: string): Promise<boolean> {
  try {
    await getCurrentUser(token)
    return true
  } catch {
    return false
  }
}
