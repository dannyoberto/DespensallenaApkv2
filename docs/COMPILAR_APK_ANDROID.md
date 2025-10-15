# 📱 Guía Completa: Compilar APK para Android

## 🎯 Información del Proyecto

- **Nombre de la App**: Despensa Llena
- **Package ID**: `com.dannyoberto.despensallena`
- **Versión**: 1.0.0 (versionCode: 1)
- **Color de marca**: #80b918 (verde)

---

## 🚀 MÉTODO 1: Compilar desde Terminal (Más Rápido)

### ✅ Pre-requisitos

Asegúrate de tener instalado:
- ✅ Node.js (v18 o superior)
- ✅ JDK 17 o JDK 21
- ✅ Android SDK
- ✅ Variables de entorno configuradas:
  - `ANDROID_HOME` = ruta al Android SDK
  - `JAVA_HOME` = ruta al JDK

### 📋 Pasos para Compilar

#### Paso 1: Limpiar builds anteriores (Opcional)
```bash
cd android
.\gradlew clean
cd ..
```

#### Paso 2: Compilar APK de Debug (para pruebas)
```bash
cd android
.\gradlew assembleDebug
cd ..
```

El APK se generará en:
```
android\app\build\outputs\apk\debug\app-debug.apk
```

#### Paso 3: Compilar APK de Release (para distribución)
```bash
cd android
.\gradlew assembleRelease
cd ..
```

El APK se generará en:
```
android\app\build\outputs\apk\release\app-release.apk
```

#### Paso 4: Instalar APK en dispositivo conectado
```bash
# Debug
adb install android\app\build\outputs\apk\debug\app-debug.apk

# Release
adb install android\app\build\outputs\apk\release\app-release.apk
```

---

## 🏢 MÉTODO 2: Compilar desde Android Studio

### Paso 1: Abrir el Proyecto
1. Abre **Android Studio**
2. Selecciona **File → Open**
3. Navega a la carpeta `android` de tu proyecto
4. Selecciona la carpeta `android` y presiona **OK**
5. Espera a que Gradle sincronice (puede tomar varios minutos la primera vez)

### Paso 2: Configurar el Build
1. En la barra superior, verifica que esté seleccionado:
   - **app** (módulo)
   - **release** o **debug** (variante)

### Paso 3: Compilar el APK

#### Opción A: Build → Build Bundle(s) / APK(s) → Build APK(s)
1. Ve al menú **Build**
2. Selecciona **Build Bundle(s) / APK(s)**
3. Haz clic en **Build APK(s)**
4. Espera a que termine la compilación
5. Cuando termine, aparecerá una notificación en la esquina inferior derecha
6. Haz clic en **locate** para ver el APK generado

#### Opción B: Build → Generate Signed Bundle / APK
1. Ve al menú **Build**
2. Selecciona **Generate Signed Bundle / APK**
3. Selecciona **APK** y haz clic en **Next**
4. Selecciona o crea un keystore (ver sección de firma más abajo)
5. Selecciona la variante de build (**release** o **debug**)
6. Haz clic en **Finish**

### Paso 4: Ubicar el APK
El APK se generará en una de estas rutas:

**Debug:**
```
android\app\build\outputs\apk\debug\app-debug.apk
```

**Release:**
```
android\app\build\outputs\apk\release\app-release.apk
```

---

## 🔐 Configurar Firma de Release (IMPORTANTE para producción)

### ⚠️ Actualmente usando Debug Keystore

Tu `build.gradle` está configurado para usar el keystore de debug incluso en release:
```gradle
release {
    signingConfig signingConfigs.debug  // ← Esto debe cambiar para producción
}
```

### 📝 Crear tu propio Keystore para Producción

#### Paso 1: Generar Keystore
```bash
keytool -genkeypair -v -storetype PKCS12 -keystore despensallena-release.keystore -alias despensallena -keyalg RSA -keysize 2048 -validity 10000
```

Te pedirá:
- **Password del keystore**: Guárdalo en un lugar seguro
- **Nombre y apellido**: DespensaLlena o tu nombre
- **Unidad organizativa**: Tu empresa
- **Organización**: Tu empresa
- **Ciudad**: Tu ciudad
- **Estado**: Tu estado
- **Código de país**: MX (México) o tu país

#### Paso 2: Guardar el Keystore
Mueve el archivo generado a:
```
android\app\despensallena-release.keystore
```

#### Paso 3: Crear archivo de propiedades de firma
Crea un archivo: `android\keystore.properties`

```properties
storePassword=TU_PASSWORD_AQUI
keyPassword=TU_PASSWORD_AQUI
keyAlias=despensallena
storeFile=despensallena-release.keystore
```

**⚠️ IMPORTANTE:** Agrega este archivo al `.gitignore` para no subir tus contraseñas:
```
# En tu archivo .gitignore
android/keystore.properties
android/app/*.keystore
```

#### Paso 4: Modificar build.gradle
Edita `android\app\build.gradle`:

```gradle
android {
    // ... código existente ...

    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            // Cargar propiedades desde archivo
            def keystorePropertiesFile = rootProject.file("keystore.properties")
            def keystoreProperties = new Properties()
            
            if (keystorePropertiesFile.exists()) {
                keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
                
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
    }
    
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            signingConfig signingConfigs.release  // ← Cambiado de .debug a .release
            minifyEnabled enableMinifyInReleaseBuilds
            proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
            shrinkResources enableShrinkResources.toBoolean()
            crunchPngs enablePngCrunchInRelease.toBoolean()
        }
    }
}
```

---

## 🎨 Verificar Iconos y Splash Screen

Antes de compilar, verifica que tus assets estén correctos:

### Iconos de la App
```
assets\images\icon.png              (1024x1024)
assets\images\android-icon-foreground.png
assets\images\android-icon-background.png
```

### Splash Screen
```
assets\images\splash-icon.png
```

### Configuración en app.json
```json
{
  "expo": {
    "icon": "./assets/images/icon.png",
    "splash": {
      "image": "./assets/images/splash-icon.png",
      "backgroundColor": "#80b918"
    },
    "android": {
      "icon": "./assets/images/icon.png",
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/android-icon-foreground.png",
        "backgroundImage": "./assets/images/android-icon-background.png",
        "backgroundColor": "#80b918"
      }
    }
  }
}
```

---

## 📊 Optimizaciones para Producción

### En gradle.properties
```properties
# Optimizaciones recomendadas
android.enableMinifyInReleaseBuilds=true
android.enableShrinkResourcesInReleaseBuilds=true
android.enablePngCrunchInReleaseBuilds=true

# Arquitecturas (incluir solo las necesarias)
reactNativeArchitectures=armeabi-v7a,arm64-v8a
```

### Reducir tamaño del APK
Si solo necesitas 64-bit:
```properties
reactNativeArchitectures=arm64-v8a
```

---

## 🐛 Solución de Problemas Comunes

### Error: "SDK location not found"
**Solución**: Crea `android\local.properties`:
```properties
sdk.dir=C\:\\Users\\TU_USUARIO\\AppData\\Local\\Android\\Sdk
```

### Error: "JAVA_HOME is not set"
**Solución**: Configura la variable de entorno:
```bash
# Windows PowerShell
$env:JAVA_HOME = "C:\Program Files\Java\jdk-17"

# Windows CMD
set JAVA_HOME=C:\Program Files\Java\jdk-17
```

### Error: "Execution failed for task ':app:mergeReleaseResources'"
**Solución**: Limpia el proyecto:
```bash
cd android
.\gradlew clean
.\gradlew assembleRelease
```

### Error: "Unable to make field private final java.lang.String java.io.File.path accessible"
**Solución**: Verifica que estás usando JDK 17 o JDK 21 (no JDK 8 o 11)

### Build muy lento
**Solución**: Aumenta memoria de Gradle en `gradle.properties`:
```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m
```

---

## 📦 Ubicaciones de APK Generados

### Debug APK
```
android\app\build\outputs\apk\debug\app-debug.apk
Tamaño aproximado: ~60-80 MB
```

### Release APK
```
android\app\build\outputs\apk\release\app-release.apk
Tamaño aproximado: ~30-50 MB (con minify y shrink)
```

### AAB (Android App Bundle) - Para Google Play Store
```bash
cd android
.\gradlew bundleRelease
```
Genera:
```
android\app\build\outputs\bundle\release\app-release.aab
```

---

## 🚀 Probar el APK

### Método 1: Instalar directamente con ADB
```bash
adb install android\app\build\outputs\apk\release\app-release.apk
```

### Método 2: Copiar al teléfono
1. Copia el APK a tu teléfono vía USB o email
2. Habilita "Instalar apps desconocidas" en configuración
3. Abre el APK desde el explorador de archivos
4. Toca "Instalar"

---

## 📝 Checklist Pre-Distribución

Antes de distribuir tu APK:

- [ ] Cambiar de debug keystore a release keystore
- [ ] Actualizar versionCode y versionName en build.gradle
- [ ] Verificar que los iconos se ven bien
- [ ] Probar el splash screen
- [ ] Verificar que el color verde (#80b918) está en todos lados
- [ ] Probar el botón Back del Android
- [ ] Probar los botones Home y Atrás del footer
- [ ] Probar navegación sin internet
- [ ] Verificar que no haya console.logs en producción
- [ ] Probar en diferentes tamaños de pantalla
- [ ] Verificar permisos de internet en AndroidManifest.xml

---

## 🎯 Resumen de Comandos Rápidos

```bash
# Limpiar
cd android && .\gradlew clean && cd ..

# Debug APK
cd android && .\gradlew assembleDebug && cd ..

# Release APK
cd android && .\gradlew assembleRelease && cd ..

# Release AAB (Google Play)
cd android && .\gradlew bundleRelease && cd ..

# Instalar en dispositivo
adb install android\app\build\outputs\apk\release\app-release.apk

# Ver dispositivos conectados
adb devices

# Ver logs en tiempo real
adb logcat *:E
```

---

## 📞 Información Adicional

### Aumentar Versión para Nueva Release

Edita `android\app\build.gradle`:
```gradle
defaultConfig {
    versionCode 2          // ← Incrementar siempre
    versionName "1.0.1"    // ← Versión visible para usuarios
}
```

### Iconos Personalizados

Si necesitas regenerar los iconos con diferentes tamaños, usa:
```bash
npx expo prebuild --platform android
```

---

**📅 Fecha de creación**: Octubre 2025
**🔖 Versión del documento**: 1.0
**✨ Proyecto**: DespensaLlena APK v3

