# 🔗 Configuración de Excepciones de URL

## 📋 **Descripción**

Este documento describe la configuración de dominios permitidos para que se abran dentro del WebView en lugar de abrir el navegador externo.

## 🎯 **Propósito**

- **Métricas de seguimiento**: Los URLs acortados como `tify.cc` (Cutt.ly) necesitan abrirse dentro del WebView para mantener las métricas de clics
- **Experiencia de usuario**: Evitar interrupciones al usuario abriendo enlaces externos
- **Funcionalidad completa**: Permitir OAuth, pagos y redes sociales dentro de la app

## 📁 **Archivos de Configuración**

### `config/allowed-domains.ts`
Configuración centralizada de todos los dominios permitidos.

## 🌐 **Categorías de Dominios**

### 1. **Dominio Principal**
- `despensallena.com` - Sitio principal

### 2. **Google OAuth**
- `google.com`
- `googleapis.com`
- `gstatic.com`
- `accounts.google.com`

### 3. **URLs Acortados (Métricas)**
- `tify.cc` - Cutt.ly custom domain ⭐
- `cutt.ly` - Cutt.ly main domain
- `bit.ly` - Bitly
- `tinyurl.com` - TinyURL
- `short.link` - Short.link
- `is.gd` - Is.gd
- `v.gd` - V.gd
- `ow.ly` - Hootsuite
- `goo.gl` - Google URL Shortener
- `rebrand.ly` - Rebrandly
- `buff.ly` - Buffer
- `fb.me` - Facebook
- `t.co` - Twitter
- `lnkd.in` - LinkedIn
- `amzn.to` - Amazon

### 4. **Pagos y Checkout**
- `paypal.com`
- `stripe.com`
- `mercadopago.com`
- `squareup.com`
- `razorpay.com`

### 5. **Redes Sociales**
- `facebook.com`
- `instagram.com`
- `twitter.com`
- `linkedin.com`
- `youtube.com`
- `tiktok.com`

## 🔧 **Funciones Disponibles**

### `isUrlAllowed(url: string): boolean`
Verifica si una URL está permitida para abrir dentro del WebView.

```typescript
import { isUrlAllowed } from '@/config/allowed-domains';

const allowed = isUrlAllowed('https://tify.cc/abc123');
console.log(allowed); // true
```

### `getDomainCategory(url: string): string`
Obtiene la categoría de un dominio permitido.

```typescript
import { getDomainCategory } from '@/config/allowed-domains';

const category = getDomainCategory('https://tify.cc/abc123');
console.log(category); // 'short-url'
```

### `logDomainAccess(url: string, category: string): void`
Registra el acceso a dominios para analytics (solo en desarrollo).

## 📊 **Logs de Seguimiento**

### URLs Acortados
```
🔗 Short URL accessed: https://tify.cc/abc123 (category: short-url)
```

### Otros Dominios
```
🌐 Domain access: google-oauth - https://accounts.google.com/oauth
🌐 Domain access: payment - https://paypal.com/checkout
```

## ⚙️ **Configuración en WebView**

El WebView utiliza `onShouldStartLoadWithRequest` para interceptar navegación:

```typescript
onShouldStartLoadWithRequest: (request: any) => {
  const url = request.url;
  
  // Handle Google OAuth URLs
  if (googleOAuth.handleGoogleOAuthUrl(url)) {
    return true;
  }
  
  // Check if URL is allowed using centralized configuration
  const isAllowed = isUrlAllowed(url);
  
  if (isAllowed) {
    const category = getDomainCategory(url);
    logDomainAccess(url, category);
    
    // Log short URL access for metrics tracking
    if (category === 'short-url') {
      webviewLogger.info(`🔗 Short URL accessed: ${url} (category: ${category})`);
    }
  }
  
  return isAllowed;
}
```

## 🚀 **Beneficios**

### ✅ **Para Métricas**
- Los clics en URLs acortados se registran correctamente
- No se pierden datos de analytics
- Seguimiento completo del tráfico

### ✅ **Para UX**
- Navegación fluida sin interrupciones
- No se abre el navegador externo innecesariamente
- Experiencia consistente dentro de la app

### ✅ **Para Funcionalidad**
- OAuth funciona correctamente
- Pagos se procesan sin problemas
- Redes sociales se integran bien

## 🔄 **Agregar Nuevos Dominios**

Para agregar un nuevo dominio permitido:

1. **Editar `config/allowed-domains.ts`**
2. **Agregar a la categoría apropiada**
3. **Actualizar `ALL_ALLOWED_DOMAINS`**
4. **Probar la funcionalidad**

### Ejemplo:
```typescript
// Agregar nuevo servicio de acortamiento
export const SHORT_URL_DOMAINS = [
  'tify.cc',
  'cutt.ly',
  'newshortener.com', // ← Nuevo dominio
  // ... otros dominios
];
```

## 🧪 **Testing**

### Probar URLs Acortados:
```bash
# En la consola de desarrollo
🔗 Short URL accessed: https://tify.cc/abc123 (category: short-url)
```

### Verificar Logs:
```bash
# Metro Bundler logs
[WebView] 🔗 Short URL accessed: https://tify.cc/abc123 (category: short-url)
```

## 📈 **Métricas Esperadas**

Con esta configuración, deberías ver:
- ✅ URLs acortados abriendo dentro del WebView
- ✅ Logs de acceso a URLs acortados
- ✅ Métricas de clics preservadas
- ✅ Navegación fluida sin interrupciones

---

**Última actualización:** Octubre 2024  
**Versión:** 1.0  
**Estado:** ✅ Implementado
