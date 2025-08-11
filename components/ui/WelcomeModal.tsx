"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Play, Music, Volume2 } from "lucide-react"

interface WelcomeModalProps {
  onStart: () => void
}

export function WelcomeModal({ onStart }: WelcomeModalProps) {
  const [isStarting, setIsStarting] = useState(false)

  const handleStart = async () => {
    setIsStarting(true)
    try {
      await onStart()
    } finally {
      setIsStarting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto bg-gray-900 border-gray-700 shadow-2xl">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <Music className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-white flex items-center justify-center gap-2">
            ¡Bienvenido al Piano Virtual!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <p className="text-gray-300 leading-relaxed">
              Estás a punto de descubrir una experiencia musical increíble. 
              Podrás tocar el piano con tu teclado, aprender canciones paso a paso 
              y guardar tus configuraciones.
            </p>
            
            <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-300 mb-2">
                <Volume2 className="w-4 h-4" />
                <span className="font-medium">Preparando audio</span>
              </div>
              <p className="text-blue-200 text-sm">
                Al hacer clic en "Comenzar" se activará el sistema de audio 
                para que puedas escuchar las notas del piano.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleStart}
              disabled={isStarting}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 text-lg font-medium transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100"
              size="lg"
            >
              {isStarting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Iniciando...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Play className="w-5 h-5" />
                  <span>¡Comenzar a Tocar!</span>
                </div>
              )}
            </Button>
            
            <p className="text-xs text-gray-400 text-center">
              Necesario para activar el audio según las políticas del navegador
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
