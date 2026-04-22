// plugins/manga-zonatmo.js
// Basado en MangaKing (zonatmo.to scraper)
//
// Comandos:
//   .manga <nombre>           → busca un manga
//   .manga info <url_manga>   → lista capítulos de un manga
//   .manga cap <url_cap>      → descarga y envía las páginas del capítulo
//   .manga cap <url_cap> 1-5  → solo envía las páginas 1 a 5

import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'
import * as cheerio from 'cheerio'
import puppeteerExtra from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

puppeteerExtra.use(StealthPlugin())

// ─── Configuración ────────────────────────────────────────────────────────────

const BASE_URL = 'https://zonatmo.to'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

const HEADERS = {
  'User-Agent': UA,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'es-419,es;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Upgrade-Insecure-Requests': '1',
  Connection: 'keep-alive',
}

const PUPPETEER_OPTS = {
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
}

const MAX_PAGINAS_DEFAULT = 25   // máximo de páginas a enviar por defecto
const TIMEOUT_PAGINA = 25_000   // ms de espera en puppeteer
const TIMEOUT_IMG = 18_000      // ms de descarga por imagen

// ─── Helpers HTML ─────────────────────────────────────────────────────────────

/**
 * Intenta fetch estático; si parece Cloudflare/SPA, usa Puppeteer con stealth.
 */
async function fetchHtml(url, { clickCookies = false } = {}) {
  // Intento estático primero
  try {
    const res = await fetch(url, {
      headers: { ...HEADERS, Referer: BASE_URL },
      timeout: 12_000,
    })
    const html = await res.text()

    const necesitaDinamico =
      html.length < 3000 ||
      /challenge-platform|Just a moment|cf-browser-verification|_cf_chl/.test(html)

    if (!necesitaDinamico) return html
  } catch (_) {}

  // Fallback: Puppeteer stealth
  return fetchHtmlConPuppeteer(url, { clickCookies })
}

async function fetchHtmlConPuppeteer(url, { clickCookies = false } = {}) {
  const browser = await puppeteerExtra.launch(PUPPETEER_OPTS)
  const page = await browser.newPage()
  await page.setUserAgent(UA)
  await page.setExtraHTTPHeaders(HEADERS)

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_PAGINA })

    // Esperar bypass de Cloudflare
    for (let i = 0; i < 8; i++) {
      const body = await page.evaluate(() => document.body?.innerText || '')
      if (!/Just a moment|Checking your browser/.test(body)) break
      await new Promise(r => setTimeout(r, 3000))
    }

    // Cerrar banner de cookies si existe
    if (clickCookies) {
      try {
        await page.evaluate(() => {
          for (const btn of document.querySelectorAll('button')) {
            if (/acepto|aceptar|accept/i.test(btn.textContent)) {
              btn.click()
              break
            }
          }
        })
        await new Promise(r => setTimeout(r, 800))
      } catch (_) {}
    }

    await new Promise(r => setTimeout(r, 2000))
    const html = await page.content()
    await browser.close()
    return html
  } catch (err) {
    await browser.close()
    throw err
  }
}

// ─── Scraping: Búsqueda ───────────────────────────────────────────────────────

/**
 * Busca mangas en zonatmo.to por nombre.
 * @returns {Array<{titulo, url}>}
 */
async function buscarManga(query) {
  const searchUrl = `${BASE_URL}/library?q=${encodeURIComponent(query)}`
  const html = await fetchHtml(searchUrl, { clickCookies: true })
  const $ = cheerio.load(html)

  const resultados = []
  const vistos = new Set()

  // Selector principal de tarjetas de resultado
  $('a[href*="/manga/"]').each((_, el) => {
    const href = $(el).attr('href') || ''
    if (!href.includes('/manga/')) return

    // Filtrar capítulos (tienen más de un segmento después de /manga/)
    const partes = href.replace(/\/$/, '').split('/manga/')[1]?.split('/') || []
    if (partes.length > 1) return

    const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`
    if (vistos.has(fullUrl)) return
    vistos.add(fullUrl)

    // Intentar sacar el título del contenido del link
    let titulo = ''
    for (const sel of ['h4', 'h3', 'h2', 'span.title', '.title', 'span', 'p']) {
      titulo = $(el).find(sel).first().text().trim()
      if (titulo) break
    }
    if (!titulo) titulo = $(el).text().trim().split('\n')[0].trim()
    if (!titulo) titulo = partes[0].replace(/-/g, ' ')

    if (titulo) resultados.push({ titulo, url: fullUrl })
  })

  return resultados.slice(0, 10)
}

// ─── Scraping: Capítulos ──────────────────────────────────────────────────────

function parsearNumero(texto) {
  const m = texto.match(/[\d.]+/)
  return m ? m[0] : null
}

/**
 * Extrae la lista de capítulos de la página de un manga.
 * @returns {Array<{numero, nombre, url}>}
 */
async function obtenerCapitulos(urlManga) {
  const html = await fetchHtml(urlManga, { clickCookies: true })
  const $ = cheerio.load(html)

  const capitulos = []

  // Selector usado por MangaKing: .m-list .list-body li.item a
  $('.m-list .list-body li.item a, .chapters-list li a, .list-item a[href*="/manga/"]').each((_, el) => {
    const href = $(el).attr('href') || ''
    if (!href) return

    const url = href.startsWith('http') ? href : `${BASE_URL}${href}`

    // Nombre del capítulo
    const nombre = $(el).find('span').first().text().trim() ||
                   $(el).find('.chapter-title').text().trim() ||
                   $(el).text().trim().split('\n')[0].trim()

    // Número de capítulo
    const numRaw = $(el).find('p').first().text().trim() ||
                   $(el).find('.num-cap').text().trim()
    const numero = parsearNumero(numRaw) || parsearNumero(nombre) || '?'

    if (nombre || numero !== '?') capitulos.push({ numero, nombre, url })
  })

  return capitulos
}

// ─── Scraping: Páginas de capítulo ───────────────────────────────────────────

/**
 * Extrae las URLs de las imágenes de un capítulo usando Puppeteer
 * (necesario para que carguen las imágenes lazy).
 * @returns {string[]}
 */
async function obtenerPaginasCapitulo(urlCapitulo) {
  const browser = await puppeteerExtra.launch(PUPPETEER_OPTS)
  const page = await browser.newPage()
  await page.setUserAgent(UA)
  await page.setExtraHTTPHeaders(HEADERS)

  try {
    await page.goto(urlCapitulo, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_PAGINA })

    // Esperar bypass Cloudflare
    for (let i = 0; i < 8; i++) {
      const body = await page.evaluate(() => document.body?.innerText || '')
      if (!/Just a moment|Checking your browser/.test(body)) break
      await new Promise(r => setTimeout(r, 3000))
    }

    // Cerrar cookies
    try {
      await page.evaluate(() => {
        for (const btn of document.querySelectorAll('button')) {
          if (/acepto|aceptar|accept/i.test(btn.textContent)) { btn.click(); break }
        }
      })
    } catch (_) {}

    // Scroll para cargar lazy images (igual que MangaKing)
    await page.evaluate(async () => {
      for (let i = 0; i < 50; i++) {
        window.scrollBy(0, 1500)
        await new Promise(r => setTimeout(r, 300))
        if (window.scrollY + window.innerHeight >= document.body.scrollHeight) break
      }
    })
    await new Promise(r => setTimeout(r, 1500))

    // Extraer imágenes: selector del lector de zonatmo
    const urls = await page.evaluate(() => {
      const selectors = [
        '#page-wrapper .page img',
        '.viewer-container img',
        '.reader-container img',
        '.pages-container img',
        'div[id*="page"] img',
        '.chapter-content img',
      ]
      for (const sel of selectors) {
        const imgs = [...document.querySelectorAll(sel)]
          .map(img => img.src || img.dataset.src || img.dataset.lazySrc || '')
          .filter(src => src && src.startsWith('http') && !src.includes('logo'))
        if (imgs.length > 0) return imgs
      }
      // Fallback: cualquier img que parezca página
      return [...document.querySelectorAll('img')]
        .map(img => img.src || img.dataset.src || '')
        .filter(src => src && src.startsWith('http') &&
          !src.includes('logo') && !src.includes('avatar') &&
          !src.includes('icon') && !src.includes('banner'))
    })

    await browser.close()
    return urls
  } catch (err) {
    await browser.close()
    throw err
  }
}

// ─── Descarga de imágenes ─────────────────────────────────────────────────────

async function descargarImagen(url, destPath, referer) {
  const res = await fetch(url, {
    headers: { ...HEADERS, Referer: referer },
    timeout: TIMEOUT_IMG,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const buffer = await res.buffer()
  fs.writeFileSync(destPath, buffer)
  return buffer
}

// ─── Formato de número de capítulo ───────────────────────────────────────────

function fmtNum(s) {
  try {
    const v = parseFloat(s)
    return v === Math.floor(v) ? String(Math.floor(v)) : String(v)
  } catch (_) { return s }
}

// ─── Parsear rango de páginas ─────────────────────────────────────────────────

function parsearRango(texto, total) {
  if (!texto) return [0, Math.min(total, MAX_PAGINAS_DEFAULT) - 1]
  const m = texto.match(/^(\d+)-(\d+)$/)
  if (m) {
    const desde = Math.max(0, parseInt(m[1]) - 1)
    const hasta = Math.min(total - 1, parseInt(m[2]) - 1)
    return [desde, hasta]
  }
  const n = parseInt(texto)
  if (!isNaN(n)) return [Math.max(0, n - 1), Math.max(0, n - 1)]
  return [0, Math.min(total, MAX_PAGINAS_DEFAULT) - 1]
}

// ─── Handler principal ────────────────────────────────────────────────────────

const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text?.trim()) {
    return m.reply(
      `*📚 Manga Downloader — zonatmo.to*\n\n` +
      `*Buscar manga:*\n  ${usedPrefix + command} one piece\n\n` +
      `*Ver capítulos:*\n  ${usedPrefix + command} info https://zonatmo.to/manga/...\n\n` +
      `*Descargar capítulo:*\n  ${usedPrefix + command} cap https://zonatmo.to/manga/.../1\n  ` +
      `${usedPrefix + command} cap <url> 1-10   _(páginas 1 a 10)_`
    )
  }

  const args = text.trim().split(/\s+/)
  const subcmd = args[0].toLowerCase()

  // ── .manga info <url> ─────────────────────────────────────────────────────
  if (subcmd === 'info') {
    const urlManga = args[1]
    if (!urlManga?.includes('/manga/')) {
      return m.reply(`❌ Proporciona la URL del manga.\nEjemplo: *${usedPrefix + command} info https://zonatmo.to/manga/nombre*`)
    }

    await m.reply(`🔍 Obteniendo capítulos...`)

    let capitulos
    try {
      capitulos = await obtenerCapitulos(urlManga)
    } catch (err) {
      return m.reply(`❌ Error al obtener capítulos:\n\`${err.message}\``)
    }

    if (!capitulos.length) {
      return m.reply(`⚠️ No se encontraron capítulos.\n_El sitio puede haber cambiado o la URL no es válida._`)
    }

    // Mostrar lista (máximo 50)
    const mostrar = capitulos.slice(0, 50)
    const hay_mas = capitulos.length > 50 ? `\n_...y ${capitulos.length - 50} más_` : ''

    const lista = mostrar
      .map(c => `  • Cap. *${fmtNum(c.numero)}* — ${c.nombre || '(sin nombre)'}\n    ${c.url}`)
      .join('\n')

    return m.reply(
      `📖 *${capitulos.length} capítulos encontrados*\n\n${lista}${hay_mas}\n\n` +
      `_Usa_ *${usedPrefix + command} cap <url>* _para descargar un capítulo_`
    )
  }

  // ── .manga cap <url> [rango] ──────────────────────────────────────────────
  if (subcmd === 'cap') {
    const urlCap = args[1]
    const rangoTexto = args[2] || null   // ej: "1-10" o "5"

    if (!urlCap?.includes('zonatmo')) {
      return m.reply(`❌ Proporciona la URL del capítulo.\nEjemplo: *${usedPrefix + command} cap https://zonatmo.to/manga/nombre/1*`)
    }

    await m.reply(`📡 Cargando capítulo... _(puede tardar ~30 s si hay Cloudflare)_`)

    let pageUrls
    try {
      pageUrls = await obtenerPaginasCapitulo(urlCap)
    } catch (err) {
      return m.reply(`❌ Error al cargar el capítulo:\n\`${err.message}\``)
    }

    if (!pageUrls.length) {
      return m.reply(`⚠️ No se encontraron imágenes en ese capítulo.\n_El lector puede requerir login o la URL es incorrecta._`)
    }

    const [desde, hasta] = parsearRango(rangoTexto, pageUrls.length)
    const seleccionadas = pageUrls.slice(desde, hasta + 1)

    await m.reply(
      `✅ *${pageUrls.length} páginas* encontradas.\n` +
      `📤 Enviando páginas *${desde + 1}–${hasta + 1}* (${seleccionadas.length} imágenes)...\n` +
      `_Usa_ \`${usedPrefix + command} cap <url> 1-${pageUrls.length}\` _para todas_`
    )

    const tmpDir = path.join(process.env.TMPDIR || '/tmp', `manga_${Date.now()}`)
    fs.mkdirSync(tmpDir, { recursive: true })

    let enviadas = 0
    let fallidas = 0

    for (let i = 0; i < seleccionadas.length; i++) {
      const imgUrl = seleccionadas[i].startsWith('http')
        ? seleccionadas[i]
        : 'https:' + seleccionadas[i]

      const ext = imgUrl.includes('.webp') ? '.webp' : '.jpg'
      const tmpFile = path.join(tmpDir, `pagina_${String(desde + i + 1).padStart(3, '0')}${ext}`)

      try {
        const buffer = await descargarImagen(imgUrl, tmpFile, urlCap)
        const mimetype = ext === '.webp' ? 'image/webp' : 'image/jpeg'

        await conn.sendMessage(
          m.chat,
          {
            image: buffer,
            caption: `📖 Pág. ${desde + i + 1}/${pageUrls.length}`,
            mimetype,
          },
          { quoted: m }
        )
        enviadas++
        // Pequeña pausa entre imágenes para no saturar
        await new Promise(r => setTimeout(r, 600))
      } catch (err) {
        fallidas++
        console.error(`[manga] Falló página ${desde + i + 1}: ${err.message}`)
        // No romper el loop, intentar las demás
      } finally {
        try { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile) } catch (_) {}
      }
    }

    fs.rmSync(tmpDir, { recursive: true, force: true })

    const resumen = `✅ *${enviadas}* páginas enviadas` +
      (fallidas > 0 ? ` · ⚠️ *${fallidas}* fallidas` : '')
    return m.reply(resumen)
  }

  // ── .manga <nombre> → búsqueda ────────────────────────────────────────────
  const query = args.join(' ')
  await m.reply(`🔎 Buscando *"${query}"* en zonatmo.to...`)

  let resultados
  try {
    resultados = await buscarManga(query)
  } catch (err) {
    return m.reply(`❌ Error en la búsqueda:\n\`${err.message}\``)
  }

  if (!resultados.length) {
    return m.reply(`😶 No se encontraron resultados para *"${query}"*.\n_Prueba con otro nombre._`)
  }

  const lista = resultados
    .map((r, i) => `*${i + 1}.* ${r.titulo}\n    ${r.url}`)
    .join('\n\n')

  return m.reply(
    `📚 *Resultados para "${query}":*\n\n${lista}\n\n` +
    `_Usa_ *${usedPrefix + command} info <url>* _para ver los capítulos_`
  )
}

handler.help = [
  'manga <nombre>',
  'manga info <url_manga>',
  'manga cap <url_capitulo> [rango]',
]
handler.tags = ['manga', 'descargas']
handler.command = /^manga$/i

export default handler
