// ========================================================
// CONFIGURACIÓN DEL MARCO DE CÁMARA (TWITCH OVERLAY)
// ========================================================

const CONFIG = {
    // 1. AQUÍ VA EL NOMBRE DE TU CANAL DE TWITCH (en minúsculas, sin @)
    // También puedes pasarlo en OBS en la URL añadiendo ?channel=tu_canal
    channel: "makacagotica",

    // 2. Tema por defecto al abrir el marco: "normal" o "gtavi"
    defaultTheme: "normal",

    // 3. Cada cuántos segundos comprobar el juego en Twitch cuando está en modo !tema auto
    autoIntervalSeconds: 30,

    // 4. Solo moderadores y streamer pueden usar el comando !tema
    // false = solo mods y streamer | true = cualquier espectador del chat
    allowEveryone: false,

    // 5. Mostrar aviso visual arriba al cambiar de tema (false = oculto)
    showNotification: false,
    notificationDurationMs: 3000
};
