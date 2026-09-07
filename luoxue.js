/**
 * @name GD音乐台
 * @description 基于GD Studio音乐API的音源
 * @version 1.0.0
 * @author GD Studio
 * @homepage https://music.gdstudio.xyz
 */

const { EVENT_NAMES, request, on, send } = globalThis.lx;

// 默认音乐源（可修改为 netease / joox / bilibili 等）
const DEFAULT_SOURCE = 'netease';

// HTTP 请求封装
const httpRequest = (url, options) => new Promise((resolve, reject) => {
    request(url, options, (err, resp) => {
        if (err) return reject(err);
        resolve(resp.body);
    });
});

// 从 musicInfo 中提取必要字段
const getMusicInfo = (musicInfo) => {
    const id = musicInfo.songmid || musicInfo.id;
    const source = musicInfo.source || DEFAULT_SOURCE;
    return { id, source };
};

// 获取音乐 URL
const handleMusicUrl = async (info) => {
    const { id, source } = getMusicInfo(info.musicInfo);
    const brMap = {
        '128k': 128,
        '320k': 320,
        'flac': 740,
        'flac24bit': 999,
    };
    // 若 info.type 为 null（local 源特性），默认使用最高音质 999
    const br = brMap[info.type] || 999;
    const url = `https://music-api.gdstudio.xyz/api.php?types=url&source=${source}&id=${id}&br=${br}`;
    const data = await httpRequest(url);
    const json = JSON.parse(data);
    if (json.url) return json.url;
    throw new Error('获取音乐URL失败');
};

// 获取歌词
const handleLyric = async (info) => {
    const { id, source } = getMusicInfo(info.musicInfo);
    // 歌词ID优先使用 lyric_id，否则使用歌曲ID
    const lyricId = info.musicInfo.lyric_id || id;
    const url = `https://music-api.gdstudio.xyz/api.php?types=lyric&source=${source}&id=${lyricId}`;
    const data = await httpRequest(url);
    const json = JSON.parse(data);
    return {
        lyric: json.lyric || '',
        tlyric: json.tlyric || '',
    };
};

// 获取封面
const handlePic = async (info) => {
    const { id, source } = getMusicInfo(info.musicInfo);
    // 封面ID优先使用 pic_id，否则使用歌曲ID
    const picId = info.musicInfo.pic_id || id;
    const url = `https://music-api.gdstudio.xyz/api.php?types=pic&source=${source}&id=${picId}&size=500`;
    const data = await httpRequest(url);
    const json = JSON.parse(data);
    if (json.url) return json.url;
    throw new Error('获取封面失败');
};

// 注册请求事件
on(EVENT_NAMES.request, ({ source, action, info }) => {
    switch (action) {
        case 'musicUrl':
            return handleMusicUrl(info);
        case 'lyric':
            return handleLyric(info);
        case 'pic':
            return handlePic(info);
        default:
            return Promise.reject(new Error('不支持的 action'));
    }
});

// 发送初始化事件
send(EVENT_NAMES.inited, {
    sources: {
        local: {
            name: 'GD音乐台',
            type: 'music',
            actions: ['musicUrl', 'lyric', 'pic'],
            qualitys: [], // 音质选择由脚本内部决定
        },
    },
});
