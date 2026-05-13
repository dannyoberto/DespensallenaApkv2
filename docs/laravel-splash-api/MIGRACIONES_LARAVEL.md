# Migraciones Laravel (referencia)

Copiar al proyecto Laravel en `database/migrations/` con nombres con fecha, por ejemplo:

- `xxxx_xx_xx_000001_create_splash_settings_table.php`
- `xxxx_xx_xx_000002_create_splash_messages_table.php`

Ajustar nombres de clases a la convención de Laravel. Si preferís **una sola** migración con `Schema::create` de ambas tablas, unifica en un solo archivo (válido para MVP).

## Tabla `splash_settings`

- Una fila por `app_slug` (unique).
- Almacena flags y parámetros del splash enriquecido.

### Campos sugeridos

| Columna | Tipo Laravel | Notas |
|---------|--------------|--------|
| `id` | `id()` | |
| `app_slug` | `string('app_slug', 64)->unique()` | p.ej. `despensallena` |
| `enabled` | `boolean` | default `true` |
| `mode` | `string(16)` o `enum` | `full`, `minimal`, `off` |
| `minimal_duration_ms` | `unsignedInteger()->nullable()` | p.ej. 400 |
| `max_wait_ms` | `unsignedInteger()->nullable()` | solo informativo |
| `cache_ttl_seconds` | `unsignedInteger()` | p.ej. 300 |
| `version` | `unsignedInteger()` | p.ej. 1, incremento manual al cambiar contrato |
| `max_messages` | `unsignedTinyInteger()->default(5)` | límite a devolver en JSON |
| `timestamps` | `timestamps()` | |

**Índices:** unique en `app_slug`.

## Tabla `splash_messages`

- Muchos mensajes; filtrados en el controlador.

### Campos sugeridos

| Columna | Tipo Laravel | Notas |
|---------|--------------|--------|
| `id` | `id()` | |
| `app_slug` | `string(64)->index()` | coherente con `splash_settings` |
| `sort_order` | `integer` | default 0 |
| `title` | `string(255)` | |
| `subtitle` | `string(512)->nullable()` | |
| `icon_emoji` | `string(32)->nullable()` | |
| `image_url` | `string(1024)->nullable()` | |
| `is_active` | `boolean` | default `true` |
| `starts_at` | `timestamp()->nullable()` | |
| `ends_at` | `timestamp()->nullable()` | |
| `timestamps` | `timestamps()` | |

**Índices sugeridos:** compuesto `app_slug` + `is_active`; según consultas, añade índice en rango de fechas si el volumen crece.

## Ejemplo de cuerpos de migración (PHP 8 / Laravel 10+)

> Sustituye el nombre de clase y el timestamp del archivo según el proyecto.

### `create_splash_settings_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('splash_settings', function (Blueprint $table) {
            $table->id();
            $table->string('app_slug', 64)->unique();
            $table->boolean('enabled')->default(true);
            $table->string('mode', 16); // full | minimal | off
            $table->unsignedInteger('minimal_duration_ms')->nullable();
            $table->unsignedInteger('max_wait_ms')->nullable();
            $table->unsignedInteger('cache_ttl_seconds')->default(300);
            $table->unsignedInteger('version')->default(1);
            $table->unsignedTinyInteger('max_messages')->default(5);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('splash_settings');
    }
};
```

### `create_splash_messages_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('splash_messages', function (Blueprint $table) {
            $table->id();
            $table->string('app_slug', 64);
            $table->integer('sort_order')->default(0);
            $table->string('title', 255);
            $table->string('subtitle', 512)->nullable();
            $table->string('icon_emoji', 32)->nullable();
            $table->string('image_url', 1024)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->timestamps();

            $table->index(['app_slug', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('splash_messages');
    }
};
```

## Seeder mínimo (recomendación)

- `SplashSettingsSeeder`: inserta fila `app_slug = despensallena` con `mode = minimal` y `enabled = true` para alinear con prioridad de velocidad.
- `SplashMessagesSeeder`: 1–2 mensajes de prueba (fechas nulas o vigentes hoy).

Registrar en `DatabaseSeeder` o ejecutar por separado en documentación del repo Laravel.

## Variables de entorno (API key)

- `SPLASH_APP_KEY` o `MOBILE_API_KEY`: string largo, sin commitear; documentar en `.env.example` del repo Laravel.
