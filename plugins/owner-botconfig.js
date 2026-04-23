/**
 * ╔══════════════════════════════════════════════════════╗
 * ║         owner-botconfig.js  — KanaArima-MD           ║
 * ║  Plugin de configuración del bot (solo propietario)  ║
 * ║  Autor: MINORURAKUEN | GitHub: otakusan212@gmail.com ║
 * ╚══════════════════════════════════════════════════════╝
 *
 * COMANDOS DISPONIBLES (solo dueño):
 *  .setnombre  <texto>   — Cambia el nombre del bot
 *  .setwm      <texto>   — Cambia el watermark/firma
 *  .setpack    <texto>   — Cambia el packname de stickers
 *  .setauthor  <texto>   — Cambia el autor de stickers
 *  .setstate   <texto>   — Cambia el estado/about del bot en WhatsApp
 *  .setpp                — Cambia la foto de perfil (imagen citada/adjunta)
 *  .setbanner            — Cambia el banner del menú (imagen citada/adjunta)
 *  .setvideo             — Cambia el banner por un VIDEO (video citado/adjunto)
 *  .delbanner            — Elimina el banner personalizado (vuelve al original)
 *  .botconfig            — Muestra la configuración actual del bot
 *  .resetbotconfig       — Restaura la configuración de fábrica
 */

import fs from 'fs';
import path from 'path';

// ─── Ruta del archivo de persistencia ───────────────────────────────────────
const CONFIG_FILE = './src/bot-custom-config.json';
const BANNER_IMG  = './src/assets/images/languages/es/banner_custom.png';
const BANNER_VID  = './src/assets/images/languages/es/banner_custom.mp4';

// ─── Valores de fábrica (leídos desde globals en tiempo de carga) ─────────
const DEFAULTS = {
  wm:         global.wm         || 'Kana Arima - Bot',
  titulowm:   global.titulowm   || 'Kana Bot',
  titulowm2:  global.titulowm2  || 'Kana Bot',
  packname:   global.packname   || 'Kana',
  author:     global.author     || 'MINORURAKUEN',
  igfg:       global.igfg       || 'Kana Arima',
  gt:         global.gt         || 'Kana Arima-MD',
  kanaarima:  global.kanaarima  || 'Kana Arima-MD',
  bannerType: 'default',        // 'default' | 'image' | 'video'
};

// ─── Cargar configuración persistida ─────────────────────────────────────────
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      applyConfig(saved);
      console.log('\x1b[36m[BotConfig]\x1b[0m Configuración personalizada cargada ✔');
    }
  } catch (e) {
    console.error('\x1b[31m[BotConfig]\x1b[0m Error al cargar config:', e.message);
  }
}

// ─── Aplicar configuración a los globals ─────────────────────────────────────
function applyConfig(cfg) {
  if (cfg.wm)        global.wm        = cfg.wm;
  if (cfg.titulowm)  global.titulowm  = cfg.titulowm;
  if (cfg.titulowm2) global.titulowm2 = cfg.titulowm2;
  if (cfg.packname)  global.packname  = cfg.packname;
  if (cfg.author)    global.author    = cfg.author;
  if (cfg.igfg)      global.igfg      = cfg.igfg;
  if (cfg.gt)        global.gt        = cfg.gt;
  if (cfg.kanaarima) global.kanaarima = cfg.kanaarima;

  // Recargar banner según tipo guardado
  if (cfg.bannerType === 'image' && fs.existsSync(BANNER_IMG)) {
    global.imagen1 = fs.readFileSync(BANNER_IMG);
    global._bannerType = 'image';
  } else if (cfg.bannerType === 'video') {
    global._bannerType = 'video';
  } else {
    global._bannerType = 'default';
  }
}

// ─── Guardar configuración en disco ──────────────────────────────────────────
function saveConfig(data) {
  try {
    fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('\x1b[31m[BotConfig]\x1b[0m Error guardando config:', e.message);
  }
}

function currentConfig() {
  try {
    return fs.existsSync(CONFIG_FILE)
      ? JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))
      : { ...DEFAULTS };
  } catch { return { ...DEFAULTS }; }
}

// Cargar al arrancar el bot
loadConfig();

// ─── Handler principal ────────────────────────────────────────────────────────
const handler = async (m, { conn, args, usedPrefix, command, isOwner, isROwner }) => {

  // ── Permiso: solo el dueño real del bot ──────────────────────────────────
  if (!isOwner && !isROwner) {
    return conn.sendMessage(m.chat, {
      text: `❌ *Solo el dueño del bot puede usar este comando.*`
    }, { quoted: m });
  }

  const text  = args.join(' ').trim();
  const cfg   = currentConfig();

  // ────────────────────────────────────────────────────────────────────────
  // .setnombre / .setbotname
  // ────────────────────────────────────────────────────────────────────────
  if (/^(setnombre|setbotname|setnick)$/i.test(command)) {
    if (!text) return m.reply(`✏️ Uso: *${usedPrefix}setnombre <nombre>*\nEjemplo: ${usedPrefix}setnombre Sakura Bot`);

    global.wm        = text;
    global.titulowm  = text;
    global.titulowm2 = text;
    global.igfg      = text;
    global.gt        = text;
    global.kanaarima = text;

    cfg.wm = cfg.titulowm = cfg.titulowm2 = cfg.igfg = cfg.gt = cfg.kanaarima = text;
    saveConfig(cfg);

    // Intentar cambiar el nombre en WhatsApp (puede requerir permisos)
    try { await conn.updateProfileName(text); } catch (_) { /* Ignorar si el cliente no lo soporta */ }

    return conn.sendMessage(m.chat, {
      text: `✅ *Nombre del bot actualizado*\n\n🤖 Nuevo nombre: *${text}*`
    }, { quoted: m });
  }

  // ────────────────────────────────────────────────────────────────────────
  // .setwm / .setwatermark
  // ────────────────────────────────────────────────────────────────────────
  if (/^(setwm|setwatermark|setwatermark)$/i.test(command)) {
    if (!text) return m.reply(`✏️ Uso: *${usedPrefix}setwm <texto>*\nEjemplo: ${usedPrefix}setwm © Sakura Bot 2025`);

    global.wm = text;
    cfg.wm = text;
    saveConfig(cfg);

    return conn.sendMessage(m.chat, {
      text: `✅ *Watermark actualizado*\n\n📝 Nuevo WM: *${text}*`
    }, { quoted: m });
  }

  // ────────────────────────────────────────────────────────────────────────
  // .setpack
  // ────────────────────────────────────────────────────────────────────────
  if (/^(setpack|setpackname)$/i.test(command)) {
    if (!text) return m.reply(`✏️ Uso: *${usedPrefix}setpack <nombre>*\nEjemplo: ${usedPrefix}setpack Sakura Stickers`);

    global.packname = text;
    cfg.packname = text;
    saveConfig(cfg);

    return conn.sendMessage(m.chat, {
      text: `✅ *Pack de stickers actualizado*\n\n📦 Nuevo pack: *${text}*`
    }, { quoted: m });
  }

  // ────────────────────────────────────────────────────────────────────────
  // .setauthor
  // ────────────────────────────────────────────────────────────────────────
  if (/^(setauthor|setautor)$/i.test(command)) {
    if (!text) return m.reply(`✏️ Uso: *${usedPrefix}setauthor <nombre>*\nEjemplo: ${usedPrefix}setauthor MINORURAKUEN`);

    global.author = text;
    cfg.author = text;
    saveConfig(cfg);

    return conn.sendMessage(m.chat, {
      text: `✅ *Autor de stickers actualizado*\n\n✍️ Nuevo autor: *${text}*`
    }, { quoted: m });
  }

  // ────────────────────────────────────────────────────────────────────────
  // .setstate / .setstatus / .setbio
  // ────────────────────────────────────────────────────────────────────────
  if (/^(setstate|setstatus|setbio|setabout)$/i.test(command)) {
    if (!text) return m.reply(`✏️ Uso: *${usedPrefix}setstate <texto>*\nEjemplo: ${usedPrefix}setstate 🤖 Bot activo 24/7`);

    try {
      await conn.updateProfileStatus(text);
      cfg.state = text;
      saveConfig(cfg);
      return conn.sendMessage(m.chat, {
        text: `✅ *Estado/Bio actualizado*\n\n💬 Nuevo estado: _${text}_`
      }, { quoted: m });
    } catch (e) {
      return m.reply(`❌ Error al cambiar el estado: ${e.message}`);
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // .setpp — Cambiar foto de perfil del bot
  // ────────────────────────────────────────────────────────────────────────
  if (/^(setpp|setfoto|setpfp|setperfil)$/i.test(command)) {
    const quoted = m.quoted || m;
    const mime   = (quoted.mimetype || '').split('/')[0];

    // Verificar que se adjuntó una imagen
    if (!quoted || !/(image)/.test(quoted.mimetype || '')) {
      return m.reply(`✏️ Uso: *${usedPrefix}setpp*\n📎 Cita o adjunta una *imagen* junto al comando.`);
    }

    const media = await quoted.download();

    try {
      await conn.updateProfilePicture(conn.user.jid, media);
      return conn.sendMessage(m.chat, {
        text: `✅ *Foto de perfil del bot actualizada* 🖼️`
      }, { quoted: m });
    } catch (e) {
      return m.reply(`❌ No se pudo cambiar la foto de perfil.\nError: ${e.message}`);
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // .setbanner — Cambiar banner/imagen del menú
  // ────────────────────────────────────────────────────────────────────────
  if (/^(setbanner|setmenu|setimg|setimagen)$/i.test(command)) {
    const quoted = m.quoted || m;

    if (!quoted || !/(image)/.test(quoted.mimetype || '')) {
      return m.reply(`✏️ Uso: *${usedPrefix}setbanner*\n📎 Cita o adjunta una *imagen* junto al comando.\n_(Reemplazará la imagen del menú principal)_`);
    }

    const media = await quoted.download();

    try {
      fs.mkdirSync(path.dirname(BANNER_IMG), { recursive: true });
      fs.writeFileSync(BANNER_IMG, media);
      global.imagen1      = media;
      global._bannerType  = 'image';
      cfg.bannerType      = 'image';
      saveConfig(cfg);

      return conn.sendFile(m.chat, media, 'banner.png',
        `✅ *Banner del menú actualizado* 🖼️\n_El nuevo banner se usará al llamar al menú._`, m);
    } catch (e) {
      return m.reply(`❌ Error al guardar el banner: ${e.message}`);
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // .setvideo — Cambiar banner por VIDEO
  // ────────────────────────────────────────────────────────────────────────
  if (/^(setvideo|setbannervid|setvid|setbannervideo)$/i.test(command)) {
    const quoted = m.quoted || m;

    if (!quoted || !/(video)/.test(quoted.mimetype || '')) {
      return m.reply(`✏️ Uso: *${usedPrefix}setvideo*\n📎 Cita o adjunta un *video* junto al comando.\n_(Se usará como banner animado del menú)_`);
    }

    const media = await quoted.download();

    try {
      fs.mkdirSync(path.dirname(BANNER_VID), { recursive: true });
      fs.writeFileSync(BANNER_VID, media);
      global._bannerType  = 'video';
      global._bannerVideo = media;
      cfg.bannerType      = 'video';
      saveConfig(cfg);

      return conn.sendFile(m.chat, media, 'banner.mp4',
        `✅ *Banner de VIDEO actualizado* 🎬\n_El video se usará como banner animado del menú._`, m);
    } catch (e) {
      return m.reply(`❌ Error al guardar el video: ${e.message}`);
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // .delbanner — Eliminar banner personalizado
  // ────────────────────────────────────────────────────────────────────────
  if (/^(delbanner|removebanner|resetbanner)$/i.test(command)) {
    try {
      if (fs.existsSync(BANNER_IMG)) fs.unlinkSync(BANNER_IMG);
      if (fs.existsSync(BANNER_VID)) fs.unlinkSync(BANNER_VID);

      global.imagen1     = fs.readFileSync('./src/assets/images/languages/es/menu.png');
      global._bannerType = 'default';
      delete global._bannerVideo;
      cfg.bannerType = 'default';
      saveConfig(cfg);

      return conn.sendMessage(m.chat, {
        text: `✅ *Banner eliminado*\n_Se restauró el banner original del bot._`
      }, { quoted: m });
    } catch (e) {
      return m.reply(`❌ Error al eliminar el banner: ${e.message}`);
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // .botconfig — Mostrar configuración actual
  // ────────────────────────────────────────────────────────────────────────
  if (/^(botconfig|configbot|botinfo|infobot)$/i.test(command)) {
    const bannerStatus =
      global._bannerType === 'image' ? '🖼️ Imagen personalizada' :
      global._bannerType === 'video' ? '🎬 Video personalizado'  :
      '📂 Banner original (default)';

    const info = `
╔══════════════════════════════╗
║   ⚙️  CONFIGURACIÓN DEL BOT   ║
╚══════════════════════════════╝

🤖 *Nombre:*    ${global.wm || '—'}
📝 *Watermark:* ${global.wm || '—'}
📦 *Pack:*      ${global.packname || '—'}
✍️  *Autor:*    ${global.author || '—'}
🖼️  *Banner:*   ${bannerStatus}
💬 *Estado:*    ${cfg.state || '_(no establecido)_'}

╔══════════════════════════════╗
║        📋 COMANDOS           ║
╚══════════════════════════════╝
┊✦ ${usedPrefix}setnombre  <nombre>
┊✦ ${usedPrefix}setwm      <texto>
┊✦ ${usedPrefix}setpack    <nombre>
┊✦ ${usedPrefix}setauthor  <nombre>
┊✦ ${usedPrefix}setstate   <texto>
┊✦ ${usedPrefix}setpp      _(citar imagen)_
┊✦ ${usedPrefix}setbanner  _(citar imagen)_
┊✦ ${usedPrefix}setvideo   _(citar video)_
┊✦ ${usedPrefix}delbanner
┊✦ ${usedPrefix}resetbotconfig
╰━═┅═━──────────────────๑
`.trim();

    const banner = global.imagen1 || null;
    if (banner) {
      return conn.sendFile(m.chat, banner, 'config.jpg', info, m);
    } else {
      return conn.sendMessage(m.chat, { text: info }, { quoted: m });
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // .resetbotconfig — Restaurar valores de fábrica
  // ────────────────────────────────────────────────────────────────────────
  if (/^(resetbotconfig|resetconfig|resetbot)$/i.test(command)) {
    // Borrar archivos de banner personalizados
    try { if (fs.existsSync(BANNER_IMG)) fs.unlinkSync(BANNER_IMG); } catch (_) {}
    try { if (fs.existsSync(BANNER_VID)) fs.unlinkSync(BANNER_VID); } catch (_) {}

    applyConfig({ ...DEFAULTS });
    global.imagen1     = fs.readFileSync('./src/assets/images/languages/es/menu.png');
    global._bannerType = 'default';
    delete global._bannerVideo;

    saveConfig({ ...DEFAULTS });

    return conn.sendMessage(m.chat, {
      text: `✅ *Configuración del bot restaurada*\n_Todos los valores volvieron a los valores de fábrica._`
    }, { quoted: m });
  }
};

// ─── Metadatos del plugin ──────────────────────────────────────────────────
handler.help    = ['botconfig', 'setnombre', 'setwm', 'setbanner', 'setvideo', 'setpp', 'setstate'];
handler.tags    = ['owner', 'config'];
handler.command = /^(setnombre|setbotname|setnick|setwm|setwatermark|setpack|setpackname|setauthor|setautor|setstate|setstatus|setbio|setabout|setpp|setfoto|setpfp|setperfil|setbanner|setmenu|setimg|setimagen|setvideo|setbannervid|setvid|setbannervideo|delbanner|removebanner|resetbanner|botconfig|configbot|botinfo|infobot|resetbotconfig|resetconfig|resetbot)$/i;
handler.owner   = true;   // Solo el dueño puede usarlo (handler.js lo filtra automáticamente)
handler.rowner  = false;

export default handler;
