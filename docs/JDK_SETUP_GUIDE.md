# Guía de Configuración del JDK para Android

## Problema
Error al ejecutar `npx expo run:android`:
```
No Java compiler found, please ensure you are running Gradle with a JDK
```

## Solución

### 1. Instalar JDK 17 (Eclipse Temurin)

1. Descarga JDK 17 desde: https://adoptium.net/
2. Selecciona:
   - Version: **17 - LTS**
   - Operating System: **Windows**
   - Architecture: **x64**
3. Descarga el instalador MSI
4. Durante la instalación:
   - ✅ Marca: "Set JAVA_HOME variable"
   - ✅ Marca: "Add to PATH"

### 2. Configurar Variables de Entorno Manualmente (si es necesario)

Si la instalación no configuró JAVA_HOME automáticamente:

**En PowerShell (temporal para esta sesión):**
```powershell
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.x.x-hotspot"
$env:PATH += ";$env:JAVA_HOME\bin"
```

**En Windows (permanente):**
1. Busca "Variables de entorno" en el menú inicio
2. Click en "Variables de entorno"
3. En "Variables del sistema", click "Nueva":
   - Nombre: `JAVA_HOME`
   - Valor: `C:\Program Files\Eclipse Adoptium\jdk-17.0.x.x-hotspot`
4. Edita la variable `Path` y agrega: `%JAVA_HOME%\bin`
5. **Reinicia el terminal**

### 3. Verificar la Instalación

```powershell
# Verificar versión de Java
java -version

# Debería mostrar algo como:
# openjdk version "17.0.x" 2024-xx-xx

# Verificar JAVA_HOME
echo $env:JAVA_HOME

# Verificar compilador de Java
javac -version
```

### 4. Probar la Build de Android

```bash
npx expo run:android
```

## Alternativas Rápidas (Sin configurar JDK)

### Opción 1: Usar Expo Go (Más Rápido)
```bash
npx expo start
```
Escanea el QR con la app Expo Go en tu dispositivo.

**Nota:** El splash screen nativo no se verá en Expo Go, solo el de Expo por defecto.

### Opción 2: Usar EAS Build (Sin necesidad de JDK local)
```bash
# Instalar EAS CLI
npm install -g eas-cli

# Login
eas login

# Build de desarrollo
eas build --platform android --profile preview
```

Esto compila en la nube, sin necesidad de configurar Android Studio ni JDK.

## Requisitos Completos para React Native

Para desarrollo Android completo, necesitas:

1. **JDK 17** ✅ (esta guía)
2. **Android Studio** (incluye Android SDK)
3. **Variables de entorno:**
   - `JAVA_HOME`
   - `ANDROID_HOME`
   - `PATH` actualizado

Para una guía completa de Android Studio:
https://reactnative.dev/docs/environment-setup

## Verificar Todo Está Configurado

```powershell
# Java
java -version
javac -version
echo $env:JAVA_HOME

# Android SDK (si está instalado)
echo $env:ANDROID_HOME
adb version
```


