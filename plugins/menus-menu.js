import fetch from 'node-fetch';
const handler = async (m, {conn, usedPrefix, __dirname, text, isPrems}) => {
  try {
  if (usedPrefix == 'a' || usedPrefix == 'A') return;

  const date = d.toLocaleDateString(locale, {day: 'numeric', month: 'long', year: 'numeric'});
  const {money, joincount} = global.db.data.users[m.sender];
  const rtotalreg = Object.values(global.db.data.users).filter((user) => user.registered == true).length;
  const rtotal = Object.entries(global.db.data.users).length || '0';
  const taguser = '@' + m.sender.split('@s.whatsapp.net')[0];
  const {exp, limit, level, role} = global.db.data.users[m.sender];
  const pp = await conn.profilePictureUrl(conn.user.jid).catch(_ => 'https://telegra.ph/file/24fa902ead26340f3df2c.png');
  const fkon = { key: { fromMe: false, participant: `0@s.whatsapp.net`, ...(m.chat ? { remoteJid: `status@broadcast` } : {}) }, message: { 'contactMessage': { 'displayName': saludo, 'vcard': `BEGIN:VCARD\nVERSION:3.0\nN:XL;${saludo},;;;\nFN:${saludo},\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabell:Ponsel\nEND:VCARD`, 'jpegThumbnail': imagen1, thumbnail: imagen1, sendEphemeral: true}}};
  await conn.sendMessage(m.chat, { react: { text: '🌸', key: m.key } });

  let txt = `
˚₊· ͟͟͞͞➳❥ ιɴғo ∂ε υsυαяιo ༘⋆
╭───୨ৎ────────────────
│ 𖦹 *Usuario:* ${taguser}
│ 𖦹 *Nivel:* ${level}
│ 𖦹 *Exp:* ${exp}
│ 𖦹 *Coins:* ${money}
│ 𖦹 *Dólares:* ${joincount}
╰────────────────────────

˚₊· ͟͟͞͞➳❥ ιɴғo ∂εʟ вoт ༘⋆
╭───୨ৎ────────────────
│ 𖦹 *Usuarios:* ${rtotal}
│ 𖦹 *Registrados:* ${rtotalreg}
│ 𖦹 *Fecha:* ${date}
│ 𖦹 *Hora:* ${moment.tz('America/Mexico_City').format('HH:mm:ss')}
╰────────────────────────

✦•┈๑⋅⋯ ⋯⋅๑┈•✦
  ꒰ঌ 🛠️ Soʟυcιoɴ Eяяoяes ໒꒱
✦•┈๑⋅⋯ ⋯⋅๑┈•✦
╭───୨ৎ────────────────
│ ᯓᡣ𐭩 _${usedPrefix}fixmsgespera_
│ ᯓᡣ𐭩 _${usedPrefix}dsowner_
╰────────────────────────

✦•┈๑⋅⋯ ⋯⋅๑┈•✦
  ꒰ঌ 🤖 Iɴғo Boт ໒꒱
✦•┈๑⋅⋯ ⋯⋅๑┈•✦
╭───୨ৎ────────────────
│ ᯓᡣ𐭩 _${usedPrefix}estado_
│ ᯓᡣ𐭩 _${usedPrefix}infobot_
│ ᯓᡣ𐭩 _${usedPrefix}speedtest_
│ ᯓᡣ𐭩 _${usedPrefix}owner_
│ ᯓᡣ𐭩 _${usedPrefix}terminosycondiciones_
╰────────────────────────

✦•┈๑⋅⋯ ⋯⋅๑┈•✦
  ꒰ঌ 👑 Acтιvαя / Desαcтιvαя ໒꒱
✦•┈๑⋅⋯ ⋯⋅๑┈•✦
╭───୨ৎ────────────────
│ ᯓᡣ𐭩 _${usedPrefix}enable/disable welcome_
│ ᯓᡣ𐭩 _${usedPrefix}enable/disable antilink_
│ ᯓᡣ𐭩 _${usedPrefix}enable/disable antilink2_
│ ᯓᡣ𐭩 _${usedPrefix}enable/disable detect_
│ ᯓᡣ𐭩 _${usedPrefix}enable/disable autosticker_
│ ᯓᡣ𐭩 _${usedPrefix}enable/disable antiviewonce_
│ ᯓᡣ𐭩 _${usedPrefix}enable/disable antitoxic_
│ ᯓᡣ𐭩 _${usedPrefix}enable/disable antitraba_
│ ᯓᡣ𐭩 _${usedPrefix}enable/disable antiarabes_
│ ᯓᡣ𐭩 _${usedPrefix}enable/disable antiprivado_
╰────────────────────────

✦•┈๑⋅⋯ ⋯⋅๑┈•✦
  ꒰ঌ 📥 Descαяɢαs ໒꒱
✦•┈๑⋅⋯ ⋯⋅๑┈•✦
╭───୨ৎ────────────────
│ ᯓᡣ𐭩 _${usedPrefix}ytmp3 <url>_
│ ᯓᡣ𐭩 _${usedPrefix}ytmp4 <url>_
│ ᯓᡣ𐭩 _${usedPrefix}play <texto>_
│ ᯓᡣ𐭩 _${usedPrefix}playlist <texto>_
│ ᯓᡣ𐭩 _${usedPrefix}spotify <texto>_
│ ᯓᡣ𐭩 _${usedPrefix}soundcloud <texto>_
│ ᯓᡣ𐭩 _${usedPrefix}instagram <url>_
│ ᯓᡣ𐭩 _${usedPrefix}tiktok <url>_
│ ᯓᡣ𐭩 _${usedPrefix}tiktokimg <url>_
│ ᯓᡣ𐭩 _${usedPrefix}twitter <url>_
│ ᯓᡣ𐭩 _${usedPrefix}facebook <url>_
│ ᯓᡣ𐭩 _${usedPrefix}threads <url>_
│ ᯓᡣ𐭩 _${usedPrefix}mediafire <url>_
│ ᯓᡣ𐭩 _${usedPrefix}gdrive <url>_
│ ᯓᡣ𐭩 _${usedPrefix}gitclone <url>_
│ ᯓᡣ𐭩 _${usedPrefix}modapk <texto>_
│ ᯓᡣ𐭩 _${usedPrefix}ringtone <texto>_
│ ᯓᡣ𐭩 _${usedPrefix}stickerpack <url>_
│ ᯓᡣ𐭩 _${usedPrefix}imagen <texto>_
│ ᯓᡣ𐭩 _${usedPrefix}pinterest <texto>_
│ ᯓᡣ𐭩 _${usedPrefix}pptiktok <usuario>_
│ ᯓᡣ𐭩 _${usedPrefix}igstalk <usuario>_
│ ᯓᡣ𐭩 _${usedPrefix}tiktokstalk <usuario>_
╰────────────────────────

✦•┈๑⋅⋯ ⋯⋅๑┈•✦
  ꒰ঌ 🔍 Bυscαdoяes ໒꒱
✦•┈๑⋅⋯ ⋯⋅๑┈•✦
╭───୨ৎ────────────────
│ ᯓᡣ𐭩 _${usedPrefix}google <texto>_
│ ᯓᡣ𐭩 _${usedPrefix}ytsearch <texto>_
│ ᯓᡣ𐭩 _${usedPrefix}animeinfo <texto>_
│ ᯓᡣ𐭩 _${usedPrefix}wikipedia <texto>_
│ ᯓᡣ𐭩 _${usedPrefix}letra <texto>_
│ ᯓᡣ𐭩 _${usedPrefix}stickersearch <texto>_
│ ᯓᡣ𐭩 _${usedPrefix}stickersearch2 <texto>_
│ ᯓᡣ𐭩 _${usedPrefix}githubsearch <texto>_
│ ᯓᡣ𐭩 _${usedPrefix}playstore <texto>_
│ ᯓᡣ𐭩 _${usedPrefix}tiktoksearch <texto>_
│ ᯓᡣ𐭩 _${usedPrefix}peliculas <texto>_
╰────────────────────────

✦•┈๑⋅⋯ ⋯⋅๑┈•✦
  ꒰ঌ 👥 Gяυρos ໒꒱
✦•┈๑⋅⋯ ⋯⋅๑┈•✦
╭───୨ৎ────────────────
│ ᯓᡣ𐭩 _${usedPrefix}add <número>_
│ ᯓᡣ𐭩 _${usedPrefix}kick <@tag>_
│ ᯓᡣ𐭩 _${usedPrefix}kick2 <@tag>_
│ ᯓᡣ𐭩 _${usedPrefix}listanum / kicknum_
│ ᯓᡣ𐭩 _${usedPrefix}promote <@tag>_
│ ᯓᡣ𐭩 _${usedPrefix}demote <@tag>_
│ ᯓᡣ𐭩 _${usedPrefix}admins_
│ ᯓᡣ𐭩 _${usedPrefix}infogrupo_
│ ᯓᡣ𐭩 _${usedPrefix}link / resetlink_
│ ᯓᡣ𐭩 _${usedPrefix}setname <texto>_
│ ᯓᡣ𐭩 _${usedPrefix}setdesc <texto>_
│ ᯓᡣ𐭩 _${usedPrefix}setpp <imagen>_
│ ᯓᡣ𐭩 _${usedPrefix}setwelcome <texto>_
│ ᯓᡣ𐭩 _${usedPrefix}setbye <texto>_
│ ᯓᡣ𐭩 _${usedPrefix}tagall / hidetag <texto>_
│ ᯓᡣ𐭩 _${usedPrefix}warn / unwarn <@tag>_
│ ᯓᡣ𐭩 _${usedPrefix}listwarn_
│ ᯓᡣ𐭩 _${usedPrefix}fantasmas_
│ ᯓᡣ𐭩 _${usedPrefix}grupo <abrir/cerrar>_
│ ᯓᡣ𐭩 _${usedPrefix}destraba_
│ ᯓᡣ𐭩 _${usedPrefix}delete_
╰────────────────────────

✦•┈๑⋅⋯ ⋯⋅๑┈•✦
  ꒰ঌ 🔄 Coɴveятιdoяes ໒꒱
✦•┈๑⋅⋯ ⋯⋅๑┈•✦
╭───୨ৎ────────────────
│ ᯓᡣ𐭩 _${usedPrefix}toimg <sticker>_
│ ᯓᡣ𐭩 _${usedPrefix}tovideo <sticker>_
│ ᯓᡣ𐭩 _${usedPrefix}tomp3 <video>_
│ ᯓᡣ𐭩 _${usedPrefix}toptt <audio/video>_
│ ᯓᡣ𐭩 _${usedPrefix}togifaud <video>_
│ ᯓᡣ𐭩 _${usedPrefix}toanime <imagen>_
│ ᯓᡣ𐭩 _${usedPrefix}tourl <archivo>_
│ ᯓᡣ𐭩 _${usedPrefix}tts <idioma> <texto>_
╰────────────────────────

✦•┈๑⋅⋯ ⋯⋅๑┈•✦
  ꒰ঌ 🎨 Eғecтos & Logoʂ ໒꒱
✦•┈๑⋅⋯ ⋯⋅๑┈•✦
╭───୨ৎ────────────────
│ ᯓᡣ𐭩 _${usedPrefix}logos <efecto> <texto>_
│ ᯓᡣ𐭩 _${usedPrefix}ytcomment <texto>_
│ ᯓᡣ𐭩 _${usedPrefix}hornycard <@tag>_
│ ᯓᡣ𐭩 _${usedPrefix}simpcard <@tag>_
│ ᯓᡣ𐭩 _${usedPrefix}lolice <@tag>_
│ ᯓᡣ𐭩 _${usedPrefix}itssostupid_
│ ᯓᡣ𐭩 _${usedPrefix}pixelar <imagen>_
│ ᯓᡣ𐭩 _${usedPrefix}blur <imagen>_
╰────────────────────────

✦•┈๑⋅⋯ ⋯⋅๑┈•✦
  ꒰ঌ 🎵 Aυdιo Eғecтos ໒꒱
✦•┈๑⋅⋯ ⋯⋅๑┈•✦
╭───୨ৎ────────────────
│ ᯓᡣ𐭩 _${usedPrefix}bass_
│ ᯓᡣ𐭩 _${usedPrefix}blown_
│ ᯓᡣ𐭩 _${usedPrefix}deep_
│ ᯓᡣ𐭩 _${usedPrefix}earrape_
│ ᯓᡣ𐭩 _${usedPrefix}fast / slow_
│ ᯓᡣ𐭩 _${usedPrefix}nightcore_
│ ᯓᡣ𐭩 _${usedPrefix}reverse_
│ ᯓᡣ𐭩 _${usedPrefix}robot_
│ ᯓᡣ𐭩 _${usedPrefix}echo_
│ ᯓᡣ𐭩 _${usedPrefix}underwater_
╰────────────────────────

✦•┈๑⋅⋯ ⋯⋅๑┈•✦
  ꒰ঌ 🖼️ Sтιcкeяs ໒꒱
✦•┈๑⋅⋯ ⋯⋅๑┈•✦
╭───୨ৎ────────────────
│ ᯓᡣ𐭩 _${usedPrefix}s <imagen/video>_
│ ᯓᡣ𐭩 _${usedPrefix}attp / ttp <texto>_
│ ᯓᡣ𐭩 _${usedPrefix}emojimix <emoji>&<emoji>_
│ ᯓᡣ𐭩 _${usedPrefix}scircle <imagen>_
│ ᯓᡣ𐭩 _${usedPrefix}sremovebg <imagen>_
│ ᯓᡣ𐭩 _${usedPrefix}semoji <tipo> <emoji>_
│ ᯓᡣ𐭩 _${usedPrefix}qc <texto>_
│ ᯓᡣ𐭩 _${usedPrefix}slap <@tag>_
│ ᯓᡣ𐭩 _${usedPrefix}dado_
│ ᯓᡣ𐭩 _${usedPrefix}wm <pack> <autor>_
│ ᯓᡣ𐭩 _${usedPrefix}stickermarker <efecto>_
│ ᯓᡣ𐭩 _${usedPrefix}stickerfilter <efecto>_
╰────────────────────────

✦•┈๑⋅⋯ ⋯⋅๑┈•✦
  ꒰ঌ ⚙️ Heяяαмιeɴтαs ໒꒱
✦•┈๑⋅⋯ ⋯⋅๑┈•✦
╭───୨ৎ────────────────
│ ᯓᡣ𐭩 _${usedPrefix}traducir <texto>_
│ ᯓᡣ𐭩 _${usedPrefix}ocr <imagen>_
│ ᯓᡣ𐭩 _${usedPrefix}hd <imagen>_
│ ᯓᡣ𐭩 _${usedPrefix}clima <país> <ciudad>_
│ ᯓᡣ𐭩 _${usedPrefix}horario_
│ ᯓᡣ𐭩 _${usedPrefix}calc <operación>_
│ ᯓᡣ𐭩 _${usedPrefix}acortar <url>_
│ ᯓᡣ𐭩 _${usedPrefix}qrcode <texto>_
│ ᯓᡣ𐭩 _${usedPrefix}readqr <imagen>_
│ ᯓᡣ𐭩 _${usedPrefix}readviewonce_
│ ᯓᡣ𐭩 _${usedPrefix}styletext <texto>_
│ ᯓᡣ𐭩 _${usedPrefix}readmore <texto>_
│ ᯓᡣ𐭩 _${usedPrefix}fakereply <texto>_
│ ᯓᡣ𐭩 _${usedPrefix}nowa <número>_
│ ᯓᡣ𐭩 _${usedPrefix}spamwa <num|txt|cant>_
│ ᯓᡣ𐭩 _${usedPrefix}tamaño <imagen/video>_
│ ᯓᡣ𐭩 _${usedPrefix}encuesta <texto>_
│ ᯓᡣ𐭩 _${usedPrefix}dropmail_
│ ᯓᡣ𐭩 _${usedPrefix}recordatorio <tiempo> <texto>_
│ ᯓᡣ𐭩 _${usedPrefix}whatmusic <audio>_
│ ᯓᡣ𐭩 _${usedPrefix}ssweb <url>_
│ ᯓᡣ𐭩 _${usedPrefix}inspect <link gc>_
│ ᯓᡣ𐭩 _${usedPrefix}piropo_
│ ᯓᡣ𐭩 _${usedPrefix}del_
╰────────────────────────

✦•┈๑⋅⋯ ⋯⋅๑┈•✦
  ꒰ঌ 🎲 Rαɴdoм ໒꒱
✦•┈๑⋅⋯ ⋯⋅๑┈•✦
╭───୨ৎ────────────────
│ ᯓᡣ𐭩 _${usedPrefix}meme_
│ ᯓᡣ𐭩 _${usedPrefix}cat / dog_
│ ᯓᡣ𐭩 _${usedPrefix}neko / waifu_
│ ᯓᡣ𐭩 _${usedPrefix}kpop <blackpink/bts/exo>_
│ ᯓᡣ𐭩 _${usedPrefix}blackpink / itzy_
│ ᯓᡣ𐭩 _${usedPrefix}messi / cristianoronaldo_
│ ᯓᡣ𐭩 _${usedPrefix}navidad_
│ ᯓᡣ𐭩 _${usedPrefix}wpaesthetic / wprandom_
│ ᯓᡣ𐭩 _${usedPrefix}wpgaming / wpmontaña_
│ ᯓᡣ𐭩 _${usedPrefix}wpvehiculo / wpmoto_
│ ᯓᡣ𐭩 _${usedPrefix}wallhp_
│ ᯓᡣ𐭩 _${usedPrefix}loli_
╰────────────────────────

✦•┈๑⋅⋯ ⋯⋅๑┈•✦
  ꒰ঌ 👑 Owɴeя ໒꒱
✦•┈๑⋅⋯ ⋯⋅๑┈•✦
╭───୨ৎ────────────────
│ ᯓᡣ𐭩 _${usedPrefix}menuowner_
╰────────────────────────

˖ ࣪ ꉂ🗯˙ ‹—────୨ৎ────›`;

  await conn.sendMessage(m.chat, {
    text: txt.trim(),
    mentions: [...txt.matchAll(/@([0-9]{5,16}|0)/g)].map((v) => v[1] + '@s.whatsapp.net'),
    contextInfo: {
      forwardingScore: 9999999,
      isForwarded: true,
      mentionedJid: [...txt.matchAll(/@([0-9]{5,16}|0)/g)].map((v) => v[1] + '@s.whatsapp.net'),
      externalAdReply: {
        showAdAttribution: true,
        containsAutoReply: true,
        renderLargerThumbnail: true,
        title: '🌸 Kana Arima - Bot',
        mediaType: 1,
        thumbnail: imagen1,
        mediaUrl: global.channel,
        sourceUrl: global.channel
      }
    }
  }, {quoted: fkon});
  } catch {
    conn.reply(m.chat, '🌸 *Ocurrió un error al mostrar el menú*', m);
  }
};
handler.help = ['menu'];
handler.tags = ['menu'];
handler.command = /^(menu|allmenu|menú|help|menucompleto)$/i;
handler.register = true;
export default handler;
