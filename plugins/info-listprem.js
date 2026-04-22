import fs from 'fs';

// ── Helpers ───────────────────────────────────────────────────────────────────

function sort(property, ascending = true) {
  if (property) return (...args) => args[ascending & 1][property] - args[!ascending & 1][property];
  else          return (...args) => args[ascending & 1] - args[!ascending & 1];
}

function toNumber(property, _default = 0) {
  if (property) return (a, i, b) => ({ ...b[i], [property]: a[property] ?? _default });
  else          return (a) => a ?? _default;
}

function clockString(ms, labels) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const s  = totalSec % 60;
  const m  = Math.floor(totalSec / 60) % 60;
  const h  = Math.floor(totalSec / 3600) % 24;
  const d  = Math.floor(totalSec / 86400);
  const w  = Math.floor(d / 7);
  const mo = Math.floor(d / 30);
  const y  = Math.floor(d / 365);
  return [
    `${labels[0]} ${y}`,
    `${labels[1]} ${mo}`,
    `${labels[2]} ${w}`,
    `${labels[3]} ${d}`,
    `${labels[4]} ${h}`,
    `${labels[5]} ${m}`,
    `${labels[6]} ${s}`,
  ].join('\n');
}

// Obtiene JIDs de owners desde global.owner (soporta string o array anidado)
function getOwnerJids() {
  const raw = global.owner ?? [];
  return raw.map(v => {
    const num = Array.isArray(v) ? v[0] : v;
    return num.includes('@') ? num : `${num}@s.whatsapp.net`;
  });
}

// ── Handler ───────────────────────────────────────────────────────────────────

const handler = async (m, { conn, args, isPrems }) => {
  const idioma     = global.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`, 'utf-8'));
  const tradutor   = _translate.plugins.info_listprem;

  const now      = Date.now();
  const userJid  = '@' + m.sender.split('@')[0];
  const userData = global.db.data.users[m.sender];
  const prem     = userData.premium;
  const premTime = userData.premiumTime;

  // ── Estado del usuario actual ─────────────────────────────────────────────
  let statusLine;
  if (prem && premTime > 0) {
    statusLine = `${tradutor.texto1[2]} ${clockString(premTime - now, tradutor.texto3)}`;
  } else if (isPrems) {
    // Owner / premium permanente (no tiene premiumTime en DB)
    statusLine = tradutor.texto1[3]; // ej: "👑 Owner — Premium permanente"
  } else {
    statusLine = tradutor.texto1[4]; // ej: "No es usuario premium ❌"
  }

  // ── Construir lista premium ───────────────────────────────────────────────
  const ownerJids = getOwnerJids();

  // Usuarios con premiumTime > 0 en DB
  const premUsers = Object.entries(global.db.data.users)
    .filter(([, v]) => v.premiumTime > 0)
    .map(([key, value]) => ({ ...value, jid: key, isOwner: false }));

  // Añadir owners que NO estén ya en premUsers
  const premJids = new Set(premUsers.map(u => u.jid));
  const ownerUsers = ownerJids
    .filter(jid => !premJids.has(jid))
    .map(jid => ({
      jid,
      premiumTime: Infinity,  // permanente
      isOwner: true,
    }));

  const allPrem = [...ownerUsers, ...premUsers];
  const sortedP = allPrem.map(toNumber('premiumTime')).sort(sort('premiumTime'));

  const len = args[0] && args[0].length > 0
    ? Math.min(100, Math.max(parseInt(args[0]) || 10, 10))
    : Math.min(10, sortedP.length);

  // ── Sin nadie premium ─────────────────────────────────────────────────────
  if (sortedP.length === 0) {
    const infoprem = [
      `${tradutor.texto2[0]} ${userJid}`,
      statusLine,
      '',
      tradutor.texto2[3],
    ].join('\n').trim();

    return m.reply(infoprem, null, { mentions: conn.parseMention(infoprem) });
  }

  // ── Lista ─────────────────────────────────────────────────────────────────
  const listItems = sortedP.slice(0, len).map(({ jid, premiumTime: pt, isOwner }) => {
    const tag      = '@' + jid.split('@')[0];
    const timeLine = isOwner || pt === Infinity
      ? `${tradutor.texto1[7]} 👑 Permanente`
      : pt - now > 0
        ? `${tradutor.texto1[7]} ${clockString(pt - now, tradutor.texto3)}`
        : tradutor.texto1[8];
    return `${tradutor.texto1[6]} ${tag}\n${timeLine}`;
  }).join('\n\n');

  const infoprem = [
    tradutor.texto1[0],
    '',
    `${tradutor.texto1[1]} ${userJid}`,
    statusLine,
    '',
    tradutor.texto1[5],
    '',
    listItems,
  ].join('\n').trim();

  m.reply(infoprem, null, { mentions: conn.parseMention(infoprem) });
};

handler.help    = ['premlist'];
handler.tags    = ['info'];
handler.command = /^(listprem|premlist|listavip|viplista)$/i;
export default handler;
