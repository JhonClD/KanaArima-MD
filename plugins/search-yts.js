/*

- Agradecimiento a la comunidad de "WSApp • Developers"
 * https://chat.whatsapp.com/FaQunmlp9BmDRk6lEEc9FJ
- Agradecimiento especial a Carlos (PT) por los codigos de interactiveMessage (botones)
- Agradecimiento a Darlyn1234 por la estructura de uso en este codigo y quoted
 * https://github.com/darlyn1234
- Adaptacion de imagen en tipo lista, codigo y funcionamiento por BrunoSobrino
 * https://github.com/BrunoSobrino

*/
import { prepareWAMessageMedia, generateWAMessageFromContent, getDevice } from "@itsliaaa/baileys"
import yts from 'yt-search';
import fs from 'fs';

const handler = async (m, { conn, text, usedPrefix: prefijo }) => {
    const datas = global;
    const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
    const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
    const traductor = _translate.plugins.buscador_yts;
    const device = getDevice(m.key.id);

    if (!text) throw `⚠️ *${traductor.texto1}*`;

    const results = await yts(text);
    if (!results || !results?.videos?.length) return m.reply('> *[❗] Error: Videos not found.*');
    const videos = results.videos.slice(0, 20);
    const randomIndex = Math.floor(Math.random() * videos.length);
    const randomVideo = videos[randomIndex];

    if (device !== 'desktop' && device !== 'web') {

        const messa = await prepareWAMessageMedia(
            { image: { url: randomVideo.thumbnail } },
            { upload: conn.waUploadToServer }
        );

        const interactiveMessage = {
            body: {
                text: `*—◉ Resultados obtenidos:* ${results.videos.length}\n*—◉ Video aleatorio:*\n*-› Title:* ${randomVideo.title}\n*-› Author:* ${randomVideo.author.name}\n*-› Views:* ${randomVideo.views}\n*-› ${traductor.texto2[0]}:* ${randomVideo.url}\n*-› Imagen:* ${randomVideo.thumbnail}`.trim()
            },
            footer: {
                text: `${global.wm}`.trim()
            },
            header: {
                title: `*< YouTube Search />*`,
                hasMediaAttachment: true,
                imageMessage: messa.imageMessage
            },
            nativeFlowMessage: {
                buttons: [
                    {
                        name: 'single_select',
                        buttonParamsJson: JSON.stringify({
                            title: 'OPCIONES DISPONIBLES',
                            sections: videos.map((video) => ({
                                title: video.title.substring(0, 24),
                                highlight_label: '',
                                rows: [
                                    {
                                        header: video.title.substring(0, 60),
                                        title: `🎵 ${video.author.name}`.substring(0, 60),
                                        description: 'Descargar MP3',
                                        id: `${prefijo}ytmp3 ${video.url}`
                                    },
                                    {
                                        header: video.title.substring(0, 60),
                                        title: `🎬 ${video.author.name}`.substring(0, 60),
                                        description: 'Descargar MP4',
                                        id: `${prefijo}ytmp4 ${video.url}`
                                    }
                                ]
                            }))
                        })
                    }
                ],
                messageParamsJson: ''
            }
        };

        const msg = generateWAMessageFromContent(
            m.chat,
            {
                viewOnceMessage: {
                    message: {
                        interactiveMessage
                    }
                }
            },
            {
                userJid: conn.user.jid,
                quoted: m
            }
        );

        await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id });

    } else {

        const tes = results.all;
        const teks = results.all.map((v) => {
            switch (v.type) {
                case 'video': return `
° *_${v.title}_*
↳ 🫐 *_${traductor.texto2[0]}_* ${v.url}
↳ 🕒 *_${traductor.texto2[1]}_* ${v.timestamp}
↳ 📥 *_${traductor.texto2[2]}_* ${v.ago}
↳ 👁 *_${traductor.texto2[3]}_* ${v.views}`;
            }
        }).filter((v) => v).join('\n\n◦◦◦◦◦◦◦◦◦◦◦◦◦◦◦◦◦◦◦◦◦◦◦◦◦◦◦◦◦◦\n\n');

        await conn.sendFile(m.chat, tes[0].thumbnail, 'error.jpg', teks.trim(), m);
    }
};

handler.help = ['ytsearch <texto>'];
handler.tags = ['search'];
handler.command = /^(ytsearch|yts|searchyt|buscaryt|videosearch|audiosearch)$/i;
export default handler;
