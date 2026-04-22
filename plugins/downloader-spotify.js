/**
 * downloader-spotify.js — Plugin KanaArima-MD / Rikka-Bot (Baileys)
 * Descarga canciones de Spotify por nombre o URL de track.
 * Uso: .spotify <nombre o url>
 */

import axios from 'axios'

// ─── APIs ─────────────────────────────────────────────────────────────────────
const API_KEY    = 'causa-0e3eacf90ab7be15'
const SEARCH_URL = 'https://api.vreden.my.id/api/spotifysearch'
const DL_URL     = 'https://rest.apicausas.xyz/api/v1/descargas/spotify'
const FALLBACK   = 'https://api.vreden.my.id/api/spotifydl'

const SPOTIFY_TRACK_RE = /https?:\/\/open\.spotify\.com\/track\/[a-zA-Z0-9]+/i

// ─── Helpers ──────────────────────────────────────────────────────────────────
function sanitizeFilename(name) {
  return name.replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 100)
}

function formatDuration(ms) {
  if (!ms || isNaN(ms)) return 'N/A'
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${m}:${String(s).padStart(2, '0')}`
}

// ─── Búsqueda ─────────────────────────────────────────────────────────────────
async function searchTrack(query) {
  const { data } = await axios.get(SEARCH_URL, {
    params: { query },
    timeout: 15_000,
  })
  const results = data?.result || data?.data || []
  if (!results.length) throw new Error('No se encontraron resultados en Spotify.')
  const t = results[0]
  return {
    ...t,
    title:       t.title      || t.name        || 'Desconocido',
    artist:      t.artist     || t.artists     || 'Desconocido',
    album:       t.album      || '',
    duration:    t.duration   || 'N/A',
    image:       t.image      || t.thumbnail   || null,
    release:     t.releaseDate|| t.release_date|| t.released   || '',
    genre:       Array.isArray(t.genre) ? t.genre.join(' / ') : (t.genre || ''),
    explicit:    t.explicit   ?? null,
    popularity:  t.popularity ?? null,
    url:         t.url        || t.link        || '',
  }
}

// ─── Descarga (con fallback) ──────────────────────────────────────────────────
async function downloadTrack(spotifyUrl) {
  // Intento 1: apicausas
  try {
    const { data } = await axios.get(DL_URL, {
      params: { apikey: API_KEY, url: spotifyUrl },
      timeout: 30_000,
    })
    if (data?.status && data?.resultado?.url) {
      const r = data.resultado
      return {
        title:    r.titulo    || 'Desconocido',
        artist:   r.artista   || 'Desconocido',
        album:    r.album     || '',
        duration: r.duracion  || 'N/A',
        image:    r.portada   || null,
        audioUrl: r.url,
      }
    }
  } catch { /* continúa al fallback */ }

  // Intento 2: vreden fallback
  const { data } = await axios.get(FALLBACK, {
    params: { url: spotifyUrl },
    timeout: 30_000,
  })
  if (!data?.result?.download) throw new Error('No se pudo obtener el audio.')
  const r = data.result
  return {
    title:    r.title    || 'Desconocido',
    artist:   r.artists  || 'Desconocido',
    album:    r.album    || '',
    duration: typeof r.duration === 'number' ? formatDuration(r.duration) : (r.duration || 'N/A'),
    image:    r.image    || null,
    audioUrl: r.download,
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────
let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) return m.reply(
    `🎵 *Descargador de Spotify*\n\n` +
    `Uso: _${usedPrefix + command} <nombre o URL>_\n` +
    `Ejemplo: _${usedPrefix + command} Blinding Lights - The Weeknd_`
  )

  await conn.sendMessage(m.chat, { react: { text: '🔍', key: m.key } })
  const wait = await conn.sendMessage(m.chat, { text: '🎵 _Buscando en Spotify..._' }, { quoted: m })

  try {
    // ── Resolver URL o buscar por texto ──────────────────────────────────────
    let spotifyUrl = SPOTIFY_TRACK_RE.test(text)
      ? text.match(SPOTIFY_TRACK_RE)[0]
      : null

    let meta = null

    if (!spotifyUrl) {
      meta       = await searchTrack(text)
      spotifyUrl = meta.url || meta.link
      if (!spotifyUrl) throw new Error('No se pudo obtener el enlace del track.')
    }

    // Actualizar mensaje de espera
    await conn.sendMessage(m.chat, { edit: wait.key, text: '⬇️ _Descargando audio..._' }).catch(() => {})

    // ── Descargar ─────────────────────────────────────────────────────────────
    const track = await downloadTrack(spotifyUrl)

    // Completar metadata con lo de la búsqueda si falta
    if (meta) {
      track.title    = track.title  === 'Desconocido' ? (meta.title  || track.title)  : track.title
      track.artist   = track.artist === 'Desconocido' ? (meta.artist || track.artist) : track.artist
      track.image    = track.image  || meta.image     || null
      track.duration = track.duration !== 'N/A'       ? track.duration : (meta.duration || 'N/A')
    }

    // ── Borrar espera ─────────────────────────────────────────────────────────
    await conn.sendMessage(m.chat, { delete: wait.key }).catch(() => {})

    // ── Caption ───────────────────────────────────────────────────────────────
    const caption =
      `🎵 *${track.title}*\n` +
      `👤 *Artista:* ${track.artist}\n` +
      (track.album    ? `💿 *Álbum:*   ${track.album}\n`    : '') +
      `⏱️ *Duración:* ${track.duration}\n\n` +
      `_${global.wm}_`

    // ── Enviar portada ────────────────────────────────────────────────────────
    if (track.image) {
      await conn.sendMessage(m.chat, {
        image: { url: track.image },
        caption,
        contextInfo: {
          externalAdReply: {
            showAdAttribution: true,
            title:        track.title.slice(0, 40),
            body:         track.artist.slice(0, 40),
            mediaType:    1,
            thumbnailUrl: track.image,
            sourceUrl:    spotifyUrl,
          }
        }
      }, { quoted: m })
    } else {
      await conn.sendMessage(m.chat, { text: caption }, { quoted: m })
    }

    // ── Enviar audio ──────────────────────────────────────────────────────────
    await conn.sendMessage(m.chat, {
      audio:    { url: track.audioUrl },
      fileName: `${sanitizeFilename(track.title)}.mp3`,
      mimetype: 'audio/mpeg',
    }, { quoted: m })

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  } catch (e) {
    await conn.sendMessage(m.chat, { delete: wait.key }).catch(() => {})
    await conn.sendMessage(m.chat, {
      text: `❌ *Error al descargar*\n_${e.message}_`
    }, { quoted: m })
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    console.error('[Spotify]', e)
  }
}

handler.help    = ['spotify <nombre o url>']
handler.tags    = ['downloader']
handler.command = /^(spotify|music)$/i

export default handler
                                                                          
