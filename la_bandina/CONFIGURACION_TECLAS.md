# Configuración de Teclas del Piano Virtual

## Nueva Funcionalidad ✨

Ahora puedes personalizar completamente el mapeo de teclas del teclado físico a las notas del piano virtual usando una **interfaz visual intuitiva**.

## Características 🚀

### 🎹 Interfaz de Piano Visual
- **Piano interactivo**: Haz clic directamente en las teclas del piano para configurarlas
- **Indicadores visuales**: Teclas asignadas aparecen con borde verde y muestran la tecla asignada
- **Captura en tiempo real**: Presiona cualquier tecla del teclado para asignarla instantáneamente
- **Fácil eliminación**: Botón "×" en cada tecla para remover asignaciones

### ⌨️ Mapeo de Teclas Personalizable
- **Click y asigna**: Haz clic en una tecla del piano, luego presiona la tecla del teclado que quieres asignar
- **Múltiples octavas**: Configura hasta 4 octavas simultáneas en la interfaz
- **Todas las notas**: Incluye teclas blancas y negras (sostenidos/bemoles)
- **Offsets de octava**: Cada tecla puede tener diferentes offsets (0-3)

### 💾 Persistencia y Control
- **Guardado manual**: Botón "Guardar Configuración" para persistir cambios
- **Carga automática**: Restaura tu configuración al abrir la aplicación
- **Reset rápido**: "Resetear a Defecto" restaura la configuración original
- **Cancelar con Escape**: Presiona Escape para cancelar asignaciones

## Cómo Usar 🎹

### 1. Acceder a la Configuración
- Haz clic en "Configurar Teclas" en la página principal del piano

### 2. Configurar Teclas Visualmente
- **Haz clic en cualquier tecla del piano** (blanca o negra) que quieras configurar
- **Presiona la tecla de tu teclado** que quieres asignar a esa nota
- La asignación se hace **automáticamente** y se muestra en la tecla

### 3. Gestionar Asignaciones
- **Teclas verdes**: Ya tienen asignación - la tecla asignada aparece en la parte superior
- **Eliminar**: Haz clic en la "×" roja para remover una asignación
- **Cancelar**: Presiona "Escape" si cambias de opinión durante la asignación

### 4. Controles y Opciones
- **Octavas a mostrar**: Selector para ver 1-4 octavas en el piano de configuración
- **Guardar**: Botón "Guardar Configuración" para persistir todos los cambios
- **Reset**: "Resetear a Defecto" para volver a la configuración original

### 5. Vista de Resumen
- **Panel inferior**: Muestra todas las asignaciones actuales en formato compacto
- **Organizado**: Por octava y luego por nota para fácil revisión

## Configuración por Defecto 🎼

```
Primera Octava (offset 0):
A → C    W → C#   S → D    E → D#   D → E    F → F
T → F#   G → G    Y → G#   H → A    U → A#   J → B

Segunda Octava (offset 1):
K → C    O → C#   L → D    P → D#   ; → E    ' → F
```

## Características Técnicas 🔧

- **Interfaz visual**: Piano interactivo para configuración intuitiva
- **Persistencia**: localStorage para mantener configuraciones entre sesiones
- **Detección automática**: Previene y resuelve asignaciones duplicadas
- **Indicadores visuales**: Bordes verdes, etiquetas de teclas, botones de eliminación
- **Escape cancellation**: Presiona Escape para cancelar operaciones
- **Compatibilidad total**: Funciona con el sistema de múltiples octavas del piano principal
- **Flexibilidad**: Soporta cualquier tecla del teclado físico (letras, números, símbolos)

## Navegación 🧭

- **Volver al Piano**: Botón "Volver al Piano" para regresar a tocar
- **Enlace directo**: `/config` para acceso directo a configuración

¡Disfruta personalizando tu piano virtual! 🎵
