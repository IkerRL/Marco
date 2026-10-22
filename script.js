/**
 * Camera Frame Spotify Dynamic Overlay
 * Supports:
 * 1. Spotify Web API (OAuth PKCE with automatic token refresh)
 * 2. Interactive Demo Mode for testing & streaming preview
 */

// ==========================================
// 1. CONFIGURACIÓN Y ESTADO
// ==========================================

const SPOTIFY_SCOPES = [
    'user-read-currently-playing',
    'user-read-playback-state'
].join(' ');

// Pistas para el modo Demostración
const DEMO_PLAYLIST = [
    {
        title: "Blinding Lights",
        artist: "The Weeknd",
        cover: "demo_cover.jpg",
        durationMs: 200000 // 3:20
    },
    {
        title: "Midnight City",
        artist: "M83",
        cover: "demo_cover.jpg",
        durationMs: 243000 // 4:03
    },
    {
        title: "Nightcall",
        artist: "Kavinsky",
        cover: "demo_cover.jpg",
        durationMs: 259000 // 4:19
    }
];

let appState = {
    isDemo: true,
    isPlaying: true,
    currentTrack: null,
    progressMs: 38000,
    durationMs: 204000,
    lastUpdateTimestamp: Date.now(),
    demoIndex: 0,
    pollTimer: null,
    progressTicker: null
};

// ==========================================
// 2. REFERENCIAS AL DOM
// ==========================================

const dom = {
    dropdown: document.getElementById('spotify-dropdown'),
    art: document.getElementById('spotify-art'),
    title: document.getElementById('spotify-title'),
    artist: document.getElementById('spotify-artist'),
    timeCurrent: document.getElementById('spotify-time-current'),
    timeTotal: document.getElementById('spotify-time-total'),
    progressBar: document.getElementById('spotify-progress-bar'),
    statusText: document.getElementById('spotify-status-text'),
    equalizer: document.getElementById('spotify-equalizer'),

    // HUD
    streamerHud: document.getElementById('streamer-hud'),
    hudToggleBtn: document.getElementById('hud-toggle-btn'),
    hudPanel: document.getElementById('hud-panel'),
    hudCloseBtn: document.getElementById('hud-close-btn'),
    btnToggleDemo: document.getElementById('btn-toggle-demo'),
    btnTogglePlayback: document.getElementById('btn-toggle-playback'),
    btnNextTrack: document.getElementById('btn-next-track'),
    btnOpenConfig: document.getElementById('btn-open-config'),

    // Modal
    spotifyModal: document.getElementById('spotify-modal'),
    modalCloseBtn: document.getElementById('modal-close-btn'),
    redirectUriDisplay: document.getElementById('redirect-uri-display'),
    btnCopyUri: document.getElementById('btn-copy-uri'),
    clientIdInput: document.getElementById('client-id-input'),
    btnSaveClientId: document.getElementById('btn-save-client-id'),
    connectionStatusPill: document.getElementById('connection-status-pill'),
    connectionStatusText: document.getElementById('connection-status-text'),
    btnSpotifyLogin: document.getElementById('btn-spotify-login'),
    btnSpotifyDisconnect: document.getElementById('btn-spotify-disconnect'),
    toast: document.getElementById('hud-toast')
};

// ==========================================
// 3. UTILIDADES
// ==========================================

// Formatear milisegundos a m:ss
function formatTime(ms) {
    if (!ms || isNaN(ms) || ms < 0) return "0:00";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

// Obtener URI de redirección actual limpio (sin hash o queries)
function getRedirectUri() {
    return window.location.origin + window.location.pathname;
}

// Generar cadena aleatoria para PKCE
function generateRandomString(length) {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let text = '';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

// SHA-256 para PKCE
async function sha256(plain) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return window.crypto.subtle.digest('SHA-256', data);
}

// Base64URL encode
function base64UrlEncode(str) {
    return btoa(String.fromCharCode.apply(null, new Uint8Array(str)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

// ==========================================
// 4. ACTUALIZACIÓN VISUAL DEL WIDGET
// ==========================================

function updateWidgetView(track, isPlaying, progressMs, durationMs) {
    if (!track) return;

    // Actualizar portada si cambió
    if (dom.art.src !== track.cover && !dom.art.src.endsWith(track.cover)) {
        dom.art.src = track.cover;
    }

    // Actualizar texto
    if (dom.title.textContent !== track.title) {
        dom.title.textContent = track.title;
    }
    if (dom.artist.textContent !== track.artist) {
        dom.artist.textContent = track.artist;
    }

    // Actualizar tiempos y barra
    dom.timeCurrent.textContent = formatTime(progressMs);
    dom.timeTotal.textContent = formatTime(durationMs);

    const percent = durationMs > 0 ? Math.min(100, Math.max(0, (progressMs / durationMs) * 100)) : 0;
    dom.progressBar.style.width = `${percent}%`;

    // Si está sonando: mostrar desplegable
    if (isPlaying) {
        dom.dropdown.classList.add('is-active');
        dom.dropdown.classList.remove('is-paused');
        dom.statusText.textContent = 'REPRODUCIENDO';
    } else {
        // Si no está sonando, replegar el desplegable hacia arriba
        dom.dropdown.classList.remove('is-active');
        dom.dropdown.classList.add('is-paused');
        dom.statusText.textContent = 'EN PAUSA';
    }
}

// Ticker de alta frecuencia para barra fluida
function startProgressTicker() {
    if (appState.progressTicker) clearInterval(appState.progressTicker);

    appState.progressTicker = setInterval(() => {
        if (!appState.isPlaying) return;

        const now = Date.now();
        const delta = now - appState.lastUpdateTimestamp;
        appState.lastUpdateTimestamp = now;

        appState.progressMs += delta;

        // Si es demo y supera la duración, reiniciar o pasar a la siguiente
        if (appState.isDemo && appState.progressMs >= appState.durationMs) {
            nextDemoTrack();
            return;
        }

        const percent = appState.durationMs > 0 ? Math.min(100, (appState.progressMs / appState.durationMs) * 100) : 0;
        dom.progressBar.style.width = `${percent}%`;
        dom.timeCurrent.textContent = formatTime(appState.progressMs);
    }, 250);
}

// ==========================================
// 5. MODO DEMO
// ==========================================

function initDemoMode() {
    appState.isDemo = true;
    appState.demoIndex = 0;
    loadDemoTrack(appState.demoIndex);
    startProgressTicker();
    updateConnectionStatusUI();
}

function loadDemoTrack(index) {
    const track = DEMO_PLAYLIST[index % DEMO_PLAYLIST.length];
    appState.currentTrack = track;
    appState.progressMs = 0;
    appState.durationMs = track.durationMs;
    appState.lastUpdateTimestamp = Date.now();
    updateWidgetView(track, appState.isPlaying, appState.progressMs, appState.durationMs);
}

function nextDemoTrack() {
    appState.demoIndex = (appState.demoIndex + 1) % DEMO_PLAYLIST.length;
    loadDemoTrack(appState.demoIndex);
}

function togglePlayback() {
    appState.isPlaying = !appState.isPlaying;
    appState.lastUpdateTimestamp = Date.now();
    updateWidgetView(appState.currentTrack, appState.isPlaying, appState.progressMs, appState.durationMs);

    if (dom.btnTogglePlayback) {
        dom.btnTogglePlayback.textContent = appState.isPlaying ? 'Pausar (Ocultar)' : 'Reanudar (Mostrar)';
    }
}

// ==========================================
// 6. SPOTIFY WEB API (PKCE AUTH)
// ==========================================

async function startSpotifyAuth() {
    const clientId = localStorage.getItem('spotify_client_id') || dom.clientIdInput.value.trim();
    if (!clientId) {
        alert('Por favor, introduce primero tu Client ID de Spotify.');
        dom.clientIdInput.focus();
        return;
    }

    localStorage.setItem('spotify_client_id', clientId);

    const verifier = generateRandomString(64);
    localStorage.setItem('spotify_code_verifier', verifier);

    const hashed = await sha256(verifier);
    const challenge = base64UrlEncode(hashed);

    const redirectUri = getRedirectUri();
    const params = new URLSearchParams({
        client_id: clientId,
        response_type: 'code',
        redirect_uri: redirectUri,
        scope: SPOTIFY_SCOPES,
        code_challenge_method: 'S256',
        code_challenge: challenge
    });

    window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

async function handleSpotifyCallback() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
        console.error('Error de autorización Spotify:', error);
        alert(`Error al conectar con Spotify: ${error}`);
        return;
    }

    if (!code) return;

    const clientId = localStorage.getItem('spotify_client_id');
    const verifier = localStorage.getItem('spotify_code_verifier');
    const redirectUri = getRedirectUri();

    if (!clientId || !verifier) {
        console.warn('Falta Client ID o code_verifier en el callback.');
        return;
    }

    try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: clientId,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: redirectUri,
                code_verifier: verifier
            })
        });

        const data = await response.json();
        if (data.access_token) {
            saveTokens(data);
            // Limpiar query params de la URL sin recargar
            window.history.replaceState({}, document.title, window.location.pathname);
            appState.isDemo = false;
            startApiPolling();
            updateConnectionStatusUI();
            alert('¡Conectado exitosamente con Spotify!');
        } else {
            console.error('Error al canjear código:', data);
        }
    } catch (err) {
        console.error('Error de red al canjear código de Spotify:', err);
    }
}

function saveTokens(data) {
    localStorage.setItem('spotify_access_token', data.access_token);
    if (data.refresh_token) {
        localStorage.setItem('spotify_refresh_token', data.refresh_token);
    }
    const expiresAt = Date.now() + (data.expires_in * 1000);
    localStorage.setItem('spotify_expires_at', expiresAt);
}

async function refreshAccessToken() {
    const refreshToken = localStorage.getItem('spotify_refresh_token');
    const clientId = localStorage.getItem('spotify_client_id');

    if (!refreshToken || !clientId) return false;

    try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: clientId,
                grant_type: 'refresh_token',
                refresh_token: refreshToken
            })
        });

        const data = await response.json();
        if (data.access_token) {
            saveTokens(data);
            return true;
        }
    } catch (err) {
        console.error('Error refrescando token:', err);
    }
    return false;
}

async function fetchCurrentlyPlaying() {
    let accessToken = localStorage.getItem('spotify_access_token');
    const expiresAt = parseInt(localStorage.getItem('spotify_expires_at') || '0', 10);

    // Refrescar si está a menos de 60 segundos de caducar
    if (Date.now() > expiresAt - 60000) {
        const ok = await refreshAccessToken();
        if (ok) accessToken = localStorage.getItem('spotify_access_token');
    }

    if (!accessToken) return;

    try {
        const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (response.status === 204) {
            // Nada sonando
            appState.isPlaying = false;
            updateWidgetView(appState.currentTrack || DEMO_PLAYLIST[0], false, 0, 0);
            return;
        }

        if (response.status === 401) {
            // No autorizado -> intentar refrescar
            const ok = await refreshAccessToken();
            if (ok) fetchCurrentlyPlaying();
            return;
        }

        if (response.ok) {
            const data = await response.json();
            if (!data || !data.item) {
                appState.isPlaying = false;
                updateWidgetView(appState.currentTrack || DEMO_PLAYLIST[0], false, 0, 0);
                return;
            }

            const track = {
                title: data.item.name,
                artist: data.item.artists.map(a => a.name).join(', '),
                cover: data.item.album && data.item.album.images.length > 0 
                    ? data.item.album.images[0].url 
                    : 'demo_cover.jpg',
                durationMs: data.item.duration_ms
            };

            appState.currentTrack = track;
            appState.isPlaying = data.is_playing;
            appState.progressMs = data.progress_ms;
            appState.durationMs = data.item.duration_ms;
            appState.lastUpdateTimestamp = Date.now();

            updateWidgetView(track, appState.isPlaying, appState.progressMs, appState.durationMs);
        }
    } catch (err) {
        console.error('Error consultando Spotify:', err);
    }
}

function startApiPolling() {
    if (appState.pollTimer) clearInterval(appState.pollTimer);
    fetchCurrentlyPlaying();
    appState.pollTimer = setInterval(fetchCurrentlyPlaying, 2000);
    startProgressTicker();
}

function disconnectSpotify() {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_refresh_token');
    localStorage.removeItem('spotify_expires_at');
    if (appState.pollTimer) clearInterval(appState.pollTimer);
    initDemoMode();
    updateConnectionStatusUI();
    alert('Desconectado de Spotify. Volviendo a modo demostración.');
}

function updateConnectionStatusUI() {
    const hasToken = !!localStorage.getItem('spotify_access_token');
    if (hasToken && !appState.isDemo) {
        dom.connectionStatusPill.classList.remove('offline');
        dom.connectionStatusPill.classList.add('online');
        dom.connectionStatusText.textContent = 'Conectado a Spotify';
        dom.btnSpotifyLogin.classList.add('hidden');
        dom.btnSpotifyDisconnect.classList.remove('hidden');
        dom.btnToggleDemo.classList.remove('active');
        dom.btnToggleDemo.textContent = 'Modo: SPOTIFY EN VIVO';
    } else {
        dom.connectionStatusPill.classList.add('offline');
        dom.connectionStatusPill.classList.remove('online');
        dom.connectionStatusText.textContent = 'Sin conectar (Modo Demo Activo)';
        dom.btnSpotifyLogin.classList.remove('hidden');
        dom.btnSpotifyDisconnect.classList.add('hidden');
        dom.btnToggleDemo.classList.add('active');
        dom.btnToggleDemo.textContent = 'Modo: DEMO ACTIVO';
    }
}

// ==========================================
// 7. EVENTOS Y LISTENERS
// ==========================================

function setupEventListeners() {
    // HUD Toggle
    dom.hudToggleBtn.addEventListener('click', () => {
        dom.hudPanel.classList.toggle('hidden');
    });

    dom.hudCloseBtn.addEventListener('click', () => {
        dom.hudPanel.classList.add('hidden');
    });

    // Controles Demo
    dom.btnToggleDemo.addEventListener('click', () => {
        if (!appState.isDemo && localStorage.getItem('spotify_access_token')) {
            appState.isDemo = true;
            if (appState.pollTimer) clearInterval(appState.pollTimer);
            initDemoMode();
        } else if (localStorage.getItem('spotify_access_token')) {
            appState.isDemo = false;
            startApiPolling();
            updateConnectionStatusUI();
        } else {
            alert('Configura primero tu Client ID de Spotify para salir del modo demo.');
        }
    });

    dom.btnTogglePlayback.addEventListener('click', togglePlayback);
    dom.btnNextTrack.addEventListener('click', nextDemoTrack);

    // Abrir Modal
    dom.btnOpenConfig.addEventListener('click', () => {
        dom.spotifyModal.classList.remove('hidden');
        dom.hudPanel.classList.add('hidden');
    });

    dom.modalCloseBtn.addEventListener('click', () => {
        dom.spotifyModal.classList.add('hidden');
    });

    // Copiar Redirect URI
    dom.btnCopyUri.addEventListener('click', () => {
        navigator.clipboard.writeText(dom.redirectUriDisplay.value).then(() => {
            dom.btnCopyUri.textContent = '¡Copiado!';
            setTimeout(() => { dom.btnCopyUri.textContent = 'Copiar'; }, 2000);
        });
    });

    // Guardar Client ID
    dom.btnSaveClientId.addEventListener('click', () => {
        const val = dom.clientIdInput.value.trim();
        if (val) {
            localStorage.setItem('spotify_client_id', val);
            alert('Client ID guardado correctamente.');
        }
    });

    // Botones Login / Disconnect
    dom.btnSpotifyLogin.addEventListener('click', startSpotifyAuth);
    dom.btnSpotifyDisconnect.addEventListener('click', disconnectSpotify);

    // Sistema de Notificación Rápida (Toast)
    let toastTimeout = null;
    function showToast(message) {
        if (!dom.toast) return;
        dom.toast.textContent = message;
        dom.toast.classList.add('show');
        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            dom.toast.classList.remove('show');
        }, 2200);
    }

    // Alternar visibilidad del HUD de controles
    function toggleStreamerHud() {
        const isVisible = dom.streamerHud.classList.toggle('is-visible');
        if (isVisible) {
            showToast('⚡ Controles de Spotify VISIBLES (Pulsa H o Ctrl+H para ocultar)');
        } else {
            showToast('🔒 Controles de Spotify OCULTOS para Stream');
            dom.hudPanel.classList.add('hidden');
        }
    }

    // Atajos de teclado para streamers:
    // 'H' o 'Ctrl+H' o 'F2': Mostrar / Ocultar el botón y controles del streamer
    // 'D': Play / Pause simulación
    // 'S': Abrir configuración de Spotify
    // 'Escape': Cerrar paneles y ventanas emergentes
    window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT') return; // Ignorar si está escribiendo en un input

        const isHKey = e.key === 'h' || e.key === 'H';
        const isF2 = e.key === 'F2';

        if (isHKey || isF2) {
            e.preventDefault();
            toggleStreamerHud();
        } else if (e.key === 'd' || e.key === 'D') {
            togglePlayback();
            showToast(appState.isPlaying ? '▶️ Spotify: Reproduciendo' : '⏸️ Spotify: Pausado');
        } else if (e.key === 's' || e.key === 'S') {
            dom.spotifyModal.classList.toggle('hidden');
        } else if (e.key === 'Escape') {
            dom.hudPanel.classList.add('hidden');
            dom.spotifyModal.classList.add('hidden');
        }
    });
}

// ==========================================
// 8. INICIALIZACIÓN
// ==========================================

window.addEventListener('DOMContentLoaded', async () => {
    // Configurar campo de Redirect URI
    dom.redirectUriDisplay.value = getRedirectUri();

    // Cargar Client ID guardado si existe
    const savedClientId = localStorage.getItem('spotify_client_id');
    if (savedClientId) {
        dom.clientIdInput.value = savedClientId;
    }

    setupEventListeners();

    // Verificar si viene de vuelta de autenticación OAuth
    await handleSpotifyCallback();

    // Si ya tiene un token guardado, iniciar directamente con API
    const hasToken = !!localStorage.getItem('spotify_access_token');
    if (hasToken) {
        appState.isDemo = false;
        startApiPolling();
        updateConnectionStatusUI();
    } else {
        // Iniciar en modo demo para que siempre se vea activo inmediatamente
        initDemoMode();
    }
});
