# Backend API Endpoints para Grabaciones

Este archivo documenta los endpoints que deben implementarse en el backend para el sistema de grabaciones.

## Estructura de Base de Datos

### Tabla: recordings
```sql
CREATE TABLE recordings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    notes JSONB NOT NULL,
    duration INTEGER NOT NULL, -- en milisegundos
    tempo INTEGER DEFAULT 120,
    category VARCHAR(50) DEFAULT 'personal',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices recomendados
CREATE INDEX idx_recordings_user_id ON recordings(user_id);
CREATE INDEX idx_recordings_category ON recordings(category);
CREATE INDEX idx_recordings_created_at ON recordings(created_at DESC);
```

### Estructura del campo notes (JSONB):
```json
[
  {
    "note": "C",
    "octave": 4,
    "startTime": 0,
    "endTime": 500,
    "velocity": 0.8
  },
  {
    "note": "E",
    "octave": 4,
    "startTime": 250,
    "endTime": 750,
    "velocity": 0.7
  }
]
```

## Endpoints Requeridos

### 1. POST /api/v1/recordings/
Crear nueva grabación

**Headers:**
- Authorization: Bearer {token}

**Body:**
```json
{
  "title": "Mi grabación",
  "description": "Una hermosa melodía",
  "notes": [
    {
      "note": "C",
      "octave": 4,
      "startTime": 0,
      "endTime": 500,
      "velocity": 0.8
    }
  ],
  "duration": 5000,
  "tempo": 120,
  "category": "personal"
}
```

**Response (201):**
```json
{
  "id": 1,
  "title": "Mi grabación",
  "description": "Una hermosa melodía",
  "notes": [...],
  "duration": 5000,
  "tempo": 120,
  "category": "personal",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z",
  "user_id": 123
}
```

### 2. GET /api/v1/recordings/
Obtener grabaciones del usuario actual

**Headers:**
- Authorization: Bearer {token}

**Query Params:**
- page: número de página (default: 1)
- per_page: elementos por página (default: 20, max: 100)
- category: filtrar por categoría (opcional)

**Response (200):**
```json
{
  "recordings": [
    {
      "id": 1,
      "title": "Mi grabación",
      "description": "Una hermosa melodía",
      "notes": [...],
      "duration": 5000,
      "tempo": 120,
      "category": "personal",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "user_id": 123
    }
  ],
  "total": 1,
  "page": 1,
  "per_page": 20,
  "total_pages": 1
}
```

### 3. GET /api/v1/recordings/{id}
Obtener grabación específica

**Headers:**
- Authorization: Bearer {token}

**Response (200):** Objeto recording
**Response (404):** Recording no encontrado
**Response (403):** Recording no pertenece al usuario

### 4. PUT /api/v1/recordings/{id}
Actualizar grabación

**Headers:**
- Authorization: Bearer {token}

**Body:** Misma estructura que POST (campos opcionales)

**Response (200):** Objeto recording actualizado

### 5. DELETE /api/v1/recordings/{id}
Eliminar grabación

**Headers:**
- Authorization: Bearer {token}

**Response (204):** Sin contenido
**Response (404):** Recording no encontrado
**Response (403):** Recording no pertenece al usuario

## Implementación FastAPI (Ejemplo)

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import json

from ..database import get_db
from ..models import Recording, User
from ..schemas import RecordingCreate, RecordingResponse, RecordingsResponse
from ..auth import get_current_user

router = APIRouter(prefix="/api/v1/recordings", tags=["recordings"])

@router.post("/", response_model=RecordingResponse)
async def create_recording(
    recording_data: RecordingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Validar datos
    if not recording_data.title.strip():
        raise HTTPException(status_code=400, detail="El título es requerido")
    
    # Crear recording
    db_recording = Recording(
        user_id=current_user.id,
        title=recording_data.title,
        description=recording_data.description,
        notes=recording_data.notes,
        duration=recording_data.duration,
        tempo=recording_data.tempo,
        category=recording_data.category
    )
    
    db.add(db_recording)
    db.commit()
    db.refresh(db_recording)
    
    return db_recording

@router.get("/", response_model=RecordingsResponse)
async def get_recordings(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Recording).filter(Recording.user_id == current_user.id)
    
    if category:
        query = query.filter(Recording.category == category)
    
    total = query.count()
    recordings = query.order_by(Recording.created_at.desc())\
                     .offset((page - 1) * per_page)\
                     .limit(per_page)\
                     .all()
    
    return RecordingsResponse(
        recordings=recordings,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=(total + per_page - 1) // per_page
    )

# Más endpoints...
```

## Schemas Pydantic (Ejemplo)

```python
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class RecordedNote(BaseModel):
    note: str
    octave: int
    startTime: int
    endTime: Optional[int] = None
    velocity: float

class RecordingCreate(BaseModel):
    title: str
    description: Optional[str] = None
    notes: List[RecordedNote]
    duration: int
    tempo: int = 120
    category: str = "personal"

class RecordingResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    notes: List[RecordedNote]
    duration: int
    tempo: int
    category: str
    created_at: datetime
    updated_at: datetime
    user_id: int
    
    class Config:
        from_attributes = True

class RecordingsResponse(BaseModel):
    recordings: List[RecordingResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
```
