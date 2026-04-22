import fetch from 'node-fetch';
const handler = async (m, {conn, usedPrefix, usedPrefix: _p, __dirname, text, isPrems}) => {
  try {
  if (usedPrefix == 'a' || usedPrefix == 'A') return;

  const date = d.toLocaleDateString(locale, {day: 'numeric', month: 'long', year: 'numeric'});
  const {money, joincount} = global.db.data.users[m.sender];

 const rtotalreg = Object.values(global.db.data.users).filter((user) => user.registered == true).length;
    const rtotal = Object.entries(global.db.data.users).length || '0'
        const taguser = '@' + m.sender.split('@s.whatsapp.net')[0];
  const {exp, limit, level, role} = global.db.data.users[m.sender];
  const pp = await conn.profilePictureUrl(conn.user.jid).catch(_ => 'https://telegra.ph/file/24fa902ead26340f3df2c.png');
  const fkon = { key: { fromMe: false, participant: `0@s.whatsapp.net`, ...(m.chat ? { remoteJid: `status@broadcast` } : {}) }, message: { 'contactMessage': { 'displayName': saludo, 'vcard': `BEGIN:VCARD\nVERSION:3.0\nN:XL;${saludo},;;;\nFN:${saludo},\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabell:Ponsel\nEND:VCARD`, 'jpegThumbnail': imagen1, thumbnail: imagen1 ,sendEphemeral: true}}};
    await conn.sendMessage(m.chat, { react: { text: '💙', key: m.key } })
  let txt = `╭*۰꒷⏝꒷۰꒷.✦˖ ࣪ ִֶָ  ★ ˖ ࣪ ִֶָ ۰✦.꒷۰꒷⏝*

*★ Información De Usuario ★*
╭─ - ✦⢄⢁✩*⢄⢁✧ ----- ✦ -----✦ --- 
│╭─────────────────
││🌩 *Nombre:* ${taguser}
││🌩 *Dólares:* ${joincount}
││🌩 *Nivel:* ${level}
││🌩 *Coins:* ${money}
││🌩  *Xp:* ${exp}
│╰─────────────────
╰─ - ✦⢄⢁✩*⢄⢁✧ ----- ✦ -----✦ ---  

*★ Información Del Bot ★* 
╭─ - ✦⢄⢁✩*⢄⢁✧ ----- ✦ -----✦ --- 
│╭─────────────────
││📇 *Usuarios En Total:* ${rtotal}
││🌩 *Usuarios Registrados:* ${rtotalreg}
││📅 *Fecha:* ${date}
││🕒 *Hora:* ${moment.tz('America/Mexico_City').format('HH:mm:ss')}
││🔮 *Bot Oficial:* ${(conn.user.jid == global.conn.user.jid ? '' : `@${global.conn.user.jid.split\`@\`[0]}`) || '𝚂𝙾𝚈 𝚄𝙽 𝙱𝙾𝚃 𝙾𝙵𝙲'}
│╰─────────────────
╰─ - ✦⢄⢁✩*⢄⢁✧ ----- ✦ -----✦ --- 

╭✦⢄✩*⢄⢁ ☪︎︎︎̸⃘̸࣭ٜ࣪࣪࣪۬◌⃘۪֟፝֯۫۫︎۫۬🛠️⃘⃪۪֟፝֯۫۫۫۬◌⃘࣭ٜ࣪࣪࣪۬☪︎︎︎︎̸ ⡠*✩⡠✦╮
│╭─────────────────
││ 「𓂃͡Sᴏʟᴜᴄɪᴏɴ ᴀ ᴇʀʀᴏʀᴇs 」
│├━━━━━━━━━━━━━━━━╯
│┣➤ Mensajes en espera
││🛠️✎ _${usedPrefix}fixmsgespera_
│┣➤ Mensajes en espera (owner)
││🛠️✎ _${usedPrefix}dsowner_
│╰─────────────────
╰─ - ✦⢄⢁✩*⢄⢁✧⡠*✩⡈⡠✦ - ─╯

╭✦⢄✩*⢄⢁☪︎︎︎̸⃘̸࣭ٜ࣪࣪࣪۬◌⃘۪֟፝֯۫۫︎۫۬🤖⃘⃪۪֟፝֯۫۫۫۬◌⃘࣭ٜ࣪࣪࣪۬☪︎︎︎︎̸⡠*✩⡠✦╮
│╭─────────────────
││  「 𓂃͡Iɴғᴏ ʙᴏᴛ 」
│├━━━━━━━━━━━━━━━━╯
││🤖✎ _${usedPrefix}velocidad_
││🤖✎ _${usedPrefix}terminosycondiciones_
││🤖✎ _${usedPrefix}estado_
││🤖✎ _${usedPrefix}infobot_
││🤖✎ _${usedPrefix}speedtest_
││🤖✎ _${usedPrefix}owner_
│╰─────────────────
╰─ - ✦⢄⢁✩*⢄⢁✧⡠*✩⡈⡠✦ - ─╯

╭✦⢄✩*⢄⢁ ☪︎︎︎̸⃘̸࣭ٜ࣪࣪࣪۬◌⃘۪֟፝֯۫۫︎۫۬👾⃘⃪۪֟፝֯۫۫۫۬◌⃘࣭ٜ࣪࣪࣪۬☪︎︎︎︎̸ ⡠*✩⡠✦╮
│╭─────────────────
││「 Uɴᴇ ᴀ Kᴀɴᴀ ᴀ ᴛᴜ ɢʀᴜᴘᴏ 」
│├━━━━━━━━━━━━━━━━╯
││👾✎ _${usedPrefix}join *<enlace / link / url>*_
│╰─────────────────
╰─ - ✦⢄⢁✩*⢄⢁✧⡠*✩⡈⡠✦ - ─╯

╭✦⢄✩*⢄⢁ ☪︎︎︎̸⃘̸࣭ٜ࣪࣪࣪۬◌⃘۪֟፝֯۫۫︎۫۬🤖⃘⃪۪֟፝֯۫۫۫۬◌⃘࣭ٜ࣪࣪࣪۬☪︎︎︎︎̸ ⡠*✩⡠✦╮
│╭─────────────────
││ 「 𓂃͡Sᴇʀ ʙᴏᴛ Mɪᴘɪʟᴏᴛ 」
│├━━━━━━━━━━━━━━━━╯
││🤖✎ _${usedPrefix}botclone_
││🤖✎ _${usedPrefix}deletesesion_
││🤖✎ _${usedPrefix}token_
││🤖✎ _${usedPrefix}stop_
││🤖✎ _${usedPrefix}bots_
│╰─────────────────
╰─ - ✦⢄⢁✩*⢄⢁✧⡠*✩⡈⡠✦ - ─╯

╭✦⢄✩*⢄⢁ ☪︎︎︎̸⃘̸࣭ٜ࣪࣪࣪۬◌⃘۪֟፝֯۫۫︎۫۬👑⃘⃪۪֟፝֯۫۫۫۬◌⃘࣭ٜ࣪࣪࣪۬☪︎︎︎︎̸ ⡠*✩⡠✦╮
│╭─────────────────
││ 「 Aᴄᴛɪᴠᴀʀ ᴏ ᴅᴇsᴀᴄᴛɪᴠᴀʀ 」
│├━━━━━━━━━━━━━━━━╯
││👾✎ _${usedPrefix}enable *welcome*_
││👾✎ _${usedPrefix}disable *welcome*_
││👾✎ _${usedPrefix}enable *antilink*_
││👾✎ _${usedPrefix}disable *antilink*_
││👾✎ _${usedPrefix}enable *antilink2*_
││👾✎ _${usedPrefix}disable *antilink2*_
││👾✎ _${usedPrefix}enable *detect*_
││👾✎ _${usedPrefix}disable *detect*_
││👾✎ _${usedPrefix}enable *autosticker*_
││👾✎ _${usedPrefix}disable *autosticker*_
││👾✎ _${usedPrefix}enable *antiviewonce*_
││👾✎ _${usedPrefix}disable *antiviewonce*_
││👾✎ _${usedPrefix}enable *antitoxic*_
││👾✎ _${usedPrefix}disable *antitoxic*_
││👾✎ _${usedPrefix}enable *antitraba*_
││👾✎ _${usedPrefix}disable *antitraba*_
││👾✎ _${usedPrefix}enable *antiarabes*_
││👾✎ _${usedPrefix}disable *antiarabes*_
││👾✎ _${usedPrefix}enable *antiprivado*_
││👾✎ _${usedPrefix}disable *antiprivado*_
│╰─────────────────
╰─ - ✦⢄⢁✩*⢄⢁✧⡠*✩⡈⡠✦ - ─╯

╭✦⢄✩*⢄⢁ ☪︎︎︎̸⃘̸࣭ٜ࣪࣪࣪۬◌⃘۪֟፝֯۫۫︎۫۬🌹⃘⃪۪֟፝֯۫۫۫۬◌⃘࣭ٜ࣪࣪࣪۬☪︎︎︎︎̸ ⡠*✩⡠✦╮
│╭─────────────────
││  「 Rᴇᴘᴏʀᴛᴀʀ ᴇʀʀᴏʀᴇs 」
│├━━━━━━━━━━━━━━━━╯
│┃🌹 _${usedPrefix}reporte *<texto>*_
│╰─────────────────
╰─ - ✦⢄⢁✩*⢄⢁✧⡠*✩⡈⡠✦ - ─╯

╭✦⢄✩*⢄⢁ ☪︎︎︎̸⃘̸࣭ٜ࣪࣪࣪۬◌⃘۪֟፝֯۫۫︎۫۬👑⃘⃪۪֟፝֯۫۫۫۬◌⃘࣭ٜ࣪࣪࣪۬☪︎︎︎︎̸ ⡠*✩⡠✦╮
│╭─────────────────
││ 「 Dᴇsᴄᴀʀɢᴀs 」
│├━━━━━━━━━━━━━━━━╯
││🍧✎ _${usedPrefix}instagram *<enlace / link / url>*_
││🍧✎ _${usedPrefix}mediafire *<enlace / link / url>*_
││🍧✎ _${usedPrefix}gitclone *<enlace / link / url>*_
││🍧✎ _${usedPrefix}gdrive *<enlace / link / url>*_
││🍧✎ _${usedPrefix}tiktok *<enlace / link / url>*_
││🍧✎ _${usedPrefix}tiktokimg *<enlace / link / url>*_
││🍧✎ _${usedPrefix}twitter *<enlace / link / url>*_
││🍧✎ _${usedPrefix}fb *<enlace / link / url>*_
││🍧✎ _${usedPrefix}threads *<enlace / link / url>*_
││🍧✎ _${usedPrefix}ytmp3 *<enlace / link / url>*_
││🍧✎ _${usedPrefix}ytmp4 *<enlace / link / url>*_
││🍧✎ _${usedPrefix}stickerpack *<enlace / link / url>*_
││🍧✎ _${usedPrefix}play *<texto>*_
││🍧✎ _${usedPrefix}playlist *<texto>*_
││🍧✎ _${usedPrefix}spotify *<texto>*_
││🍧✎ _${usedPrefix}ringtone *<texto>*_
││🍧✎ _${usedPrefix}soundcloud *<texto>*_
││🍧✎ _${usedPrefix}imagen *<texto>*_
││🍧✎ _${usedPrefix}pinterest *<texto>*_
││🍧✎ _${usedPrefix}pptiktok *<nombre de usuario>*_
││🍧✎ _${usedPrefix}igstalk *<nombre de usuario>*_
││🍧✎ _${usedPrefix}tiktokstalk *<username>*_
││🍧✎ _${usedPrefix}modapk *<texto>*_
│╰─────────────────
╰─ - ✦⢄⢁✩*⢄⢁✧⡠*✩⡈⡠✦ - ─╯

╭✦⢄✩*⢄⢁☪︎︎︎̸⃘̸࣭ٜ࣪࣪࣪۬◌⃘۪֟፝֯۫۫︎۫۬🔎⃘⃪۪֟፝֯۫۫۫۬◌⃘࣭ٜ࣪࣪࣪۬☪︎︎︎︎̸⡠*✩⡠✦╮
│╭─────────────────
││  「 Bᴜsᴄᴀᴅᴏʀᴇs 」
│├━━━━━━━━━━━━━━━━╯
││🔎✎ _${usedPrefix}githubsearch *<texto>*_
││🔎✎ _${usedPrefix}stickersearch *<texto>*_
││🔎✎ _${usedPrefix}stickersearch2 *<texto>*_
││🔎✎ _${usedPrefix}animeinfo *<texto>*_
││🔎✎ _${usedPrefix}google *<texto>*_
││🔎✎ _${usedPrefix}letra *<texto>*_
││🔎✎ _${usedPrefix}wikipedia *<texto>*_
││🔎✎ _${usedPrefix}ytsearch *<texto>*_
││🔎✎ _${usedPrefix}playstore *<texto>*_
│╰─────────────────
╰─ - ✦⢄⢁✩*⢄⢁✧⡠*✩⡈⡠✦ - ─╯

╭✦⢄✩*⢄⢁ ☪︎︎︎̸⃘̸࣭ٜ࣪࣪࣪۬◌⃘۪֟፝֯۫۫︎۫۬👑⃘⃪۪֟፝֯۫۫۫۬◌⃘࣭ٜ࣪࣪࣪۬☪︎︎︎︎̸ ⡠*✩⡠✦╮
│╭─────────────────
││  「 Gʀᴜᴘᴏs 」
│├━━━━━━━━━━━━━━━━╯
││🧿✎️ _${usedPrefix}add *<numero>*_
││🧿✎️ _${usedPrefix}kick *<@tag>*_
││🧿✎️ _${usedPrefix}kick2 *<@tag>*_
││🧿✎️ _${usedPrefix}listanum *<texto>*_
││🧿✎️ _${usedPrefix}kicknum *<texto>*_
││🧿✎️ _${usedPrefix}grupo *<abrir / cerrar>*_
││🧿✎️ _${usedPrefix}promote *<@tag>*_
││🧿✎️ _${usedPrefix}demote *<@tag>*_
││🧿✎️ _${usedPrefix}infogroup_
││🧿✎️ _${usedPrefix}resetlink_
││🧿✎️ _${usedPrefix}link_
││🧿✎️ _${usedPrefix}setname *<texto>*_
││🧿✎️ _${usedPrefix}setdesc *<texto>*_
││🧿✎️ _${usedPrefix}invocar *<texto>*_
││🧿✎️ _${usedPrefix}setwelcome *<texto>*_
││🧿✎️ _${usedPrefix}setbye *<texto>*_
││🧿✎️ _${usedPrefix}hidetag *<texto>*_
││🧿✎️ _${usedPrefix}warn *<@tag>*_
││🧿✎️ _${usedPrefix}unwarn *<@tag>*_
││🧿✎️ _${usedPrefix}listwarn_
││🧿✎️ _${usedPrefix}fantasmas_
││🧿✎️ _${usedPrefix}destraba_
││🧿✎️ _${usedPrefix}setpp *<imagen>*_
│╰─────────────────
╰─ - ✦⢄⢁✩*⢄⢁✧⡠*✩⡈⡠✦ - ─╯

╭✦⢄✩*⢄⢁ ☪︎︎︎̸⃘̸࣭ٜ࣪࣪࣪۬◌⃘۪֟፝֯۫۫︎۫۬👑⃘⃪۪֟፝֯۫۫۫۬◌⃘࣭ٜ࣪࣪࣪۬☪︎︎︎︎̸ ⡠*✩⡠✦╮
│╭─────────────────
││  「 Cᴏɴᴠᴇʀᴛɪᴅᴏʀᴇs 」
│├━━━━━━━━━━━━━━━━╯
││🔊✎ _${usedPrefix}toanime *<imagen>*_
││🔊✎ _${usedPrefix}togifaud *<video>*_
││🔊✎ _${usedPrefix}toimg *<sticker>*_
││🔊✎ _${usedPrefix}tomp3 *<video / nota de voz>*_
││🔊✎ _${usedPrefix}toptt *<video / audio>*_
││🔊✎ _${usedPrefix}tovideo *<sticker>*_
││🔊✎ _${usedPrefix}tourl *<video / imagen / audio>*_
││🔊✎ _${usedPrefix}tts *<idioma> <texto>*_
│╰─────────────────
╰─ - ✦⢄⢁✩*⢄⢁✧⡠*✩⡈⡠✦ - ─╯

╭✦⢄✩*⢄⢁ ☪︎︎︎̸⃘̸࣭ٜ࣪࣪࣪۬◌⃘۪֟፝֯۫۫︎۫۬🍨⃘⃪۪֟፝֯۫۫۫۬◌⃘࣭ٜ࣪࣪࣪۬☪︎︎︎︎̸ ⡠*✩⡠✦╮
│╭─────────────────
││  「 Eғᴇᴄᴛᴏs ʏ ʟᴏɢᴏs 」
│├━━━━━━━━━━━━━━━━╯
││🍨✎ _${usedPrefix}logos *<efecto> <texto>*_
││🍨✎ _${usedPrefix}ytcomment *<texto>*_
││🍨✎ _${usedPrefix}hornycard *<@tag>*_
││🍨✎ _${usedPrefix}simpcard *<@tag>*_
││🍨✎ _${usedPrefix}lolice *<@tag>*_
││🍨✎ _${usedPrefix}itssostupid_
││🍨✎ _${usedPrefix}pixelar_
││🍨✎ _${usedPrefix}blur_
│╰─────────────────
╰─ - ✦⢄⢁✩*⢄⢁✧⡠*✩⡈⡠✦ - ─╯

╭✦⢄✩*⢄⢁ ☪︎︎︎̸⃘̸࣭ٜ࣪࣪࣪۬◌⃘۪֟፝֯۫۫︎۫۬👑⃘⃪۪֟፝֯۫۫۫۬◌⃘࣭ٜ࣪࣪࣪۬☪︎︎︎︎̸ ⡠*✩⡠✦╮
│╭─────────────────
││ 「 Fʀᴀsᴇs ʏ ᴛᴇxᴛᴏs 」
│├━━━━━━━━━━━━━━━━╯
││🍨✎️  _${usedPrefix}piropo_
│╰─────────────────
╰─ - ✦⢄⢁✩*⢄⢁✧⡠*✩⡈⡠✦ - ─╯

╭✦⢄✩*⢄⢁ ☪︎︎︎̸⃘̸࣭ٜ࣪࣪࣪۬◌⃘۪֟፝֯۫۫︎۫۬👑⃘⃪۪֟፝֯۫۫۫۬◌⃘࣭ٜ࣪࣪࣪۬☪︎︎︎︎̸ ⡠*✩⡠✦╮
│╭─────────────────
││  「 Rᴀɴᴅᴏᴍ 」
│├━━━━━━━━━━━━━━━━╯
││🧿✎ _${usedPrefix}kpop *<blackpink / exo / bts>*_
││🧿✎ _${usedPrefix}cristianoronaldo_
││🧿✎ _${usedPrefix}messi_
││🧿✎ _${usedPrefix}cat_
││🧿✎ _${usedPrefix}dog_
││🧿✎ _${usedPrefix}meme_
││🧿✎ _${usedPrefix}itzy_
││🧿✎ _${usedPrefix}blackpink_
││🧿✎ _${usedPrefix}navidad_
││🧿✎ _${usedPrefix}wpmontaña_
││🧿✎ _${usedPrefix}pubg_
││🧿✎ _${usedPrefix}wpgaming_
││🧿✎ _${usedPrefix}wpaesthetic_
││🧿✎ _${usedPrefix}wpaesthetic2_
││🧿✎ _${usedPrefix}wprandom_
││🧿✎ _${usedPrefix}wallhp_
││🧿✎ _${usedPrefix}wpvehiculo_
││🧿✎ _${usedPrefix}wpmoto_
││🧿✎ _${usedPrefix}neko_
││🧿✎ _${usedPrefix}waifu_
│╰─────────────────
╰─ - ✦⢄⢁✩*⢄⢁✧⡠*✩⡈⡠✦ - ─╯

╭✦⢄✩*⢄⢁ ☪︎︎︎̸⃘̸࣭ٜ࣪࣪࣪۬◌⃘۪֟፝֯۫۫︎۫۬👑⃘⃪۪֟፝֯۫۫۫۬◌⃘࣭ٜ࣪࣪࣪۬☪︎︎︎︎̸ ⡠*✩⡠✦╮
│╭─────────────────
││  「 ꪹ͜𓂃͡Hᴇʀʀᴀᴍɪᴇɴᴛᴀs 」
│├━━━━━━━━━━━━━━━━╯
││⚙️✎ _${usedPrefix}inspect *<link wa_gc>*_
││⚙️✎ _${usedPrefix}spamwa *<numero|texto|cantidad>*_
││⚙️✎ _${usedPrefix}tamaño *<cantidad> <imagen / video>*_
││⚙️✎ _${usedPrefix}readviewonce *<imagen / video>*_
││⚙️✎ _${usedPrefix}clima *<país> <ciudad>*_
││⚙️✎ _${usedPrefix}encuesta *<texto1|texto2...>*_
││⚙️✎ _${usedPrefix}ocr *<responde a imagen>*_
││⚙️✎ _${usedPrefix}hd *<responde a imagen>*_
││⚙️✎ _${usedPrefix}acortar *<enlace / link / url>*_
││⚙️✎ _${usedPrefix}calc *<operacion math>*_
││⚙️✎ _${usedPrefix}del *<mensaje>*_
││⚙️✎ _${usedPrefix}whatmusic *<audio>*_
││⚙️✎ _${usedPrefix}readqr *<imagen (QR)>*_
││⚙️✎ _${usedPrefix}qrcode *<texto>*_
││⚙️✎ _${usedPrefix}readmore *<texto1| texto2>*_
││⚙️✎ _${usedPrefix}styletext *<texto>*_
││⚙️✎ _${usedPrefix}traducir *<texto>*_
││⚙️✎ _${usedPrefix}nowa *<numero>*_
││⚙️✎ _${usedPrefix}horario_
││⚙️✎ _${usedPrefix}dropmail_
││⚙️✎ _${usedPrefix}recordatorio *<tiempo> <texto>*_
│╰─────────────────
╰─ - ✦⢄⢁✩*⢄⢁✧⡠*✩⡈⡠✦ - ─╯

╭✦⢄✩*⢄⢁ ☪︎︎︎̸⃘̸࣭ٜ࣪࣪࣪۬◌⃘۪֟፝֯۫۫︎۫۬👑⃘⃪۪֟፝֯۫۫۫۬◌⃘࣭ٜ࣪࣪࣪۬☪︎︎︎︎̸ ⡠*✩⡠✦╮
│╭─────────────────
││ 「 Aᴜᴅɪᴏs ᴇғᴇᴄᴛᴏs 」
│├━━━━━━━━━━━━━━━━╯
││🎤𝘙𝘦𝘴𝘱𝘰𝘯𝘥𝘦 𝘈 𝘜𝘯𝘢 𝘕𝘰𝘵𝘢 𝘋𝘦 𝘈𝘶𝘥𝘪𝘰
││🎤✎ _${usedPrefix}bass_
││🎤✎ _${usedPrefix}blown_
││🎤✎ _${usedPrefix}deep_
││🎤✎ _${usedPrefix}earrape_
││🎤✎ _${usedPrefix}fast_
││🎤✎ _${usedPrefix}fat_
││🎤✎ _${usedPrefix}nightcore_
││🎤✎ _${usedPrefix}reverse_
││🎤✎ _${usedPrefix}robot_
││🎤✎ _${usedPrefix}slow_
││🎤✎ _${usedPrefix}smooth_
│╰─────────────────
╰─ - ✦⢄⢁✩*⢄⢁✧⡠*✩⡈⡠✦ - ─╯

╭✦⢄✩*⢄⢁ ☪︎︎︎̸⃘̸࣭ٜ࣪࣪࣪۬◌⃘۪֟፝֯۫۫︎۫۬👑⃘⃪۪֟፝֯۫۫۫۬◌⃘࣭ٜ࣪࣪࣪۬☪︎︎︎︎̸ ⡠*✩⡠✦╮
│╭─────────────────
││     「 ꪹ͜𓂃͡Sᴛɪᴄᴋᴇʀ 」
│├━━━━━━━━━━━━━━━━╯
││🧿✎ _${usedPrefix}sticker *<responder a imagen o video>*_
││🧿✎ _${usedPrefix}s *<responder a imagen o video>*_
││🧿✎ _${usedPrefix}emojimix *<emoji 1>&<emoji 2>*_
││🧿✎ _${usedPrefix}scircle *<imagen>*_
││🧿✎ _${usedPrefix}sremovebg *<imagen>*_
││🧿✎ _${usedPrefix}semoji *<tipo> <emoji>*_
││🧿✎ _${usedPrefix}qc *<texto>*_
││🧿✎ _${usedPrefix}attp *<texto>*_
││🧿✎ _${usedPrefix}ttp *<texto>*_
││🧿✎ _${usedPrefix}slap *<@tag>*_
││🧿✎ _${usedPrefix}dado_
││🧿✎ _${usedPrefix}wm *<packname> <author>*_
││🧿✎ _${usedPrefix}stickermarker *<efecto> <imagen>*_
││🧿✎ _${usedPrefix}stickerfilter *<efecto> <imagen>*_
│╰─────────────────
╰─ - ✦⢄⢁✩*⢄⢁✧⡠*✩⡈⡠✦ - ─╯

╭✦⢄✩*⢄⢁ ☪︎︎︎̸⃘̸࣭ٜ࣪࣪࣪۬◌⃘۪֟፝֯۫۫︎۫۬👑⃘⃪۪֟፝֯۫۫۫۬◌⃘࣭ٜ࣪࣪࣪۬☪︎︎︎︎̸ ⡠*✩⡠✦╮
│╭─────────────────
││       「 ꪹ͜𓂃͡Oᴡɴᴇʀ 」
│├━━━━━━━━━━━━━━━━╯
││👑✎ _${usedPrefix}menuowner_
│╰─────────────────
╰─ - ✦⢄⢁✩*⢄⢁✧⡠*✩⡈⡠✦ - ─╯`;
   await conn.sendMessage(m.chat, {text: txt.trim(), mentions: [...txt.matchAll(/@([0-9]{5,16}|0)/g)].map((v) => v[1] + '@s.whatsapp.net'), contextInfo: {forwardingScore: 9999999, isForwarded: true, mentionedJid: [...txt.matchAll(/@([0-9]{5,16}|0)/g)].map((v) => v[1] + '@s.whatsapp.net'), "externalAdReply": {"showAdAttribution": true, "containsAutoReply": true, "renderLargerThumbnail": true, "title": '🌸 Kana Arima - Bot', "containsAutoReply": true, "mediaType": 1, "thumbnail": imagen1, "mediaUrl": global.channel, "sourceUrl": global.channel}}}, {quoted: fkon});
  } catch {
    conn.reply(m.chat, '🧸 *Ocurrió Un Error*', m);
  }
};
handler.help = ['menu'];
handler.tags = ['menu'];
handler.command = /^(menu|allmenu|menú|help|menucompleto)$/i;
handler.register = true
export default handler;
