"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Keyboard, RotateCcw, Save, Check, X } from "lucide-react"
import Link from "next/link"

// Componente Toast
interface ToastProps {
  message: string
  type: "success" | "error"
  onClose: () => void
}

const Toast = ({ message, type, onClose }: ToastProps) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000) // Auto cerrar después de 3 segundos
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
      <div className={`
        flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg
        ${type === "success" 
          ? "bg-green-500 text-white" 
          : "bg-red-500 text-white"
        }
      `}>
        {type === "success" ? (
          <Check className="w-5 h-5" />
        ) : (
          <X className="w-5 h-5" />
        )}
        <span className="font-medium">{message}</span>
        <button 
          onClick={onClose}
          className="ml-2 hover:bg-black/10 rounded p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// Tipos para la configuración de teclas
interface KeyMapping {
  [key: string]: { note: string; octaveOffset: number }
}

// Mapeo por defecto
const DEFAULT_KEY_MAPPING: KeyMapping = {
  // Octava base (octaveOffset: 0)
  a: { note: "C", octaveOffset: 0 },
  w: { note: "C#", octaveOffset: 0 },
  s: { note: "D", octaveOffset: 0 },
  e: { note: "D#", octaveOffset: 0 },
  d: { note: "E", octaveOffset: 0 },
  f: { note: "F", octaveOffset: 0 },
  t: { note: "F#", octaveOffset: 0 },
  g: { note: "G", octaveOffset: 0 },
  y: { note: "G#", octaveOffset: 0 },
  h: { note: "A", octaveOffset: 0 },
  u: { note: "A#", octaveOffset: 0 },
  j: { note: "B", octaveOffset: 0 },
  
  // Primera octava superior (octaveOffset: 1)
  k: { note: "C", octaveOffset: 1 },
  o: { note: "C#", octaveOffset: 1 },
  l: { note: "D", octaveOffset: 1 },
  p: { note: "D#", octaveOffset: 1 },
  ";": { note: "E", octaveOffset: 1 },
  z: { note: "F", octaveOffset: 1 },
  x: { note: "G", octaveOffset: 1 },
  c: { note: "A", octaveOffset: 1 },
  v: { note: "B", octaveOffset: 1 },
  
  // Segunda octava superior (octaveOffset: 2)
  b: { note: "C", octaveOffset: 2 },
  n: { note: "D", octaveOffset: 2 },
  m: { note: "E", octaveOffset: 2 },
  ",": { note: "F", octaveOffset: 2 },
  ".": { note: "G", octaveOffset: 2 },
  "/": { note: "A", octaveOffset: 2 },
}

// Todas las notas cromáticas
const CHROMATIC_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

export default function ConfigPage() {
  const router = useRouter()
  const [keyMapping, setKeyMapping] = useState<KeyMapping>(DEFAULT_KEY_MAPPING)
  const [selectedPianoKey, setSelectedPianoKey] = useState<{note: string, octaveOffset: number} | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [currentOctave, setCurrentOctave] = useState(4)
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)
  const numberOfOctaves = 3 // Fijo en 3 octavas

  // Cargar configuración guardada al montar el componente
  useEffect(() => {
    const savedMapping = localStorage.getItem("pianoKeyMapping")
    if (savedMapping) {
      try {
        setKeyMapping(JSON.parse(savedMapping))
      } catch (error) {
        console.error("Error loading saved key mapping:", error)
      }
    }
  }, [])

  // Guardar configuración
  const saveConfiguration = () => {
    localStorage.setItem("pianoKeyMapping", JSON.stringify(keyMapping))
    setToast({ message: "¡Configuración guardada exitosamente!", type: "success" })
    
    // Navegar después de mostrar el toast
    setTimeout(() => {
      router.push("/")
    }, 500) // Dar tiempo para ver el toast
  }

  // Resetear a configuración por defecto
  const resetToDefault = () => {
    setKeyMapping(DEFAULT_KEY_MAPPING)
    localStorage.removeItem("pianoKeyMapping")
    setSelectedPianoKey(null)
    setIsListening(false)
    setToast({ message: "Configuración restablecida por defecto", type: "success" })
    
    // Navegar después de mostrar el toast
    setTimeout(() => {
      router.push("/")
    }, 500) // Dar tiempo para ver el toast
  }

  // Manejar click en tecla del piano
  const handlePianoKeyClick = (note: string, octaveOffset: number) => {
    setSelectedPianoKey({ note, octaveOffset })
    setIsListening(true)
  }

  // Escuchar eventos de teclado para capturar nuevas teclas
  useEffect(() => {
    if (!isListening || !selectedPianoKey) return

    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault()
      const key = event.key.toLowerCase()
      
      // Evitar teclas especiales
      if (key.length === 1 && key.match(/[a-z0-9;',./\\[\]`~!@#$%^&*()_+\-={}|:"<>?]/)) {
        // Verificar si la tecla ya está asignada y removerla
        const existingKey = Object.keys(keyMapping).find(k => k === key)
        if (existingKey) {
          const newMapping = { ...keyMapping }
          delete newMapping[existingKey]
          setKeyMapping(newMapping)
        }

        // Asignar nueva tecla
        setKeyMapping(prev => ({
          ...prev,
          [key]: {
            note: selectedPianoKey.note,
            octaveOffset: selectedPianoKey.octaveOffset
          }
        }))

        // Limpiar selección
        setSelectedPianoKey(null)
        setIsListening(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedPianoKey(null)
        setIsListening(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleEscape)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleEscape)
    }
  }, [isListening, selectedPianoKey, keyMapping])

  // Obtener la tecla asignada a una nota específica
  const getAssignedKey = (note: string, octaveOffset: number) => {
    const entry = Object.entries(keyMapping).find(([_, mapping]) => 
      mapping.note === note && mapping.octaveOffset === octaveOffset
    )
    return entry ? entry[0] : null
  }

  // Remover asignación
  const removeAssignment = (note: string, octaveOffset: number) => {
    const keyToRemove = Object.keys(keyMapping).find(k => 
      keyMapping[k].note === note && keyMapping[k].octaveOffset === octaveOffset
    )
    if (keyToRemove) {
      const newMapping = { ...keyMapping }
      delete newMapping[keyToRemove]
      setKeyMapping(newMapping)
    }
  }

  // Componente de tecla de piano para configuración
  const ConfigPianoKey = ({ 
    note, 
    octaveOffset,
    isBlack = false 
  }: { 
    note: string; 
    octaveOffset: number; 
    isBlack?: boolean 
  }) => {
    const assignedKey = getAssignedKey(note, octaveOffset)
    const isSelected = selectedPianoKey?.note === note && selectedPianoKey?.octaveOffset === octaveOffset
    const isHighlighted = isSelected && isListening

    return (
      <div
        className={`
          relative select-none transition-all duration-200 cursor-pointer group
          ${
            isBlack
              ? `w-8 h-32 bg-gray-900 hover:bg-gray-800 -mx-4 z-10 rounded-b-md border border-gray-700
               ${isHighlighted ? "bg-blue-600 border-blue-400" : ""}`
              : `w-12 h-48 bg-white hover:bg-gray-50 border border-gray-300 rounded-b-md
               ${isHighlighted ? "bg-blue-100 border-blue-400" : ""}`
          }
          ${assignedKey ? (isBlack ? "ring-2 ring-green-400" : "ring-2 ring-green-500") : ""}
        `}
        onClick={() => handlePianoKeyClick(note, octaveOffset)}
      >
        {/* Indicador de tecla asignada */}
        {assignedKey && (
          <div className={`
            absolute top-2 left-1/2 transform -translate-x-1/2 
            ${isBlack ? "text-white" : "text-gray-700"}
            text-xs font-mono font-bold bg-green-500 text-white px-1 rounded
          `}>
            {assignedKey.toUpperCase()}
          </div>
        )}

        {/* Botón para remover asignación */}
        {assignedKey && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              removeAssignment(note, octaveOffset)
            }}
            className={`
              absolute top-2 right-1 opacity-0 group-hover:opacity-100 transition-opacity
              w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center
              hover:bg-red-600 z-20
            `}
          >
            <X className="w-2 h-2" />
          </button>
        )}

        {/* Información de la nota */}
        {!isBlack && (
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 text-center">
            <div className="font-medium">{note}</div>
            <div className="text-[10px]">Oct +{octaveOffset}</div>
          </div>
        )}

        {/* Indicador de selección */}
        {isHighlighted && (
          <div className="absolute inset-0 bg-blue-400 bg-opacity-30 rounded-b-md flex items-center justify-center">
            <div className="text-white font-bold text-xs bg-blue-600 px-2 py-1 rounded">
              Presiona una tecla
            </div>
          </div>
        )}
      </div>
    )
  }

  // Renderizar teclado de configuración
  const renderConfigKeyboard = () => {
    const octaves = Array.from({ length: numberOfOctaves }, (_, i) => i)
    const whiteKeys = ["C", "D", "E", "F", "G", "A", "B"]
    const blackKeys = ["C#", "D#", null, "F#", "G#", "A#", null] // null para espacios

    return (
      <div className="relative flex overflow-x-auto bg-gray-100 p-4 rounded-lg">
        {octaves.map((octaveOffset) => (
          <div key={octaveOffset} className="relative flex">
            {/* Teclas blancas */}
            <div className="flex">
              {whiteKeys.map((note) => (
                <ConfigPianoKey 
                  key={`${note}-${octaveOffset}`} 
                  note={note} 
                  octaveOffset={octaveOffset} 
                />
              ))}
            </div>

            {/* Teclas negras */}
            <div className="absolute top-0 left-6 flex">
              {blackKeys.map((note, index) => (
                <div key={`${note}-${octaveOffset}-${index}`} className="w-12 flex justify-center">
                  {note && (
                    <ConfigPianoKey 
                      note={note} 
                      octaveOffset={octaveOffset} 
                      isBlack 
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header minimalista */}
      <div className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <button className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm">Piano</span>
                </button>
              </Link>
              <h1 className="text-xl font-medium">Configuración de Teclas</h1>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={resetToDefault}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
              <button
                onClick={saveConfiguration}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
              >
                <Save className="w-4 h-4" />
                Guardar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Piano de configuración */}
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
          <h2 className="text-lg font-medium mb-4">Asignar Teclas del Teclado</h2>
          <p className="text-sm text-gray-400 mb-6">
            Haz clic en una tecla del piano y luego presiona la tecla del teclado que quieres asignar
          </p>
          
          {/* Renderizar teclado aquí - actualizaré el renderConfigKeyboard también */}
          {renderConfigKeyboard()}
        </div>

        {/* Instrucciones */}
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
          <h3 className="text-lg font-medium mb-4">Instrucciones</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-300">
            <div>
              <h4 className="text-white font-medium mb-2">Asignar teclas:</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>Haz clic en una tecla del piano</li>
                <li>Presiona la tecla del teclado deseada</li>
                <li>La asignación se guarda automáticamente</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-medium mb-2">Controles:</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li><span className="font-mono">Escape</span> - Cancelar asignación</li>
                <li><span className="font-mono">Reset</span> - Volver a configuración por defecto</li>
                <li><span className="font-mono">Guardar</span> - Guardar y volver al piano</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Estado actual - si se está escuchando */}
        {isListening && selectedPianoKey && (
          <div className="bg-blue-900/30 backdrop-blur-sm rounded-xl border border-blue-700 p-6 text-center">
            <h3 className="text-lg font-medium mb-2">
              🎯 Presiona una tecla para asignar a: <strong>{selectedPianoKey.note}</strong> (Octava +{selectedPianoKey.octaveOffset})
            </h3>
            <p className="text-sm text-gray-400">
              Presiona <kbd className="bg-gray-700 px-2 py-1 rounded text-white">Escape</kbd> para cancelar
            </p>
          </div>
        )}
      </div>

      {/* Toast notifications */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
