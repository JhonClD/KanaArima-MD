// plugins/jkanime-animedbs-notify.js — v1.0
//
// Notificador automático de nuevos episodios — JKAnime (SUB) + AnimeDBS (SUB/LAT)
//
// Comandos:
//   .jkstart               → inicia el notificador (JKAnime + AnimeDBS)
//   .jkstop                → detiene el notificador en el chat actual
//   .jkstatus              → muestra estado y cola
//   .jkqueue               → ver episodios en cola
//   .jkflush               → vaciar la cola de este chat
//   .jkcheck               → forzar chequeo ahora
//   .jkinterval <minutos>  → cambiar intervalo (mín 5, máx 60)
//   .jkexample [N]         → prueba con los N episodios más recientes de JKAnime (por defecto 1)
//   .dbsexample [N]        → prueba con los N episodios más recientes de AnimeDBS (por defecto 1)
//   .jkunblock             → desbloquea la cola si quedó trabada

import axios        from 'axios'
import * as cheerio from 'cheerio'
import fs           from 'fs'
import path         from 'path'
import { spawn }    from 'child_process'
import { pipeline } from 'stream/promises'
import { File as MegaFile } from 'megajs'

// ─── Constantes ───────────────────────────────────────────────────────────────

const JKANIME_URL            = 'https://jkanime.net'
const ANIMEDBS_URL           = 'https://www.animedbs.online'
const SEEN_FILE              = path.join(process.env.TMPDIR || '/tmp', 'jkanime_seen.json')
const STATE_FILE             = path.join(process.env.TMPDIR || '/tmp', 'jkanime_state.json')
const CHECK_INTERVAL_DEFAULT = 10        // minutos
const QUEUE_DELAY            = 90_000    // ms entre ítems de cola (90 seg)
const DL_TIMEOUT             = 3 * 60 * 60 * 1000
const MAX_REINTENTOS         = 3
const ESPERA_REINTENTO       = 3 * 60 * 1000
const ESPERA_REQUEUEUE       = 10 * 60 * 1000

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
const HEADERS = {
  'User-Agent'     : UA,
  'Accept'         : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-419,es;q=0.9,en;q=0.8',
}

// ─── Estado global ────────────────────────────────────────────────────────────

global.jkActiveChats  = global.jkActiveChats  || new Map()
global.jkEpisodeQueue = global.jkEpisodeQueue || []
global.jkQueueRunning = global.jkQueueRunning || false
global.jkConn         = global.jkConn         || null

// ─── Persistencia ─────────────────────────────────────────────────────────────

function loadSeen()   { try { return JSON.parse(fs.readFileSync(SEEN_FILE,  'utf-8')) } catch (_) { return {} } }
function saveSeen(d)  { try { fs.writeFileSync(SEEN_FILE,  JSON.stringify(d, null, 2)) } catch (_) {} }
function loadState()  { try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')) } catch (_) { return {} } }
function saveState(d) { try { fs.writeFileSync(STATE_FILE, JSON.stringify(d, null, 2)) } catch (_) {} }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function zeroPad(n)  { return String(n).padStart(2, '0') }
function safeFile(s) { return s.replace(/[/\\:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim() }
function buildFileName(titulo, epNum) { return `${zeroPad(epNum)} ${safeFile(titulo)}.mp4` }

function detectarServNombre(url) {
  const u = url.toLowerCase()
  if (u.includes('mediafire')) return 'mediafire'
  if (u.includes('mega.nz'))   return 'mega'
  if (u.includes('voe'))       return 'voe'
  if (u.includes('filemoon'))  return 'filemoon'
  if (u.includes('mp4upload')) return 'mp4upload'
  if (u.includes('streamwish'))return 'streamwish'
  if (u.includes('streamtape'))return 'streamtape'
  if (u.includes('dood'))      return 'doodstream'
  if (u.includes('ok.ru'))     return 'okru'
  if (u.includes('gofile'))    return 'gofile'
  if (u.includes('1fichier'))  return '1fichier'
  return 'embed'
}

function ordenarServidores(srvs, fuente) {
  const prioridad = ['mega', 'mediafire', 'gofile', '1fichier']
  return [...srvs].sort((a, b) => {
    const ia = prioridad.indexOf(a.nombre)
    const ib = prioridad.indexOf(b.nombre)
    if (ia !== -1 && ib !== -1) return ia - ib
    if (ia !== -1) return -1
    if (ib !== -1) return 1
    return 0
  })
}

// ─── JKAnime — scraping de portada ───────────────────────────────────────────
//
// Estructura real de JKAnime (portada):
//
//   <div class="hero__items set-bg" data-setbg="...cdn.../image/jkvideo_xxx.jpg">
//     <div class="hero__text">
//       <h2>Dr. Stone: Science Future Part 3</h2>
//       <p>Descripción...</p>
//     </div>
//     <div class="slider-btns">
//       <a href="https://jkanime.net/slug-del-anime/">Detalles</a>
//       <a href="https://jkanime.net/slug-del-anime/4">Ver ahora</a>  ← URL del episodio
//     </div>
//   </div>
//
// El link del episodio (el "Ver ahora") tiene el número al final: /slug/N
// La imagen está en data-setbg del contenedor .hero__items

async function fetchLatestEpisodesJKAnime() {
  const { data } = await axios.get(JKANIME_URL, { headers: HEADERS, timeout: 15000 })
  const $    = cheerio.load(data)
  const lista = []

  // ── Selector principal: cada slide del hero carousel ─────────────────────
  // .hero__items tiene data-setbg con la imagen y .slider-btns con los links
  $('.hero__items').each((_, el) => {
    const $el = $(el)

    // Imagen del episodio: data-setbg en el contenedor
    const imgSrc = $el.attr('data-setbg') || ''
    const imgUrl = imgSrc.startsWith('http') ? imgSrc : ''

    // Título: <h2> dentro de .hero__text
    const titulo = $el.find('h2').first().text().trim()
    if (!titulo) return

    // Links: el primero es "Detalles" (/slug/), el segundo es "Ver ahora" (/slug/N)
    // Tomamos TODOS los links con número al final
    $el.find('.slider-btns a[href], a.slider-show[href]').each((__, aEl) => {
      const href = $(aEl).attr('href') || ''
      // Solo links de episodio: terminan en /slug/numero o /slug/numero/
      const m = href.match(/\/([a-z0-9-]+)\/(\d+)\/?$/)
      if (!m) return

      const slug  = m[1]
      const epNum = parseInt(m[2])
      if (!epNum) return

      const epUrl    = href.startsWith('http') ? href : JKANIME_URL + href
      const normSlug = slug.toLowerCase()
      const id       = `jk-${normSlug}-${epNum}`

      if (!lista.find(e => e.id === id))
        lista.push({ id, slug: normSlug, titulo, epNum, epUrl, imgUrl, fuente: 'jkanime' })
    })
  })

  // ── Fallback: sección de últimos episodios (fuera del slider) ────────────
  // Algunos temas de JKAnime también tienen una sección debajo del slider
  if (lista.length === 0) {
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || ''
      const m    = href.match(/\/([a-z0-9-]{3,})\/(\d+)\/?$/)
      if (!m) return
      const slug  = m[1]
      const epNum = parseInt(m[2])
      if (!epNum || slug === 'page') return
      const titulo   = ($(el).attr('title') || $(el).text() || slug.replace(/-/g, ' ')).trim()
      const epUrl    = href.startsWith('http') ? href : JKANIME_URL + href
      const normSlug = slug.toLowerCase()
      const id       = `jk-${normSlug}-${epNum}`
      if (!lista.find(e => e.id === id))
        lista.push({ id, slug: normSlug, titulo, epNum, epUrl, imgUrl: '', fuente: 'jkanime' })
    })
  }

  console.log(`[jkanime-notify] JKAnime: ${lista.length} episodios en portada`)
  return lista
}

// ─── AnimeDBS — scraping de portada ──────────────────────────────────────────
//
// AnimeDBS es un WordPress con tema AnimeStream. La portada lista episodios
// recientes en bloques .bs .bsx con links tipo /nombre-del-anime-episodio-N/
// Ejemplo: /haibara-kun-no-tsuyokute-seishun-new-game-episodio-4/

async function fetchLatestEpisodesAnimeDBS() {
  const { data } = await axios.get(ANIMEDBS_URL, { headers: HEADERS, timeout: 15000 })
  const $    = cheerio.load(data)
  const lista = []

  // Selector principal del tema AnimeStream
  $('.bs .bsx, .listupd .bs, article.episode, .releases .bs').each((_, el) => {
    const $el  = $(el)
    const aTag = $el.find('a[href]').first()
    const href = aTag.attr('href') || ''
    if (!href) return

    // URLs tipo: /slug-del-anime-episodio-N/ o /slug-del-anime-N/
    const m =
      href.match(/\/([a-z0-9-]+)-episodio-(\d+)\/?$/) ||
      href.match(/\/([a-z0-9-]+)-(\d+)\/?$/)
    if (!m) return

    const slug  = m[1]
    const epNum = parseInt(m[2])
    if (!epNum) return

    const titulo =
      ($el.find('.tt, h3, h2, .title').first().text() || '').trim() ||
      aTag.attr('title') ||
      slug.replace(/-/g, ' ')

    const imgEl  = $el.find('img').first()
    const imgSrc = imgEl.attr('data-src') || imgEl.attr('src') || ''
    const imgUrl = imgSrc.startsWith('http') ? imgSrc : imgSrc ? ANIMEDBS_URL + imgSrc : ''

    const epUrl    = href.startsWith('http') ? href : ANIMEDBS_URL + href
    const normSlug = slug.toLowerCase()
    const id       = `dbs-${normSlug}-${epNum}`

    // Detectar idioma desde badges o clase de la card
    const badge   = $el.find('.sb, .bt, [class*="type"], [class*="lang"], [class*="LAT"], [class*="SUB"]').text().toLowerCase()
    const idioma  = badge.includes('lat') || badge.includes('esp') ? 'latino' : 'sub'

    if (!lista.find(e => e.id === id))
      lista.push({ id, slug: normSlug, titulo: titulo.trim(), epNum, epUrl, imgUrl, fuente: 'animedbs', idioma })
  })

  // Fallback: cualquier link con patrón -episodio-N
  if (lista.length === 0) {
    $('a[href*="-episodio-"], a[href*="/ver/"]').each((_, el) => {
      const href = $(el).attr('href') || ''
      const m    =
        href.match(/\/([a-z0-9-]+)-episodio-(\d+)\/?$/) ||
        href.match(/\/([a-z0-9-]+)-(\d+)\/?$/)
      if (!m) return
      const slug  = m[1]
      const epNum = parseInt(m[2])
      if (!epNum) return
      const titulo   = ($(el).attr('title') || $(el).text() || slug.replace(/-/g, ' ')).trim()
      const epUrl    = href.startsWith('http') ? href : ANIMEDBS_URL + href
      const normSlug = slug.toLowerCase()
      const id       = `dbs-${normSlug}-${epNum}`
      if (!lista.find(e => e.id === id))
        lista.push({ id, slug: normSlug, titulo, epNum, epUrl, imgUrl: '', fuente: 'animedbs', idioma: 'sub' })
    })
  }

  console.log(`[jkanime-notify] AnimeDBS: ${lista.length} episodios en portada`)
  return lista
}

// ─── JKAnime — obtener descarga de un episodio ───────────────────────────────
//
// JKAnime expone un endpoint AJAX autenticado por CSRF:
//   GET /ajax/download_episode/{episode_id}
// Responde JSON: { url: "https://...", nombre: "slug-ep-N.mp4" }
//
// El episode_id numérico está en el HTML de la página del episodio:
//   <a id="jkdown" href="/ajax/download_episode/72697">Descargar</a>
//   o bien en el onclick del botón #jkdown:
//   url:"/ajax/download_episode/72697"
//
// Estrategia:
//  1. Cargar página del episodio y extraer el ID numérico
//  2. Llamar a la API con el CSRF token de la página
//  3. Si la API falla, buscar servidores embed en el HTML como fallback

async function scrapeServidoresJKAnime(epUrl) {
  // ── Paso 1: cargar página del episodio ────────────────────────────────────
  let html
  try {
    const res = await axios.get(epUrl, { headers: { ...HEADERS, Referer: JKANIME_URL }, timeout: 15000 })
    html = res.data
  } catch (err) {
    throw new Error(`JKAnime: error cargando página episodio — ${err.message}`)
  }

  const $ = cheerio.load(html)

  // ── Paso 2: extraer episode ID y CSRF token ───────────────────────────────
  // <a id="jkdown" ...> con href o URL en onclick/ajax
  let episodeId = null

  // Método A: href o data en el botón #jkdown
  const jkdownHref = $('#jkdown').attr('href') || ''
  const mHref = jkdownHref.match(/\/ajax\/download_episode\/(\d+)/)
  if (mHref) episodeId = mHref[1]

  // Método B: buscar en los scripts inline el patrón /ajax/download_episode/N
  if (!episodeId) {
    $('script').each((_, el) => {
      const code = $(el).html() || ''
      const mScript = code.match(/\/ajax\/download_episode\/(\d+)/)
      if (mScript) { episodeId = mScript[1]; return false }
    })
  }

  // Método C: buscar en cualquier atributo data-* o href de la página
  if (!episodeId) {
    $('[href*="/ajax/download_episode/"], [data-url*="/ajax/download_episode/"]').each((_, el) => {
      const val = $(el).attr('href') || $(el).attr('data-url') || ''
      const m   = val.match(/\/ajax\/download_episode\/(\d+)/)
      if (m) { episodeId = m[1]; return false }
    })
  }

  // CSRF token (meta tag)
  const csrfToken = $('meta[name="csrf-token"]').attr('content') || ''

  const srvs = []

  // ── Paso 3: llamar API de descarga si tenemos el ID ───────────────────────
  if (episodeId) {
    try {
      console.log(`[jkanime-notify] JKAnime API descarga: /ajax/download_episode/${episodeId}`)
      const apiRes = await axios.get(`${JKANIME_URL}/ajax/download_episode/${episodeId}`, {
        headers: {
          ...HEADERS,
          Referer     : epUrl,
          'X-CSRF-TOKEN'      : csrfToken,
          'X-Requested-With'  : 'XMLHttpRequest',
        },
        timeout: 12000,
      })
      // Respuesta: { url: "https://...", nombre: "archivo.mp4" }
      const dlUrl    = apiRes.data?.url   || ''
      const dlNombre = apiRes.data?.nombre || ''
      if (dlUrl.startsWith('http')) {
        const esMega      = dlUrl.includes('mega.nz')
        const esMediafire = dlUrl.includes('mediafire.com')
        const nombre = esMega ? 'mega' : esMediafire ? 'mediafire' : detectarServNombre(dlUrl)
        srvs.push({ nombre, url: dlUrl, directo: esMega || esMediafire, apiNombre: dlNombre })
        console.log(`[jkanime-notify] JKAnime API OK → ${nombre}: ${dlUrl.slice(0, 80)}`)
      }
    } catch (err) {
      console.log(`[jkanime-notify] JKAnime API descarga falló (${err.message}), usando fallback HTML`)
    }
  } else {
    console.log(`[jkanime-notify] JKAnime: no se encontró episode ID en ${epUrl}`)
  }

  // ── Paso 4: fallback — buscar servidores embed en el HTML ─────────────────
  // JKAnime también puede tener var servers = [...] o botones .servers
  if (srvs.length === 0) {
    $('script').each((_, el) => {
      const code = $(el).html() || ''

      const mArr = code.match(/var\s+(?:servers|videos|reproductores)\s*=\s*(\[[\s\S]*?\])\s*[;,\n]/)
      if (mArr) {
        try {
          for (const item of JSON.parse(mArr[1])) {
            const url    = item.embed || item.url || item.file || item.code || ''
            const nombre = (item.server || item.title || item.label || '').toLowerCase()
            if (!url.startsWith('http') || srvs.find(s => s.url === url)) continue
            const sinSoporte = url.includes('hqq.tv') || url.includes('netu.tv')
            if (sinSoporte) continue
            const esMega = url.includes('mega.nz'), esMediafire = url.includes('mediafire.com')
            srvs.push({ nombre: esMega ? 'mega' : esMediafire ? 'mediafire' : nombre || detectarServNombre(url), url, directo: esMega || esMediafire })
          }
        } catch (_) {}
      }
    })

    // Botones .servers con data-video
    $('[data-video], [data-url], [data-embed]').each((_, el) => {
      const raw = $(el).attr('data-video') || $(el).attr('data-url') || $(el).attr('data-embed') || ''
      let embedUrl = raw
      try { const dec = Buffer.from(raw, 'base64').toString('utf-8'); if (dec.startsWith('http')) embedUrl = dec } catch (_) {}
      if (!embedUrl.startsWith('http') || srvs.find(s => s.url === embedUrl)) return
      srvs.push({ nombre: $(el).text().trim().toLowerCase() || detectarServNombre(embedUrl), url: embedUrl, directo: false })
    })

    // Links directos
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || ''
      if (!href.startsWith('http')) return
      const esMega = href.includes('mega.nz'), esMediafire = href.includes('mediafire.com')
      const esGofile = href.includes('gofile.io'), es1fichier = href.includes('1fichier.com')
      if (!esMega && !esMediafire && !esGofile && !es1fichier) return
      if (srvs.find(s => s.url === href)) return
      srvs.push({ nombre: esMega ? 'mega' : esMediafire ? 'mediafire' : esGofile ? 'gofile' : '1fichier', url: href, directo: true })
    })

    // iframes último recurso
    if (srvs.length === 0) {
      $('iframe[src]').each((_, el) => {
        const src = $(el).attr('src') || ''
        if (src.startsWith('http')) srvs.push({ nombre: detectarServNombre(src), url: src, directo: false })
      })
    }
  }

  console.log(`[jkanime-notify] JKAnime servidores (${srvs.length}): ${srvs.map(s => s.nombre).join(', ')}`)
  return srvs
}

// ─── AnimeDBS — scraping de descargas de un episodio ─────────────────────────
//
// AnimeDBS usa el tema AnimeStream. La página de episodio contiene:
//   <div class="soraddlx soradlg">
//     <div class="sorattlx"><h3>Descargar MP4</h3></div>
//     <div class="soraurlx">
//       <strong>720p</strong>
//       <a href="https://mega.nz/...">MEGA</a>
//       <a href="https://www.mediafire.com/...">MediaFire</a>
//     </div>
//   </div>
//
// También puede haber reproductores embed en .tabcontent o .mctnx

async function scrapeServidoresAnimeDBS(epUrl) {
  const { data } = await axios.get(epUrl, { headers: { ...HEADERS, Referer: ANIMEDBS_URL }, timeout: 15000 })
  const $    = cheerio.load(data)
  const srvs = []

  // ── 1. Bloque de descargas .soraddlx / .soraurlx ──────────────────────────
  // <strong>720p</strong> <a href="...">MEGA</a> <a href="...">MediaFire</a>
  $('.soraddlx, .mctnx .soraddlx, [class*="download"]').each((_, bloque) => {
    const calidad = $(bloque).find('strong').first().text().trim() || ''
    $(bloque).find('a[href]').each((__, aEl) => {
      const href  = $(aEl).attr('href') || ''
      if (!href.startsWith('http')) return
      const label = $(aEl).text().trim().toLowerCase()
      if (srvs.find(s => s.url === href)) return

      const esMega      = href.includes('mega.nz') || href.includes('mega.co.nz')
      const esMediafire = href.includes('mediafire.com')
      const esGofile    = href.includes('gofile.io')
      const es1fichier  = href.includes('1fichier.com')
      const sinSoporte  = href.includes('hqq.tv') || href.includes('netu.tv')
      if (sinSoporte) return

      const nombre = esMega ? 'mega' : esMediafire ? 'mediafire' : esGofile ? 'gofile' : es1fichier ? '1fichier' : label || detectarServNombre(href)
      srvs.push({ nombre, url: href, directo: esMega || esMediafire || esGofile || es1fichier, calidad })
    })
  })

  // ── 2. Cualquier link de descarga directa en el DOM ───────────────────────
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || ''
    if (!href.startsWith('http')) return
    const esMega      = href.includes('mega.nz') || href.includes('mega.co.nz')
    const esMediafire = href.includes('mediafire.com')
    const esGofile    = href.includes('gofile.io')
    const es1fichier  = href.includes('1fichier.com')
    if (!esMega && !esMediafire && !esGofile && !es1fichier) return
    if (srvs.find(s => s.url === href)) return
    const nombre = esMega ? 'mega' : esMediafire ? 'mediafire' : esGofile ? 'gofile' : '1fichier'
    srvs.push({ nombre, url: href, directo: true, calidad: '' })
  })

  // ── 3. Reproductores embed en el HTML (iframes / data-src) ───────────────
  if (srvs.length === 0) {
    $('iframe[src], [data-src], [data-player]').each((_, el) => {
      const raw = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-player') || ''
      let embedUrl = raw
      try {
        const dec = Buffer.from(raw, 'base64').toString('utf-8')
        if (dec.startsWith('http')) embedUrl = dec
      } catch (_) {}
      if (!embedUrl.startsWith('http') || srvs.find(s => s.url === embedUrl)) return
      srvs.push({ nombre: detectarServNombre(embedUrl), url: embedUrl, directo: false, calidad: '' })
    })
  }

  console.log(`[jkanime-notify] AnimeDBS servidores (${srvs.length}): ${srvs.map(s => s.nombre).join(', ')}`)
  return srvs
}

// ─── Descarga desde Mega ──────────────────────────────────────────────────────

async function descargarMega(megaUrl, outputDir, fileName) {
  console.log(`[jkanime-notify] Mega → ${megaUrl.slice(0, 80)}`)
  const file = MegaFile.fromURL(megaUrl)
  await file.loadAttributes()

  const totalMB  = (file.size / 1024 / 1024).toFixed(1)
  const destPath = path.join(outputDir, fileName)
  console.log(`[jkanime-notify] Mega: ${file.name} (${totalMB} MB)`)

  let downloaded = 0
  let lastTime   = Date.now()
  let lastBytes  = 0

  const fileStream = file.download()
  fileStream.on('data', chunk => {
    downloaded += chunk.length
    const now     = Date.now()
    const elapsed = (now - lastTime) / 1000
    if (elapsed >= 1) {
      const speed = ((downloaded - lastBytes) / elapsed / 1024 / 1024).toFixed(1)
      const dlMB  = (downloaded / 1024 / 1024).toFixed(1)
      const pct   = ((downloaded / file.size) * 100).toFixed(1)
      process.stdout.write(`\r[MEGA] ${pct}% | ${dlMB}/${totalMB} MB | ${speed} MB/s   `)
      lastTime  = now
      lastBytes = downloaded
    }
  })
  fileStream.on('error', err => console.error(`\n[jkanime-notify] Mega stream error: ${err.message}`))

  try {
    await pipeline(fileStream, fs.createWriteStream(destPath))
  } catch (err) {
    throw new Error(`Mega: fallo escritura — ${err.message}`)
  }

  const finalMB = (downloaded / 1024 / 1024).toFixed(1)
  console.log(`\n[jkanime-notify] Mega ✅ ${fileName} (${finalMB} MB)`)
  return destPath
}

// ─── Descarga desde MediaFire ─────────────────────────────────────────────────

async function descargarMediaFire(mfUrl, outputDir, fileName) {
  console.log(`[jkanime-notify] MediaFire → obteniendo página: ${mfUrl}`)

  let mfPage
  try {
    const res = await axios.get(mfUrl, { headers: HEADERS, timeout: 12000 })
    mfPage = res.data
  } catch (err) {
    throw new Error(`MediaFire: error al obtener página — ${err.message}`)
  }

  const mfLink =
    mfPage.match(/href=["'](https?:\/\/download\d+\.mediafire\.com[^"']+)["']/)?.[1] ||
    mfPage.match(/id="downloadButton"[^>]+href=["']([^"']+)["']/)?.[1]              ||
    mfPage.match(/"(https?:\/\/download\d*\.mediafire\.com\/[^"]+)"/)?.[1]

  if (!mfLink) {
    const snippet = typeof mfPage === 'string'
      ? mfPage.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').slice(0, 800)
      : String(mfPage).slice(0, 800)
    console.error(`[jkanime-notify] MediaFire: no encontré link de descarga directa.`)
    console.error(`[jkanime-notify] Snippet:\n${snippet}`)
    throw new Error('MediaFire: no encontré link de descarga directa')
  }

  console.log(`[jkanime-notify] MediaFire link directo → ${mfLink.slice(0, 100)}`)

  let mfRes
  try {
    mfRes = await axios.get(mfLink, {
      responseType: 'stream',
      headers     : { ...HEADERS, Referer: 'https://www.mediafire.com/' },
      timeout     : DL_TIMEOUT,
    })
  } catch (err) {
    throw new Error(`MediaFire: error al iniciar stream — ${err.message}`)
  }

  const totalBytes = parseInt(mfRes.headers['content-length'] || '0', 10)
  const totalMB    = totalBytes ? (totalBytes / 1024 / 1024).toFixed(1) : '?'
  const destPath   = path.join(outputDir, fileName)

  let downloaded = 0, lastTime = Date.now(), lastBytes = 0
  mfRes.data.on('data', chunk => {
    downloaded += chunk.length
    const now = Date.now(), elapsed = (now - lastTime) / 1000
    if (elapsed >= 1) {
      const speed  = ((downloaded - lastBytes) / elapsed / 1024 / 1024).toFixed(1)
      const dlMB   = (downloaded / 1024 / 1024).toFixed(1)
      const pct    = totalBytes ? ((downloaded / totalBytes) * 100).toFixed(1) : '?'
      process.stdout.write(`\r[MF] ${pct}% | ${dlMB}/${totalMB} MB | ${speed} MB/s   `)
      lastTime = now; lastBytes = downloaded
    }
  })
  mfRes.data.on('error', err => console.error(`\n[jkanime-notify] MediaFire stream error: ${err.message}`))

  try {
    await pipeline(mfRes.data, fs.createWriteStream(destPath))
  } catch (err) {
    throw new Error(`MediaFire: fallo escritura — ${err.message}`)
  }

  const finalMB = (downloaded / 1024 / 1024).toFixed(1)
  console.log(`\n[jkanime-notify] MediaFire ✅ ${fileName} (${finalMB} MB)`)
  return destPath
}

// ─── Extractores de embed ─────────────────────────────────────────────────────

function jsUnpack(packed) {
  try {
    const m = packed.match(/}\s*\('(.*)',\s*(.*?),\s*(\d+),\s*'(.*?)'\.split\('\|'\)/)
    if (!m) return null
    const payload = m[1].replace(/\\'/g, "'")
    const radix   = parseInt(m[2]) || 36
    const symtab  = m[4].split('|')
    return payload.replace(/\b[a-zA-Z0-9_]+\b/g, word => {
      const idx = parseInt(word, radix)
      return (symtab[idx] && symtab[idx] !== '') ? symtab[idx] : word
    })
  } catch (_) { return null }
}

function extraerUrlVideo(code) {
  const patrones = [
    /sources\s*:\s*\[{[^}]*file\s*:\s*["']([^"']+)["']/,
    /file\s*:\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/i,
    /src\s*:\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/i,
    /["']([^"']+\.m3u8[^"']*)["']/i,
  ]
  for (const re of patrones) {
    const m = code?.match(re)
    if (m?.[1]?.startsWith('http')) return m[1]
  }
  return null
}

async function resolverEmbed(embedUrl) {
  const u = embedUrl.toLowerCase()

  // ── Voe ──────────────────────────────────────────────────────────────────
  if (u.includes('voe.sx') || u.match(/voe\d*\.sx/)) {
    try {
      const { data } = await axios.get(embedUrl, { headers: { ...HEADERS, Referer: embedUrl }, timeout: 15000 })
      const mHls = data.match(/["']hls["']\s*:\s*["']([^"']+\.m3u8[^"']*)["']/)
      if (mHls?.[1]) return mHls[1]
      const enc = data.match(/\["([A-Za-z0-9+/=@$^~!#&%?*]{20,})"\]/)
      if (enc?.[1]) {
        try {
          let v = enc[1]
          v = v.replace(/[A-Za-z]/g, c => {
            const b = c <= 'Z' ? 65 : 97
            return String.fromCharCode(((c.charCodeAt(0) - b + 13) % 26) + b)
          })
          for (const p of ['@$', '^^', '~@', '%?', '*~', '!!', '#&']) v = v.split(p).join('_')
          v = Buffer.from(v.replace(/_/g, ''), 'base64').toString('utf-8')
          v = v.split('').map(c => String.fromCharCode(c.charCodeAt(0) - 3)).join('')
          v = Buffer.from(v.split('').reverse().join(''), 'base64').toString('utf-8')
          const json = JSON.parse(v)
          return json.source || json.direct_access_url || json.hls || null
        } catch (_) {}
      }
      const mAny = data.match(/["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/)
      if (mAny?.[1]) return mAny[1]
    } catch (_) {}
    return null
  }

  // ── Filemoon ──────────────────────────────────────────────────────────────
  if (u.includes('filemoon') || u.includes('moonplayer')) {
    try {
      const { data } = await axios.get(embedUrl, { headers: { ...HEADERS, Referer: embedUrl }, timeout: 15000 })
      const packed   = data.match(/eval\(function\(p,a,c,k,e[,\w]*\)[\s\S]+?\)\)/)
      const unpacked = packed ? jsUnpack(packed[0]) : null
      const src      = extraerUrlVideo(unpacked || data)
      if (src) return src
    } catch (_) {}
    return null
  }

  // ── Mp4Upload ─────────────────────────────────────────────────────────────
  if (u.includes('mp4upload')) {
    try {
      const idMatch  = embedUrl.match(/mp4upload\.com\/(?:embed-)?([A-Za-z0-9]+)/)
      const url      = idMatch ? `https://www.mp4upload.com/embed-${idMatch[1]}.html` : embedUrl
      const { data } = await axios.get(url, { headers: { ...HEADERS, Referer: 'https://www.mp4upload.com/' }, timeout: 15000 })
      const packed   = data.match(/eval\(function\(p,a,c,k,e[,\w]*\)[\s\S]+?\)\)/)
      const code     = packed ? jsUnpack(packed[0]) : data
      const m1       = (code || data).match(/player\.src\("([^"]+)"/)
      if (m1?.[1]) return m1[1]
      return extraerUrlVideo(code || data)
    } catch (_) {}
    return null
  }

  // ── DoodStream ────────────────────────────────────────────────────────────
  if (u.includes('dood') || u.includes('ds2play')) {
    try {
      const url  = embedUrl.replace(/\/(d|watch)\//, '/e/')
      const res  = await axios.get(url, { headers: { ...HEADERS, Referer: 'https://dood.wf/' }, timeout: 15000 })
      const text = res.data
      const host = new URL(res.request?.res?.responseUrl || url).origin
      const pass = text.match(/\/pass_md5\/[^'"<\s]*/)?.[0]
      if (!pass) return null
      const token = pass.split('/').pop()
      const r2    = await axios.get(host + pass, { headers: { Referer: url }, timeout: 15000 })
      const rand  = Array.from({ length: 10 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]).join('')
      return `${r2.data}${rand}?token=${token}&expiry=${Date.now()}`
    } catch (_) {}
    return null
  }

  // ── StreamWish / Vidhide ──────────────────────────────────────────────────
  if (u.includes('streamwish') || u.includes('wishembed') || u.includes('vidhide') || u.includes('filelions')) {
    try {
      const { data } = await axios.get(embedUrl, { headers: { ...HEADERS, 'Sec-Fetch-Dest': 'document' }, timeout: 15000 })
      const packed   = data.match(/eval\(function\(p,a,c,k,e[,\w]*\)[\s\S]+?\)\)/)
      if (packed) {
        const code = jsUnpack(packed[0])
        const src  = code ? extraerUrlVideo(code) : null
        if (src) return src
      }
      return extraerUrlVideo(data)
    } catch (_) {}
    return null
  }

  return null
}

// ─── Descarga con yt-dlp para embeds ─────────────────────────────────────────

async function descargarEmbed(embedUrl, outputDir, fileName, referer = JKANIME_URL) {
  const u = embedUrl.toLowerCase()
  if (u.includes('hqq.tv') || u.includes('netu.tv') || u.includes('netu.ac'))
    throw new Error(`Servidor sin soporte: ${embedUrl.split('/')[2]}`)

  let videoUrl = embedUrl
  const resuelto = await resolverEmbed(embedUrl)
  if (resuelto) {
    console.log(`[jkanime-notify] Embed resuelto → ${resuelto.slice(0, 80)}`)
    videoUrl = resuelto
  } else {
    try {
      const { data } = await axios.get(embedUrl, { headers: { ...HEADERS, Referer: referer }, timeout: 12000 })
      const dm = data.match(/file\s*:\s*["'](https?:\/\/[^"']+\.(?:mp4|m3u8)[^"']*)["']/i) ||
                 data.match(/"(https?:\/\/[^"]+\.(?:mp4|m3u8)[^"]*)"/)
      if (dm?.[1]) videoUrl = dm[1]
    } catch (_) {}
  }

  const outTemplate = path.join(outputDir, 'video.%(ext)s')
  const cmdArgs = [
    '--no-check-certificate', '--no-warnings',
    '-f', 'best[ext=mp4]/bestvideo[ext=mp4]+bestaudio/best',
    '--merge-output-format', 'mp4',
    '--add-header', `User-Agent: ${UA}`,
    '--add-header', `Referer: ${referer}/`,
    '-o', outTemplate,
    videoUrl,
  ]

  console.log(`[jkanime-notify] yt-dlp → ${videoUrl.slice(0, 100)}`)

  await new Promise((resolve, reject) => {
    const proc  = spawn('yt-dlp', cmdArgs, { stdio: ['ignore', 'pipe', 'pipe'] })
    let errBuf  = ''
    proc.stderr.on('data', d => { errBuf += d.toString() })
    proc.stdout.on('data', d => process.stdout.write(`[jk] ${d}`))
    const timer = setTimeout(() => { proc.kill(); reject(new Error('yt-dlp timeout')) }, DL_TIMEOUT)
    proc.on('close', code => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error(errBuf.trim() || `código ${code}`)) })
    proc.on('error', err  => { clearTimeout(timer); reject(err) })
  })

  const archivos = fs.readdirSync(outputDir).filter(f => /\.(mp4|mkv|webm)$/i.test(f))
  if (!archivos.length) throw new Error('yt-dlp no generó ningún archivo')

  const srcPath  = path.join(outputDir, archivos[0])
  const destPath = path.join(outputDir, fileName)
  fs.renameSync(srcPath, destPath)
  return destPath
}

// ─── Enviar episodio ──────────────────────────────────────────────────────────

async function enviarEpisodio(chatId, ep, conn) {
  const { titulo, epNum, epUrl, imgUrl, fuente = 'jkanime', idioma = 'sub' } = ep
  const fileName = buildFileName(titulo, epNum)
  const tmpDir   = path.join(process.env.TMPDIR || '/tmp', `jk_${Date.now()}`)
  fs.mkdirSync(tmpDir, { recursive: true })

  let bandera, etiqueta, referer
  if (fuente === 'animedbs') {
    bandera  = idioma === 'latino' ? '🇲🇽' : '🇯🇵'
    etiqueta = `AnimeDBS ${bandera}`
    referer  = ANIMEDBS_URL
  } else {
    bandera  = '🇯🇵'
    etiqueta = 'JKAnime 🇯🇵'
    referer  = JKANIME_URL
  }

  console.log(`[jkanime-notify] Enviando [${fuente}]: ${fileName}`)

  try {
    // 1. Aviso con imagen
    const ahora   = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()
    const caption =
      `*✨ Nuevo Episodio ✨*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `> ${bandera} ${titulo}\n` +
      `> 🆕 Capítulo: *${epNum}*\n` +
      `> 🕐 Publicado: *${ahora}*\n` +
      `> 🌐 Ver online: ${epUrl}\n` +
      `> 📡 Fuente: *${etiqueta}*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `✅ _INICIANDO DESCARGA..._`

    if (imgUrl) {
      try {
        const imgRes = await axios.get(imgUrl, { responseType: 'arraybuffer', headers: HEADERS, timeout: 10000 })
        await conn.sendMessage(chatId, { image: Buffer.from(imgRes.data), caption })
      } catch (_) {
        await conn.sendMessage(chatId, { text: caption })
      }
    } else {
      await conn.sendMessage(chatId, { text: caption })
    }

    // 2. Obtener servidores según fuente
    const srvs = fuente === 'animedbs'
      ? await scrapeServidoresAnimeDBS(epUrl)
      : await scrapeServidoresJKAnime(epUrl)

    if (!srvs.length) throw new Error('No se encontraron servidores de descarga')

    // 3. Esperar 15s antes de descargar
    console.log('[jkanime-notify] Esperando 15s antes de descargar...')
    await new Promise(r => setTimeout(r, 15_000))

    // 4. Descargar en orden de preferencia
    const orden = ordenarServidores(srvs, fuente).slice(0, 5)
    console.log(`[jkanime-notify] Orden [${fuente}]: ${orden.map(s => s.nombre).join(' → ')}`)

    let videoPath = null
    for (const srv of orden) {
      try {
        // Si la API de JKAnime proveyó un nombre de archivo, usarlo (ya incluye extensión)
        const fileNameFinal = (srv.apiNombre && srv.apiNombre.endsWith('.mp4'))
          ? safeFile(srv.apiNombre)
          : fileName
        console.log(`[jkanime-notify] Intentando: ${srv.nombre} — ${srv.url.slice(0, 80)}`)
        if (srv.nombre === 'mega') {
          videoPath = await descargarMega(srv.url, tmpDir, fileNameFinal)
        } else if (srv.nombre === 'mediafire') {
          videoPath = await descargarMediaFire(srv.url, tmpDir, fileNameFinal)
        } else {
          videoPath = await descargarEmbed(srv.url, tmpDir, fileNameFinal, referer)
        }
        break
      } catch (err) {
        console.error(`[jkanime-notify] ❌ ${srv.nombre} falló:`)
        console.error(err.stack || err.message)
        fs.readdirSync(tmpDir).forEach(f => {
          try { if (f !== 'cover.jpg') fs.unlinkSync(path.join(tmpDir, f)) } catch (_) {}
        })
      }
    }

    if (!videoPath) throw new Error('Todos los servidores fallaron')

    // 5. Enviar video
    const sizeMB = (fs.statSync(videoPath).size / 1024 / 1024).toFixed(1)
    await conn.sendMessage(chatId, {
      document : fs.readFileSync(videoPath),
      fileName,
      mimetype : 'video/mp4',
      caption  : `✅ *${titulo}*\n📌 Episodio ${zeroPad(epNum)}\n📦 ${sizeMB} MB · ${etiqueta}`,
    })

    console.log(`[jkanime-notify] ✅ ${fileName}`)

  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch (_) {}
  }
}

// ─── Cola de envíos ───────────────────────────────────────────────────────────

async function procesarCola() {
  if (global.jkQueueRunning) return
  global.jkQueueRunning = true
  console.log('[jkanime-notify] Cola iniciada')

  try {
    while (global.jkEpisodeQueue.length > 0) {
      const item = global.jkEpisodeQueue[0]
      if (!item) { global.jkEpisodeQueue.shift(); continue }

      const { chatId, ep } = item
      let intentos = 0, exito = false

      while (intentos < MAX_REINTENTOS && !exito) {
        intentos++
        const connActivo = global.jkConn
        if (!connActivo) {
          console.log('[jkanime-notify] ⚠️ Sin conn activo, esperando...')
          await new Promise(r => setTimeout(r, ESPERA_REINTENTO))
          continue
        }
        try {
          await enviarEpisodio(chatId, ep, connActivo)
          exito = true
          global.jkEpisodeQueue.shift()
          console.log(`[jkanime-notify] ✅ Cola: completado ${ep.titulo} ep ${zeroPad(ep.epNum)}`)
        } catch (err) {
          const esConexion = /connection closed|stream errored|timed out|econnreset|socket hang up|precondition required/i.test(err.message)
          console.error(`[jkanime-notify] ❌ Intento ${intentos}/${MAX_REINTENTOS}: ${err.message}`)
          if (err.stack) console.error(err.stack)

          if (esConexion && intentos < MAX_REINTENTOS) {
            await new Promise(r => setTimeout(r, ESPERA_REINTENTO * intentos))
          } else if (esConexion) {
            global.jkEpisodeQueue.shift()
            global.jkEpisodeQueue.push({ chatId, ep })
            console.log(`[jkanime-notify] 🔁 Re-encolado: ${ep.titulo} ep ${zeroPad(ep.epNum)}`)
            await new Promise(r => setTimeout(r, ESPERA_REQUEUEUE))
            break
          } else {
            global.jkEpisodeQueue.shift()
            console.error(`[jkanime-notify] ❌ Error no recuperable: ${err.message}`)
            try {
              const connErr = global.jkConn
              if (connErr) await connErr.sendMessage(chatId, {
                text: `❌ Error enviando *${ep.titulo}* ep *${zeroPad(ep.epNum)}*:\n${err.message}`
              })
            } catch (_) {}
          }
        }
      }

      if (global.jkEpisodeQueue.length > 0) {
        console.log(`[jkanime-notify] Cola: ${global.jkEpisodeQueue.length} pendiente(s), esperando ${QUEUE_DELAY / 1000}s...`)
        await new Promise(r => setTimeout(r, QUEUE_DELAY))
      }
    }
  } catch (fatalErr) {
    console.error('[jkanime-notify] Error fatal en cola:', fatalErr.message)
    if (fatalErr.stack) console.error(fatalErr.stack)
  } finally {
    global.jkQueueRunning = false
    console.log('[jkanime-notify] Cola finalizada')
  }
}

// ─── Chequeo periódico ────────────────────────────────────────────────────────

async function checkNuevosEpisodios(chatId, conn) {
  console.log(`[jkanime-notify] Chequeando para ${chatId}...`)

  let lista = []

  try {
    const jk = await fetchLatestEpisodesJKAnime()
    lista = lista.concat(jk)
  } catch (err) {
    console.error('[jkanime-notify] JKAnime fetch error:', err.message)
  }

  try {
    const dbs = await fetchLatestEpisodesAnimeDBS()
    lista = lista.concat(dbs)
  } catch (err) {
    console.error('[jkanime-notify] AnimeDBS fetch error:', err.message)
  }

  if (!lista.length) return

  const seen = loadSeen()
  if (!seen[chatId]) seen[chatId] = []
  const nuevos = lista.filter(e => !seen[chatId].includes(e.id))
  if (!nuevos.length) { console.log('[jkanime-notify] Sin novedades'); return }

  console.log(`[jkanime-notify] ${nuevos.length} nuevo(s):`, nuevos.map(e => e.id).join(', '))

  for (const ep of nuevos) seen[chatId].push(ep.id)
  if (seen[chatId].length > 500) seen[chatId] = seen[chatId].slice(-500)
  saveSeen(seen)

  if (nuevos.length > 1) {
    try {
      await conn.sendMessage(chatId, {
        text:
          `📋 *${nuevos.length} episodios nuevos detectados*\n\n` +
          nuevos.map((e, i) => `${i + 1}. *${e.titulo}* — Ep ${zeroPad(e.epNum)}`).join('\n') +
          `\n\n⏳ _Se enviarán de uno en uno..._`
      })
    } catch (_) {}
  }

  for (const ep of nuevos) global.jkEpisodeQueue.push({ chatId, ep })
  procesarCola().catch(err => {
    console.error('[jkanime-notify] cola error:', err.message)
    if (err.stack) console.error(err.stack)
  })
}

// ─── Notificador ─────────────────────────────────────────────────────────────

function iniciarNotificador(chatId, conn, intervalMin = CHECK_INTERVAL_DEFAULT) {
  if (conn) global.jkConn = conn
  if (global.jkActiveChats.has(chatId)) clearInterval(global.jkActiveChats.get(chatId).timer)
  const timer = setInterval(() => {
    const c = global.jkConn
    if (!c) return
    checkNuevosEpisodios(chatId, c).catch(e => {
      console.error('[jkanime-notify] interval error:', e.message)
    })
  }, intervalMin * 60 * 1000)
  global.jkActiveChats.set(chatId, { timer, intervalMin, startedAt: Date.now() })
  const state = loadState()
  state[chatId] = { intervalMin, startedAt: Date.now() }
  saveState(state)
  console.log(`[jkanime-notify] Iniciado en ${chatId} cada ${intervalMin} min`)
}

function detenerNotificador(chatId) {
  const entry = global.jkActiveChats.get(chatId)
  if (entry) { clearInterval(entry.timer); global.jkActiveChats.delete(chatId) }
  const state = loadState()
  delete state[chatId]
  saveState(state)
}

function restaurarNotificadores(conn) {
  const state = loadState()
  for (const [chatId, cfg] of Object.entries(state)) {
    if (!global.jkActiveChats.has(chatId))
      iniciarNotificador(chatId, conn, cfg.intervalMin || CHECK_INTERVAL_DEFAULT)
  }
}

// ─── Watchdog ─────────────────────────────────────────────────────────────────

if (!global.jkWatchdog) {
  global.jkWatchdog = setInterval(() => {
    const conn = global.jkConn
    if (!conn) return
    const state = loadState()
    let restaurados = 0
    for (const [chatId, cfg] of Object.entries(state)) {
      if (!global.jkActiveChats.has(chatId)) {
        console.log('[jkanime-notify] 🔄 Watchdog restaurando: ' + chatId)
        iniciarNotificador(chatId, conn, cfg.intervalMin || CHECK_INTERVAL_DEFAULT)
        restaurados++
      }
    }
    if (restaurados > 0) console.log('[jkanime-notify] Watchdog restauró ' + restaurados + ' chat(s)')
  }, 2 * 60 * 1000)
  console.log('[jkanime-notify] Watchdog iniciado')
}

// ─── Handler ──────────────────────────────────────────────────────────────────

let handler = async (m, { conn, text, usedPrefix, command }) => {

  if (conn) global.jkConn = conn
  restaurarNotificadores(conn)

  // ── .jkstart ───────────────────────────────────────────────────────────────
  if (command === 'jkstart') {
    const min = parseInt(text?.trim())
    const intervalMin = (!isNaN(min) && min >= 5 && min <= 60) ? min : CHECK_INTERVAL_DEFAULT
    iniciarNotificador(m.chat, conn, intervalMin)
    await conn.sendMessage(m.chat, {
      text:
        `✅ *Notificador JKAnime + AnimeDBS activado*\n\n` +
        `╭━━━━━━〔 📡 〕━━━━━━\n` +
        `┃ ⏱️ Intervalo: *${intervalMin} min*\n` +
        `┃ 🇯🇵 JKAnime — Sub japonés\n` +
        `┃ 🌐 AnimeDBS — Sub / Latino\n` +
        `┃ 💬 Chat registrado\n` +
        `╰━━━━━━━━━━━━━━━━━━\n\n` +
        `_Usa ${usedPrefix}jkstop para detener._`
    }, { quoted: m })
    try {
      const jk  = await fetchLatestEpisodesJKAnime()
      const dbs = await fetchLatestEpisodesAnimeDBS()
      const lista = [...jk, ...dbs]
      const seen  = loadSeen()
      if (!seen[m.chat]) seen[m.chat] = []
      for (const ep of lista) { if (!seen[m.chat].includes(ep.id)) seen[m.chat].push(ep.id) }
      if (seen[m.chat].length > 500) seen[m.chat] = seen[m.chat].slice(-500)
      saveSeen(seen)
      await conn.sendMessage(m.chat, {
        text: `📋 *${jk.length}* ep JKAnime + *${dbs.length}* ep AnimeDBS registrados como base.\n_Solo los nuevos se enviarán._`
      }, { quoted: m })
    } catch (err) {
      await conn.sendMessage(m.chat, { text: `⚠️ Chequeo inicial falló: ${err.message}` }, { quoted: m })
    }
    return
  }

  // ── .jkstop ────────────────────────────────────────────────────────────────
  if (command === 'jkstop') {
    if (!global.jkActiveChats.has(m.chat)) return m.reply(`ℹ️ El notificador no estaba activo.`)
    detenerNotificador(m.chat)
    return m.reply(`🛑 *Notificador detenido.*\n_Usa ${usedPrefix}jkstart para reactivar._`)
  }

  // ── .jkstatus ──────────────────────────────────────────────────────────────
  if (command === 'jkstatus') {
    const activo = global.jkActiveChats.has(m.chat)
    const entry  = global.jkActiveChats.get(m.chat)
    const cola   = global.jkEpisodeQueue.filter(i => i.chatId === m.chat)
    const vistos = (loadSeen()[m.chat] || []).length
    let txt = `📡 *Estado JKAnime + AnimeDBS*\n\n`
    txt += activo ? `✅ *Activo* — cada ${entry.intervalMin} min\n` : `🔴 *Inactivo*\n`
    txt += `📋 Cola: *${cola.length}* pendiente(s)\n`
    txt += `🔵 Procesando: *${global.jkQueueRunning ? 'Sí' : 'No'}*\n`
    txt += `👁️ Vistos: *${vistos}*`
    if (cola.length > 0) txt += `\n\n*En cola:*\n` + cola.slice(0, 5).map((i, n) => `  ${n + 1}. ${i.ep.titulo} ep ${zeroPad(i.ep.epNum)}`).join('\n')
    return m.reply(txt)
  }

  // ── .jkqueue ───────────────────────────────────────────────────────────────
  if (command === 'jkqueue') {
    if (!global.jkEpisodeQueue.length) return m.reply(`✅ Cola vacía.`)
    return m.reply(
      `📋 *Cola (${global.jkEpisodeQueue.length}):*\n\n` +
      global.jkEpisodeQueue.map((i, n) =>
        `${n + 1}. *${i.ep.titulo}* ep ${zeroPad(i.ep.epNum)} [${i.chatId === m.chat ? 'este chat' : 'otro chat'}] — ${i.ep.fuente}`
      ).join('\n')
    )
  }

  // ── .jkflush ───────────────────────────────────────────────────────────────
  if (command === 'jkflush') {
    const antes = global.jkEpisodeQueue.length
    global.jkEpisodeQueue = global.jkEpisodeQueue.filter(i => i.chatId !== m.chat)
    return m.reply(`🗑️ *${antes - global.jkEpisodeQueue.length}* episodio(s) eliminado(s).`)
  }

  // ── .jkunblock ─────────────────────────────────────────────────────────────
  if (command === 'jkunblock') {
    const estaba = global.jkQueueRunning
    global.jkQueueRunning = false
    if (global.jkEpisodeQueue.length > 0) {
      await m.reply(`🔓 Cola desbloqueada${estaba ? ' (estaba trabada)' : ''}.\n▶️ Reanudando ${global.jkEpisodeQueue.length} episodio(s)...`)
      procesarCola().catch(e => console.error('[jkanime-notify] cola error:', e.message))
    } else {
      await m.reply(`🔓 Cola desbloqueada${estaba ? ' (estaba trabada)' : ''}.\nℹ️ No hay episodios pendientes.`)
    }
    return
  }

  // ── .jkcheck ───────────────────────────────────────────────────────────────
  if (command === 'jkcheck') {
    await m.reply(`🔍 Chequeando JKAnime + AnimeDBS...`)
    try {
      await checkNuevosEpisodios(m.chat, conn)
      if (!global.jkEpisodeQueue.some(i => i.chatId === m.chat)) await m.reply(`✅ Sin episodios nuevos.`)
    } catch (err) { await m.reply(`❌ Error: ${err.message}`) }
    return
  }

  // ── .jkinterval ────────────────────────────────────────────────────────────
  if (command === 'jkinterval') {
    const min = parseInt(text?.trim())
    if (isNaN(min) || min < 5 || min > 60) return m.reply(`❌ Número entre *5* y *60*.\nEj: *${usedPrefix}jkinterval 15*`)
    if (!global.jkActiveChats.has(m.chat)) return m.reply(`⚠️ Usa *${usedPrefix}jkstart* primero.`)
    iniciarNotificador(m.chat, conn, min)
    return m.reply(`⏱️ Intervalo actualizado a *${min} minutos*.`)
  }

  // ── .jkexample [N] — prueba con episodios recientes de JKAnime ────────────
  if (command === 'jkexample') {
    const cantidad = Math.min(Math.max(parseInt(text?.trim()) || 1, 1), 10)
    await m.reply(`🔍 Obteniendo los *${cantidad}* episodio(s) más reciente(s) de *JKAnime*...`)

    let lista = []
    try {
      lista = await fetchLatestEpisodesJKAnime()
      if (!lista.length) return m.reply(`❌ Sin episodios de JKAnime disponibles. Intenta más tarde.`)
    } catch (err) { return m.reply(`❌ Error al obtener episodios: ${err.message}`) }

    const seleccion = lista.slice(0, cantidad)
    if (seleccion.length > 1) {
      await m.reply(
        `📋 *${seleccion.length} episodios seleccionados (JKAnime):*\n\n` +
        seleccion.map((e, i) => `${i + 1}. *${e.titulo}* — Ep ${zeroPad(e.epNum)}`).join('\n') +
        `\n\n⏳ _Se enviarán de uno en uno..._`
      )
    }

    for (const ep of seleccion) global.jkEpisodeQueue.push({ chatId: m.chat, ep })
    procesarCola().catch(e => console.error('[jkanime-notify] cola error:', e.message))
    return
  }

  // ── .dbsexample [N] — prueba con episodios recientes de AnimeDBS ──────────
  if (command === 'dbsexample') {
    const cantidad = Math.min(Math.max(parseInt(text?.trim()) || 1, 1), 10)
    await m.reply(`🔍 Obteniendo los *${cantidad}* episodio(s) más reciente(s) de *AnimeDBS*...`)

    let lista = []
    try {
      lista = await fetchLatestEpisodesAnimeDBS()
      if (!lista.length) return m.reply(`❌ Sin episodios de AnimeDBS disponibles. Intenta más tarde.`)
    } catch (err) { return m.reply(`❌ Error al obtener episodios: ${err.message}`) }

    const seleccion = lista.slice(0, cantidad)
    if (seleccion.length > 1) {
      await m.reply(
        `📋 *${seleccion.length} episodios seleccionados (AnimeDBS):*\n\n` +
        seleccion.map((e, i) => `${i + 1}. *${e.titulo}* — Ep ${zeroPad(e.epNum)}`).join('\n') +
        `\n\n⏳ _Se enviarán de uno en uno..._`
      )
    }

    for (const ep of seleccion) global.jkEpisodeQueue.push({ chatId: m.chat, ep })
    procesarCola().catch(e => console.error('[jkanime-notify] cola error:', e.message))
    return
  }
}

handler.command = /^(jkstart|jkstop|jkstatus|jkcheck|jkqueue|jkflush|jkunblock|jkinterval|jkexample|dbsexample)$/i
handler.tags    = ['anime', 'notificaciones']
handler.help    = ['jkstart', 'jkstop', 'jkstatus', 'jkcheck', 'jkqueue', 'jkflush', 'jkunblock', 'jkinterval <min>', 'jkexample [N]', 'dbsexample [N]']
handler.exp     = 0
handler.level   = 0
handler.limit   = false

handler.before = async (m, { conn }) => {
  if (conn) global.jkConn = conn
  restaurarNotificadores(conn)
}

export default handler
