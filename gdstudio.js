```javascript
/**
 * @name GD音乐台测试
 * @description GD音乐台网易云播放源
 * @version 1.0.0
 * @author JY
 * @homepage https://music.gdstudio.xyz/
 */

const { EVENT_NAMES, request, on, send } = globalThis.lx

const API = 'https://music-api.gdstudio.xyz/api.php'

const qualitys = {
  wy: {
    '128k': '128',
    '320k': '320',
    flac: '740',
    flac24bit: '999',
  },
}

const httpRequest = (url, options) => new Promise((resolve, reject) => {
  request(url, options || {}, (err, resp) => {
    if (err) {
      reject(err)
      return
    }

    resolve(resp.body)
  })
})

const getMusicId = musicInfo => {
  if (musicInfo.songmid) return musicInfo.songmid
  if (musicInfo.id) return musicInfo.id
  if (musicInfo.musicId) return musicInfo.musicId
  if (musicInfo.songId) return musicInfo.songId

  return null
}

const musicUrl = async (musicInfo, quality) => {
  const id = getMusicId(musicInfo)

  if (!id) {
    throw new Error('无法获取歌曲 ID')
  }

  const url =
    API +
    '?types=url' +
    '&source=netease' +
    '&id=' + encodeURIComponent(id) +
    '&br=' + encodeURIComponent(quality || '320')

  const body = await httpRequest(url)

  if (!body || !body.url) {
    throw new Error('GDStudio 没有返回音乐 URL')
  }

  return body.url
}

on(EVENT_NAMES.request, ({ source, action, info }) => {
  if (source !== 'wy') {
    return Promise.reject(new Error('不支持的音乐源'))
  }

  if (action !== 'musicUrl') {
    return Promise.reject(new Error('不支持的操作'))
  }

  const quality = qualitys.wy[info.type] || '320'

  return musicUrl(info.musicInfo, quality)
})

send(EVENT_NAMES.inited, {
  openDevTools: true,

  sources: {
    wy: {
      name: '网易云音乐 - GD音乐台',
      type: 'music',
      actions: ['musicUrl'],
      qualitys: [
        '128k',
        '320k',
        'flac',
        'flac24bit',
      ],
    },
  },
})
```
