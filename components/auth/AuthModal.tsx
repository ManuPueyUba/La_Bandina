"use client"

import { useState } from "react"
import { LoginForm } from "./LoginForm"
import { RegisterForm } from "./RegisterForm"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  initialMode?: "login" | "register"
}

export function AuthModal({ isOpen, onClose, initialMode = "login" }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">(initialMode)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" data-modal-open="true">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-md mx-4" role="dialog">
        {mode === "login" ? (
          <LoginForm
            onClose={onClose}
            onSwitchToRegister={() => setMode("register")}
          />
        ) : (
          <RegisterForm
            onClose={onClose}
            onSwitchToLogin={() => setMode("login")}
          />
        )}
      </div>
    </div>
  )
}
