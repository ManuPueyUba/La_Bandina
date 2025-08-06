"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { loginUser, registerUser, getCurrentUser, validateToken } from '@/lib/api/auth'

// Tipos para el usuario y autenticación
export interface User {
  id: number
  email: string
  username: string
  full_name: string | null
  is_active: boolean
}

export interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => void
  updateUser: (userData: Partial<User>) => void
}

// Crear el contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Provider del contexto
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Verificar si hay token guardado al cargar la aplicación
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = localStorage.getItem('authToken')
        if (token) {
          // Validar token con el backend
          const isValid = await validateToken(token)
          if (isValid) {
            const userData = await getCurrentUser(token)
            setUser(userData)
          } else {
            // Token inválido, limpiar localStorage
            localStorage.removeItem('authToken')
            localStorage.removeItem('userData')
          }
        }
      } catch (error) {
        console.error('Error checking auth status:', error)
        localStorage.removeItem('authToken')
        localStorage.removeItem('userData')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuthStatus()
  }, [])

  // Función de login
  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      // Llamada real al backend
      const loginResponse = await loginUser(email, password)
      const { access_token } = loginResponse
      
      // Obtener datos del usuario
      const userData = await getCurrentUser(access_token)
      
      // Guardar en localStorage
      localStorage.setItem('authToken', access_token)
      localStorage.setItem('userData', JSON.stringify(userData))
      
      setUser(userData)
    } catch (error) {
      console.error('Login error:', error)
      throw new Error(error instanceof Error ? error.message : 'Error al iniciar sesión')
    } finally {
      setIsLoading(false)
    }
  }

  // Función de registro
  const register = async (email: string, password: string, name: string) => {
    setIsLoading(true)
    try {
      // Llamada real al backend
      const userData = await registerUser(email, password, name)
      
      // Después del registro exitoso, hacer login automático
      const loginResponse = await loginUser(email, password)
      const { access_token } = loginResponse
      
      // Guardar en localStorage
      localStorage.setItem('authToken', access_token)
      localStorage.setItem('userData', JSON.stringify(userData))
      
      setUser(userData)
    } catch (error) {
      console.error('Register error:', error)
      throw new Error(error instanceof Error ? error.message : 'Error al registrarse')
    } finally {
      setIsLoading(false)
    }
  }

  // Función de logout
  const logout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('userData')
    setUser(null)
  }

  // Función para actualizar datos del usuario
  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData }
      setUser(updatedUser)
      localStorage.setItem('userData', JSON.stringify(updatedUser))
    }
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook personalizado para usar el contexto
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
