// ========================================================
// TWITCH IRC WEBSOCKET & TEMA CONTROLLER
// ========================================================

(function () {
    'use strict';

    // 1. Obtener parámetros de URL (sobrescriben config.js)
    const urlParams = new URLSearchParams(window.location.search);
    const cfg = window.CONFIG || {};

    const channel = (urlParams.get('channel') || urlParams.get('canal') || cfg.channel || 'makacagotica')
        .toLowerCase()
        .replace(/^#/, '')
        .trim();

    let currentTheme = (urlParams.get('theme') || urlParams.get('tema') || cfg.defaultTheme || 'normal').toLowerCase();
    if (currentTheme !== 'normal' && currentTheme !== 'gtavi') {
        currentTheme = 'normal';
    }

    const autoIntervalSec = parseInt(urlParams.get('interval') || urlParams.get('intervalo') || cfg.autoIntervalSeconds || 30, 10);
    const allowEveryone = cfg.allowEveryone !== undefined ? cfg.allowEveryone : false;
    const showNotification = urlParams.get('notify') === 'true' || (cfg.showNotification === true);
    const notificationDurationMs = cfg.notificationDurationMs || 3000;

    const toastElement = document.getElementById('theme-toast');
    let toastTimeout = null;
    let autoIntervalId = null;
    let isAutoMode = urlParams.get('auto') === 'true';

    // 2. Control visual de temas
    function showToast(message) {
        if (!showNotification || !toastElement) return;
        toastElement.textContent = message;
        toastElement.classList.add('visible');

        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toastElement.classList.remove('visible');
        }, notificationDurationMs);
    }

    function applyTheme(theme, notify = true, customMessage = null) {
        const targetTheme = theme === 'gtavi' ? 'gtavi' : 'normal';

        // Evita reiniciar animaciones si ya está activo ese tema
        if (document.body.classList.contains(`theme-${targetTheme}`)) {
            currentTheme = targetTheme;
            return;
        }

        document.body.classList.remove('theme-normal', 'theme-gtavi');
        document.body.classList.add(`theme-${targetTheme}`);
        currentTheme = targetTheme;

        if (notify) {
            const defaultMsg = targetTheme === 'gtavi' ? '🌴 TEMA: GTA VI' : '⚡ TEMA: NORMAL';
            showToast(customMessage || defaultMsg);
        }
    }

    function toggleTheme(notify = true) {
        const nextTheme = currentTheme === 'normal' ? 'gtavi' : 'normal';
        applyTheme(nextTheme, notify);
    }

    // 3. Detección automática del juego en Twitch (!tema auto)
    function isGtaGame(gameName) {
        if (!gameName) return false;
        return /grand theft auto|\bgta\b/i.test(gameName);
    }

    async function checkTwitchGameAndApplyTheme() {
        if (!channel || typeof fetch !== 'function') return;

        try {
            const url = `https://decapi.me/twitch/game/${encodeURIComponent(channel)}?_=${Date.now()}`;
            const response = await fetch(url, { cache: 'no-store' });
            if (!response.ok) return;

            const game = (await response.text()).trim();
            if (!game || /not found|error/i.test(game)) return;

            const targetTheme = isGtaGame(game) ? 'gtavi' : 'normal';
            console.log(`[Twitch Auto] Juego detectado en #${channel}: "${game}" -> Tema: ${targetTheme}`);
            applyTheme(targetTheme, false);
        } catch (err) {
            console.warn('[Twitch Auto] No se pudo consultar la categoría actual:', err);
        }
    }

    function startAutoMode(notify = true) {
        if (autoIntervalId) clearInterval(autoIntervalId);
        isAutoMode = true;
        if (notify) showToast(`🔄 AUTO ACTIVADO`);

        checkTwitchGameAndApplyTheme();
        autoIntervalId = setInterval(() => {
            checkTwitchGameAndApplyTheme();
        }, autoIntervalSec * 1000);
    }

    function stopAutoMode(notify = true) {
        if (autoIntervalId) {
            clearInterval(autoIntervalId);
            autoIntervalId = null;
        }
        isAutoMode = false;
        if (notify) showToast('⏸️ AUTO DESACTIVADO');
    }

    function toggleAutoMode() {
        if (isAutoMode) {
            stopAutoMode(true);
        } else {
            startAutoMode(true);
        }
    }

    // Inicializar tema inicial
    document.body.classList.remove('theme-normal', 'theme-gtavi');
    document.body.classList.add(`theme-${currentTheme}`);
    if (isAutoMode) {
        startAutoMode(false);
    }

    // 4. Procesador de Comandos de Twitch
    function handleTwitchCommand(commandText, sender, tags) {
        const parts = commandText.trim().split(/\s+/);
        const mainCmd = parts[0].toLowerCase();
        const arg = (parts[1] || '').toLowerCase();

        if (mainCmd !== '!tema') return;

        // Comprobación de permisos: solo mods y streamer si allowEveryone es false
        if (!allowEveryone) {
            const isMod = tags['mod'] === '1' || (tags['badges'] && tags['badges'].includes('moderator'));
            const isBroadcaster = tags['badges'] && tags['badges'].includes('broadcaster');
            if (!isMod && !isBroadcaster) {
                console.log(`[Twitch] Comando !tema ignorado de @${sender} (solo mods/streamer)`);
                return;
            }
        }

        console.log(`[Twitch] Comando recibido de @${sender}: ${commandText}`);

        if (arg === 'auto') {
            const subArg = (parts[2] || '').toLowerCase();
            if (subArg === 'off' || subArg === 'stop' || subArg === 'no') {
                stopAutoMode(true);
            } else {
                startAutoMode(true);
            }
            return;
        }

        if (arg === 'normal' || arg === 'generico' || arg === 'genérico' || arg === 'base' || arg === 'default') {
            if (isAutoMode) stopAutoMode(false);
            applyTheme('normal', true, `⚡ TEMA: NORMAL (@${sender})`);
            return;
        }

        if (arg === 'gta' || arg === 'gtavi' || arg === 'gta6') {
            if (isAutoMode) stopAutoMode(false);
            applyTheme('gtavi', true, `🌴 TEMA: GTA VI (@${sender})`);
            return;
        }
    }

    // 5. Parser de Mensajes IRC de Twitch
    function parseIrcMessage(raw) {
        let tags = {};
        let line = raw;

        if (line.startsWith('@')) {
            const spaceIndex = line.indexOf(' ');
            const tagString = line.slice(1, spaceIndex);
            line = line.slice(spaceIndex + 1);

            const tagPairs = tagString.split(';');
            for (const pair of tagPairs) {
                const [key, value] = pair.split('=');
                tags[key] = value;
            }
        }

        if (line.startsWith(':')) {
            const spaceIndex = line.indexOf(' ');
            const prefix = line.slice(1, spaceIndex);
            line = line.slice(spaceIndex + 1);

            const commandMatch = line.match(/^(\S+)\s+#?(\S+)(?:\s+:(.*))?$/);
            if (commandMatch) {
                const command = commandMatch[1];
                const target = commandMatch[2];
                const message = commandMatch[3] || '';
                const sender = prefix.split('!')[0];

                return { tags, prefix, command, target, message, sender };
            }
        }

        return null;
    }

    // 6. Conexión WebSocket a Twitch Chat (Nativa, sin librerías externas)
    let ws = null;
    let reconnectTimeout = null;

    function connectToTwitch() {
        if (!channel) {
            console.warn('[Twitch] No se ha configurado ningún canal en config.js o URL (?channel=tu_canal)');
            return;
        }

        console.log(`[Twitch] Conectando al chat de #${channel}...`);

        try {
            ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
        } catch (err) {
            console.error('[Twitch] Error creando WebSocket:', err);
            scheduleReconnect();
            return;
        }

        ws.onopen = function () {
            console.log(`[Twitch] Conexión abierta con éxito. Autenticando espectador anónimo...`);
            ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
            ws.send('PASS SCHMOOPIIE');
            const randomId = Math.floor(10000 + Math.random() * 90000);
            ws.send(`NICK justinfan${randomId}`);
            ws.send(`JOIN #${channel}`);
        };

        ws.onmessage = function (event) {
            const lines = event.data.split('\r\n');
            for (const line of lines) {
                if (!line) continue;

                // Responder a PING de Twitch para mantener viva la conexión
                if (line.startsWith('PING')) {
                    ws.send('PONG :tmi.twitch.tv');
                    continue;
                }

                const parsed = parseIrcMessage(line);
                if (parsed && parsed.command === 'PRIVMSG') {
                    const text = parsed.message.trim();
                    if (text.startsWith('!tema')) {
                        handleTwitchCommand(text, parsed.sender, parsed.tags);
                    }
                } else if (parsed && parsed.command === 'JOIN') {
                    console.log(`[Twitch] Unido correctamente al canal #${channel}`);
                }
            }
        };

        ws.onclose = function () {
            console.warn('[Twitch] Conexión cerrada. Reconectando en 5 segundos...');
            scheduleReconnect();
        };

        ws.onerror = function (err) {
            console.error('[Twitch] Error de conexión:', err);
            ws.close();
        };
    }

    function scheduleReconnect() {
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(() => {
            connectToTwitch();
        }, 5000);
    }

    // Iniciar conexión
    connectToTwitch();

    // 7. Atajos de teclado para pruebas locales en navegador (sin Espacio)
    window.addEventListener('keydown', (e) => {
        if (e.key === '1') applyTheme('normal', true, '⚡ TEMA: NORMAL (Manual)');
        if (e.key === '2') applyTheme('gtavi', true, '🌴 TEMA: GTA VI (Manual)');
        if (e.key === 'a' || e.key === 'A') toggleAutoMode();
    });

    // Exponer API en ventana para pruebas desde consola
    window.CameraFrame = {
        setTheme: applyTheme,
        toggleTheme: toggleTheme,
        startAuto: startAutoMode,
        stopAuto: stopAutoMode,
        toggleAuto: toggleAutoMode,
        checkGame: checkTwitchGameAndApplyTheme,
        getCurrentTheme: () => currentTheme,
        isAuto: () => isAutoMode
    };
})();
