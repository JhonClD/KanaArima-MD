import fetch from 'node-fetch';
import { exec } from 'child_process';
import fs from 'fs';
import { promisify } from 'util';
import { pipeline } from 'stream';
import { createWriteStream } from 'fs';

const execPromise   = promisify(exec);
const pipelineAsync = promisify(pipeline);

// ── Configura aquí la URL de tu scraper ─────────────────────────────────────
const SCRAPER_BASE = process.env.YT_SCRAPER_URL || 'http://localhost:7860';
const TIMEOUT      = 30000;

const fetchWithTimeout = (url, ms = TIMEOUT) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(t));
};

// Waveform plano → PTT con líneas rectas en WhatsApp
const FLAT_WAVEFORM = new Uint8Array(64).fill(0);

const YT_REGEX = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/|v\/))([a-zA-Z0-9_-]{11})/;

// ── Helpers de formato ───────────────────────────────────────────────────────
const formatViews = (raw) => {
    if (!raw && raw !== 0) return 'N/A';
    // Puede venir como número o como string "1.2M views"
    if (typeof raw === 'string') return raw.replace(' views', '');
    const n = parseInt(raw, 10);
    if (isNaN(n)) return String(raw);
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
    if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)         return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString('es');
};

const formatDuration = (sec) => {
    if (!sec) return 'N/A';
    // Si ya viene como "m:ss" (string de yts-api), devolver directo
    if (typeof sec === 'string' && /^\d+:\d+/.test(sec)) return sec;
    const s = parseInt(sec, 10);
    if (isNaN(s)) return String(sec);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    return h > 0
        ? `${h}:${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`
        : `${m}:${String(r).padStart(2,'0')}`;
};

const formatDate = (raw) => {
    if (!raw) return 'N/A';
    const str = String(raw).replace(/-/g, '');
    if (/^\d{8}$/.test(str)) {
        const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
        const [y, mo, d] = [str.slice(0,4), str.slice(4,6), str.slice(6,8)];
        return `${parseInt(d)} ${months[parseInt(mo)-1]} ${y}`;
    }
    return raw; // "2 years ago", "YYYYMMDD", etc.
};

// ── Buscar o resolver URL ────────────────────────────────────────────────────
const resolveVideo = async (query) => {
    if (YT_REGEX.test(query)) {
        // Es una URL → info directa
        const url = `${SCRAPER_BASE}/api/info?url=${encodeURIComponent(query)}`;
        const res = await fetchWithTimeout(url);
        if (!res.ok) throw new Error(`Scraper info HTTP ${res.status}`);
        const data = await res.json();
        // Reconstruir URL canónica
        data._ytUrl = query;
        return { type: 'info', data };
    }
    // Es búsqueda por texto
    const url = `${SCRAPER_BASE}/api/search?q=${encodeURIComponent(query)}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error(`Scraper search HTTP ${res.status}`);
    const json = await res.json();
    const items = json?.items || [];
    const first = items.find(i => i.type === 'video') || items[0];
    if (!first) throw new Error('No se encontró ningún video.');
    return { type: 'search', data: first };
};

// ── Obtener info completa a partir de video ID ───────────────────────────────
const getInfo = async (videoId) => {
    const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const url   = `${SCRAPER_BASE}/api/info?url=${encodeURIComponent(ytUrl)}`;
    const res   = await fetchWithTimeout(url);
    if (!res.ok) throw new Error(`Scraper info HTTP ${res.status}`);
    return res.json();
};

// ── Thumbnail URL desde el scraper ───────────────────────────────────────────
const thumbUrl = (id) => `${SCRAPER_BASE}/api/thumbnail/${id}`;

// ── Handler principal ────────────────────────────────────────────────────────
const handler = async (m, { conn, client, args, text, command }) => {
    const socket = conn || client;
    const query  = text || args.join(' ');

    if (!query) return socket.sendMessage(m.chat,
        { text: `《✧》 Escribe el nombre o URL del video.\n\n*Ejemplo:* .play Linkin Park` },
        { quoted: m });

    const isVideo     = /play2|mp4|video/i.test(command);
    const isVoiceNote = /playaudio/i.test(command);

    try {
        // ── 1. Resolver video + react en paralelo ────────────────────────
        const [resolved] = await Promise.all([
            resolveVideo(query),
            socket.sendMessage(m.chat, { react: { text: '🔍', key: m.key } })
        ]);

        // ── 2. Obtener info completa (puede requerir 2da llamada) ─────────
        let info;
        let videoId;

        if (resolved.type === 'info') {
            info = resolved.data;
            videoId = info.id;
        } else {
            // Resultado de búsqueda → fetch info completa
            const item = resolved.data;
            videoId = item.id;
            info = await getInfo(videoId);
        }

        // ── 3. Extraer campos ─────────────────────────────────────────────
        const title    = info.title    || 'Sin título';
        const channel  = info.channel  || 'N/A';
        const views    = info.view_count;
        const duration = info.duration;
        const date     = info.upload_date;
        const ytUrl    = info._ytUrl || `https://www.youtube.com/watch?v=${videoId}`;
        const thumb    = thumbUrl(videoId);

        const header     = isVideo ? '🎬 YOUTUBE VIDEO' : '♪ YOUTUBE AUDIO';
        const captionInfo = (
`╭━━━〔 ${header} 〕━━━⬣
┃ ◈ *Título:* ${title}
┃ ✦ *Canal:* ${channel}
┃ ✧ *Vistas:* ${formatViews(views)}
┃ ◷ *Duración:* ${formatDuration(duration)}
┃ ⊞ *Lanzamiento:* ${formatDate(date)}
┃ ∞ *Link:* ${ytUrl}
╰━━━━━━━━━━━━━━━━━━━⬣`).trim();

        // ── 4. Obtener download URL según tipo ────────────────────────────
        let downloadUrl;
        if (isVideo) {
            // Mejor calidad ≤ 720p (ya vienen ordenados desc)
            const fmt = info.mp4_formats?.find(f => parseInt(f.quality) <= 720)
                     || info.mp4_formats?.[0];
            downloadUrl = fmt?.download_url;
        } else {
            downloadUrl = info.mp3_format?.download_url;
        }

        if (!downloadUrl) throw new Error('No se pudo obtener el enlace de descarga.');

        // ── 5. Miniatura + indicador ──────────────────────────────────────
        await Promise.all([
            socket.sendMessage(m.chat, { image: { url: thumb }, caption: captionInfo }, { quoted: m }),
            socket.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })
        ]);

        // ── 6. Envío ──────────────────────────────────────────────────────
        if (isVideo) {
            await socket.sendMessage(m.chat, {
                video: { url: downloadUrl },
                caption: `🎬 *${title}*`,
                mimetype: 'video/mp4',
                fileName: `${title.replace(/[\\/:*?"<>|]/g, '')}.mp4`
            }, { quoted: m });

        } else if (isVoiceNote) {
            const stamp  = Date.now();
            const tmpMp3 = `./tmp_${stamp}.mp3`;
            const tmpOgg = `./tmp_${stamp}.ogg`;

            try {
                const dlRes = await fetchWithTimeout(downloadUrl, 60000);
                if (!dlRes.ok) throw new Error(`Error al descargar audio: ${dlRes.status}`);
                await pipelineAsync(dlRes.body, createWriteStream(tmpMp3));

                await execPromise(
                    `ffmpeg -y -i "${tmpMp3}" -ar 16000 -ac 1 -c:a libopus -b:a 32k ` +
                    `-application voip "${tmpOgg}"`
                );

                const audioBuffer = fs.readFileSync(tmpOgg);
                await socket.sendMessage(m.chat, {
                    audio: audioBuffer,
                    mimetype: 'audio/ogg; codecs=opus',
                    ptt: true,
                    waveform: FLAT_WAVEFORM
                }, { quoted: m });

            } finally {
                [tmpMp3, tmpOgg].forEach(f => { try { fs.unlinkSync(f); } catch {} });
            }

        } else {
            await socket.sendMessage(m.chat, {
                audio: { url: downloadUrl },
                mimetype: 'audio/mpeg',
                fileName: `${title.replace(/[\\/:*?"<>|]/g, '')}.mp3`,
                ptt: false
            }, { quoted: m });
        }

        await socket.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

    } catch (e) {
        console.error('\n━━━━━━━━━━ [PLAY ERROR] ━━━━━━━━━━');
        console.error(`📌 Comando : ${command}`);
        console.error(`🔎 Query   : ${query}`);
        console.error(`❌ Mensaje : ${e.message}`);
        console.error(`📄 Stack   :\n${e.stack}`);
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        const msg = e.name === 'AbortError'
            ? 'Tiempo de espera agotado. Intenta de nuevo.'
            : e.message;

        await Promise.all([
            socket.sendMessage(m.chat, { react: { text: '❌', key: m.key } }),
            socket.sendMessage(m.chat, { text: `❌ *Error:* ${msg}` }, { quoted: m })
        ]);
    }
};

handler.help    = ['play', 'play2', 'playaudio', 'mp4', 'mp3', 'video'];
handler.tags    = ['downloader'];
handler.command = /^(play|play2|mp3|video|mp4|playaudio)$/i;

export default handler;
        
