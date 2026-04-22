import fetch from 'node-fetch'
import AbortController from 'abort-controller'

// ── Configuración ──────────────────────────────────────────
const TIMEOUT_MS   = 12_000
const MAX_RETRIES  = 3
const USERNAME_RE  = /^[a-zA-Z0-9._]{1,24}$/

// ── User-Agents rotativos (desktop → mobile como fallback) ─
const USER_AGENTS = [
  // Chrome desktop
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  // Firefox desktop
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  // Safari mobile (iOS) — TikTok suele responder diferente a mobile UA
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
]

// ── Fetch con timeout ──────────────────────────────────────
async function fetchWithTimeout(url, options, ms = TIMEOUT_MS) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

// ── Construir headers según intento ───────────────────────
function buildHeaders(attempt) {
  const ua       = USER_AGENTS[attempt % USER_AGENTS.length]
  const isMobile = ua.includes('iPhone')
  return {
    'User-Agent'     : ua,
    'Accept'         : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'es-419,es;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer'        : isMobile ? 'https://www.tiktok.com/' : 'https://www.google.com/',
    'Cache-Control'  : 'no-cache',
    'Pragma'         : 'no-cache',
    'sec-fetch-dest' : 'document',
    'sec-fetch-mode' : 'navigate',
    'sec-fetch-site' : isMobile ? 'none' : 'cross-site',
  }
}

// ── Extraer datos del HTML (3 métodos en cascada) ─────────
function extractFromHtml(html) {
  // Método 1 — __UNIVERSAL_DATA_FOR_REHYDRATION__ (Chrome reciente)
  const m1 = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/)
  if (m1) {
    try {
      const json     = JSON.parse(m1[1])
      const userInfo = json?.['__DEFAULT_SCOPE__']?.['webapp.user-detail']?.userInfo
      if (userInfo?.user && userInfo?.stats) return { user: userInfo.user, stats: userInfo.stats }
    } catch (_) {}
  }

  // Método 2 — SIGI_STATE (versión anterior de TikTok)
  const m2 = html.match(/<script id="SIGI_STATE"[^>]*>([\s\S]*?)<\/script>/)
  if (m2) {
    try {
      const json  = JSON.parse(m2[1])
      const users = json?.UserModule?.users
      const stats = json?.UserModule?.stats
      if (users) {
        const key = Object.keys(users)[0]
        if (users[key] && stats?.[key]) return { user: users[key], stats: stats[key] }
      }
    } catch (_) {}
  }

  // Método 3 — __NEXT_DATA__ (versión PWA/SSR)
  const m3 = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (m3) {
    try {
      const json   = JSON.parse(m3[1])
      const detail = json?.props?.pageProps?.userInfo
      if (detail?.user && detail?.stats) return { user: detail.user, stats: detail.stats }
    } catch (_) {}
  }

  return null
}

// ── Fetch con reintentos y UA rotativo ────────────────────
async function fetchProfile(username) {
  const bust  = `?_t=${Date.now()}` // cache-busting
  const url   = `https://www.tiktok.com/@${username}${bust}`
  let lastErr = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(url, { headers: buildHeaders(attempt) })

      if (res.status === 404) return { notFound: true }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const html = await res.text()

      // Detectar bloqueo de bot antes de parsear
      if (html.includes('verifyPage') || html.includes('tiktok.com/robots') || html.length < 5_000) {
        throw new Error('bot-block')
      }

      const data = extractFromHtml(html)
      if (data) return { data }

      throw new Error('json-not-found')

    } catch (err) {
      lastErr = err
      // Espera progresiva entre reintentos
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(r => setTimeout(r, (attempt + 1) * 1_200))
      }
    }
  }

  throw lastErr
}

// ── Formatear número compacto ──────────────────────────────
const fmt = n => {
  const num = Number(n)
  if (isNaN(num) || num === 0) return '—'
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B'
  if (num >= 1_000_000)     return (num / 1_000_000).toFixed(1)     + 'M'
  if (num >= 1_000)         return (num / 1_000).toFixed(1)         + 'K'
  return num.toLocaleString('es-CO')
}

// ── Handler principal ──────────────────────────────────────
const handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args[0]) {
    return conn.reply(m.chat,
      `❌ Uso: *${usedPrefix}${command} @usuario*\n` +
      `Ejemplo: *${usedPrefix}${command} khaby.lame*`, m)
  }

  const username = args[0].replace(/^@/, '').trim()

  if (!USERNAME_RE.test(username)) {
    return conn.reply(m.chat,
      `❌ Nombre de usuario inválido.\n` +
      `Solo letras, números, puntos y guiones bajos (máx. 24 caracteres).`, m)
  }

  await m.react(rwait)

  try {
    const result = await fetchProfile(username)

    if (result.notFound) {
      await m.react(error)
      return conn.reply(m.chat, `❌ El usuario *@${username}* no existe en TikTok.`, m)
    }

    const { user: info, stats } = result.data

    // Campos con fallbacks seguros
    const uniqueId = info.uniqueId  || username
    const nickname = info.nickname  || uniqueId
    const bio      = (info.signature || '').trim() || 'Sin bio'
    const avatar   = info.avatarLarger || info.avatarMedium || info.avatarThumb || ''
    const verified = info.verified       ? '✅ Sí' : '❌ No'
    const privado  = info.privateAccount ? '🔒 Sí' : '🔓 No'

    const texto =
      `🎵 *TikTok Stalk*\n` +
      `✩̣̣̣̣̣ͯ┄•͙✧⃝•͙┄✩ͯ•͙͙✧⃝•͙͙✩ͯ\n` +
      `❍ *Usuario* › @${uniqueId}\n` +
      `❍ *Nombre* › ${nickname}\n` +
      `❍ *Bio* › ${bio}\n` +
      `❍ *Verificado* › ${verified}\n` +
      `❍ *Privado* › ${privado}\n` +
      `✩̣̣̣̣̣ͯ┄•͙✧⃝•͙┄✩ͯ•͙͙✧⃝•͙͙✩ͯ\n` +
      `❍ *Seguidores* › ${fmt(stats.followerCount)}\n` +
      `❍ *Siguiendo* › ${fmt(stats.followingCount)}\n` +
      `❍ *Likes* › ${fmt(stats.heartCount ?? stats.diggCount)}\n` +
      `❍ *Videos* › ${fmt(stats.videoCount)}\n` +
      `──⇌••⇋──\n` +
      `🔗 ${'https://www.tiktok.com/@' + uniqueId}\n` +
      `${dev}`

    // Enviar con imagen; si el avatar está bloqueado, caer a solo texto
    if (avatar) {
      try {
        await conn.sendMessage(m.chat, { image: { url: avatar }, caption: texto }, { quoted: m })
      } catch (_) {
        await conn.reply(m.chat, texto, m)
      }
    } else {
      await conn.reply(m.chat, texto, m)
    }

    await m.react(done)

  } catch (e) {
    console.error('[ttstalk]', e.message)
    await m.react(error)

    const msg = e.message?.includes('bot-block')
      ? `⚠️ TikTok bloqueó la petición. Intenta de nuevo en unos segundos.`
      : e.message?.includes('abort') || e.message?.includes('timeout')
      ? `⏱️ TikTok tardó demasiado en responder. Intenta de nuevo.`
      : `❌ No se pudo obtener el perfil. Verifica que el usuario existe.`

    return conn.reply(m.chat, msg, m)
  }
}

handler.help     = ['ttstalk *@usuario*']
handler.tags     = ['downloader']
handler.command  = ['ttstalk', 'tiktokstalk', 'ttstalkear']
handler.register = true

export default handler
