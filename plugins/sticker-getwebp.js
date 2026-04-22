const handler = async (m, { conn }) => {
  if (!m.quoted?.message?.stickerMessage)
    return conn.sendMessage(m.chat, { text: 'Responde a un sticker.' }, { quoted: m })

  const s = m.quoted.message.stickerMessage

  const b64 = (buf) => buf ? Buffer.from(buf).toString('base64') : 'N/A'

  const lines = [
    `url: ${s.url ?? 'N/A'}`,
    `directPath: ${s.directPath ?? 'N/A'}`,
    `mimetype: ${s.mimetype ?? 'N/A'}`,
    `mediaKey: ${b64(s.mediaKey)}`,
    `fileSha256: ${b64(s.fileSha256)}`,
    `fileEncSha256: ${b64(s.fileEncSha256)}`,
    `fileLength: ${s.fileLength ?? 'N/A'}`,
    `mediaKeyTimestamp: ${s.mediaKeyTimestamp ?? 'N/A'}`,
    `width: ${s.width ?? 'N/A'}`,
    `height: ${s.height ?? 'N/A'}`,
    `isAnimated: ${s.isAnimated ?? false}`,
    `isLottie: ${s.isLottie ?? false}`,
    `isAvatar: ${s.isAvatar ?? false}`,
    `isAiSticker: ${s.isAiSticker ?? false}`,
    `stickerSentTs: ${s.stickerSentTs ?? 'N/A'}`,
    `firstFrameLength: ${s.firstFrameLength ?? 'N/A'}`,
    `firstFrameSidecar: ${s.firstFrameSidecar ? b64(s.firstFrameSidecar) : 'N/A'}`,
    `pngThumbnail: ${s.pngThumbnail ? b64(s.pngThumbnail) : 'N/A'}`,
  ]

  await conn.sendMessage(m.chat, { text: lines.join('\n') }, { quoted: m })
}

handler.help    = ['getwebp']
handler.tags    = ['sticker']
handler.command = ['getwebp']

export default handler
