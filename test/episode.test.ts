import { describe, expect, test } from 'bun:test'
import { episodePreviewGroups, isValidEpisodeRegex, parseEpisode } from '../src/lib/episode'
import type { MikanData } from '../src/lib/types'
import { mikanRssUrl } from '../src/lib/mikan'

const mikan: MikanData = {
    releaseGroupNames: { '583': '喵萌奶茶屋', '1231': 'ANi' },
    items: [{
        id: 3060,
        title: '无职转生',
        dayofweek: 1,
        releaseGroups: [
            { id: 583, items: ['[喵萌奶茶屋] 无职转生 04 [1080p]', '[喵萌奶茶屋] 无职转生 05 [1080p]'] },
            { id: 1231, items: ['[ANi] 无职转生 05 简体'] },
        ],
    }],
}

describe('parseEpisode', () => {
    test('默认正则在空格包裹的数字上取集数', () => {
        expect(parseEpisode('[喵萌] 无职转生 04 [1080p]', ' (\\d{2,}) ', 0)).toBe(4)
    })

    test('偏移作用于提取到的数字', () => {
        expect(parseEpisode('第2集', '第(\\d+)集', 1)).toBe(3)
        expect(parseEpisode('EP10', '(\\d+)', -1)).toBe(9)
    })

    test('无匹配或正则非法返回 null', () => {
        expect(parseEpisode('无职转生 S01', ' (\\d{2,}) ', 0)).toBeNull()
        expect(parseEpisode('无职转生', '([', 0)).toBeNull()
    })
})

describe('isValidEpisodeRegex', () => {
    test('可编译的正则返回 true', () => {
        expect(isValidEpisodeRegex(' (\\d{2,}) ')).toBe(true)
        expect(isValidEpisodeRegex('第(\\d+)集')).toBe(true)
    })

    test('非法正则返回 false', () => {
        expect(isValidEpisodeRegex('([')).toBe(false)
        expect(isValidEpisodeRegex('\\')).toBe(false)
    })
})

describe('episodePreviewGroups', () => {
    test('按 RSS 优先级分组建组，组名取自目录', () => {
        const rss = [
            mikanRssUrl(3060, 583),
            'https://example.com/custom-feed',
            mikanRssUrl(3060, 1231),
        ]

        expect(episodePreviewGroups(rss, mikan)).toEqual([
            {
                key: '3060:583',
                name: '喵萌奶茶屋',
                titles: ['[喵萌奶茶屋] 无职转生 04 [1080p]', '[喵萌奶茶屋] 无职转生 05 [1080p]'],
            },
            { key: '3060:1231', name: 'ANi', titles: ['[ANi] 无职转生 05 简体'] },
        ])
    })

    test('同一发布组多行 RSS 合并为一组', () => {
        const rss = [mikanRssUrl(3060, 583), mikanRssUrl(3060, 583)]

        expect(episodePreviewGroups(rss, mikan)).toHaveLength(1)
        expect(episodePreviewGroups(rss, mikan)[0].titles).toHaveLength(2)
    })

    test('目录外的组、无标题的组与非蜜柑 RSS 被跳过', () => {
        const rss = [
            mikanRssUrl(3060, 999),
            mikanRssUrl(42, 583),
            'https://mikanani.me/RSS/Bangumi?bangumiId=3060',
            'https://example.com/rss',
        ]

        expect(episodePreviewGroups(rss, mikan)).toEqual([])
    })
})
