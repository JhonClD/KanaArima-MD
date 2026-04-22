import fetch from 'node-fetch'
import { format } from 'util'

const handler = async (m, { conn, text }) => {
  if (!text) return m.reply('《✧》 Ingresa un enlace para realizar la solicitud.')
  if (!/^https?:\/\//.test(text)) return m.reply('《✧》 Ingresa un enlace válido que comience con http o https.')

  const _url    = new URL(text)
  const params  = new URLSearchParams(_url.searchParams)
  const url     = `${_url.origin}${_url.pathname}${params.toString() ? '?' + params.toString() : ''}`

  const res           = await fetch(url, { headers: { 'Accept': 'application/json, text/plain, */*', 'User-Agent': 'Mozilla/5.0' } })
  const contentType   = res.headers.get('content-type')   || ''
  const contentLength = parseInt(res.headers.get('content-length') || '0')

  if (contentLength > 10 * 1024 * 1024) {
    return m.reply(`《✧》 El archivo es demasiado grande.\nContent-Length: ${contentLength} bytes`)
  }

  // ── Archivo binario → enviar como documento ────────────────────────────────
  if (!/text|json|xml/.test(contentType)) {
    return conn.sendFile(m.chat, url, 'file', text, m)
  }

  const buffer = await res.buffer()
  const raw    = buffer.toString()

  // ── JSON → formato legible en bloque de código ────────────────────────────
  if (/json/.test(contentType)) {
    try {
      const json = JSON.parse(raw)
      return m.reply('```' + format(json).slice(0, 65536) + '```')
    } catch {
      return m.reply('```' + raw.slice(0, 65536) + '```')
    }
  }

  // ── HTML → extraer texto limpio (sin tags, sin scripts) ───────────────────
  if (/html/.test(contentType) || raw.trimStart().startsWith('<!DOCTYPE') || raw.trimStart().startsWith('<html')) {
    const txt = raw
      .replace(/<script[\s\S]*?<\/script>/gi, '')   // quitar scripts
      .replace(/<style[\s\S]*?<\/style>/gi, '')      // quitar estilos
      .replace(/<[^>]+>/g, ' ')                      // quitar tags
      .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"')
      .replace(/\s{2,}/g, ' ')                       // colapsar espacios
      .trim()
    if (!txt) return m.reply('《✧》 La página no tiene contenido de texto legible.')
    return m.reply('```' + txt.slice(0, 65536) + '```')
  }

  // ── Texto plano / XML ──────────────────────────────────────────────────────
  return m.reply('```' + raw.slice(0, 65536) + '```')
}

handler.help    = ['fetch <url>', 'get <url>']
handler.tags    = ['owner']
handler.command = /^(fetch|get)$/i
handler.rowner  = true

export default handler
      
