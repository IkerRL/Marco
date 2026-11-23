# Marco de Cámara Interactivo para Twitch y OBS Studio 🎥✨

Marco de cámara neón interactivo para directos de Twitch en OBS Studio, con cambio de temas mediante comandos del chat de Twitch (solo para moderadores y streamer).

---

## 🎨 Temas Disponibles

1. **⚡ Tema Normal (Cyberpunk Violeta)**:
   - Resplandor neón púrpura/violeta con esquinas animadas en blanco brillante.
2. **🌴 Tema GTA VI**:
   - Borde con gradiente animado (rosa coral, atardecer, violeta y cyan), siluetas dobles de palmeras tropicales con contraluz neón y partículas flotantes.

---

## 💬 Comandos del Chat de Twitch (Solo Mods y Streamer)

| Comando | Acción |
| :--- | :--- |
| `!tema normal` | Activa el tema **Normal / Genérico** |
| `!tema gta` | Activa el tema **GTA VI** |
| `!tema auto` | Detecta automáticamente el juego en Twitch: si estás jugando a **GTA** pone el tema de GTA VI; si es cualquier otro juego o Just Chatting, pone el tema **Normal** |
| `!tema auto off` | Desactiva la detección automática de juego |

---

## ⚙️ Dónde Configurar tu Canal de Twitch

Abre el archivo [config.js](file:///c:/Users/ikerr/Desktop/vale/Marco-main/Marco-main/config.js) y cambia el valor de `channel`:

```javascript
const CONFIG = {
    // 1. AQUÍ VA EL NOMBRE DE TU CANAL DE TWITCH (en minúsculas, sin @)
    channel: "tu_canal",

    // 2. Tema por defecto al abrir el marco: "normal" o "gtavi"
    defaultTheme: "normal",

    // 3. Cada cuántos segundos comprobar el juego en Twitch en modo !tema auto
    autoIntervalSeconds: 30,

    // 4. Solo moderadores y streamer pueden usar el comando !tema
    allowEveryone: false,

    // 5. Mostrar aviso visual arriba al cambiar de tema (false = oculto)
    showNotification: false,
    notificationDurationMs: 3000
};
```

> **Alternativa sin editar archivos:** En OBS puedes añadir `?channel=tu_canal` al final de la URL (por ejemplo `index.html?channel=tu_canal` o `index.html?channel=tu_canal&auto=true`).

---

## 📺 Cómo Añadirlo a OBS Studio

1. En OBS Studio, añade una fuente de tipo **Navegador (Browser Source)**.
2. Marca **Archivo local** y selecciona [index.html](file:///c:/Users/ikerr/Desktop/vale/Marco-main/Marco-main/index.html) (o usa tu URL con `?channel=tu_canal`).
3. Ajusta el ancho y alto al tamaño de tu cámara (por ejemplo `1920x1080` o `1280x720`).
4. Marca **Actualizar el navegador cuando la escena se active**.

---

## ⌨️ Atajos de Teclado (para pruebas locales en navegador)

- Tecla **`1`**: Tema Normal
- Tecla **`2`**: Tema GTA VI
- Tecla **`A`**: Activar / desactivar modo automático según el juego de Twitch
