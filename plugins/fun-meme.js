/**
 * fun-meme.js — Plugin KanaArima-MD / Rikka-Bot (Baileys)
 * Obtiene memes aleatorios de Reddit sin API key.
 * Uso: .meme          → subreddit aleatorio de la lista
 *      .meme dankmemes → subreddit específico
 */

// ─── Subreddits disponibles ───────────────────────────────────────────────────
const SUBREDDITS = [
  'memes',
  'dankmemes',
  'me_irl',
  'funny',
  'AdviceAnimals',
  'shitposting',
  'meme',
  'comedyheaven',
  'surrealmemes',
  'bonehurtingjuice',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
const IMAGE_EXT = /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function isImagePost(post) {
  if (post.is_video)                   return false
  if (post.over_18)                    return false  // sin NSFW
  if (post.spoiler)                    return false
  if (post.post_hint === 'image')      return true
  if (IMAGE_EXT.test(post.url || '')) return true
  return false
}

// ─── Fetch de meme desde Reddit ───────────────────────────────────────────────
async function fetchMeme(subreddit) {
  const sorts = ['hot', 'top', 'new']
  const sort  = pick(sorts)
  const url   = `https://www.reddit.com/r/${subreddit}/${sort}.json?limit=50&t=day`

  const res = await fetch(url, {
    headers: { 'User-Agent': 'KanaArima-Bot/1.0' },
    signal: AbortSignal.timeout(15_000),
  })

  if (!res.ok) throw new Error(`Reddit HTTP ${res.status} en r/${subreddit}`)

  const json  = await res.json()
  const posts = (json?.data?.children || []).map(c => c.data)
  const valid = posts.filter(isImagePost)

  if (!valid.length) throw new Error(`Sin imágenes en r/${subreddit}`)

  return pick(valid)
}

// ─── Formato del caption ──────────────────────────────────────────────────────
function formatUpvotes(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

function buildCaption(post) {
  return (
    `😂 *${post.title}*\n\n` +
    `📌 r/${post.subreddit}\n` +
    `👤 u/${post.author}\n` +
    `⬆️ ${formatUpvotes(post.score)} upvotes\n\n` +
    `_${global.wm}_`
  )
}

// ─── Handler ──────────────────────────────────────────────────────────────────
let handler = async (m, { conn, args }) => {
  // Determinar subreddit
  const requestedSub = args[0]?.replace(/^r\//i, '').trim()
  const subreddit    = requestedSub || pick(SUBREDDITS)

  await conn.sendMessage(m.chat, { react: { text: '🔍', key: m.key } })

  try {
    const post    = await fetchMeme(subreddit)
    const caption = buildCaption(post)

    // GIFs como video, imágenes estáticas como image
    if (/\.gif(\?.*)?$/i.test(post.url)) {
      await conn.sendMessage(m.chat, { video: { url: post.url }, caption, gifPlayback: true }, { quoted: m })
    } else {
      await conn.sendMessage(m.chat, { image: { url: post.url }, caption }, { quoted: m })
    }

    await conn.sendMessage(m.chat, { react: { text: '😂', key: m.key } })

  } catch (err) {
    // Si el subreddit pedido falla, intentar con uno de la lista por defecto
    if (requestedSub) {
      return conn.sendMessage(m.chat, {
        text: `❌ No se pudo obtener memes de *r/${subreddit}*\n_${err.message}_`,
      }, { quoted: m })
    }

    // Fallback: reintentar con otro subreddit
    try {
      const fallbackSub = pick(SUBREDDITS.filter(s => s !== subreddit))
      const post        = await fetchMeme(fallbackSub)
      const caption     = buildCaption(post)

      if (/\.gif(\?.*)?$/i.test(post.url)) {
        await conn.sendMessage(m.chat, { video: { url: post.url }, caption, gifPlayback: true }, { quoted: m })
      } else {
        await conn.sendMessage(m.chat, { image: { url: post.url }, caption }, { quoted: m })
      }

      await conn.sendMessage(m.chat, { react: { text: '😂', key: m.key } })

    } catch (e2) {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      await conn.sendMessage(m.chat, {
        text: `❌ *No se pudo obtener ningún meme*\n_${e2.message}_`,
      }, { quoted: m })
    }
  }
}

handler.help    = ['meme', 'meme <subreddit>']
handler.tags    = ['fun']
handler.command = /^meme$/i

export default handler
