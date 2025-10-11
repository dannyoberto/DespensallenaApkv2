# Sistema de Feedback de Carga Instantáneo

## Problema Identificado

Anteriormente, el spinner de carga aparecía con un retraso notable (varios segundos) después de que el usuario hacía clic en un enlace o producto. Esto se debía a que el spinner se activaba con el evento `onLoadStart` de la WebView, que se dispara cuando la navegación **ya está en proceso**, no cuando el usuario hace clic.

### Flujo Anterior:
1. Usuario hace clic en un enlace → **(Delay de 1-3 segundos sin feedback)**
2. WebView comienza la navegación
3. `onLoadStart` se dispara
4. Spinner aparece

## Solución Implementada

Se implementó un sistema de interceptación de clics mediante JavaScript inyectado que detecta el clic **inmediatamente** y muestra el spinner antes de que la navegación comience.

### Flujo Nuevo:
1. Usuario hace clic en un enlace → **Spinner aparece instantáneamente (0ms)**
2. JavaScript envía mensaje a React Native
3. Spinner se muestra inmediatamente
4. WebView comienza la navegación
5. `onLoadStart` confirma la navegación
6. Página carga
7. `onLoadEnd` oculta el spinner

## Características

### 1. Interceptación Universal de Clics
- **Enlaces estándar** (`<a href="...">`)
- **Enlaces de productos** (`.product a`, `.woocommerce-loop-product__link`)
- **Botones de WooCommerce**:
  - Añadir al carrito (`button[name="add-to-cart"]`)
  - Botón de compra individual (`.single_add_to_cart_button`)
  - Botón de checkout (`.checkout-button`)
  - Botones de producto simple/variable

### 2. Filtrado Inteligente
El sistema **NO** muestra spinner para:
- Enlaces ancla (`#`)
- Enlaces JavaScript (`javascript:`)
- Enlaces externos con `target="_blank"`
- Enlaces de email (`mailto:`)
- Enlaces de teléfono (`tel:`)
- **Enlaces de autenticación de Google** (Google tiene sus propios indicadores de progreso)

### 3. Detección Dinámica
- Usa `MutationObserver` para detectar nuevos enlaces agregados dinámicamente
- Se actualiza automáticamente cuando el DOM cambia
- Compatible con contenido cargado vía AJAX/JavaScript

### 4. Fase de Captura
Los eventos se capturan en la fase de captura (`capture: true`) para garantizar que se detecten antes que otros event listeners de la página.

## Implementación Técnica

### JavaScript Inyectado
```javascript
function setupClickInterceptors() {
  // Detectar clics en enlaces
  var links = document.querySelectorAll('a[href]');
  links.forEach(function(link) {
    link.addEventListener('click', function(e) {
      // Enviar mensaje a React Native inmediatamente
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'link_clicked',
        url: href,
        timestamp: Date.now()
      }));
    }, true); // Fase de captura
  });
}
```

### Manejador en React Native
```typescript
const handleMessage = useCallback((event: WebViewMessageEvent) => {
  const data = JSON.parse(event.nativeEvent.data);
  
  if (data.type === 'link_clicked') {
    // Mostrar spinner inmediatamente
    setLoading(true);
    setShowProgress(true);
    setProgress(0);
  }
}, []);
```

## Beneficios

### 1. **Experiencia de Usuario Mejorada**
- Feedback visual instantáneo (0ms de delay)
- Los usuarios saben inmediatamente que su acción fue detectada
- Reduce la percepción de lentitud de la app

### 2. **Navegación Más Fluida**
- No más "¿hice clic?" o doble-clics por impaciencia
- Confianza en que la app está respondiendo

### 3. **Compatible con WooCommerce**
- Funciona con todos los elementos de ecommerce
- Detección de productos, carritos, checkout, etc.

### 4. **Sin Impacto en Rendimiento**
- Los event listeners son ligeros
- Se reutilizan para elementos dinámicos
- No interfiere con la funcionalidad existente

## Casos de Uso

### Navegación de Productos
```
Usuario hace clic en producto → Spinner aparece → Página de producto carga
```

### Añadir al Carrito
```
Usuario hace clic en "Añadir al carrito" → Spinner aparece → Actualización de carrito
```

### Checkout
```
Usuario hace clic en "Finalizar compra" → Spinner aparece → Página de checkout carga
```

### Navegación General
```
Usuario hace clic en menú → Spinner aparece → Página carga
```

## Archivos Modificados

- `components/optimized-webview.tsx`:
  - Agregado interceptor de clics en JavaScript inyectado
  - Agregado manejador `link_clicked` en `handleMessage`
  - Detección automática de elementos de WooCommerce

## Compatibilidad

- ✅ WordPress
- ✅ WooCommerce
- ✅ Contenido dinámico (AJAX)
- ✅ Single Page Applications (SPA)
- ✅ Google OAuth (excluido intencionalmente)

## Mantenimiento

El sistema es auto-contenido y no requiere configuración adicional. Se mantiene automáticamente mediante:
- MutationObserver para nuevos elementos
- Event listeners que se auto-registran
- Filtrado inteligente de URLs

## Notas Técnicas

- Los event listeners usan la fase de **captura** para garantizar detección temprana
- Se usa `dataset.hasClickListener` para evitar duplicación de listeners
- El sistema respeta la navegación nativa de Google OAuth
- Compatible con safe areas y navegación móvil

