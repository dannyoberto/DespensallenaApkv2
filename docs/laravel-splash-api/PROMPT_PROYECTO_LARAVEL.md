# Prompt para crear el proyecto Laravel (pegar en Cursor / chat nuevo)

Copia y pega el bloque siguiente **al crear el repositorio o carpeta Laravel nueva**. Sustituye nombres de dominio y hosting solo si ya los tienes; si no, deja genérico.

---

## Prompt (copiar desde aquí)

Necesito un **proyecto Laravel reciente y sencillo** (última LTS o última versión estable que recomiendes) para un **MVP de API JSON** usado por una app móvil (React Native / Expo) de la marca **Despensallena** (`app_slug`: `despensallena`).

### Objetivo del backend

- Exponer un endpoint público (protegido con **API key** en header) que devuelva:
  - **Flags** del splash enriquecido: `enabled`, `mode` (`full` | `minimal` | `off`), `minimal_duration_ms`, `cache_ttl_seconds`, `version`.
  - **Lista** de mensajes: `title`, `subtitle`, `icon_emoji` opcional, `image_url` opcional, filtrados por vigencia y `is_active`, orden por `sort_order`, limitado por `max_messages` de settings.
- Prioridad de negocio: **velocidad de arranque en móvil**; el JSON debe ser **pequeño** y la consulta **simple** (eager mínimo, sin N+1).

### Rutas y contrato

- Implementar: `GET /api/v1/splash`
- Query opcional: `?app=despensallena` (si falta, default `despensallena`).
- Request: header `X-App-Key: <key>` o `Authorization: Bearer <key>` (elige **uno**, documenta en README).
- Response: JSON con forma:

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
  "messages": [ ... ],
  "meta": { "generated_at": "ISO8601" }
}
```

- Códigos: 401/403 clave inválida; 404 si no existen settings para el app; 200 con `messages: []` si no hay campañas vigentes.

### Base de datos

- Migraciones y modelos Eloquent:
  - `splash_settings` (una fila por `app_slug` unique) con campos: `enabled`, `mode`, `minimal_duration_ms`, `max_wait_ms` nullable, `cache_ttl_seconds`, `version`, `max_messages`, timestamps.
  - `splash_messages` con: `app_slug`, `sort_order`, `title`, `subtitle` nullable, `icon_emoji` nullable, `image_url` nullable, `is_active`, `starts_at`, `ends_at` nullable, timestamps.
- **Seeders**: una fila de settings para `despensallena` con `mode = minimal` (prioridad arranque) y 1–2 mensajes de ejemplo vigentes.
- Añade `.env.example` con `SPLASH_APP_KEY` (o el nombre que elijas).

### API key

- Middleware o guard simple que lea la key de config y compare en **timing-safe** (hash_equals) el header del cliente.
- **No** inventes complejidad OAuth en el MVP; solo app key fija o rotación manual en .env.

### Código y calidad

- Form Requests o validación mínima en el controller para query `app` si aplica.
- `php artisan test` con al menos:
  - 200 + JSON correcto con key válida.
  - 401/403 con key inválida.
- README del repo Laravel: cómo levantar, migrar, seed, URL del endpoint, ejemplo `curl` con el header.
- Código en inglés (comentarios puntuales en español OK en README), PSR-12, sin paquetes innecesarios.

Entrega: estructura de archivos, migraciones, seed, controller, route `api`, middleware, tests, README y .env.example.

## Prompt (hasta aquí)

---

## Después de generar el proyecto

1. Revisar que el JSON coincida con [ESPECIFICACION_COMPLETA.md](./ESPECIFICACION_COMPLETA.md).
2. Probar con `curl` o Thunder Client desde la máquina.
3. Desplegar y fijar URL base; luego, en el repo móvil, se implementa el `fetch` hacia `GET /api/v1/splash` con timeout y caché.
