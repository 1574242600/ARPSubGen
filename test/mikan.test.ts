import { describe, expect, test } from 'bun:test'
import { mikanIdsOf, mikanRssUrl, parseMikanRss, resolveReleaseGroup } from '../src/lib/mikan'
import type { MikanData } from '../src/lib/types'

const mikan: MikanData = {
    releaseGroupNames: { '583': '喵萌奶茶屋', '1231': 'ANi' },
    items: [{
        id: 3060,
        title: '无职转生',
        dayofweek: 1,
        releaseGroups: [{ id: 583, items: [] }, { id: 1231, items: [] }],
    }],
}

describe('parseMikanRss', () => {
    test('解析蜜柑源的 bangumiId 与 subgroupid', () => {
        expect(parseMikanRss(mikanRssUrl(3060, 583)))
            .toEqual({ bangumiId: 3060, groupId: 583 })
    })

    test('缺少 subgroupid 时 groupId 为 null', () => {
        expect(parseMikanRss('https://mikanani.me/RSS/Bangumi?bangumiId=3060'))
            .toEqual({ bangumiId: 3060, groupId: null })
    })

    test('非蜜柑源、非法 id 与非法 URL 均返回 null', () => {
        expect(parseMikanRss('https://example.com/rss')).toBeNull()
        expect(parseMikanRss('https://mikanani.me/RSS/Bangumi?bangumiId=0&subgroupid=1')).toBeNull()
        expect(parseMikanRss('not a url')).toBeNull()
    })
})

describe('mikanIdsOf', () => {
    test('去重后保持首次出现顺序', () => {
        const rss = [
            mikanRssUrl(3060, 583),
            'https://example.com/rss',
            mikanRssUrl(3060, 1231),
            mikanRssUrl(42, 7),
        ]

        expect(mikanIdsOf(rss)).toEqual([3060, 42])
    })

    test('没有蜜柑源时为空数组', () => {
        expect(mikanIdsOf(['https://example.com/rss'])).toEqual([])
    })
})

describe('resolveReleaseGroup', () => {
    test('目录中存在该番剧与发布组时返回组名', () => {
        expect(resolveReleaseGroup(mikanRssUrl(3060, 583), mikan)).toBe('喵萌奶茶屋')
    })

    test('番剧不在目录、发布组不属于该番剧、或缺省 subgroupid 时返回 null', () => {
        expect(resolveReleaseGroup(mikanRssUrl(42, 583), mikan)).toBeNull()
        expect(resolveReleaseGroup(mikanRssUrl(3060, 999), mikan)).toBeNull()
        expect(resolveReleaseGroup('https://mikanani.me/RSS/Bangumi?bangumiId=3060', mikan)).toBeNull()
        expect(resolveReleaseGroup('https://example.com/rss', mikan)).toBeNull()
    })
})
