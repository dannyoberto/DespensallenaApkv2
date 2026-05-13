# Especificación: API Laravel para splash y contenido remoto (Despensallena)

## 1. Objetivo

Permitir desde un panel (Laravel) o base de datos:

- Encender o apagar el **splash enriquecido** (el que hoy vive en la app como pantalla con mensajes/animación).
- Elegir un **modo** acorde a la prioridad de **velocidad de arranque**, sin dejar el arranque “vacío”: siempre habrá un comportamiento **por defecto** en cliente si el API falla o tarda.
- Gestionar **mensajes** (título, subtítulo, icono/emoji, imagen remota opcional) con vigencia (fechas) y activación.
- Un único `app_slug` para la marca: **`despensallena`**.

## 2. Principios (alineados con el cliente móvil)

- **Arranque rápido primero:** el `GET` debe ser **liviano** (pocos joins, JSON pequeño, caché HTTP si aplica).
- **Nunca depender al 100% de red:** el cliente mantiene **fallback local** + **caché** de la última respuesta válida.
- **Timeout corto en el cliente (futuro):** si el API no responde a tiempo, se usa caché/fallback (esto no es del backend, pero el contrato debe ser estable y versionable).
- **Imágenes:** URLs absolutas `https` apuntando a almacenamiento (S3, R2, etc.); el backend devuelve metadatos, no embeber binarios en JSON enormes.

## 3. Alcance del backend (MVP)

- Autenticación mínima para el API público de la app: **API key** en header (Laravel: middleware simple o Sanctum “token de app” si se prefiere).
- CRUD administrativo puede ser **Fase 2** (Tinker, Filament, o panel mínimo); en MVP basta con **semillas** + **migraciones** y edición vía base de datos o tinker.
- Un solo “contrato” principal consumido al abrir la app:

`GET /api/v1/splash` (nombre exacto ajustable, pero fijar uno y no cambiarlo sin versionar).

## 4. Modelo de feature flags (splash)

Campos lógicos (pueden vivir en una fila de tabla `splash_settings` o equivalente, ver migraciones):

| Campo lógico | Tipo | Descripción |
|--------------|------|-------------|
| `app_slug` | string | Siempre `despensallena` en el MVP. |
| `enabled` | bool | Si el splash enriquecido está permitido. |
| `mode` | enum | `full` \| `minimal` \| `off`. |
| `minimal_duration_ms` | int, nullable | Si `mode=minimal`, duración sugerida (p.ej. 300–500 ms) para que se vea armónico. |
| `max_wait_ms` | int, nullable | Máx. tiempo de espera al API en cliente (solo documentación / hint; el cliente aplica su timeout). |
| `cache_ttl_seconds` | int | Recomendación de TTL de caché (cliente y/o CDN). |
| `version` | int o string | Sube cuando cambies contrato; el cliente puede invalidar caché si `version` cambia. |
| `updated_at` | datetime | Auditoría. |

**Semántica de `mode` (recomendada):**

- `full`: experiencia completa (mensajes rotativos, animación, barra, etc. según la app).
- `minimal`: logo / mensaje mínimo breve, prioridad arranque.
- `off`: no mostrar el splash enriquecido; ir a la app cuando el runtime esté listo (sigue existiendo el splash **nativo** mínimo del SO/Expo si aplica, fuera de este API).

`enabled=false` puede ser equivalente a `mode=off` o forzar apagado total del splash enriquecido. En implementación, elegir **una** regla clara y documentarla en el README del API.

## 5. Modelo de mensajes

Cada mensaje (rotación, campaña, día):

| Campo lógico | Tipo | Descripción |
|--------------|------|-------------|
| `id` | bigint | PK. |
| `app_slug` | string | Filtro por app. |
| `sort_order` | int | Orden de aparición. |
| `title` | string | Título. |
| `subtitle` | string, nullable | Subtítulo. |
| `icon_emoji` | string, nullable | Un emoji; si `image_url` está rellenado, la app puede priorizar imagen. |
| `image_url` | string, nullable | URL pública. |
| `is_active` | bool | Incluido en respuesta si true. |
| `starts_at` | datetime, nullable | Vigencia inicio. |
| `ends_at` | datetime, nullable | Vigencia fin. |
| `created_at` / `updated_at` | timestamps | — |

Lógica de filtrado en el backend:

- `is_active = true`
- Ahora (servidor) entre `starts_at` y `ends_at` si no son null
- Orden: `sort_order` ASC, luego `id` ASC
- Máximo **N** mensajes en respuesta (N configurable en `splash_settings` o fijo, p. ej. 5)

## 6. Respuesta del endpoint `GET /api/v1/splash`

**Headers (request desde la app, MVP):**

- `Accept: application/json`
- `X-App-Key: <secreto>` o `Authorization: Bearer <token>` (elegir uno y dejar fijo en doc + `.env`)

**Response 200 (ejemplo):**

```json
{
  "ok": true,
  "app_slug": "despensallena",
  "version": 1,
  "flags": {
    "enabled": true,
    "mode": "minimal",
    "minimal_duration_ms": 400,
    "cache_ttl_seconds": 300
  },
  "messages": [
    {
      "id": 1,
      "title": "Oferta del día",
      "subtitle": "Productos frescos a tu mesa",
      "icon_emoji": "🛒",
      "image_url": null
    }
  ],
  "meta": {
    "generated_at": "2026-04-27T20:00:00Z"
  }
}
```

**Errores:**

- `401` / `403` si la API key es inválida.
- `429` si aplica rate limiting.
- `500` con cuerpo JSON mínimo `{ "ok": false, "message": "..." }`.

## 7. CORS y despliegue

- El API lo consume la app móvil: **CORS** no es crítico para el APK; sí puede serlo si luego usás el mismo API desde web.
- **HTTPS** obligatorio en producción.
- **Rate limit** básico por IP + API key (recomendado).

## 8. Fases sugeridas

- **Fase 1 (rápida):** migraciones + seeder + `GET /api/v1/splash` + middleware de API key + tests mínimos de ruta.
- **Fase 2:** panel (Filament) o endpoints admin protegidos para no tocar la DB a mano.
- **Fase 3:** métricas (mostrar/click) si el negocio lo pide.

## 9. Conexión con el repo móvil (futuro)

- Archivo a tocar: `components/enhanced-splash-screen.tsx` (o capa de servicio nueva).
- Comportamiento: leer `flags` + `messages`; si falla red, usar lista local actual como **fallback**; respetar `mode` y `enabled`.

---

Esta especificación es el contrato acordado hasta que se defina el contrato v2; cualquier cambio de forma debe subir `version` y anunciarse a ambos equipos.
