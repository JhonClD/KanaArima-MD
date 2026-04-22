/**
 * group-warns.js — KanaArima-MD / Rikka-Bot
 * Sistema de advertencias para grupos.
 * Comandos: .warn | .unwarn | .listwarn
 * 
 * Adaptado de Luna-BotV6 para la estructura nativa de Kana.
 * — No requiere pluginHelper (Kana ya inyecta isAdmin, isBotAdmin, participants)
 * — Usa src/libraries/advertencias.js para persistencia en tmp/advertencias.json
 * — 3 warns → expulsión automática y reset
 */

import fs from 'fs'
import { addWarning, removeWarning, resetWarnings, listWarnings } from '../src/libraries/advertencias.js'

// ─── Límite de warns antes de expulsar ────────────────────────────────────────
const MAX_WARNS = 3

// ─── Helper: resolve @lid → jid real usando los participantes ya inyectados ───
function resolveLid(jid, participants) {
  if (!jid?.includes('@lid')) return jid
  return participants.find(p => p.lid === jid)?.id || jid
}

// ══════════════════════════════════════════════════════════════════════════════
// HANDLER PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
const handler = async (m, { conn, text, command, usedPrefix, isOwner, isAdmin, isBotAdmin, participants }) => {

  // ── .warn ──────────────────────────────────────────────────────────────────
  if (/^(warn|advertir|advertencia|warning)$/i.test(command)) {
    if (!m.isGroup) return conn.sendMessage(m.chat, { text: '❌ Este comando solo funciona en grupos.' }, { quoted: m })
    if (!isAdmin && !isOwner)  return conn.sendMessage(m.chat, { text: '⛔ Solo los administradores pueden advertir.' }, { quoted: m })
    if (!isBotAdmin)           return conn.sendMessage(m.chat, { text: '⚠️ El bot necesita ser administrador para aplicar sanciones.' }, { quoted: m })

    let target = m.mentionedJid?.[0] || m.quoted?.sender
    if (!target) return conn.sendMessage(m.chat, { text: `💡 Uso: *${usedPrefix}warn @usuario [motivo]*` }, { quoted: m })
    if (target === conn.user.jid) return conn.sendMessage(m.chat, { text: '❌ No me puedes advertir a mí.' }, { quoted: m })

    target = resolveLid(target, participants)

    const exists = participants.find(p => p.id === target)
    if (!exists) return conn.sendMessage(m.chat, { text: '❌ Ese usuario no está en el grupo.' }, { quoted: m })

    const reason = text?.replace(/@\d+/g, '').trim() || 'Sin motivo especificado'
    const warns  = await addWarning(target)
    const tag    = target.split('@')[0]

    await conn.sendMessage(m.chat, {
      text:
        `⚠️ *Advertencia aplicada*\n\n` +
        `👤 Usuario: @${tag}\n` +
        `📝 Motivo: ${reason}\n` +
        `🔢 Warns: *${warns}/${MAX_WARNS}*\n\n` +
        `${warns >= MAX_WARNS ? `🚫 Alcanzó el límite. ¡Expulsado!` : `${MAX_WARNS - warns} advertencia(s) restante(s).`}`,
      mentions: [target]
    }, { quoted: m })

    if (warns >= MAX_WARNS) {
      await resetWarnings(target)
      try {
        await conn.groupParticipantsUpdate(m.chat, [target], 'remove')
      } catch {
        await conn.sendMessage(m.chat, { text: `⚠️ No se pudo expulsar a @${tag}. Verifica los permisos del bot.`, mentions: [target] })
      }
    }
    return
  }

  // ── .unwarn ────────────────────────────────────────────────────────────────
  if (/^(unwarn|delwarn|deladvertencia|deladvertir)$/i.test(command)) {
    if (!m.isGroup) return conn.sendMessage(m.chat, { text: '❌ Este comando solo funciona en grupos.' }, { quoted: m })
    if (!isAdmin && !isOwner) return conn.sendMessage(m.chat, { text: '⛔ Solo los administradores pueden quitar advertencias.' }, { quoted: m })

    let target = m.mentionedJid?.[0] || m.quoted?.sender
    if (!target) return conn.sendMessage(m.chat, { text: `💡 Uso: *${usedPrefix}unwarn @usuario*` }, { quoted: m })

    target = resolveLid(target, participants)

    const exists = participants.find(p => p.id === target)
    if (!exists) return conn.sendMessage(m.chat, { text: '❌ Ese usuario no está en el grupo.' }, { quoted: m })

    const warns = await removeWarning(target)
    const tag   = target.split('@')[0]

    return conn.sendMessage(m.chat, {
      text:
        `✅ *Advertencia removida*\n\n` +
        `👤 Usuario: @${tag}\n` +
        `🔢 Warns actuales: *${warns}/${MAX_WARNS}*`,
      mentions: [target]
    }, { quoted: m })
  }

  // ── .listwarn ──────────────────────────────────────────────────────────────
  if (/^(listwarn|veradvertencias|advertencias|warns)$/i.test(command)) {
    if (!m.isGroup) return conn.sendMessage(m.chat, { text: '❌ Este comando solo funciona en grupos.' }, { quoted: m })
    if (!isAdmin && !isOwner) return conn.sendMessage(m.chat, { text: '⛔ Solo los administradores pueden ver las advertencias.' }, { quoted: m })

    const allWarns = await listWarnings()
    // Filtrar solo miembros que están en el grupo actualmente
    const inGroup  = allWarns.filter(u => u.warns > 0 && participants.find(p => p.id === u.id))

    if (!inGroup.length) {
      return conn.sendMessage(m.chat, { text: '✅ No hay usuarios con advertencias en este grupo.' }, { quoted: m })
    }

    let msg = `📋 *Lista de advertencias del grupo*\n\n`
    for (const u of inGroup) {
      const bar = '🟥'.repeat(u.warns) + '⬜'.repeat(MAX_WARNS - u.warns)
      msg += `• @${u.id.split('@')[0]} — ${bar} (${u.warns}/${MAX_WARNS})\n`
    }

    return conn.sendMessage(m.chat, {
      text: msg,
      mentions: inGroup.map(u => u.id)
    }, { quoted: m })
  }
}

handler.help    = ['warn @usuario [motivo]', 'unwarn @usuario', 'listwarn']
handler.tags    = ['group']
handler.command = /^(warn|advertir|advertencia|warning|unwarn|delwarn|deladvertencia|deladvertir|listwarn|veradvertencias|advertencias|warns)$/i
handler.group   = true

export default handler
