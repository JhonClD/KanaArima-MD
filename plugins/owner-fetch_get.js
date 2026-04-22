import fetch from 'node-fetch'
import { format } from 'util'
import fs from 'fs'

const handler = async (m, {conn, text, usedPrefix}) => {
  try {
    const datas = global
    const idioma = datas.db.data.users[m.sender]?.language || global.defaultLenguaje || 'es'
    const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))
    const tradutor = _translate.plugins.owner_fetch_get

    if (!text) throw `*Uso:* ${usedPrefix}fetch https://ejemplo.com/api.js`
    if (!/^https?:\/\//.test(text)) throw tradutor.texto1

    m.react('⏳') // Reacciona mientras descarga

    const res = await fetch(text, { timeout: 20000 })
    
    const size = res.headers.get('content-length')
    if (size > 10 * 1024) { // 10 MB máximo para código
      throw `*Archivo muy pesado:* ${(size / 1024).toFixed(2)} MB. Máx 10 MB para código`
    }
    
    const contentType = res.headers.get('content-type') || ''
    
    // Si es binario: imagen, video, zip, lo manda como archivo
    if (!/text|json|javascript|html|css|xml/.test(contentType)) {
      await conn.sendFile(m.chat, text, 'archivo', `*Tipo:* ${contentType}\n*URL:* ${text}`, m)
      return m.react('✅')
    }
    
    let code = await res.text()
    
    // Detecta el lenguaje por extensión o content-type
    let lang = 'txt'
    if (text.endsWith('.js') || /javascript/.test(contentType)) lang = 'js'
    else if (text.endsWith('.json') || /json/.test(contentType)) lang = 'json'
    else if (text.endsWith('.py') || /python/.test(contentType)) lang = 'python'
    else if (text.endsWith('.html') || /html/.test(contentType)) lang = 'html'
    else if (text.endsWith('.css') || /css/.test(contentType)) lang = 'css'
    
    // Si es JSON, lo formatea bonito
    if (lang === 'json') {
      try {
        code = format(JSON.parse(code))
      } catch {}
    }
    
    // Corta si es muy largo. WhatsApp aguanta 65k pero se lagea
    if (code.length > 60000) {
      code = code.slice(0, 60000) + '\n\n...[CORTADO: archivo muy largo]'
    }
    
    // ✅ Manda como yo: bloque de código con lenguaje
    const msg = `\`\`\`${lang}\n${code}\n\`\`\``
    await m.reply(msg)
    m.react('✅')
    
  } catch (e) {
    console.error('[FETCH]', e)
    m.react('❌')
    throw `*Error:* ${e.message || e}`
  }
}

handler.help = ['fetch <url>', 'get <url>']
handler.tags = ['tools']
handler.command = /^(fetch|get)$/i
handler.rowner = true

export default handler
