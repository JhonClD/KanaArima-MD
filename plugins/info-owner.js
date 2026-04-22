import fs from "fs";

const handler = async (m, { conn, usedPrefix }) => {
  // ── i18n (solo para body del externalAdReply) ─────────────────────────────
  const idioma =
    global.db?.data?.users?.[m.sender]?.language || global.defaultLenguaje;
  const _translate = JSON.parse(
    fs.readFileSync(`./src/languages/${idioma}.json`, "utf-8")
  );
  const tradutor = _translate.plugins.info_creador;

  // texto2 puede ser string o array, Baileys necesita string
  const bodyText = Array.isArray(tradutor?.texto2)
    ? tradutor.texto2[0]
    : (tradutor?.texto2 ?? "Kana Arima-MD");

  // ── Caption hardcodeado ───────────────────────────────────────────────────
  const text = `
*—◉ Numero Del Owner*
wa.me/51925092348

*—◉ FACEBOOK Del Owner*
https://www.facebook.com/share/1B1aW1WGBa/

*—◉ GitHub Del Bot*
https://github.com/JhonClD/KanaArima-MD

*—◉ El Numero Del Colaborador Es*
wa.me/584262212498`.trim();

  // ── Mimetype aleatorio ────────────────────────────────────────────────────
  const mimeTypes = [
    "pdf",
    "zip",
    "vnd.openxmlformats-officedocument.presentationml.presentation",
    "vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  const randomMime = mimeTypes[Math.floor(Math.random() * mimeTypes.length)];

  // ── Thumbnail ─────────────────────────────────────────────────────────────
  const thumbnail = global.imagen1 ?? Buffer.alloc(0);

  // ── Mensaje ───────────────────────────────────────────────────────────────
  const repoUrl = "https://github.com/JhonClD/KanaArima-MD";
  const buttonMessage = {
    document: { url: repoUrl },
    mimetype: `application/${randomMime}`,
    fileName: "Kana Arima-MD",
    fileLength: 99999999999999,
    pageCount: 200,
    contextInfo: {
      forwardingScore: 200,
      isForwarded: true,
      externalAdReply: {
        mediaUrl: repoUrl,
        mediaType: 2,
        previewType: "pdf",
        title: "Kana Arima-MD",
        body: bodyText,
        thumbnail,
        sourceUrl: repoUrl,
      },
    },
    caption: text,
    footer: "Kana Arima-MD",
    headerType: 6,
  };

  await conn.sendMessage(m.chat, buttonMessage, { quoted: m });
};

handler.help = ["owner"];
handler.tags = ["info"];
handler.command = /^(owner|creator|creador|propietario)$/i;

export default handler;
