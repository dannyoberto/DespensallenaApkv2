# Backend Laravel: configuración y mensajes del splash (Despensallena)

Esta carpeta documenta el **proyecto backend** (Laravel) que alimentará la app móvil con:

- Activación / desactivación del splash enriquecido.
- Modos de arranque (prioridad: **velocidad**).
- Mensajes e imágenes configurables (sin recompilar el APK).
- Endpoints `GET` pensados para consumo desde la app React Native / Expo.

## Ubicación en el repositorio

| Archivo | Propósito |
|--------|------------|
| [ESPECIFICACION_COMPLETA.md](./ESPECIFICACION_COMPLETA.md) | Requisitos, contratos de API, JSON, seguridad, fallbacks y caché en cliente. |
| [MIGRACIONES_LARAVEL.md](./MIGRACIONES_LARAVEL.md) | Esquema de base de datos y **migraciones** listas para el proyecto Laravel. |
| [PROMPT_PROYECTO_LARAVEL.md](./PROMPT_PROYECTO_LARAVEL.md) | **Prompt** para pegar al crear/abrir el nuevo repo Laravel (Cursor o chat). |

## Cómo usarlo

1. Crea un **nuevo repositorio** (solo Laravel) o carpeta de proyecto aparte.
2. Abre [PROMPT_PROYECTO_LARAVEL.md](./PROMPT_PROYECTO_LARAVEL.md) y pégalo en una nueva sesión para generar el esqueleto.
3. Implementa según [ESPECIFICACION_COMPLETA.md](./ESPECIFICACION_COMPLETA.md) y aplica [MIGRACIONES_LARAVEL.md](./MIGRACIONES_LARAVEL.md).
4. Vuelve a **este** repo móvil cuando toque exponer el `GET` y conectar el splash (fase acordada).

**Nota:** La documentación vive aquí para mantener un solo contrato mientras el código Laravel aún no existe; puedes copiar la carpeta al repo backend si lo preferís.
