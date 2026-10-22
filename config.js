/**
 * ======================================================================
 * CONFIGURACIÓN PERMANENTE DE SPOTIFY PARA EL MARCO DE OBS (MakacaGotica)
 * ======================================================================
 * 
 * Al rellenar los datos de este archivo, el marco se conectará de forma
 * AUTOMÁTICA y PERMANENTE cada vez que abras OBS o la página web, sin
 * necesidad de volver a iniciar sesión, sin botones y sin que caduque.
 * 
 * INSTRUCCIONES RÁPIDAS:
 * 1. Pega tu Client ID de tu App de Spotify Developer.
 * 2. Pega tu Refresh Token permanente.
 * 
 * (Si aún no tienes tu Refresh Token, abre index.html en tu navegador,
 * pulsa 'S' o pulsa 'Iniciar Sesión con Spotify' una sola vez, y la pantalla
 * te dará tu código de Refresh Token listo para copiar y pegar aquí).
 * ======================================================================
 */

const SPOTIFY_CONFIG = {
    // 1. Client ID de Spotify Developer
    clientId: "",

    // 2. Refresh Token permanente (garantiza conexión 24/7 sin iniciar sesión)
    refreshToken: "",

    // 3. (Opcional) Si prefieres usar Last.fm (sin tokens, solo usuario):
    lastFmUser: ""
};
