// plugins/manga-DL.js — v1.0
// Descarga capítulos de manga en español (MangaDex) y los convierte a PDF
//
// Requisito: npm install pdf-lib
//
// Comandos:
//   .mangadl <nombre>         → busca manga, muestra info + lista de capítulos
//   .mangadl <nombre> <cap>   → descarga el capítulo N directamente en PDF
//   .mangacancelar            → cancela descarga activa
//
//   Selección (web/desktop):  responde con la letra  a, b, c, d…
//   Selección (móvil):        botones interactivos nativos
//
//   Ejemplos:
//   .mangadl naruto
//   .mangadl one piece 1000
//   .mangadl berserk 1

import { generateWAMessageFromContent, getDevice } from '@itsliaaa/baileys'
import fs       from 'fs'
import path     from 'path'
import os       from 'os'
import { pipeline } from 'stream/promises'
import https    from 'https'

// ─── Globals ───────────────────────────────────────────────────────────────

global.activeMangaDownloads = global.activeMangaDownloads || new Map() // chatId → true
global.pendingMangaSearch   = global.pendingMangaSearch   || new Map() // chatId → { resultados, owner, usedPrefix }
global.pendingMangaChapters = global.pendingMangaChapters || new Map() // chatId → { chapters, title, owner, … }

// ─── Constantes ───────────────────────────────────────────────────────────

const MDX_API    = 'https://api.mangadex.org'
const MDX_CDN    = 'https://uploads.mangadex.org'
const LANGS      = ['es', 'es-la']         // Spanish / Latin American Spanish
const MAX_LIST   = 26                       // máx. filas en lista interactiva
const RATE_DELAY = 250                      // ms entre peticiones a MangaDex
const MAX_MB     = 95                       // límite de envío WhatsApp (MB)

const httpsAgentManga = new https.Agent({ keepAlive: true })

// ─── Helpers básicos ───────────────────────────────────────────────────────

const sleep       = ms => new Promise(r => setTimeout(r, ms))
const numToLetter = i  => String.fromCharCode(97 + (i % 26))

// ─── MangaDex: petición GET → JSON ────────────────────────────────────────

async function mdxGet(endpoint, params = {}) {
  const { default: axios } = await import('axios')
  const url = new URL(`${MDX_API}${endpoint}`)
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) v.forEach(vi => url.searchParams.append(k, vi))
    else url.searchParams.set(k, String(v))
  }
  const res = await axios.get(url.toString(), {
    headers: { 'User-Agent': 'KanaArimaBot/1.0 (WhatsApp)' },
    timeout : 20000,
    httpsAgent: httpsAgentManga,
  })
  return res.data
}

// ─── MangaDex: buscar manga ────────────────────────────────────────────────

async function searchManga(query) {
  try {
    const data = await mdxGet('/manga', {
      title : query,
      'availableTranslatedLanguage[]': LANGS,
      'includes[]'   : ['cover_art', 'author'],
      'contentRating[]': ['safe', 'suggestive', 'erotica'],
      limit : 10,
    })
    return (data.data || []).map(m => {
      const attr    = m.attributes
      const title   =
        attr.title?.es ||
        attr.title?.['es-la'] ||
        attr.title?.en ||
        Object.values(attr.title || {})[0] || 'Sin título'

      const coverRel = m.relationships?.find(r => r.type === 'cover_art')
      const coverUrl = coverRel?.attributes?.fileName
        ? `${MDX_CDN}/covers/${m.id}/${coverRel.attributes.fileName}.256.jpg`
        : null

      return { id: m.id, title, coverUrl }
    })
  } catch (e) {
    console.error('[Manga searchManga]', e.message)
    return []
  }
}

// ─── MangaDex: información de manga ───────────────────────────────────────

async function getMangaInfo(mangaId) {
  try {
    const data = await mdxGet(`/manga/${mangaId}`, {
      'includes[]': ['cover_art', 'author', 'artist'],
    })
    const m    = data.data
    const attr = m.attributes

    const title =
      attr.title?.es ||
      attr.title?.['es-la'] ||
      attr.title?.en ||
      Object.values(attr.title || {})[0] || 'Sin título'

    const description =
      attr.description?.es ||
      attr.description?.['es-la'] ||
      attr.description?.en || ''

    // Géneros en español (MangaDex ya tiene etiquetas en es)
    const genres = (attr.tags || [])
      .filter(t => ['genre', 'theme', 'format'].includes(t.attributes?.group))
      .map(t =>
        t.attributes?.name?.es ||
        t.attributes?.name?.['es-la'] ||
        t.attributes?.name?.en || ''
      )
      .filter(Boolean)

    const statusMap = {
      ongoing  : '📡 En curso',
      completed: '✅ Completado',
      hiatus   : '⏸️ En hiato',
      cancelled: '❌ Cancelado',
    }
    const status = statusMap[attr.status] || attr.status || 'Desconocido'

    const year     = attr.year ? `${attr.year}` : null
    const coverRel = m.relationships?.find(r => r.type === 'cover_art')
    const coverUrl = coverRel?.attributes?.fileName
      ? `${MDX_CDN}/covers/${m.id}/${coverRel.attributes.fileName}.512.jpg`
      : null

    const author = m.relationships?.find(r => r.type === 'author')?.attributes?.name || null

    return { id: m.id, title, description, genres, status, year, coverUrl, author }
  } catch (e) {
    console.error('[Manga getMangaInfo]', e.message)
    return null
  }
}

// ─── MangaDex: capítulos en español ───────────────────────────────────────
// Descarga todos los capítulos paginados y deduplica por número (prioriza es-la)

async function getChapters(mangaId) {
  const chapters = []
  let   offset   = 0
  const limit    = 100

  try {
    while (true) {
      const data = await mdxGet(`/manga/${mangaId}/feed`, {
        'translatedLanguage[]': LANGS,
        'order[chapter]'      : 'asc',
        'order[volume]'       : 'asc',
        'includes[]'          : ['scanlation_group'],
        limit,
        offset,
      })
      const items = data.data || []
      for (const ch of items) {
        const num   = ch.attributes.chapter != null ? parseFloat(ch.attributes.chapter) : null
        if (num === null || isNaN(num)) continue
        const title = ch.attributes.title || null
        const lang  = ch.attributes.translatedLanguage
        const group = ch.relationships?.find(r => r.type === 'scanlation_group')?.attributes?.name || ''
        const pages = ch.attributes.pages || 0
        chapters.push({ id: ch.id, num, title, lang, group, pages })
      }
      if (items.length < limit) break
      offset += limit
      await sleep(RATE_DELAY)
    }
  } catch (e) {
    console.error('[Manga getChapters]', e.message)
  }

  // Deduplicar: mismo número de capítulo → priorizar es-la > es, mayor nº de páginas
  const seen = new Map()
  for (const ch of chapters) {
    const prev = seen.get(ch.num)
    if (!prev) { seen.set(ch.num, ch); continue }
    const prevPriority = prev.lang === 'es-la' ? 2 : 1
    const thisPriority = ch.lang  === 'es-la' ? 2 : 1
    if (thisPriority > prevPriority || (thisPriority === prevPriority && ch.pages > prev.pages)) {
      seen.set(ch.num, ch)
    }
  }

  return [...seen.values()].sort((a, b) => a.num - b.num)
}

// ─── MangaDex: URLs de páginas de un capítulo ─────────────────────────────

async function getChapterPages(chapterId, dataSaver = true) {
  try {
    const data   = await mdxGet(`/at-home/server/${chapterId}`)
    const base   = data.baseUrl
    const hash   = data.chapter.hash
    const files  = dataSaver ? data.chapter.dataSaver : data.chapter.data
    const folder = dataSaver ? 'data-saver' : 'data'
    return files.map(f => `${base}/${folder}/${hash}/${f}`)
  } catch (e) {
    console.error('[Manga getChapterPages]', e.message)
    return []
  }
}

// ─── enviarListaWA (idéntico al patrón de anime-DL) ───────────────────────
// Móvil  → interactiveMessage nativeFlow single_select
// Web/PC → texto plano con letras a, b, c…

async function enviarListaWA(conn, m, { title, body = '', footer, buttonText = 'SELECCIONAR', sections }) {
  const device   = typeof getDevice === 'function' ? getDevice(m.key.id) : 'android'
  const isMobile = device !== 'desktop' && device !== 'web'

  if (isMobile) {
    try {
      const interactiveMessage = {
        body  : { text: body },
        footer: { text: footer || global.wm || 'Kana Arima Bot' },
        header: { title, hasMediaAttachment: false },
        nativeFlowMessage: {
          buttons: [{
            name: 'single_select',
            buttonParamsJson: JSON.stringify({ title: buttonText, sections }),
          }],
          messageParamsJson: '',
        },
      }
      const msg = generateWAMessageFromContent(
        m.chat,
        { viewOnceMessage: { message: { interactiveMessage } } },
        { userJid: conn.user.jid, quoted: m }
      )
      await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
      return true
    } catch (err) {
      console.error('[manga enviarListaWA]', err.message)
      // caer al fallback texto
    }
  }

  // Fallback texto plano — letras minúsculas
  let idx = 0
  const lineas = sections.flatMap(sec => {
    const cab  = sec.title ? [`\n*${sec.title}*`] : []
    const rows = sec.rows.map(row => {
      const letra = numToLetter(idx++)
      return `*${letra}.* ${row.title}${row.description ? `  —  _${row.description}_` : ''}`
    })
    return [...cab, ...rows]
  })
  await m.reply(
    `*${title}*${body ? '\n' + body : ''}\n\n` +
    lineas.join('\n') +
    `\n\n_Responde con la letra correspondiente_`
  )
  return false
}

// ─── Puntuar similitud de títulos ─────────────────────────────────────────

function puntuarTitulo(a = '', b = '') {
  const norm = s => s.toLowerCase().replace(/[^\w\s]/g, '').trim()
  const na = norm(a), nb = norm(b)
  if (na === nb) return 100
  if (na.includes(nb) || nb.includes(na)) return 80
  const wa = new Set(na.split(' ')), wb = new Set(nb.split(' '))
  const inter = [...wa].filter(x => wb.has(x)).length
  return Math.round((inter / Math.max(wa.size, wb.size)) * 70)
}

// ─── updateStatus helper ───────────────────────────────────────────────────

function makeStatusUpdater(conn, m, initialKey = null) {
  let statusKey = initialKey
  return async (txt) => {
    try {
      if (statusKey) {
        await conn.sendMessage(m.chat, { text: txt, edit: statusKey })
      } else {
        const sent = await m.reply(txt)
        statusKey  = sent?.key ?? null
      }
    } catch (_) {
      try { const sent = await m.reply(txt); statusKey = sent?.key ?? null } catch (_) {}
    }
  }
}

// ─── Mostrar info + lista de capítulos ────────────────────────────────────

async function mostrarInfoYCapitulos(manga, m, conn, usedPrefix, statusKey = null) {
  const updateStatus = makeStatusUpdater(conn, m, statusKey)

  await updateStatus(`📡 Obteniendo datos de *${manga.title || 'manga'}*...`)

  const info = await getMangaInfo(manga.id)
  if (!info) return updateStatus(`❌ No se pudo obtener información del manga.`)

  await updateStatus(`📚 Cargando capítulos de *${info.title}*...`)
  const chapters = await getChapters(manga.id)

  if (!chapters.length) {
    return updateStatus(
      `❌ No hay capítulos en español disponibles para *${info.title}*.\n\n` +
      `_Puede que este manga no tenga traducción al español en MangaDex aún._`
    )
  }

  // Descripción
  const descTxt    = info.description.length > 300
    ? info.description.slice(0, 300).trimEnd() + '…'
    : info.description || 'Sin descripción disponible.'
  const generosTxt = info.genres.length ? info.genres.join(', ') : 'No disponible'

  const caption =
    `*📚 ${info.title}*\n\n` +
    `📖 *Descripción:*\n${descTxt}\n\n` +
    `🏷️ *Géneros:* ${generosTxt}\n` +
    (info.author ? `✏️ *Autor:* ${info.author}\n` : '') +
    (info.year   ? `📅 *Año:* ${info.year}\n`     : '') +
    `📊 *Estado:* ${info.status}\n` +
    `📑 *Capítulos en español:* ${chapters.length}`

  // Enviar portada + caption (o solo texto si falla)
  if (info.coverUrl) {
    try {
      await conn.sendMessage(m.chat, { image: { url: info.coverUrl }, caption }, { quoted: m })
      await updateStatus(`✅ *${info.title}* — ${chapters.length} cap. disponibles`)
    } catch (_) {
      await updateStatus(caption)
    }
  } else {
    await updateStatus(caption)
  }

  // Guardar estado para selección interactiva
  global.pendingMangaChapters.set(m.chat, {
    chapters,
    mangaId  : info.id,
    title    : info.title,
    owner    : m.sender,
    usedPrefix,
    timestamp: Date.now(),
  })

  // Lista interactiva: últimos MAX_LIST capítulos
  const slice = chapters.slice(-MAX_LIST)
  const nota  = chapters.length > MAX_LIST
    ? `Últimos ${slice.length} de ${chapters.length} cap.\nEscribe *${usedPrefix}mangadl ${info.title} <N>* para ir a cualquiera.`
    : 'Elige el capítulo a descargar:'

  await enviarListaWA(conn, m, {
    title     : `📋 Capítulos — ${info.title}`,
    body      : nota,
    buttonText: 'VER CAPÍTULOS',
    footer    : global.wm || 'Kana Arima Bot',
    sections  : [{
      title: 'Capítulos disponibles',
      rows : slice.map(ch => ({
        title      : `Capítulo ${ch.num}${ch.title ? ' — ' + ch.title.slice(0, 40) : ''}`,
        description: [ch.pages ? `${ch.pages} págs` : '', ch.group].filter(Boolean).join(' · '),
        id         : `__manga_cap__${info.id}__${ch.id}__${ch.num}`,
      })),
    }],
  })
}

// ─── Descargar capítulo y convertir a PDF ─────────────────────────────────

async function descargarYConvertirPDF({ chapterId, chapterNum, mangaTitle }, m, conn, statusKey = null) {
  const updateStatus = makeStatusUpdater(conn, m, statusKey)
  const tmpDir  = fs.mkdtempSync(path.join(os.tmpdir(), 'manga_'))
  const safeTitle = mangaTitle.slice(0, 35).replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_')
  const pdfPath = path.join(os.tmpdir(), `${safeTitle}_Cap${chapterNum}.pdf`)

  try {
    await updateStatus(`📥 Obteniendo páginas del capítulo *${chapterNum}*...`)

    const pages = await getChapterPages(chapterId, true)   // data-saver (menor tamaño)
    if (!pages.length) throw new Error('No se encontraron páginas para este capítulo.')

    const { default: axios } = await import('axios')
    const { PDFDocument }    = await import('pdf-lib')

    const pdfDoc = await PDFDocument.create()
    pdfDoc.setTitle(`${mangaTitle} — Capítulo ${chapterNum}`)
    pdfDoc.setAuthor('KanaArimaBot · MangaDex')
    pdfDoc.setLanguage('es')

    let downloaded = 0, failed = 0

    await updateStatus(
      `⬇️ Descargando *${pages.length} páginas*...\n` +
      `_Cap. ${chapterNum} — ${mangaTitle}_`
    )

    for (let i = 0; i < pages.length; i++) {
      const url = pages[i]
      try {
        const res = await axios.get(url, {
          responseType: 'arraybuffer',
          timeout     : 25000,
          headers     : {
            'Referer'   : 'https://mangadex.org/',
            'User-Agent': 'KanaArimaBot/1.0',
          },
          httpsAgent: httpsAgentManga,
        })
        const buf = Buffer.from(res.data)
        const ct  = (res.headers['content-type'] || '').toLowerCase()

        let img
        try {
          img = ct.includes('png') ? await pdfDoc.embedPng(buf) : await pdfDoc.embedJpg(buf)
        } catch (_) {
          try       { img = await pdfDoc.embedPng(buf) }
          catch (__){ img = await pdfDoc.embedJpg(buf) }
        }

        const page = pdfDoc.addPage([img.width, img.height])
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height })

        downloaded++
        const pct   = ((downloaded / pages.length) * 100).toFixed(1)
        const dlMB  = (Buffer.byteLength(buf) / 1024 / 1024).toFixed(2)
        process.stdout.write(
          `\r[Manga] Cap.${chapterNum}  ${pct}% | ${downloaded}/${pages.length} págs | última: ${dlMB} MB`
        )
        await sleep(RATE_DELAY)
      } catch (pageErr) {
        failed++
        console.error(`\n[Manga] Página ${i + 1} falló:`, pageErr.message)
        await sleep(500)
      }
    }

    process.stdout.write('\n')
    console.log(`[Manga] ✅ Cap.${chapterNum} — ${downloaded} ok · ${failed} fallidas`)

    if (downloaded === 0) throw new Error('Todas las páginas fallaron al descargarse.')

    await updateStatus(`📄 Generando PDF (${downloaded} de ${pages.length} págs)...`)

    const pdfBytes = await pdfDoc.save()
    fs.writeFileSync(pdfPath, pdfBytes)

    const sizeMB = (pdfBytes.length / 1024 / 1024).toFixed(1)
    console.log(`[Manga] PDF: ${sizeMB} MB → ${pdfPath}`)

    if (pdfBytes.length > MAX_MB * 1024 * 1024) {
      throw new Error(
        `El PDF pesa *${sizeMB} MB*, supera el límite de WhatsApp (${MAX_MB} MB).\n` +
        `Prueba activar calidad baja o busca el capítulo dividido en partes.`
      )
    }

    await updateStatus(`⬆️ Subiendo PDF (${sizeMB} MB)...`)

    await conn.sendMessage(m.chat, {
      document: fs.readFileSync(pdfPath),
      fileName: `${safeTitle}_Cap${chapterNum}.pdf`,
      mimetype: 'application/pdf',
      caption :
        `📚 *${mangaTitle}*\n` +
        `📖 Capítulo *${chapterNum}*\n` +
        `📄 ${downloaded} páginas · ${sizeMB} MB\n` +
        `_Fuente: MangaDex · Español_`,
    }, { quoted: m })

    await updateStatus(`✅ *${mangaTitle}* — Cap. ${chapterNum} enviado (${sizeMB} MB)`)

  } catch (err) {
    console.error('[manga PDF]', err.message)
    await updateStatus(`❌ Error: ${err.message}`)
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch (_) {}
    try { fs.unlinkSync(pdfPath)                               } catch (_) {}
    global.activeMangaDownloads.delete(m.chat)
  }
}

// ─── Limpiar sesiones antiguas (> 10 min) ─────────────────────────────────

function limpiarSesiones() {
  const limite = Date.now() - 10 * 60 * 1000
  for (const [k, v] of global.pendingMangaSearch.entries())
    if (v.timestamp < limite) global.pendingMangaSearch.delete(k)
  for (const [k, v] of global.pendingMangaChapters.entries())
    if (v.timestamp < limite) global.pendingMangaChapters.delete(k)
}
setInterval(limpiarSesiones, 5 * 60 * 1000)

// ─── Handler principal ────────────────────────────────────────────────────

let handler = async (m, { conn, command, args, usedPrefix }) => {
  const text = args.join(' ').trim()

  // ── .mangacancelar / .mangastop ───────────────────────────────────────────
  if (/^manga(cancelar|stop|cancel)$/i.test(command)) {
    global.activeMangaDownloads.delete(m.chat)
    global.pendingMangaChapters.delete(m.chat)
    global.pendingMangaSearch.delete(m.chat)
    return m.reply('🛑 Sesión de manga cancelada.')
  }

  // ── Selección con letra (fallback web/desktop) ─────────────────────────
  if (/^[a-z]$/.test(text.toLowerCase()) && command === 'mangadl') {
    const letra = text.toLowerCase()
    const idx   = letra.charCodeAt(0) - 97  // a=0, b=1…

    // ¿Hay selección de búsqueda pendiente?
    const mangaSearch = global.pendingMangaSearch.get(m.chat)
    if (mangaSearch) {
      if (mangaSearch.owner && mangaSearch.owner !== m.sender)
        return m.reply(`⛔ Esta selección pertenece a otro usuario.`)
      const elegido = mangaSearch.resultados[idx]
      if (!elegido)
        return m.reply(`❌ Letra inválida. Elige entre *a* y *${numToLetter(mangaSearch.resultados.length - 1)}*.`)
      global.pendingMangaSearch.delete(m.chat)
      return mostrarInfoYCapitulos(elegido, m, conn, usedPrefix)
    }

    // ¿Hay selección de capítulo pendiente?
    const mangaChaps = global.pendingMangaChapters.get(m.chat)
    if (mangaChaps) {
      if (mangaChaps.owner && mangaChaps.owner !== m.sender)
        return m.reply(`⛔ Esta selección pertenece a otro usuario.`)
      if (global.activeMangaDownloads.has(m.chat))
        return m.reply('⚠️ Ya hay una descarga en curso. Usa *.mangacancelar* para detenerla.')
      const slice = mangaChaps.chapters.slice(-MAX_LIST)
      const chap  = slice[idx]
      if (!chap)
        return m.reply(`❌ Letra inválida. Elige entre *a* y *${numToLetter(slice.length - 1)}*.`)
      global.pendingMangaChapters.delete(m.chat)
      global.activeMangaDownloads.set(m.chat, true)
      return descargarYConvertirPDF(
        { chapterId: chap.id, chapterNum: chap.num, mangaTitle: mangaChaps.title },
        m, conn
      )
    }
  }

  // ── Sin argumentos → ayuda ────────────────────────────────────────────────
  if (!text) return m.reply(
    `📚 *Manga Downloader — MangaDex*\n\n` +
    `*Uso:*\n` +
    `  *${usedPrefix}mangadl <nombre>*         → info + lista de capítulos\n` +
    `  *${usedPrefix}mangadl <nombre> <cap>*   → descargar capítulo en PDF\n` +
    `  *${usedPrefix}mangacancelar*            → cancelar descarga\n\n` +
    `*Ejemplos:*\n` +
    `  .mangadl naruto\n` +
    `  .mangadl one piece 1000\n` +
    `  .mangadl berserk 1\n\n` +
    `_Solo capítulos en español (es / es-la)_`
  )

  // ── Detectar si el último token es número de capítulo ────────────────────
  const tokens    = text.split(/\s+/)
  const lastToken = tokens[tokens.length - 1]
  const capNum    = tokens.length > 1 && !isNaN(lastToken) ? parseFloat(lastToken) : null
  const nombre    = capNum !== null ? tokens.slice(0, -1).join(' ') : text

  // ── Descarga directa con número de capítulo ───────────────────────────────
  if (capNum !== null) {
    if (global.activeMangaDownloads.has(m.chat))
      return m.reply('⚠️ Ya hay una descarga en curso. Usa *.mangacancelar* para detenerla.')

    const { key: sk } = await m.reply(`🔎 Buscando *${nombre}*...`)
    const editStatus  = async txt => { try { await conn.sendMessage(m.chat, { text: txt, edit: sk }) } catch (_) {} }

    const resultados = await searchManga(nombre)
    if (!resultados.length) return editStatus(`❌ No encontré el manga *${nombre}*.`)

    // Elegir mejor resultado por similitud de título
    const manga = resultados
      .slice()
      .sort((a, b) => puntuarTitulo(b.title, nombre) - puntuarTitulo(a.title, nombre))[0]

    await editStatus(`📖 Buscando capítulo *${capNum}* en *${manga.title}*...`)
    const chapters = await getChapters(manga.id)

    // Buscar capítulo exacto o más cercano
    const chap =
      chapters.find(c => c.num === capNum) ||
      chapters.find(c => Math.round(c.num) === Math.round(capNum))

    if (!chap) {
      const disponibles = chapters.map(c => c.num).join(', ')
      return editStatus(
        `❌ Capítulo *${capNum}* no disponible en español para *${manga.title}*.\n\n` +
        `*Capítulos disponibles:*\n` +
        (disponibles.length > 300 ? disponibles.slice(0, 300) + '…' : disponibles)
      )
    }

    global.activeMangaDownloads.set(m.chat, true)
    return descargarYConvertirPDF(
      { chapterId: chap.id, chapterNum: chap.num, mangaTitle: manga.title },
      m, conn, sk
    )
  }

  // ── Sin número → buscar + info + capítulos ────────────────────────────────
  const { key: sk } = await m.reply(`🔎 Buscando *${nombre}*...`)
  const editStatus   = async txt => { try { await conn.sendMessage(m.chat, { text: txt, edit: sk }) } catch (_) {} }

  const resultados = await searchManga(nombre)
  if (!resultados.length)
    return editStatus(`❌ No encontré ningún manga llamado *${nombre}*.\n\n_Intenta con el nombre en inglés o japonés (romaji)._`)

  // Match exacto / único → directo a info + capítulos
  if (resultados.length === 1 || puntuarTitulo(resultados[0].title, nombre) >= 80)
    return mostrarInfoYCapitulos(resultados[0], m, conn, usedPrefix, sk)

  // Múltiples → lista de selección
  await editStatus(`🔍 *${resultados.length} resultados para "${nombre}"* — elige uno:`)
  const maxR = Math.min(resultados.length, MAX_LIST)
  global.pendingMangaSearch.set(m.chat, {
    resultados: resultados.slice(0, maxR),
    nombre,
    owner    : m.sender,
    usedPrefix,
    timestamp: Date.now(),
  })

  return enviarListaWA(conn, m, {
    title     : `🔍 Resultados para "${nombre}"`,
    body      : `Encontré ${resultados.length} manga(s). Elige el correcto:`,
    buttonText: 'ELEGIR MANGA',
    footer    : global.wm || 'Kana Arima Bot',
    sections  : [{
      title: 'Mangas encontrados',
      rows : resultados.slice(0, maxR).map(r => ({
        title      : r.title,
        description: '',
        id         : `__manga_search__${r.id}`,
      })),
    }],
  })
}

handler.command = /^manga(dl|descarga|down|cancelar|stop|cancel)$/i
handler.help    = ['mangadl <nombre> [capítulo]']
handler.tags    = ['tools', 'manga']

// ─── handler.before — respuestas interactivas nativas (móvil) ─────────────

handler.before = async function (m, { conn }) {
  const nativeFlow = m.message?.interactiveResponseMessage?.nativeFlowResponseMessage
  if (!nativeFlow) return false

  let selectedId
  try { selectedId = JSON.parse(nativeFlow.paramsJson || '{}')?.id }
  catch (_) { return false }
  if (!selectedId) return false

  // ── Selección de manga desde lista de búsqueda ──────────────────────────
  if (selectedId.startsWith('__manga_search__')) {
    const mangaId     = selectedId.replace('__manga_search__', '')
    const mangaSearch = global.pendingMangaSearch.get(m.chat)
    if (!mangaSearch) return false

    if (mangaSearch.owner && mangaSearch.owner !== m.sender) {
      await conn.sendMessage(m.chat,
        { text: `⛔ @${m.sender.split('@')[0]}, estos botones son de otro usuario.` },
        { quoted: m, mentions: [m.sender] }
      )
      return true
    }

    global.pendingMangaSearch.delete(m.chat)
    const elegido = mangaSearch.resultados.find(r => r.id === mangaId)
    if (!elegido) return false

    await mostrarInfoYCapitulos(elegido, m, conn, mangaSearch.usedPrefix || '.')
    return true
  }

  // ── Selección de capítulo desde lista ──────────────────────────────────
  if (selectedId.startsWith('__manga_cap__')) {
    // formato: __manga_cap__<mangaId>__<chapterId>__<chapterNum>
    const raw          = selectedId.replace('__manga_cap__', '')
    const [mId, cId, cNumStr] = raw.split('__')
    const chapterNum   = parseFloat(cNumStr)

    const mangaChaps   = global.pendingMangaChapters.get(m.chat)

    if (mangaChaps?.owner && mangaChaps.owner !== m.sender) {
      await conn.sendMessage(m.chat,
        { text: `⛔ @${m.sender.split('@')[0]}, estos botones son de otro usuario.` },
        { quoted: m, mentions: [m.sender] }
      )
      return true
    }

    const mangaTitle = mangaChaps?.title || 'Manga'
    global.pendingMangaChapters.delete(m.chat)

    if (global.activeMangaDownloads.has(m.chat)) {
      await m.reply('⚠️ Ya hay una descarga en curso. Usa *.mangacancelar* para detenerla.')
      return true
    }

    global.activeMangaDownloads.set(m.chat, true)
    await descargarYConvertirPDF({ chapterId: cId, chapterNum, mangaTitle }, m, conn)
    return true
  }

  return false
}

export default handler
