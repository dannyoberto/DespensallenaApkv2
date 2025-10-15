# 🔄 GUÍA DE MIGRACIÓN - FASE 1

## Migrar del Sistema Antiguo al Nuevo

Esta guía explica cómo migrar tu código existente para usar las nuevas optimizaciones de la Fase 1.

---

## 📋 Tabla de Contenidos

1. [Reemplazar console.log con logger](#1-reemplazar-consolelog-con-logger)
2. [Migrar hooks de cache antiguos](#2-migrar-hooks-de-cache-antiguos)
3. [Actualizar componentes que usan WebView](#3-actualizar-componentes-que-usan-webview)
4. [Adaptar scripts de inyección](#4-adaptar-scripts-de-inyección)
5. [Testing y validación](#5-testing-y-validación)

---

## 1. Reemplazar console.log con logger

### ❌ Antes (Antiguo)
```typescript
console.log('WebView loading started');
console.warn('Network check failed:', error);
console.error('WebView error:', error);
console.log('Preloaded resource:', url);
```

### ✅ Ahora (Nuevo)
```typescript
import { logger, webviewLogger, networkLogger, preloadLogger } from '@/utils/logger';

logger.info('General information');
webviewLogger.info('WebView loading started');
networkLogger.warn('Network check failed:', error);
webviewLogger.error('WebView error:', error);
preloadLogger.info('Preloaded resource:', url);
```

**Beneficio:** Los logs solo aparecen en desarrollo, mejorando rendimiento en producción.

---

## 2. Migrar hooks de cache antiguos

### ❌ Antes (Antiguo)
```typescript
import { useWebViewCache } from '@/hooks/use-webview-cache';
import { useWordPressCache } from '@/hooks/use-wordpress-cache';

// En tu componente
const { preloadResources, clearCache } = useWebViewCache();
const { cacheWordPressData, getWordPressData } = useWordPressCache();

// Precargar recursos
await preloadResources(['https://example.com/style.css']);

// Cachear datos WordPress
await cacheWordPressData('product_123', productData, 'product');

// Obtener datos
const cached = await getWordPressData('product_123', 'product');
```

### ✅ Ahora (Nuevo)
```typescript
import { useCacheManager } from '@/hooks/use-cache-manager';

// En tu componente
const cacheManager = useCacheManager();

// Precargar recursos (ahora se hace en IntelligentPreloader)
// Ya no necesitas preload manual

// Cachear datos - API unificada
await cacheManager.set('product_123', productData, 'product');

// Obtener datos
const cached = await cacheManager.get<ProductType>('product_123', 'product');

// Operaciones adicionales
const stats = await cacheManager.getStats();
await cacheManager.clear('product'); // Limpiar solo productos
await cacheManager.prune(); // Limpiar expirados
```

**Beneficios:**
- API unificada y consistente
- Cache persistente automática
- Mejor gestión de memoria (LRU)
- Estadísticas detalladas

---

## 3. Actualizar componentes que usan WebView

### ❌ Antes (Antiguo)
```typescript
import { OptimizedWebView } from '@/components/optimized-webview';

// En tu componente
<OptimizedWebView
  source={{ uri: 'https://despensallena.com' }}
  onLoadStart={() => console.log('Loading...')}
  onLoadEnd={() => console.log('Loaded!')}
/>
```

### ✅ Ahora (Nuevo)
```typescript
import { OptimizedWebView } from '@/components/optimized-webview-v2';
import { logger } from '@/utils/logger';

// En tu componente
const webViewRef = useRef<OptimizedWebViewRef>(null);

<OptimizedWebView
  ref={webViewRef}
  source={{ uri: 'https://despensallena.com' }}
  onLoadStart={() => logger.info('Loading...')}
  onLoadEnd={() => logger.info('Loaded!')}
/>

// Nuevos métodos disponibles
webViewRef.current?.reload();
await webViewRef.current?.clearCache();
```

**Nuevas características:**
- Cache persistente automático de páginas
- Scripts modulares optimizados
- Métricas de performance
- Método clearCache() disponible

---

## 4. Adaptar scripts de inyección

### ❌ Antes (Antiguo)
```typescript
// Script monolítico de 473 líneas
const injectScript = WORDPRESS_INJECTION_SCRIPT + `
  (function() {
    // Todo mezclado en un solo script gigante
    // ...
  })();
`;

webViewRef.current?.injectJavaScript(injectScript);
```

### ✅ Ahora (Nuevo)
```typescript
import {
  buildInjectionScript,
  injectScriptLazy,
  SAFE_AREA_SCRIPT,
  CLICK_INTERCEPTOR_SCRIPT,
} from '@/config/injection-scripts';

// Opción 1: Script completo (recomendado para migración)
const script = buildInjectionScript({
  safeArea: true,
  clickInterceptor: true,
  googleOAuth: true,
  wooCommerce: true,
  wordPressCleanup: true,
  pageCheck: true,
});

webViewRef.current?.injectJavaScript(script);

// Opción 2: Scripts individuales (para casos específicos)
injectScriptLazy(webViewRef, SAFE_AREA_SCRIPT, 0);
injectScriptLazy(webViewRef, CLICK_INTERCEPTOR_SCRIPT, 500);

// Opción 3: Condicional según página
const isLoginPage = url.includes('/login');
const script = buildInjectionScript({
  safeArea: true,
  googleOAuth: isLoginPage, // Solo en página de login
  wooCommerce: !isLoginPage, // Solo fuera de login
});
```

**Beneficios:**
- Scripts más pequeños y rápidos
- Inyección condicional
- Mejor mantenibilidad
- Carga diferida de scripts no críticos

---

## 5. Testing y validación

### Checklist de Migración

#### ✅ Paso 1: Backup
```bash
git add .
git commit -m "Backup antes de migración Fase 1"
git branch backup-pre-fase1
```

#### ✅ Paso 2: Instalar dependencias
```bash
npm install
# o
npx expo install
```

#### ✅ Paso 3: Actualizar imports
Buscar y reemplazar en todo el proyecto:
- `console.log` → `logger.info` (revisar contexto)
- `console.warn` → `logger.warn`
- `console.error` → `logger.error` (mantener para errores críticos)

#### ✅ Paso 4: Actualizar OptimizedWebView
```typescript
// Cambiar import
- import { OptimizedWebView } from '@/components/optimized-webview';
+ import { OptimizedWebView } from '@/components/optimized-webview-v2';
```

#### ✅ Paso 5: Probar en desarrollo
```bash
npx expo start --clear
# Presionar 'a' para Android o 'i' para iOS
```

#### ✅ Paso 6: Verificar logs
Abrir Metro bundler y verificar que aparecen los nuevos logs:
- `[Cache]` logs
- `[Network]` logs
- `[WebView]` logs
- `[Preload]` logs

#### ✅ Paso 7: Testing funcional
1. **Primera carga:** Verificar que carga normal
2. **Segunda carga:** Verificar carga desde cache (debe ser mucho más rápida)
3. **Cambio de red:** Activar/desactivar WiFi y verificar detección
4. **Modo offline:** Activar modo avión y verificar páginas cacheadas
5. **Cache hit rate:** Después de usar la app 5 minutos, verificar hit rate > 70%

#### ✅ Paso 8: Performance benchmark
```typescript
// Medir tiempo de carga
// Antes
console.time('page-load');
// ... cargar página
console.timeEnd('page-load'); // ~3000ms primera vez

// Después (con cache)
// Segunda carga debería ser < 1000ms
```

---

## 🔧 Troubleshooting de Migración

### Problema: "Module not found: utils/logger"
**Solución:** 
```bash
# Verificar que el archivo existe
ls utils/logger.ts

# Si no existe, copiarlo desde el repositorio actualizado
```

### Problema: "Cannot find name 'cacheManager'"
**Solución:**
```typescript
// Asegúrate de importar el hook
import { useCacheManager } from '@/hooks/use-cache-manager';

// Y usarlo en tu componente
const cacheManager = useCacheManager();
```

### Problema: TypeScript errors en OptimizedWebView
**Solución:**
```bash
# Limpiar caché de TypeScript
rm -rf node_modules/.cache
npx tsc --noEmit
```

### Problema: App más lenta después de migración
**Posible causa:** Cache inicial poblándose
**Solución:** Esperar 2-3 minutos de uso. La primera vez el cache se llena, luego mejora dramáticamente.

### Problema: Cache crece demasiado
**Solución:**
```typescript
// Reducir límites en use-cache-manager.ts
const DEFAULT_CONFIG: CacheConfig = {
  maxSize: 100, // Reducir de 200 a 100 MB
  maxEntries: 500, // Reducir de 1000 a 500
};
```

---

## 📊 Comparación de APIs

### Cache APIs

| Operación | Antiguo | Nuevo |
|-----------|---------|-------|
| Set | `cacheWordPressData(key, data, type)` | `cacheManager.set(key, data, type)` |
| Get | `getWordPressData(key, type)` | `cacheManager.get(key, type)` |
| Clear | `clearWordPressCache()` | `cacheManager.clear()` |
| Stats | No disponible | `cacheManager.getStats()` |
| Prune | No disponible | `cacheManager.prune()` |
| Multiple | No disponible | `cacheManager.getMultiple(keys)` |

### Logging APIs

| Operación | Antiguo | Nuevo |
|-----------|---------|-------|
| Info | `console.log()` | `logger.info()` |
| Warning | `console.warn()` | `logger.warn()` |
| Error | `console.error()` | `logger.error()` |
| Debug | `console.log()` | `logger.debug()` |
| Performance | `console.time()` | `logger.mark()` + `logger.measure()` |

---

## 🎯 Validación Final

### Checklist de Validación

- [ ] App compila sin errores
- [ ] No hay warnings de TypeScript
- [ ] Logs aparecen correctamente en desarrollo
- [ ] Logs NO aparecen en producción
- [ ] Cache persiste entre sesiones
- [ ] Detección de red funciona correctamente
- [ ] Segunda carga es significativamente más rápida
- [ ] Modo offline funciona para páginas cacheadas
- [ ] Uso de memoria es razonable (< 300 MB)
- [ ] No hay memory leaks (verificar con profiler)

### Comandos de Validación

```bash
# Verificar tipos
npx tsc --noEmit

# Verificar linting
npm run lint

# Limpiar y recompilar
npx expo start --clear

# Build de producción (verificar tamaño)
npx eas build --platform android --profile preview
```

---

## 📈 Métricas Esperadas

### Antes de la migración
- Primera carga: 3-5 segundos
- Segunda carga: 3-5 segundos (sin cache)
- Uso de CPU: Alto
- Hit rate: 0%

### Después de la migración
- Primera carga: 2-3 segundos (~40% mejor)
- Segunda carga: 0.5-1 segundos (~80% mejor)
- Uso de CPU: Medio-Bajo
- Hit rate: 70-90% después de 5 minutos de uso

---

## 🚀 Siguientes Pasos

Una vez completada la migración de Fase 1:

1. **Monitorear en producción**
   - Verificar que no hay crashes
   - Monitorear uso de memoria
   - Recolectar feedback de usuarios

2. **Optimizar configuración**
   - Ajustar TTL según patrones de uso
   - Ajustar límites de cache según dispositivos

3. **Preparar Fase 2**
   - WooCommerce optimizer
   - Optimización de imágenes
   - Validación de recursos críticos

---

## 💡 Tips y Mejores Prácticas

### 1. Logs
```typescript
// ✅ HACER: Usar logger apropiado
cacheLogger.info('Cache hit');
networkLogger.warn('Slow connection');

// ❌ EVITAR: Usar logger genérico para todo
logger.info('Cache hit'); // Funciona pero menos específico
```

### 2. Cache Keys
```typescript
// ✅ HACER: Usar keys descriptivos
cacheManager.set('page_https://despensallena.com/productos', data);
cacheManager.set('product_123', productData);

// ❌ EVITAR: Keys ambiguos
cacheManager.set('data', data);
cacheManager.set('123', productData);
```

### 3. Tipos TypeScript
```typescript
// ✅ HACER: Especificar tipos
const product = await cacheManager.get<Product>('product_123', 'product');

// ❌ EVITAR: Sin tipos
const product = await cacheManager.get('product_123');
```

### 4. Error Handling
```typescript
// ✅ HACER: Manejar errores
try {
  await cacheManager.set('key', data, 'api');
} catch (error) {
  logger.error('Failed to cache:', error);
  // Continuar sin cache
}

// ❌ EVITAR: Asumir que siempre funciona
await cacheManager.set('key', data, 'api'); // Puede fallar
```

---

## ✅ Migración Completada

Si has seguido todos los pasos:
- ✅ Código actualizado a nuevas APIs
- ✅ Tests pasando
- ✅ Mejoras de performance visibles
- ✅ Sin errores en producción

**¡Felicitaciones! Estás listo para la Fase 2.**

---

## 📞 Ayuda

Si necesitas ayuda durante la migración:
1. Revisa esta guía completamente
2. Consulta `FASE_1_OPTIMIZACIONES.md`
3. Revisa los logs de error
4. Verifica que todas las dependencias están instaladas
5. Intenta con un build limpio: `npx expo start --clear`

