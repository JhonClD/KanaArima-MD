import fetch from 'node-fetch'
import { format } from 'util'

const handler = async (m, { conn, text }) => {
  if (!text) return m.reply('《✧》 Ingresa un enlace para realizar la solicitud.')
  if (!/^https?:\/\//.test(text)) return m.reply('《✧》 Ingresa un enlace válido que comience con http o https.')

  const _url    = new URL(text)
  const params  = new URLSearchParams(_url.searchParams)
  const url     = `${_url.origin}${_url.pathname}${params.toString() ? '?' + params.toString() : ''}`

  const res           = await fetch(url)
  const contentType   = res.headers.get('content-type')   || ''
  const contentLength = parseInt(res.headers.get('content-length') || '0')

  if (contentLength > 10 * 1024 * 1024) {
    return m.reply(`《✧》 El archivo es demasiado grande.\nContent-Length: ${contentLength} bytes`)
  }

  if (/text|json/.test(contentType)) {
    const buffer = await res.buffer()
    let txt
    try {
      txt = format(JSON.parse(buffer.toString()))
    } catch {
      txt = buffer.toString()
    }
    return m.reply('```' + txt.slice(0, 65536) + '```')
  }

  return conn.sendFile(m.chat, url, 'file', text, m)
}

handler.help    = ['fetch <url>', 'get <url>']
handler.tags    = ['owner']
handler.command = /^(fetch|get)$/i
handler.rowner  = true

export default handler
