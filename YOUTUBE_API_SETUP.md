# Configuración de YouTube Data API v3 🎵

Esta guía te explica cómo obtener una **YouTube Data API key** para habilitar la búsqueda real en YouTube en QuizMind AI.

## ⚠️ Importante

**La búsqueda funcionará perfectamente SIN la API key** usando nuestra biblioteca curada de música para estudiar. Solo necesitas seguir estos pasos si quieres búsqueda real en YouTube.

## 🆓 ¿Es Gratis?

**SÍ, es gratis**, pero con limitaciones:
- **100 consultas gratuitas por día**
- Después de eso, cuesta aproximadamente $0.002 por consulta
- Para uso personal de estudio, raramente superarás el límite gratuito

## 📋 Pasos para Obtener la API Key

### 1. Ir a Google Cloud Console
- Visita: [https://console.developers.google.com/](https://console.developers.google.com/)
- Inicia sesión con tu cuenta de Google

### 2. Crear un Nuevo Proyecto
- Haz clic en "Seleccionar proyecto"
- Clic en "Nuevo proyecto"
- Nombre: "QuizMind AI Music" (o el que prefieras)
- Haz clic en "Crear"

### 3. Habilitar YouTube Data API v3
- Ve a "APIs y servicios" > "Biblioteca"
- Busca "YouTube Data API v3"
- Haz clic en el resultado
- Presiona "Habilitar"

### 4. Crear Credenciales
- Ve a "APIs y servicios" > "Credenciales"
- Haz clic en "Crear credenciales"
- Selecciona "Clave de API"
- Copia la API key generada

### 5. Configurar Restricciones (Opcional pero Recomendado)
- Haz clic en tu API key
- En "Restricciones de la aplicación":
  - Selecciona "Referentes HTTP"
  - Agrega: `file://*` (para uso local)
- En "Restricciones de la API":
  - Selecciona "Restringir clave"
  - Elige "YouTube Data API v3"
- Guarda los cambios

## 🔧 Configurar en QuizMind AI

1. Abre QuizMind AI
2. En el paso de configuración inicial
3. Pega tu YouTube API key en el campo opcional
4. ¡Listo! Ahora tendrás búsqueda real en YouTube

## 📊 Monitorear Uso

Para ver cuántas consultas has usado:
1. Ve a Google Cloud Console
2. "APIs y servicios" > "Panel"
3. Haz clic en "YouTube Data API v3"
4. Verás estadísticas de uso

## 🎯 Beneficios de la API Real

### Con YouTube API Key:
- ✅ Búsqueda real en YouTube
- ✅ Resultados actualizados
- ✅ Cualquier canción disponible
- ✅ Thumbnails reales
- ✅ Información de duración precisa

### Sin API Key (Biblioteca Curada):
- ✅ Funciona perfectamente
- ✅ Sin configuración adicional
- ✅ Sin límites de uso
- ✅ Música optimizada para estudiar
- ✅ Categorías predefinidas

## ⚡ Solución de Problemas

### Error: "Cuota agotada"
- Has superado las 100 consultas diarias
- Espera hasta mañana o configura facturación
- Usa la biblioteca curada mientras tanto

### Error: "API key inválida"
- Verifica que copiaste la key completa
- Asegúrate de que YouTube Data API v3 esté habilitado
- Revisa las restricciones de la API key

### Error: "Sin resultados"
- Intenta términos de búsqueda más generales
- La biblioteca curada siempre tiene resultados

## 💡 Consejos

1. **Usa términos específicos**: "lofi study music" en lugar de solo "music"
2. **Combina keywords**: "classical piano study focus"
3. **Biblioteca curada**: Es perfecta para la mayoría de usuarios
4. **Monitorea uso**: Revisa tu cuota periódicamente

## 🎵 Biblioteca Curada Incluye

Sin API key, tienes acceso a:
- **Lo-Fi Hip Hop**: Beats relajantes
- **Música Clásica**: Mozart, Bach, Chopin
- **Jazz Suave**: Instrumental relajante
- **Piano**: Melodías tranquilas
- **Ambient**: Atmosféricos profundos
- **Sonidos Naturales**: Lluvia, océano, bosque
- **Electronic Chill**: Synthwave, ambient techno

## 🔗 Enlaces Útiles

- [Google Cloud Console](https://console.developers.google.com/)
- [YouTube Data API Documentation](https://developers.google.com/youtube/v3)
- [Precios de YouTube API](https://developers.google.com/youtube/v3/determine_quota_cost)

---

**¿Necesitas ayuda?** La biblioteca curada funciona perfectamente para la mayoría de usuarios y no requiere configuración adicional.

**Desarrollado por:** Geronimo Facundo Moreira
- GitHub: [@xxDMONxx](https://github.com/xxDMONxx)
- LinkedIn: [moreiragf](https://www.linkedin.com/in/moreiragf/)
