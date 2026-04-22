/**
 * info-speedtest.js — Plugin KanaArima-MD / Rikka-Bot (Baileys)
 * Ejecuta un speedtest y envía el resultado como imagen o texto.
 * Usa --simple --fast para reducir el tiempo de ~25s a ~12s.
 */

import cp from 'child_process';
import { promisify } from 'util';
const exec = promisify(cp.exec);

// ─── Parsea la salida --simple del script Python ─────────────────────────────
function parseSpeedtestOutput(raw) {
  const get = (re) => raw.match(re)?.[1]?.trim() ?? null
  return {
    isp:      get(/ISP:\*?\s*(.+)/),
    server:   get(/Servidor:\*?\s*([^\n▢]+)/),
    location: get(/Ubicaci[oó]n:\*?\s*([^\n▢\[]+)/),
    latency:  get(/Latencia:\s*([\d.]+\s*ms)/i),
    download: get(/Descarga:\s*([\d.]+\s*M\w+\/s)/i),
    upload:   get(/Subida:\s*([\d.]+\s*M\w+\/s)/i),
    imgUrl:   get(/(https?:\/\/\S+\.png)/),
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────
const handler = async (m, { conn }) => {
  await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })
  const wait = await conn.sendMessage(
    m.chat,
    { text: '🌐 _Ejecutando speedtest, espera ~12s..._' },
    { quoted: m }
  )

  try {
    const { stdout, stderr } = await exec(
      'python3 ./src/libraries/ookla-speedtest.py --simple --share --secure --fast',
      { timeout: 60_000 }
    )

    const raw    = (stdout + stderr).trim()
    const parsed = parseSpeedtestOutput(raw)

    const lines = [
      `🌐 *SPEEDTEST*`,
      ``,
      parsed.isp      ? `📡 *ISP:* ${parsed.isp}`            : null,
      parsed.server   ? `🖥️ *Servidor:* ${parsed.server}`    : null,
      parsed.location ? `📍 *Ubicación:* ${parsed.location}` : null,
      ``,
      parsed.latency  ? `⏱️ *Latencia:*  ${parsed.latency}`  : null,
      parsed.download ? `⬇️ *Descarga:* ${parsed.download}`  : null,
      parsed.upload   ? `⬆️ *Subida:*   ${parsed.upload}`    : null,
      ``,
      `_${global.wm}_`,
    ].filter(l => l !== null).join('\n')

    await conn.sendMessage(m.chat, { delete: wait.key }).catch(() => {})

    if (parsed.imgUrl) {
      await conn.sendMessage(m.chat, { image: { url: parsed.imgUrl }, caption: lines }, { quoted: m })
    } else {
      await conn.sendMessage(m.chat, { text: lines }, { quoted: m })
    }

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  } catch (e) {
    await conn.sendMessage(m.chat, { delete: wait.key }).catch(() => {})
    await conn.sendMessage(m.chat, { text: `❌ *Speedtest falló:*\n${e.message}` }, { quoted: m })
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
  }
}

handler.help    = ['speedtest']
handler.tags    = ['info']
handler.command = /^(speedtest|testspeed)$/i

export default handler
