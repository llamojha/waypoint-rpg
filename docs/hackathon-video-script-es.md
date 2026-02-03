# Waypoint Demo Video Script (Español)

**Duración**: 2:50 (menos de 3 minutos)
**Formato**: Grabación de pantalla + voz en off + visuales de arquitectura

---

## ESCENA 1: Gancho (0:00 - 0:20)

**[VISUAL]**: UI del juego en acción. El jugador escribe "Intento escabullirme de los guardias". Aparece la narración en streaming. Animación de tirada de dados. Los paneles de UI se actualizan.

**[VOZ EN OFF]**:
> "¿Y si una IA pudiera ser realmente un Dungeon Master — no solo un chatbot pretendiendo serlo?"
>
> "Esto es Waypoint. Un RPG impulsado por IA donde Gemini 3 controla todo el juego."

**[VISUAL]**: Cortes rápidos mostrando: panel de relaciones actualizándose, inventario cambiando, prueba de habilidad exitosa.

---

## ESCENA 2: El Problema (0:20 - 0:45)

**[VISUAL]**: Comparación en pantalla dividida. Izquierda: chat de IA genérico perdiendo contexto. Derecha: Waypoint manteniendo el estado.

**[VOZ EN OFF]**:
> "La mayoría de los RPGs con IA tienen un problema. Olvidan lo que pasó hace cinco turnos. Alucinan objetos que no tienes. Las tiradas de dados ocurren dentro del LLM — completamente no deterministas."
>
> "Construimos Waypoint para solucionar esto."

**[VISUAL]**: Mostrar un chat estilo competidor donde la IA se contradice vs los paneles consistentes de Waypoint.

---

## ESCENA 3: La Solución — Vista General de Arquitectura (0:45 - 1:20)

**[VISUAL - Hub-and-Spoke Overview]**: Diagrama de arquitectura apareciendo. Diseño hub-and-spoke con nombres funcionales: Detección de Intención, Recuperación de Canon, Validación, Narración, Contexto de Misiones alrededor del Orquestador central.

**[VOZ EN OFF]**:
> "Waypoint usa una arquitectura de agentes hub-and-spoke. Seis agentes especializados de Gemini 3, cada uno con un trabajo específico."
>
> "El Orquestador es el hub central. Detecta la intención del jugador y propone eventos del juego usando tool calling de Gemini 3."

**[VISUAL - Tool Calling Flow]**: Resaltar el nodo del Orquestador. Mostrar ejemplos de tool calls apareciendo: `propose_stat_change`, `propose_relationship_change`.

**[VOZ EN OFF]**:
> "El Lorekeeper recupera conocimiento del mundo. El Arbiter valida todo. Y el Chronicler genera la narrativa — en streaming en tiempo real."

**[VISUAL - Data Flow Arrows]**: Flechas animándose mostrando el flujo de datos a través del pipeline.

---

## ESCENA 4: Bajo el Capó — Vista de Trace (1:20 - 2:00)

**[VISUAL - Grabación de Pantalla]**: UI del juego con el PANEL DE TRACE abierto. Mostrar un turno siendo procesado.

**[VOZ EN OFF]**:
> "Veamos bajo el capó. Esto es lo que pasa cuando realizas una acción."

**[VISUAL]**: Panel de trace mostrando: SENTINEL → RUNE_MARSHAL → ORCHESTRATOR → ARBITER → CHRONICLER

**[VOZ EN OFF]**:
> "Primero: Tool calling. Observa cómo el Orquestador genera propuestas estructuradas — `propose_relationship_change`, `propose_inventory_add`. Sin texto libre. Sin alucinaciones."

**[VISUAL]**: Resaltar el trace del ORCHESTRATOR mostrando las llamadas de propuestas.

**[VOZ EN OFF]**:
> "El Arbiter valida todo. ¿Ves ese rechazo? El jugador intentó reclamar un objeto que no tiene. Bloqueado."

**[VISUAL]**: Resaltar el trace del ARBITER mostrando un rechazo.

**[VOZ EN OFF]**:
> "Luego el Chronicler transmite la narración en tiempo real. Todo esto en menos de tres segundos."

**[VISUAL]**: Mostrar tiempos en el trace (total ~2-3 segundos).

---

## ESCENA 5: Demo en Vivo — Experiencia del Jugador (2:00 - 2:30)

**[VISUAL]**: UI completa del juego. Panel de trace CERRADO. Vista limpia del jugador.

**[VOZ EN OFF]**:
> "Pero los jugadores no ven nada de eso. Solo ven esto."

**[ACCIÓN]**: Escribir: "Le pregunto al mercader sobre el envío perdido"

**[VISUAL]**: La narración aparece en streaming. El panel de relaciones se actualiza. Experiencia fluida.

**[VOZ EN OFF]**:
> "Conversación natural. Cambios de estado reales. Narrativa que recuerda todo — porque usamos la ventana de contexto completa de un millón de tokens de Gemini. Nunca resumimos. Nunca olvidamos."

**[VISUAL]**: Desplazarse hacia arriba por el historial de turnos mostrando narrativa consistente.

---

## ESCENA 6: El Principio + Cierre (2:30 - 2:50)

**[VISUAL - LLM + Code Hybrid Split]**: Gráfico dividido: "LLM Propone" (izquierda) | "Código Valida" (derecha)

**[VOZ EN OFF]**:
> "Nuestro principio fundamental: el LLM propone, el código dispone."
>
> "Gemini 3 maneja la creatividad. El código determinista maneja las mecánicas. ¿El resultado? Una IA que es creativa Y consistente."

**[VISUAL]**: Logo de Waypoint + "Built with Gemini 3"

**[VOZ EN OFF]**:
> "Waypoint. Un mundo persistente donde tus decisiones importan — impulsado por Gemini 3."

**[VISUAL]**: URL al demo / GitHub

---

## Notas de Producción

### Grabación de Pantalla
- Usar OBS o Loom
- Resolución 1920x1080
- 60fps para animación de streaming fluida

### Visuales Necesarios
| Escena | Nombre del Visual | Tipo |
|--------|-------------------|------|
| 3 | Hub-and-Spoke Overview | Imagen generada |
| 3 | Tool Calling Flow | Imagen generada |
| 3 | Data Flow Arrows | Igual que Tool Calling Flow (animar en editor) |
| 4 | Trace View | Grabación de pantalla |
| 5 | Live Demo | Grabación de pantalla |
| 6 | LLM + Code Hybrid Split | Imagen generada |

### Audio
- Grabar voz en off por separado (mejor calidad)
- Música de fondo: sutil, no distrae
- Normalizar niveles de audio

### Puntos de Control de Tiempo
| Timestamp | Escena | Duración |
|-----------|--------|----------|
| 0:00 | Gancho | 20s |
| 0:20 | Problema | 25s |
| 0:45 | Arquitectura | 35s |
| 1:20 | Bajo el Capó (Trace) | 40s |
| 2:00 | Demo en Vivo | 30s |
| 2:30 | Principio + Cierre | 20s |
| **Total** | | **2:50** |

### Frases Clave a Enfatizar
- "El LLM propone, el código dispone"
- "Nunca resumimos, nunca olvidamos"
- "Tool calling, no texto libre"
- "Creativa Y consistente"
