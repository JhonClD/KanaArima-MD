/**
 * tools-recordatorio.js — KanaArima-MD / Rikka-Bot
 * Recordatorios con tiempo personalizable, soporte de menciones,
 * cancelación y edición por ID.
 * 
 * Adaptado de Luna-BotV6 — sin dependencias externas.
 * Los recordatorios son en memoria (se pierden si el bot se reinicia).
 * 
 * Sintaxis de tiempo:
 *   10s → 10 segundos
 *   5m  → 5 minutos
 *   2h  → 2 horas
 *   1h30m → 1 hora 30 minutos
 * 
 * Comandos:
 *   .recordar 10m Jugamos @usuario   → crea recordatorio
 *   .recordar cancelar <ID>          → cancela recordatorio
 *   .recordar editar <ID> 15m Nuevo  → edita recordatorio
 *   .recordar lista                  → lista recordatorios activos del chat
 */

// ─── Store de recordatorios en memoria ───────────────────────────────────────
// Estructura: { [id]: { timeout, texto, chat, mentions, expiresAt } }
const recordatorios = {}

// ─── Parser de tiempo ─────────────────────────────────────────────────────────
function parseTiempo(texto) {
  if (!texto) return null
  const norm = texto.toLowerCase().trim()

  const horasMatch = norm.match(/(\d+)\s*h(?:ora)?s?/)
  const minsMatch  = norm.match(/(\d+)\s*m(?:in(?:uto)?s?)?/)
  const segsMatch  = norm.match(/(\d+)\s*s(?:eg(?:undo)?s?)?/)

  let ms = 0
  if (horasMatch) ms += parseInt(horasMatch[1]) * 3_600_000
  if (minsMatch)  ms += parseInt(minsMatch[1])  * 60_000
  if (segsMatch)  ms += parseInt(segsMatch[1])  * 1_000

  if (!horasMatch && !minsMatch && !segsMatch) {
    // Intentar solo número → asumimos minutos
    const soloNum = norm.match(/^(\d+)$/)
    if (soloNum) ms = parseInt(soloNum[1]) * 60_000
  }

  return ms > 0 ? ms : null
}

function formatTiempo(ms) {
  if (!ms) return '?'
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  let parts = []
  if (h) parts.push(`${h}h`)
  if (m) parts.push(`${m}m`)
  if (sec) parts.push(`${sec}s`)
  return parts.join(' ') || '0s'
}

function generateId() {
  return Date.now().toString(36).slice(-5).toUpperCase()
}

// ──────────────────────────────────────────────────────────────────────────────
const handler = async (m, { conn, text, args, usedPrefix, command }) => {

  if (!text) {
    return conn.sendMessage(m.chat, {
      text:
        `📌 *Recordatorio — Uso:*\n\n` +
        `▸ *Crear:*\n` +
        `  ${usedPrefix}recordar 10m Jugamos @usuario\n` +
        `  ${usedPrefix}recordar 1h30m Empezamos el evento\n` +
        `  ${usedPrefix}recordar 30s Revisa el horno\n\n` +
        `▸ *Cancelar:*\n` +
        `  ${usedPrefix}recordar cancelar <ID>\n\n` +
        `▸ *Editar:*\n` +
        `  ${usedPrefix}recordar editar <ID> 15m Nuevo mensaje\n\n` +
        `▸ *Lista:*\n` +
        `  ${usedPrefix}recordar lista\n\n` +
        `_Unidades: segundos (s), minutos (m), horas (h)_`
    }, { quoted: m })
  }

  // ── lista ──────────────────────────────────────────────────────────────────
  if (args[0]?.toLowerCase() === 'lista') {
    const activos = Object.entries(recordatorios)
      .filter(([, r]) => r.chat === m.chat)

    if (!activos.length) {
      return conn.sendMessage(m.chat, { text: '📭 No hay recordatorios activos en este chat.' }, { quoted: m })
    }

    let msg = `📋 *Recordatorios activos (${activos.length}):*\n\n`
    for (const [id, r] of activos) {
      const restante = r.expiresAt - Date.now()
      msg += `▸ *[${id}]* — en ${formatTiempo(restante)}\n   _${r.texto.slice(0, 60)}${r.texto.length > 60 ? '...' : ''}_\n\n`
    }

    return conn.sendMessage(m.chat, { text: msg.trim() }, { quoted: m })
  }

  // ── cancelar ───────────────────────────────────────────────────────────────
  if (args[0]?.toLowerCase() === 'cancelar') {
    const id = args[1]?.toUpperCase()
    if (!id) return conn.sendMessage(m.chat, { text: `💡 Uso: ${usedPrefix}recordar cancelar <ID>` }, { quoted: m })

    if (!recordatorios[id] || recordatorios[id].chat !== m.chat) {
      return conn.sendMessage(m.chat, { text: `❌ No se encontró el recordatorio *${id}* en este chat.` }, { quoted: m })
    }

    clearTimeout(recordatorios[id].timeout)
    delete recordatorios[id]
    return conn.sendMessage(m.chat, { text: `🗑️ Recordatorio *[${id}]* cancelado.` }, { quoted: m })
  }

  // ── editar ─────────────────────────────────────────────────────────────────
  if (args[0]?.toLowerCase() === 'editar') {
    const id        = args[1]?.toUpperCase()
    const nuevoTime = args[2]
    const nuevoMsg  = args.slice(3).join(' ')

    if (!id || !nuevoTime || !nuevoMsg) {
      return conn.sendMessage(m.chat, {
        text: `💡 Uso: ${usedPrefix}recordar editar <ID> <tiempo> <mensaje>`
      }, { quoted: m })
    }

    if (!recordatorios[id] || recordatorios[id].chat !== m.chat) {
      return conn.sendMessage(m.chat, { text: `❌ No se encontró el recordatorio *${id}* en este chat.` }, { quoted: m })
    }

    const tiempo = parseTiempo(nuevoTime)
    if (!tiempo) return conn.sendMessage(m.chat, { text: '⏱️ Tiempo inválido. Ej: 10m, 2h, 30s' }, { quoted: m })

    clearTimeout(recordatorios[id].timeout)
    const mentions   = m.mentionedJid || []
    const expiresAt  = Date.now() + tiempo

    recordatorios[id].timeout = setTimeout(() => {
      conn.sendMessage(m.chat, {
        text: `⏰ *Recordatorio [${id}]:*\n${nuevoMsg}`,
        mentions
      })
      delete recordatorios[id]
    }, tiempo)

    recordatorios[id].texto     = nuevoMsg
    recordatorios[id].mentions  = mentions
    recordatorios[id].expiresAt = expiresAt

    return conn.sendMessage(m.chat, {
      text: `✏️ Recordatorio *[${id}]* editado.\n⏳ Tiempo: *${formatTiempo(tiempo)}*`
    }, { quoted: m })
  }

  // ── crear recordatorio ─────────────────────────────────────────────────────
  const tiempoStr = args[0]
  const mensaje   = args.slice(1).join(' ')

  if (!tiempoStr) return conn.sendMessage(m.chat, { text: `💡 Uso: ${usedPrefix}recordar <tiempo> <mensaje>` }, { quoted: m })

  const tiempo = parseTiempo(tiempoStr)
  if (!tiempo) return conn.sendMessage(m.chat, { text: '⏱️ Tiempo inválido. Ej: 10m, 2h, 1h30m, 30s' }, { quoted: m })

  if (!mensaje) return conn.sendMessage(m.chat, { text: '📝 Escribe el mensaje del recordatorio después del tiempo.' }, { quoted: m })

  const id       = generateId()
  const mentions = m.mentionedJid || []
  const expiresAt = Date.now() + tiempo

  recordatorios[id] = {
    chat: m.chat,
    texto: mensaje,
    mentions,
    expiresAt,
    timeout: setTimeout(async () => {
      try {
        await conn.sendMessage(m.chat, {
          text: `⏰ *Recordatorio [${id}]:*\n${mensaje}`,
          mentions
        })
      } catch { /* ignorar si el grupo ya no existe */ }
      delete recordatorios[id]
    }, tiempo)
  }

  return conn.sendMessage(m.chat, {
    text:
      `✅ *Recordatorio creado*\n\n` +
      `🆔 ID: *[${id}]*\n` +
      `⏳ En: *${formatTiempo(tiempo)}*\n` +
      `📝 Mensaje: _${mensaje.slice(0, 80)}${mensaje.length > 80 ? '...' : ''}_\n\n` +
      `_Usa_ *${usedPrefix}recordar cancelar ${id}* _para cancelarlo._`
  }, { quoted: m })
}

handler.help    = ['recordar <tiempo> <mensaje>', 'recordar cancelar <ID>', 'recordar editar <ID> <tiempo> <mensaje>', 'recordar lista']
handler.tags    = ['tools']
handler.command = /^(recordar|recordatorio|remind|reminder)$/i

export default handler
