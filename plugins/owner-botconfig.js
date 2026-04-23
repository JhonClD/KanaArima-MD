/**
 * ˚⊱🪷⊰˚ ⿻ 𓂃 ࣪˖ ִֶָ 𓈈
 * ╭┈─────────────────── ೄ ྀ ࿐ ˊˎ-
 * ┊✦ owner-botconfig.js — KanaArima-MD
 * ┊✦ Configuración del bot · Solo propietario
 * ┊✦ Dev: MINORURAKUEN ⭑ otakusan212@gmail.com
 * ╰┈─➤ ❝ Decora tu bot a tu gusto ❞
 * ˚ • 𖥔 ࣪˖ ⭑ ₊ ⭒ *ೃ༄
 *
 * COMANDOS (solo dueño):
 *  .setnombre  <texto>  — Nombre del bot
 *  .setwm      <texto>  — Watermark / firma
 *  .setpack    <texto>  — Packname de stickers
 *  .setauthor  <texto>  — Autor de stickers
 *  .setstate   <texto>  — Estado / bio en WhatsApp
 *  .setpp               — Foto de perfil  (citar imagen)
 *  .setbanner           — Banner del menú (citar imagen)
 *  .setvideo            — Banner animado  (citar video)
 *  .delbanner           — Elimina banner personalizado
 *  .botconfig           — Muestra config actual
 *  .resetbotconfig      — Restaura valores de fábrica
 */

import fs   from 'fs';
import path from 'path';

// ˚⊱🪷⊰˚ ─── Rutas ────────────────────────────────────────────────────────
const CONFIG_FILE = './src/bot-custom-config.json';
const BANNER_IMG  = './src/assets/images/languages/es/banner_custom.png';
const BANNER_VID  = './src/assets/images/languages/es/banner_custom.mp4';

// ˚⊱🪷⊰˚ ─── Decoradores reutilizables ─────────────────────────────────────
const D = {
  top:  `˚⊱🪷⊰˚\n⿻\n𓂃 ࣪˖ ִֶָ 𓈈\n╭┈─────── ೄ ྀ ࿐ ˊˎ-`,
  bot:  `╰━═┅═━────────────────๑\n ִׄ˚ • 𖥔 ࣪˖ ⭑ ₊ ⭒ *ೃ༄`,
  ok:   `✦ ♥︎ ꕤ`,
  err:  `(｡>﹏<｡)~`,
  row:  `┊✦`,
  sep:  `- ◌ ❛❜ ⋆ ♥︎ ꧕ ⪧ ꕤ*. ⸾ 𖡻`,
  tip:  `╰┈─➤`,
  line: `- ◌ ❛❜ ⋆ ♡ ⊹ ★꒷ ᵎᵎ ₊*`,
};

// ˚⊱🪷⊰˚ ─── Valores de fábrica ────────────────────────────────────────────
const DEFAULTS = {
  wm:        global.wm        || 'Kana Arima - Bot',
  titulowm:  global.titulowm  || 'Kana Bot',
  titulowm2: global.titulowm2 || 'Kana Bot',
  packname:  global.packname  || 'Kana',
  author:    global.author    || 'MINORURAKUEN',
  igfg:      global.igfg      || 'Kana Arima',
  gt:        global.gt        || 'Kana Arima-MD',
  kanaarima: global.kanaarima || 'Kana Arima-MD',
  bannerType:'default',
};

// ˚⊱🪷⊰˚ ─── Cargar config persistida ──────────────────────────────────────
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      applyConfig(JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')));
      console.log('\x1b[35m[˚⊱🪷⊰˚ BotConfig]\x1b[0m Config cargada \u2714');
    }
  } catch (e) {
    console.error('\x1b[31m[BotConfig]\x1b[0m Error cargando config:', e.message);
  }
}

// ˚⊱🪷⊰˚ ─── Aplicar globals ────────────────────────────────────────────────
function applyConfig(cfg) {
  if (cfg.wm)        global.wm        = cfg.wm;
  if (cfg.titulowm)  global.titulowm  = cfg.titulowm;
  if (cfg.titulowm2) global.titulowm2 = cfg.titulowm2;
  if (cfg.packname)  global.packname  = cfg.packname;
  if (cfg.author)    global.author    = cfg.author;
  if (cfg.igfg)      global.igfg      = cfg.igfg;
  if (cfg.gt)        global.gt        = cfg.gt;
  if (cfg.kanaarima) global.kanaarima = cfg.kanaarima;

  if (cfg.bannerType === 'image' && fs.existsSync(BANNER_IMG)) {
    global.imagen1     = fs.readFileSync(BANNER_IMG);
    global._bannerType = 'image';
  } else if (cfg.bannerType === 'video') {
    global._bannerType = 'video';
  } else {
    global._bannerType = 'default';
  }
}

// ˚⊱🪷⊰˚ ─── Guardar en disco ──────────────────────────────────────────────
function saveConfig(data) {
  try {
    fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('\x1b[31m[BotConfig]\x1b[0m Error guardando:', e.message);
  }
}

function currentConfig() {
  try {
    return fs.existsSync(CONFIG_FILE)
      ? JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))
      : { ...DEFAULTS };
  } catch { return { ...DEFAULTS }; }
}

// ˚⊱🪷⊰˚ ─── Asegurar directorios ──────────────────────────────────────────
try { fs.mkdirSync('./src/tmp', { recursive: true }); } catch (_) {}

// Cargar al iniciar
loadConfig();

// ═══════════════════════════════════════════════════════════════
//                      HANDLER PRINCIPAL
// ═══════════════════════════════════════════════════════════════
const handler = async (m, { conn, args, usedPrefix, command, isOwner, isROwner }) => {

  // ── Solo el dueño ──────────────────────────────────────────────────────
  if (!isOwner && !isROwner) {
    return conn.sendMessage(m.chat, { text:
`${D.top}
${D.row} ${D.err} *Acceso denegado*
${D.sep}
${D.row} Solo el *dueño del bot* puede
${D.row} usar estos comandos ♡
${D.bot}`
    }, { quoted: m });
  }

  const text = args.join(' ').trim();
  const cfg  = currentConfig();

  // ══════════════════════════════════════════════════════════════
  //  .setnombre / .setbotname / .setnick
  // ══════════════════════════════════════════════════════════════
  if (/^(setnombre|setbotname|setnick)$/i.test(command)) {
    if (!text) return conn.sendMessage(m.chat, { text:
`${D.top}
${D.row} 𝓢𝓮𝓽𝓷𝓸𝓶𝓫𝓻𝓮 — Uso correcto
${D.sep}
${D.row} *Comando:*
${D.tip} ❝ ${usedPrefix}setnombre <nombre> ❞
${D.row} *Ejemplo:*
${D.tip} ❝ ${usedPrefix}setnombre Sakura Bot ❞
${D.bot}`
    }, { quoted: m });

    global.wm = global.titulowm = global.titulowm2 =
    global.igfg = global.gt = global.kanaarima = text;
    cfg.wm = cfg.titulowm = cfg.titulowm2 =
    cfg.igfg = cfg.gt = cfg.kanaarima = text;
    saveConfig(cfg);
    try { await conn.updateProfileName(text); } catch (_) {}

    return conn.sendMessage(m.chat, { text:
`${D.top}
${D.row} ${D.ok} *Nombre actualizado*
${D.sep}
${D.row} Nuevo nombre:
${D.tip} ❝ *${text}* ❞
${D.bot}`
    }, { quoted: m });
  }

  // ══════════════════════════════════════════════════════════════
  //  .setwm / .setwatermark
  // ══════════════════════════════════════════════════════════════
  if (/^(setwm|setwatermark)$/i.test(command)) {
    if (!text) return conn.sendMessage(m.chat, { text:
`${D.top}
${D.row} 𝓢𝓮𝓽𝔀𝓶 — Uso correcto
${D.sep}
${D.row} *Comando:*
${D.tip} ❝ ${usedPrefix}setwm <texto> ❞
${D.row} *Ejemplo:*
${D.tip} ❝ ${usedPrefix}setwm © Sakura Bot 2025 ❞
${D.bot}`
    }, { quoted: m });

    global.wm = text;
    cfg.wm    = text;
    saveConfig(cfg);

    return conn.sendMessage(m.chat, { text:
`${D.top}
${D.row} ${D.ok} *Watermark actualizado*
${D.sep}
${D.row} Nuevo wm:
${D.tip} ❝ _${text}_ ❞
${D.bot}`
    }, { quoted: m });
  }

  // ══════════════════════════════════════════════════════════════
  //  .setpack / .setpackname
  // ══════════════════════════════════════════════════════════════
  if (/^(setpack|setpackname)$/i.test(command)) {
    if (!text) return conn.sendMessage(m.chat, { text:
`${D.top}
${D.row} 𝓢𝓮𝓽𝓹𝓪𝓬𝓴 — Uso correcto
${D.sep}
${D.row} *Comando:*
${D.tip} ❝ ${usedPrefix}setpack <nombre> ❞
${D.row} *Ejemplo:*
${D.tip} ❝ ${usedPrefix}setpack Sakura Stickers ❞
${D.bot}`
    }, { quoted: m });

    global.packname = text;
    cfg.packname    = text;
    saveConfig(cfg);

    return conn.sendMessage(m.chat, { text:
`${D.top}
${D.row} ${D.ok} *Pack de stickers actualizado*
${D.sep}
${D.row} Nuevo pack:
${D.tip} ❝ *${text}* ❞
${D.bot}`
    }, { quoted: m });
  }

  // ══════════════════════════════════════════════════════════════
  //  .setauthor / .setautor
  // ══════════════════════════════════════════════════════════════
  if (/^(setauthor|setautor)$/i.test(command)) {
    if (!text) return conn.sendMessage(m.chat, { text:
`${D.top}
${D.row} 𝓢𝓮𝓽𝓪𝓾𝓽𝓱𝓸𝓻 — Uso correcto
${D.sep}
${D.row} *Comando:*
${D.tip} ❝ ${usedPrefix}setauthor <nombre> ❞
${D.row} *Ejemplo:*
${D.tip} ❝ ${usedPrefix}setauthor MINORURAKUEN ❞
${D.bot}`
    }, { quoted: m });

    global.author = text;
    cfg.author    = text;
    saveConfig(cfg);

    return conn.sendMessage(m.chat, { text:
`${D.top}
${D.row} ${D.ok} *Autor de stickers actualizado*
${D.sep}
${D.row} Nuevo autor:
${D.tip} ❝ *${text}* ❞
${D.bot}`
    }, { quoted: m });
  }

  // ══════════════════════════════════════════════════════════════
  //  .setstate / .setstatus / .setbio / .setabout
  // ══════════════════════════════════════════════════════════════
  if (/^(setstate|setstatus|setbio|setabout)$/i.test(command)) {
    if (!text) return conn.sendMessage(m.chat, { text:
`${D.top}
${D.row} 𝓢𝓮𝓽𝓼𝓽𝓪𝓽𝓮 — Uso correcto
${D.sep}
${D.row} *Comando:*
${D.tip} ❝ ${usedPrefix}setstate <texto> ❞
${D.row} *Ejemplo:*
${D.tip} ❝ ${usedPrefix}setstate Bot activo 24/7 ❞
${D.bot}`
    }, { quoted: m });

    try {
      await conn.updateProfileStatus(text);
      cfg.state = text;
      saveConfig(cfg);
      return conn.sendMessage(m.chat, { text:
`${D.top}
${D.row} ${D.ok} *Estado / Bio actualizado*
${D.sep}
${D.row} Nuevo estado:
${D.tip} ❝ _${text}_ ❞
${D.bot}`
      }, { quoted: m });
    } catch (e) {
      return conn.sendMessage(m.chat, { text:
`${D.top}
${D.row} ${D.err} *Error al cambiar estado*
${D.sep}
${D.row} ${e.message}
${D.bot}`
      }, { quoted: m });
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  .setpp / .setfoto / .setpfp / .setperfil
  // ══════════════════════════════════════════════════════════════
  if (/^(setpp|setfoto|setpfp|setperfil)$/i.test(command)) {
    const quoted = m.quoted || m;

    if (!quoted || !/(image)/.test(quoted.mimetype || '')) {
      return conn.sendMessage(m.chat, { text:
`${D.top}
${D.row} 𝓢𝓮𝓽𝓹𝓹 — Uso correcto
${D.sep}
${D.row} Cita o adjunta una *imagen* ♡
${D.row} junto al comando:
${D.tip} ❝ ${usedPrefix}setpp ❞
${D.bot}`
      }, { quoted: m });
    }

    const media = await quoted.download();
    try {
      await conn.updateProfilePicture(conn.user.jid, media);
      return conn.sendMessage(m.chat, { text:
`${D.top}
${D.row} ${D.ok} *Foto de perfil actualizada*
${D.sep}
${D.row} ₍ᵔ๑・ᴥ・๑ᵔ₎ La nueva imagen
${D.row}   ya esta activa en el bot ~
${D.bot}`
      }, { quoted: m });
    } catch (e) {
      return conn.sendMessage(m.chat, { text:
`${D.top}
${D.row} ${D.err} *No se pudo cambiar la foto*
${D.sep}
${D.row} ${e.message}
${D.bot}`
      }, { quoted: m });
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  .setbanner / .setmenu / .setimg / .setimagen
  // ══════════════════════════════════════════════════════════════
  if (/^(setbanner|setmenu|setimg|setimagen)$/i.test(command)) {
    const quoted = m.quoted || m;

    if (!quoted || !/(image)/.test(quoted.mimetype || '')) {
      return conn.sendMessage(m.chat, { text:
`${D.top}
${D.row} 𝓢𝓮𝓽𝓫𝓪𝓷𝓷𝓮𝓻 — Uso correcto
${D.sep}
${D.row} Cita o adjunta una *imagen* ♡
${D.row} junto al comando:
${D.tip} ❝ ${usedPrefix}setbanner ❞
${D.row} _Reemplazara el banner del menu_
${D.bot}`
      }, { quoted: m });
    }

    const media = await quoted.download();
    try {
      fs.mkdirSync(path.dirname(BANNER_IMG), { recursive: true });
      fs.writeFileSync(BANNER_IMG, media);
      global.imagen1     = media;
      global._bannerType = 'image';
      cfg.bannerType     = 'image';
      saveConfig(cfg);

      return conn.sendMessage(m.chat, {
        image: media,
        caption:
`${D.top}
${D.row} ${D.ok} *Banner del menu actualizado*
${D.sep}
${D.row} ✰ La nueva imagen se mostrara
${D.row}   al llamar al menu principal ♡
${D.bot}`
      }, { quoted: m });
    } catch (e) {
      return conn.sendMessage(m.chat, { text:
`${D.top}
${D.row} ${D.err} *Error al guardar el banner*
${D.sep}
${D.row} ${e.message}
${D.bot}`
      }, { quoted: m });
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  .setvideo / .setbannervid / .setvid / .setbannervideo
  // ══════════════════════════════════════════════════════════════
  if (/^(setvideo|setbannervid|setvid|setbannervideo)$/i.test(command)) {
    const quoted = m.quoted || m;

    if (!quoted || !/(video)/.test(quoted.mimetype || '')) {
      return conn.sendMessage(m.chat, { text:
`${D.top}
${D.row} 𝓢𝓮𝓽𝓿𝓲𝓭𝓮𝓸 — Uso correcto
${D.sep}
${D.row} Cita o adjunta un *video* 🎬
${D.row} junto al comando:
${D.tip} ❝ ${usedPrefix}setvideo ❞
${D.row} _Se usara como banner animado_
${D.bot}`
      }, { quoted: m });
    }

    const media = await quoted.download();
    try {
      fs.mkdirSync(path.dirname(BANNER_VID), { recursive: true });
      fs.writeFileSync(BANNER_VID, media);
      global._bannerType  = 'video';
      global._bannerVideo = media;
      cfg.bannerType      = 'video';
      saveConfig(cfg);

      return conn.sendMessage(m.chat, {
        video: media,
        caption:
`${D.top}
${D.row} ${D.ok} *Banner de VIDEO actualizado* 🎬
${D.sep}
${D.row} ✰ El video ya esta guardado
${D.row}   como banner animado del bot ♡
${D.bot}`
      }, { quoted: m });
    } catch (e) {
      return conn.sendMessage(m.chat, { text:
`${D.top}
${D.row} ${D.err} *Error al guardar el video*
${D.sep}
${D.row} ${e.message}
${D.bot}`
      }, { quoted: m });
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  .delbanner / .removebanner / .resetbanner
  // ══════════════════════════════════════════════════════════════
  if (/^(delbanner|removebanner|resetbanner)$/i.test(command)) {
    try {
      if (fs.existsSync(BANNER_IMG)) fs.unlinkSync(BANNER_IMG);
      if (fs.existsSync(BANNER_VID)) fs.unlinkSync(BANNER_VID);

      global.imagen1     = fs.readFileSync('./src/assets/images/languages/es/menu.png');
      global._bannerType = 'default';
      delete global._bannerVideo;
      cfg.bannerType     = 'default';
      saveConfig(cfg);

      return conn.sendMessage(m.chat, { text:
`${D.top}
${D.row} ${D.ok} *Banner eliminado*
${D.sep}
${D.row} ( . >﹏<｡)~ Se restauro
${D.row}   el banner *original* del bot ♡
${D.bot}`
      }, { quoted: m });
    } catch (e) {
      return conn.sendMessage(m.chat, { text:
`${D.top}
${D.row} ${D.err} *Error al eliminar banner*
${D.sep}
${D.row} ${e.message}
${D.bot}`
      }, { quoted: m });
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  .botconfig / .configbot / .botinfo / .infobot
  // ══════════════════════════════════════════════════════════════
  if (/^(botconfig|configbot|botinfo|infobot)$/i.test(command)) {
    const bannerStatus =
      global._bannerType === 'image' ? '🖼️ Imagen personalizada' :
      global._bannerType === 'video' ? '🎬 Video personalizado'  :
      '📂 Banner original';

    const info =
`˚⊱🪷⊰˚
⿻
𓂃 ࣪˖ ִֶָ 𓈈
╭┈─────── ೄ ྀ ࿐ ˊˎ-
┊✦ ❝ 𝓒𝓸𝓷𝓯𝓲𝓰𝓾𝓻𝓪𝓬𝓲𝓸𝓷 𝓭𝓮𝓵 𝓑𝓸𝓽 ❞
${D.sep}
┊✦ 🤖 *Nombre:*    ${global.wm || '—'}
┊✦ 📝 *Watermark:* ${global.wm || '—'}
┊✦ 📦 *Pack:*      ${global.packname || '—'}
┊✦ ✍️  *Autor:*     ${global.author || '—'}
┊✦ 🖼️  *Banner:*    ${bannerStatus}
┊✦ 💬 *Estado:*    ${cfg.state || '_(sin establecer)_'}
${D.line}
╭┈─────── ೄ ྀ ࿐ ˊˎ-
┊✦ ❝ 𝓒𝓸𝓶𝓪𝓷𝓭𝓸𝓼 ❞
${D.sep}
┊✦ ${usedPrefix}setnombre  _<nombre>_
┊✦ ${usedPrefix}setwm      _<texto>_
┊✦ ${usedPrefix}setpack    _<nombre>_
┊✦ ${usedPrefix}setauthor  _<nombre>_
┊✦ ${usedPrefix}setstate   _<texto>_
┊✦ ${usedPrefix}setpp      _(citar imagen)_
┊✦ ${usedPrefix}setbanner  _(citar imagen)_
┊✦ ${usedPrefix}setvideo   _(citar video)_
┊✦ ${usedPrefix}delbanner
┊✦ ${usedPrefix}resetbotconfig
╰━═┅═━────────────────๑
 ִׄ˚ • 𖥔 ࣪˖ ⭑ ₊ ⭒ *ೃ༄`;

    const banner = global.imagen1 || null;
    if (banner) {
      return conn.sendMessage(m.chat, {
        image: Buffer.isBuffer(banner) ? banner : Buffer.from(banner),
        caption: info
      }, { quoted: m });
    }
    return conn.sendMessage(m.chat, { text: info }, { quoted: m });
  }

  // ══════════════════════════════════════════════════════════════
  //  .resetbotconfig / .resetconfig / .resetbot
  // ══════════════════════════════════════════════════════════════
  if (/^(resetbotconfig|resetconfig|resetbot)$/i.test(command)) {
    try { if (fs.existsSync(BANNER_IMG)) fs.unlinkSync(BANNER_IMG); } catch (_) {}
    try { if (fs.existsSync(BANNER_VID)) fs.unlinkSync(BANNER_VID); } catch (_) {}

    applyConfig({ ...DEFAULTS });
    global.imagen1     = fs.readFileSync('./src/assets/images/languages/es/menu.png');
    global._bannerType = 'default';
    delete global._bannerVideo;
    saveConfig({ ...DEFAULTS });

    return conn.sendMessage(m.chat, { text:
`${D.top}
${D.row} ${D.ok} *Config restaurada*
${D.sep}
${D.row} ٩(๛ ˘ ³˘)۶ Todos los valores
${D.row}   volvieron a los de *fabrica* ♡
${D.bot}`
    }, { quoted: m });
  }
};

// ˚⊱🪷⊰˚ ─── Metadatos ────────────────────────────────────────────────────
handler.help    = ['botconfig', 'setnombre', 'setwm', 'setbanner', 'setvideo', 'setpp', 'setstate'];
handler.tags    = ['owner', 'config'];
handler.command = /^(setnombre|setbotname|setnick|setwm|setwatermark|setpack|setpackname|setauthor|setautor|setstate|setstatus|setbio|setabout|setpp|setfoto|setpfp|setperfil|setbanner|setmenu|setimg|setimagen|setvideo|setbannervid|setvid|setbannervideo|delbanner|removebanner|resetbanner|botconfig|configbot|botinfo|infobot|resetbotconfig|resetconfig|resetbot)$/i;
handler.owner   = true;
handler.rowner  = false;

export default handler;
    
