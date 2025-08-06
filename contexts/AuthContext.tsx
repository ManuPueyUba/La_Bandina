"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// Tipos para el usuario y autenticación
export interface User {
  id: string
  email: string
  name: string
  createdAt: string
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
          // TODO: Validar token con el backend
          // Por ahora, simular usuario logueado
          const savedUser = localStorage.getItem('userData')
          if (savedUser) {
            setUser(JSON.parse(savedUser))
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
      // TODO: Llamada real al backend
      // Por ahora, simular login exitoso
      const mockUser: User = {
        id: '1',
        email,
        name: email.split('@')[0],
        createdAt: new Date().toISOString()
      }

      const mockToken = 'mock-jwt-token-' + Date.now()
      
      // Guardar en localStorage
      localStorage.setItem('authToken', mockToken)
      localStorage.setItem('userData', JSON.stringify(mockUser))
      
      setUser(mockUser)
    } catch (error) {
      console.error('Login error:', error)
      throw new Error('Error al iniciar sesión')
    } finally {
      setIsLoading(false)
    }
  }

  // Función de registro
  const register = async (email: string, password: string, name: string) => {
    setIsLoading(true)
    try {
      // TODO: Llamada real al backend
      // Por ahora, simular registro exitoso
      const mockUser: User = {
        id: Date.now().toString(),
        email,
        name,
        createdAt: new Date().toISOString()
      }

      const mockToken = 'mock-jwt-token-' + Date.now()
      
      // Guardar en localStorage
      localStorage.setItem('authToken', mockToken)
      localStorage.setItem('userData', JSON.stringify(mockUser))
      
      setUser(mockUser)
    } catch (error) {
      console.error('Register error:', error)
      throw new Error('Error al registrarse')
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
