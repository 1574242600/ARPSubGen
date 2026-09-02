import { describe, expect, test } from 'bun:test'
import { parseImportedJson, buildSubscribeFile, DEFAULT_EP_REGEX } from '../src/lib/config'

describe('parseImportedJson', () => {
    test('rss 列表按原顺序还原，非蜜柑源同样保留', () => {
        const file = [
            {
                tvdbId: 100,
                season: 1,
                rss: [
                    'https://mikanani.me/RSS/Bangumi?bangumiId=3060&subgroupid=1231',
                    'https://mikanani.me/RSS/Bangumi?bangumiId=3060&subgroupid=583',
                ],
            },
            { tvdbId: 200, season: 2, epRegex: ' 第(\\d+)集 ', epOffset: 1, rss: ['https://example.com/rss'] },
        ]

        const result = parseImportedJson(JSON.stringify(file))

        expect(result.skipped).toBe(0)
        expect(result.subscriptions[0].rss).toEqual([
            'https://mikanani.me/RSS/Bangumi?bangumiId=3060&subgroupid=1231',
            'https://mikanani.me/RSS/Bangumi?bangumiId=3060&subgroupid=583',
        ])
        expect(result.subscriptions[1].rss).toEqual(['https://example.com/rss'])
        expect(result.subscriptions[1].epOffset).toBe(1)
    })

    test('tvdbId 与 season 之外的均为可选，缺省取默认值', () => {
        const result = parseImportedJson(JSON.stringify([{ tvdbId: 100, season: 1 }]))

        expect(result.subscriptions[0].title).toBe('')
        expect(result.subscriptions[0].rss).toEqual([])
        expect(result.subscriptions[0].epRegex).toBe(DEFAULT_EP_REGEX)
        expect(result.subscriptions[0].epOffset).toBe(0)
    })

    test('rss 中的非字符串项被丢弃', () => {
        const result = parseImportedJson(JSON.stringify([
            { tvdbId: 100, season: 1, rss: ['https://example.com/rss', 42, null] },
        ]))

        expect(result.subscriptions[0].rss).toEqual(['https://example.com/rss'])
    })

    test('无效与重复条目被跳过并计数', () => {
        const result = parseImportedJson(JSON.stringify([
            { tvdbId: 1, season: 0 },
            { tvdbId: 1, season: 1 },
            { tvdbId: 'x' },
            { season: 3 },
            'str',
            null,
        ]))

        expect(result.subscriptions).toHaveLength(1)
        expect(result.skipped).toBe(5)
    })

    test('非 JSON 或根节点非数组时报错', () => {
        expect(() => parseImportedJson('not json')).toThrow('不是有效的 JSON')
        expect(() => parseImportedJson('{"tvdbId": 1}')).toThrow('根节点必须是数组')
    })
})

describe('buildSubscribeFile', () => {
    test('默认 epRegex/epOffset 不导出，无订阅源的跳过', () => {
        const subs = [
            { tvdbId: 100, season: 1, title: 'A', rss: ['https://example.com/a'], epRegex: DEFAULT_EP_REGEX, epOffset: 0 },
            { tvdbId: 200, season: 2, title: 'B', rss: ['https://example.com/b'], epRegex: ' 第(\\d+)集 ', epOffset: 5 },
            { tvdbId: 300, season: 1, title: 'C', rss: [], epRegex: DEFAULT_EP_REGEX, epOffset: 0 },
        ]

        const entries = buildSubscribeFile(subs)

        expect(entries).toHaveLength(2)
        expect(entries[0]).not.toHaveProperty('epRegex')
        expect(entries[0]).not.toHaveProperty('epOffset')
        expect(entries[0].rss).toEqual(['https://example.com/a'])
        expect(entries[1].epRegex).toBe(' 第(\\d+)集 ')
        expect(entries[1].epOffset).toBe(5)
    })

    test('导出 → 再导入完整还原状态（round-trip）', () => {
        const subs = [
            {
                tvdbId: 100,
                season: 1,
                title: 'A',
                rss: [
                    'https://mikanani.me/RSS/Bangumi?bangumiId=3060&subgroupid=1231',
                    'https://mikanani.me/RSS/Bangumi?bangumiId=3060&subgroupid=583',
                ],
                epRegex: DEFAULT_EP_REGEX,
                epOffset: 0,
            },
            { tvdbId: 200, season: 2, title: 'B', rss: ['https://example.com/b'], epRegex: ' 第(\\d+)集 ', epOffset: 5 },
        ]

        const result = parseImportedJson(JSON.stringify(buildSubscribeFile(subs)))

        expect(result.subscriptions[0].rss).toEqual(subs[0].rss)
        expect(result.subscriptions[1].rss).toEqual(['https://example.com/b'])
        expect(result.subscriptions[1].epOffset).toBe(5)
    })
})
