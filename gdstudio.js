```javascript
/**
 * @name GD音乐台 - 网易云
 * @description 使用 GD音乐台 API 为 LX Music 提供网易云音乐播放地址
 * @version 1.0.0
 * @author JY
 * @homepage https://music.gdstudio.xyz/
 *
 * 数据来源：GD音乐台 (music.gdstudio.xyz)
 * API 仅用于学习交流，请遵守 GD Studio 的 CC BY-NC 4.0 许可及相关声明。
 */

const { EVENT_NAMES, request, on, send } = globalThis.lx

// ============================================================
// 基础配置
// ============================================================

const API_BASE = 'https://music-api.gdstudio.xyz/api.php'

// GDStudio 官方限制：5 分钟不超过 50 次
// 为了留出安全余量，这里限制为 40 次
const RATE_LIMIT = {
  maxRequests: 40,
  window: 5 * 60 * 1000,
}

// 缓存时间
const CACHE_TIME = {
  musicUrl: 10 * 60 * 1000,
}

// LX Music 音质 → GDStudio 音质
const qualitys = {
  wy: {
    '128k': '128',
    '320k': '320',
    'flac': '740',
    'flac24bit': '999',
  },
}

// ============================================================
// HTTP 请求
// ============================================================

const httpRequest = (url, options = {}) => new Promise((resolve, reject) => {
  request(url, options, (err, resp) => {
    if (err) {
      reject(err)
      return
    }

    resolve(resp.body)
  })
})

// ============================================================
// 请求限流
// ============================================================

const requestTimes = []

const checkRateLimit = () => {
  const now = Date.now()

  // 删除 5 分钟以前的记录
  while (
    requestTimes.length > 0 &&
    now - requestTimes[0] >= RATE_LIMIT.window
  ) {
    requestTimes.shift()
  }

  if (requestTimes.length >= RATE_LIMIT.maxRequests) {
    throw new Error(
      'GDStudio API 请求次数已达到本地安全限制，请稍后再试'
    )
  }

  requestTimes.push(now)
}

// ============================================================
// 简单缓存
// ============================================================

const cache = new Map()

const getCache = key => {
  const item = cache.get(key)

  if (!item) return null

  if (Date.now() - item.time > item.ttl) {
    cache.delete(key)
    return null
  }

  return item.value
}

const setCache = (key, value, ttl) => {
  cache.set(key, {
    value,
    time: Date.now(),
    ttl,
  })
}

// ============================================================
// 工具函数
// ============================================================

const getMusicId = musicInfo => {
  // LX Music 不同情况下可能存在不同 ID 字段
  return (
    musicInfo.songmid ||
    musicInfo.id ||
    musicInfo.musicId ||
    musicInfo.songId
  )
}

// ============================================================
// GDStudio API
// ============================================================

const apis = {

  wy: {

    /**
     * 获取网易云音乐播放地址
     */
    async musicUrl(musicInfo, quality) {

      const id = getMusicId(musicInfo)

      if (!id) {
        throw new Error('无法获取网易云歌曲 ID')
      }

      // 默认使用 320K
      quality = quality || '320'

      const cacheKey = `wy:url:${id}:${quality}`

      // 优先使用缓存
      const cached = getCache(cacheKey)

      if (cached) {
        return cached
      }

      // 请求前检查频率限制
      checkRateLimit()

      const url =
        `${API_BASE}?types=url` +
        `&source=netease` +
        `&id=${encodeURIComponent(id)}` +
        `&br=${encodeURIComponent(quality)}`

      const body = await httpRequest(url)

      let data

      try {
        data = typeof body === 'string'
          ? JSON.parse(body)
          : body
      } catch (err) {
        throw new Error('GDStudio 返回的数据不是有效 JSON')
      }

      if (!data || !data.url) {
        throw new Error(
          data?.message ||
          data?.error ||
          'GDStudio 没有返回有效的音乐 URL'
        )
      }

      // 缓存播放地址
      setCache(
        cacheKey,
        data.url,
        CACHE_TIME.musicUrl
      )

      return data.url
    },
  },
}

// ============================================================
// LX Music 请求事件
// ============================================================

on(EVENT_NAMES.request, ({ source, action, info }) => {

  if (!apis[source]) {
    return Promise.reject(
      new Error(`不支持的音乐源：${source}`)
    )
  }

  switch (action) {

    case 'musicUrl': {
      const quality =
        qualitys[source]?.[info.type] ||
        '320'

      return apis[source]
        .musicUrl(info.musicInfo, quality)
        .catch(err => {
          console.log('[GDStudio]', err)
          return Promise.reject(err)
        })
    }

    default:
      return Promise.reject(
        new Error(`暂不支持的操作：${action}`)
      )
  }
})

// ============================================================
// 初始化
// ============================================================

send(EVENT_NAMES.inited, {
  // 调试阶段可以改成 true
  openDevTools: false,

  sources: {

    wy: {
      name: '网易云音乐（GD音乐台）',

      type: 'music',

      actions: [
        'musicUrl',
      ],

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
