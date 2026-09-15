import { describe, expect, test } from 'bun:test'
import { parseImportedJson, buildSubscribeFile, subscriptionIssues } from '../src/lib/config'
import { DEFAULT_EP_OFFSET, DEFAULT_EP_REGEX, resolveEpOffset, resolveEpRegex } from '../src/lib/feed'
import type { Subscription } from '../src/lib/types'

/** Subscription fixture: the default config sits on feed 1, the rest inherits it. */
function sub(patch: Partial<Subscription> = {}): Subscription {
    return {
        tvdbId: 100,
        season: 1,
        title: '',
        rss: ['https://example.com/rss'],
        epRegex: [DEFAULT_EP_REGEX],
        epOffset: [DEFAULT_EP_OFFSET],
        ...patch,
    }
}

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
            { tvdbId: 200, season: 2, epRegex: [' 第(\\d+)集 '], epOffset: [1], rss: ['https://example.com/rss'] },
        ]

        const result = parseImportedJson(JSON.stringify(file))

        expect(result.skipped).toBe(0)
        expect(result.subscriptions[0].rss).toEqual([
            'https://mikanani.me/RSS/Bangumi?bangumiId=3060&subgroupid=1231',
            'https://mikanani.me/RSS/Bangumi?bangumiId=3060&subgroupid=583',
        ])
        expect(result.subscriptions[1].rss).toEqual(['https://example.com/rss'])
        expect(resolveEpRegex(result.subscriptions[1], 0)).toBe(' 第(\\d+)集 ')
        expect(resolveEpOffset(result.subscriptions[1], 0)).toBe(1)
    })

    test('tvdbId 与 season 之外的均为可选，缺省取默认值', () => {
        const result = parseImportedJson(JSON.stringify([{ tvdbId: 100, season: 1 }]))

        expect(result.subscriptions[0].title).toBe('')
        expect(result.subscriptions[0].rss).toEqual([])
        expect(result.subscriptions[0].epRegex).toEqual([DEFAULT_EP_REGEX])
        expect(result.subscriptions[0].epOffset).toEqual([DEFAULT_EP_OFFSET])
    })

    test('每源数组按索引读入：空洞与更短的数组都表示继承源 1', () => {
        const result = parseImportedJson(JSON.stringify([
            { tvdbId: 100, season: 1, epRegex: [' A ', '', ' B '], epOffset: [3], rss: ['u1', 'u2', 'u3'] },
        ]))
        const imported = result.subscriptions[0]

        expect(imported.epRegex).toEqual([' A ', undefined, ' B '])
        expect(resolveEpRegex(imported, 1)).toBe(' A ')
        expect(resolveEpRegex(imported, 2)).toBe(' B ')
        expect(resolveEpOffset(imported, 2)).toBe(3)
    })

    test('兼容旧的标量形式', () => {
        const result = parseImportedJson(JSON.stringify([
            { tvdbId: 100, season: 1, epRegex: ' 旧 ', epOffset: 4, rss: ['https://example.com/rss'] },
        ]))

        expect(resolveEpRegex(result.subscriptions[0], 0)).toBe(' 旧 ')
        expect(resolveEpOffset(result.subscriptions[0], 0)).toBe(4)
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
    test('带 title 导出，默认 epRegex/epOffset 不导出，空标题省略，无订阅源的跳过', () => {
        const subs = [
            sub({ tvdbId: 100, title: 'A', rss: ['https://example.com/a'] }),
            sub({ tvdbId: 200, season: 2, title: 'B', rss: ['https://example.com/b'], epRegex: [' 第(\\d+)集 '], epOffset: [5] }),
            sub({ tvdbId: 300, title: 'C', rss: [] }),
            sub({ tvdbId: 400, title: '', rss: ['https://example.com/c'] }),
        ]

        const entries = buildSubscribeFile(subs)

        expect(entries).toHaveLength(3)
        expect(entries[0].title).toBe('A')
        expect(entries[0]).not.toHaveProperty('epRegex')
        expect(entries[0]).not.toHaveProperty('epOffset')
        expect(entries[0].rss).toEqual(['https://example.com/a'])
        expect(entries[1].title).toBe('B')
        expect(entries[1].epRegex).toEqual([' 第(\\d+)集 '])
        expect(entries[1].epOffset).toEqual([5])
        expect(entries[2]).not.toHaveProperty('title')
    })

    test('每源配置导出为逐源数组，尾部与默认相同的项省略', () => {
        const subs = [
            sub({
                tvdbId: 100,
                rss: ['https://example.com/1', 'https://example.com/2', 'https://example.com/3'],
                epRegex: [' A ', undefined, ' B '],
                epOffset: [7],
            }),
        ]

        const [entry] = buildSubscribeFile(subs)

        expect(entry.epRegex).toEqual([' A ', ' A ', ' B '])
        expect(entry.epOffset).toEqual([7])
    })

    test('导出 → 再导入完整还原状态（round-trip）', () => {
        const subs = [
            sub({
                tvdbId: 100,
                title: 'A',
                rss: [
                    'https://mikanani.me/RSS/Bangumi?bangumiId=3060&subgroupid=1231',
                    'https://mikanani.me/RSS/Bangumi?bangumiId=3060&subgroupid=583',
                ],
            }),
            sub({ tvdbId: 200, season: 2, title: 'B', rss: ['https://example.com/b'], epRegex: [' 第(\\d+)集 '], epOffset: [5] }),
        ]

        const result = parseImportedJson(JSON.stringify(buildSubscribeFile(subs)))

        expect(result.subscriptions[0].rss).toEqual(subs[0].rss)
        expect(result.subscriptions[1].rss).toEqual(['https://example.com/b'])
        expect(resolveEpRegex(result.subscriptions[1], 0)).toBe(' 第(\\d+)集 ')
        expect(resolveEpOffset(result.subscriptions[1], 0)).toBe(5)
    })
})

describe('subscriptionIssues', () => {
    const base = sub()

    test('无冲突且正则合法时无问题', () => {
        expect(subscriptionIssues({ ...base, rss: [] })).toEqual([])
        expect(subscriptionIssues({ ...base, rss: ['https://example.com/rss'] })).toEqual([])
        expect(subscriptionIssues({ ...base, rss: [
            'https://mikanani.me/RSS/Bangumi?bangumiId=3060&subgroupid=583',
            'https://example.com/rss',
        ] })).toEqual([])
    })

    test('同一番剧多个蜜柑源不算冲突，跨番剧才算', () => {
        expect(subscriptionIssues({ ...base, rss: [
            'https://mikanani.me/RSS/Bangumi?bangumiId=3060&subgroupid=583',
            'https://mikanani.me/RSS/Bangumi?bangumiId=3060&subgroupid=1231',
        ] })).toEqual([])

        expect(subscriptionIssues({ ...base, rss: [
            'https://mikanani.me/RSS/Bangumi?bangumiId=3060&subgroupid=583',
            'https://mikanani.me/RSS/Bangumi?bangumiId=42&subgroupid=583',
        ] })).toEqual(['蜜柑 Id 冲突：3060、42'])
    })

    test('非法正则指向具体的源，且与冲突可同时存在', () => {
        expect(subscriptionIssues({ ...base, rss: [], epRegex: [' (['] })).toEqual(['集数正则无效'])
        expect(subscriptionIssues({ ...base, rss: ['u1', 'u2'], epRegex: [' A ', ' (['] }))
            .toEqual(['第 2 个源的集数正则无效'])
        expect(subscriptionIssues({ ...base, rss: [
            'https://mikanani.me/RSS/Bangumi?bangumiId=3060&subgroupid=583',
            'https://mikanani.me/RSS/Bangumi?bangumiId=42&subgroupid=583',
        ], epRegex: [' (['] })).toEqual(['蜜柑 Id 冲突：3060、42', '集数正则无效'])
    })
})
