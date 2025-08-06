"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { User, LogIn, UserPlus } from "lucide-react"

export function AuthButton() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showOptions, setShowOptions] = useState(false)

  // Si el usuario está autenticado, mostrar perfil
  if (isAuthenticated) {
    return (
      <div className="relative">
        <Button
          variant="outline"
          onClick={() => setShowOptions(!showOptions)}
          className="flex items-center gap-2"
        >
          <User className="w-4 h-4" />
          Mi Perfil
        </Button>
        
        {showOptions && (
          <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
            <div className="py-1">
              <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                Ver Perfil
              </button>
              <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                Configuración
              </button>
              <hr className="my-1" />
              <button 
                onClick={() => setIsAuthenticated(false)}
                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Si no está autenticado, mostrar opciones de login/registro
  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setShowOptions(!showOptions)}
        className="flex items-center gap-2"
      >
        <LogIn className="w-4 h-4" />
        Cuenta
      </Button>
      
      {showOptions && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
          <div className="py-1">
            <button 
              onClick={() => {
                setShowOptions(false)
                // TODO: Abrir modal de login
                console.log("Abrir Login")
              }}
              className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Iniciar Sesión
            </button>
            <button 
              onClick={() => {
                setShowOptions(false)
                // TODO: Abrir modal de registro
                console.log("Abrir Registro")
              }}
              className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Registrarse
            </button>
          </div>
        </div>
      )}
      
      {/* Overlay para cerrar el dropdown al hacer clic fuera */}
      {showOptions && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowOptions(false)}
        />
      )}
    </div>
  )
}
