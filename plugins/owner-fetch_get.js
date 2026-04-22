import fetch from 'node-fetch'
import { format } from 'util'
import fs from 'fs'
import { generateWAMessageFromContent } from '@whiskeysockets/baileys'

const handler = async (m, {conn, text, usedPrefix}) => {
  try {
    const datas = global
    const idioma = datas.db.data.users[m.sender]?.language || global.defaultLenguaje || 'es'
    const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))
    const tradutor = _translate.plugins.owner_fetch_get

    if (!text) throw `*Uso:* ${usedPrefix}fetch https://ejemplo.com/api.js`
    if (!/^https?:\/\//.test(text)) throw tradutor.texto1

    const res = await fetch(text, { timeout: 20000 })
    
    const size = res.headers.get('content-length')
    if (size > 10 * 1024 * 1024) {
      throw `*Archivo muy pesado:* ${(size / 1024 / 1024).toFixed(2)} MB. Máx 10 MB`
    }
    
    const contentType = res.headers.get('content-type') || ''
    
    if (!/text|json|javascript|html|css|xml/.test(contentType)) {
      return conn.sendFile(m.chat, text, 'archivo', `*Tipo:* ${contentType}\n*URL:* ${text}`, m)
    }
    
    let code = await res.text()
    
    // Detecta lenguaje y nombre
    let lang = 'txt'
    let langName = 'Texto'
    if (text.endsWith('.js') || /javascript/.test(contentType)) {
      lang = 'javascript'; langName = 'Código de Js'
    }
    else if (text.endsWith('.json') || /json/.test(contentType)) {
      lang = 'json'; langName = 'Código JSON'
    }
    else if (text.endsWith('.py') || /python/.test(contentType)) {
      lang = 'python'; langName = 'Código de Python'
    }
    else if (text.endsWith('.html') || /html/.test(contentType)) {
      lang = 'html'; langName = 'Código HTML'
    }
    else if (text.endsWith('.css') || /css/.test(contentType)) {
      lang = 'css'; langName = 'Código CSS'
    }
    
    if (lang === 'json') {
      try { code = format(JSON.parse(code)) } catch {}
    }
    
    if (code.length > 60000) {
      code = code.slice(0, 60000) + '\n\n...[CORTADO]'
    }

    // ✅ Esto genera la vista previa nativa de WhatsApp
    const msg = generateWAMessageFromContent(m.chat, {
      interactiveMessage: {
        header: { title: langName, hasMediaAttachment: false },
        body: { text: 'Ver código' },
        nativeFlowMessage: {
          codeMessage: {
            code: code,
            language: lang
          }
        }
      }
    }, {})
    
    await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
    
  } catch (e) {
    console.error('[FETCH]', e)
    throw `*Error:* ${e.message || e}`
  }
}

handler.help = ['fetch <url>', 'get <url>']
handler.tags = ['tools']
handler.command = /^(fetch|get)$/i
handler.rowner = true

export default handler
