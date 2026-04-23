import fetch from 'node-fetch'
import axios from 'axios'

const MAX_FILE_SIZE_MB = 80
const CACHE_TIME = 1 * 60 * 1000 // 1 minuto
let spotifyCache = {}

function formatNumber(num) {
    return num.toLocaleString('en-US')
}

async function getSize(url) {
    try {
        const res = await axios.head(url)
        const len = res.headers['content-length']
        return len ? parseInt(len, 10) : 0
    } catch {
        return 0
    }
}

function formatSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB']
    let i = 0
    while (bytes >= 1024 && i < units.length - 1) {
        bytes /= 1024
        i++
    }
    return `${bytes.toFixed(2)} ${units[i]}`
}

function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
}

async function searchSpotify(query) {
    try {
        const api = `https://api.delirius.store/search/spotify?q=${encodeURIComponent(query)}&limit=10`
        const res = await fetch(api)
        const data = await res.json()

        if (data && data.data && Array.isArray(data.data)) {
            return data.data
        }
        return []
    } catch (e) {
        console.error('Error en búsqueda de Spotify:', e)
        return []
    }
}

async function downloadSpotify(url) {
    try {
        const api = `https://api.delirius.store/download/spotifydl?url=${encodeURIComponent(url)}`
        const res = await fetch(api)
        const data = await res.json()

        if (data && data.data && data.data.download) {
            return {
                link: data.data.download,
                title: data.data.title || 'Unknown',
                artist: data.data.author || 'Unknown',
                thumbnail: data.data.image || null
            }
        }
        return null
    } catch (e) {
        console.error('Error al descargar:', e)
        return null
    }
}

var handler = async (m, { text, conn, usedPrefix, command }) => {

    if (!text) {
        return conn.sendMessage(m.chat, { text: `〩 *Ejemplo de uso:*\n*${usedPrefix + command}* Golden Brown` }, { quoted: m })
    }

    try {
        await m.react('⏰')

        const results = await searchSpotify(text)

        if (!results.length) {
            return conn.sendMessage(m.chat, { text: "No se han encontrado resultados..." }, { quoted: m })
        }

        let caption = `· ┄ · ⊸ 𔓕 *Spotify  :  Search*\n\n`
        caption += `\t＃ *Búsqueda* : ${text}\n`
        caption += `\t＃ *Resultados* : *${results.length}* canciones\n`
        caption += `\t＃ *Fuente* : Spotify\n\n📍  Responda a este mensaje con el numero correspondiente.\n\n\n`

        for (let i = 0; i < results.length; i++) {
            const track = results[i]
            caption += `⧡ *${i + 1}* : ${track.id}\n`
            caption += `⧡ *Titulo* : ${track.title}\n`
            caption += `⧡ *Duracion* : ${track.duration || 'N/A'}\n`
            caption += `⧡ *Enlace* : ${track.url || 'N/A'}\n\n\n`
        }

        caption += `⏰ *Expira en:* 1 minuto\n\n`
        caption += `> Buscador de Spotify (created @Farguts)`

        const thumbnail = results[0].image || results[0].thumbnail || null

        let mensajeEnviado;

        if (thumbnail) {
            const thumbData = (await conn.getFile(thumbnail))?.data
            mensajeEnviado = await conn.sendMessage(m.chat, { 
                text: caption, 
                mentions: [m.sender], 
                contextInfo: { 
                    externalAdReply: { 
                        title: "⧿ Spotify : Search ⧿", 
                        body: botname, 
                        thumbnail: thumbData, 
                        sourceUrl: null, 
                        mediaType: 1, 
                        renderLargerThumbnail: false 
                    }
                }
            }, { quoted: m })
        } else {
            mensajeEnviado = await conn.sendMessage(m.chat, { text: caption }, { quoted: m })
        }

        // Guardar en caché con el ID del mensaje
        const messageId = mensajeEnviado.key.id

        spotifyCache[messageId] = { 
            results: results, 
            timestamp: Date.now(),
            chat: m.chat,
            activo: true,
            expirado: false,
            usuariosDescargados: {} // Rastrear qué usuarios ya descargaron qué canción
        }

        // Timer de 1 minuto
        setTimeout(() => {
            if (spotifyCache[messageId] && spotifyCache[messageId].activo && !spotifyCache[messageId].expirado) {
                spotifyCache[messageId].expirado = true
                spotifyCache[messageId].activo = false

                conn.sendMessage(m.chat, { 
                    text: `⏰  La búsqueda de Spotify ha expirado.\n\n> Usa *${usedPrefix}sp* para buscar de nuevo.` 
                })

                // Limpiar después de 10 segundos
                setTimeout(() => {
                    delete spotifyCache[messageId]
                }, 10000)
            }
        }, CACHE_TIME)

        await m.react('✅')
    } catch (e) {
        console.error('Error en comando spotify:', e)
        await conn.sendMessage(m.chat, { text: `${e.message}` }, { quoted: m })
    }
}

handler.before = async (m, { conn }) => {
    if (!m.text) return false
    if (m.isBaileys) return false
    if (!m.quoted) return false

    // Verificar que esté citando un mensaje del bot
    if (!m.quoted.fromMe) return false

    // Detectar si el mensaje es solo un número del 1 al 10
    const match = m.text.trim().match(/^(\d{1,2})$/i)
    if (!match) return false

    const index = parseInt(match[1]) - 1
    const userId = m.sender

    // Obtener el messageId del mensaje citado
    const messageId = m.quoted.id

    // Verificar si existe en el caché de Spotify
    const searchCache = spotifyCache[messageId]

    // Si no existe en el caché de Spotify, ignorar (no es un mensaje de búsqueda de Spotify)
    if (!searchCache) return false

    // Verificar si ya expiró
    if (searchCache.expirado || !searchCache.activo) {
        // Solo mostrar mensaje de expiración si aún no se ha mostrado
        if (!searchCache.mensajeMostrado) {
            searchCache.mensajeMostrado = true
            await conn.sendMessage(m.chat, { 
                text: `⏰  La búsqueda ha expirado.\n\n> Vuelve a usar el comando de búsqueda.` 
            }, { quoted: m })
        }
        return true
    }

    // Verificar que el índice sea válido
    if (!searchCache.results[index]) {
        await conn.sendMessage(m.chat, { 
            text: `📍  Número inválido. Elige un número entre 1 y ${searchCache.results.length}.` 
        }, { quoted: m })
        return true
    }

    const track = searchCache.results[index]

    try {
        await m.react('⏰')

        const downloadData = await downloadSpotify(track.url)

        if (!downloadData) {
            return conn.sendMessage(m.chat, { text: "No se han encontrado resultados o la API fallo." }, { quoted: m })
        }

        const size = await getSize(downloadData.link)
        const mb = size / (1024 * 1024)
        const sendAsDoc = mb > MAX_FILE_SIZE_MB

        const caption = `${botname}\n> Buscador de Spotify.`

        if (sendAsDoc) {
            await conn.sendMessage(m.chat, { 
                document: { url: downloadData.link }, 
                fileName: `${downloadData.title} - ${downloadData.artist}.mp3`, 
                mimetype: 'audio/mpeg', 
                caption 
            }, { quoted: m })
        } else {
            await conn.sendMessage(m.chat, { 
                audio: { url: downloadData.link }, 
                fileName: `${downloadData.title} - ${downloadData.artist}.mp3`, 
                mimetype: 'audio/mpeg', 
                ptt: false, 
                caption 
            }, { quoted: m })
        }

        await m.react('✅')

        // NO eliminar el caché, solo registrar que este usuario descargó esta canción
        if (!searchCache.usuariosDescargados[userId]) {
            searchCache.usuariosDescargados[userId] = []
        }
        searchCache.usuariosDescargados[userId].push(index)

    } catch (e) {
        console.error('Error al descargar:', e)
        await conn.sendMessage(m.chat, { text: `${e.message}` }, { quoted: m })
    }

    return true
}

handler.tags = ['download']
handler.command = ['spotifys', 'sp', 'spys']
export default handler
