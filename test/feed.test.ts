import { describe, expect, test } from 'bun:test'
import {
    DEFAULT_EP_OFFSET,
    DEFAULT_EP_REGEX,
    addFeed,
    feedArray,
    parseEpOffsetField,
    parseEpRegexField,
    raiseFeed,
    removeFeed,
    resolveEpOffset,
    resolveEpRegex,
    setFeedEpOffset,
    setFeedEpRegex,
    subscribeEpOffset,
    subscribeEpRegex,
} from '../src/lib/feed'
import type { Subscription } from '../src/lib/types'

/** Subscription fixture: the default config sits on feed 1, the rest inherits it. */
function sub(patch: Partial<Subscription> = {}): Subscription {
    return {
        tvdbId: 100,
        season: 1,
        title: 'A',
        rss: ['https://example.com/1', 'https://example.com/2'],
        epRegex: [DEFAULT_EP_REGEX],
        epOffset: [DEFAULT_EP_OFFSET],
        ...patch,
    }
}

describe('resolveEpRegex / resolveEpOffset', () => {
    test('未覆盖的源继承源 1 的值', () => {
        const s = sub({ rss: ['u1', 'u2', 'u3'], epRegex: [' A ', ' B '], epOffset: [3, 9] })

        expect(resolveEpRegex(s, 0)).toBe(' A ')
        expect(resolveEpRegex(s, 1)).toBe(' B ')
        expect(resolveEpRegex(s, 2)).toBe(' A ')
        expect(resolveEpOffset(s, 2)).toBe(3)
    })

    test('没有自定义时用内置默认', () => {
        const s = sub({ rss: ['u1'], epRegex: [], epOffset: [] })

        expect(resolveEpRegex(s, 0)).toBe(DEFAULT_EP_REGEX)
        expect(resolveEpOffset(s, 0)).toBe(0)
    })
})

describe('setFeedEpRegex', () => {
    test('写入某个源，中间未覆盖的源保持继承', () => {
        const s = sub({ rss: ['u1', 'u2', 'u3'] })

        expect(setFeedEpRegex(s, 2, ' 第(\\d+)集 ')).toEqual({
            epRegex: [DEFAULT_EP_REGEX, undefined, ' 第(\\d+)集 '],
        })
    })

    test('留空即恢复继承', () => {
        const s = sub({ epRegex: [' A ', ' B '] })

        expect(setFeedEpRegex(s, 1, '')).toEqual({ epRegex: [' A '] })
    })

    test('源 1 留空时恢复内置默认，其余源不动', () => {
        const s = sub({ epRegex: [' A ', ' B '] })

        expect(setFeedEpRegex(s, 0, '')).toEqual({ epRegex: [DEFAULT_EP_REGEX, ' B '] })
    })

    test('写成与默认相同的值时不留下冗余条目', () => {
        const s = sub({ rss: ['u1', 'u2', 'u3'], epRegex: [' A ', ' B '] })

        expect(setFeedEpRegex(s, 2, ' A ')).toEqual({ epRegex: [' A ', ' B '] })
    })
})

describe('setFeedEpOffset', () => {
    test('写入某个源，null 表示恢复继承', () => {
        expect(setFeedEpOffset(sub(), 1, 12)).toEqual({ epOffset: [0, 12] })
        expect(setFeedEpOffset(sub({ epOffset: [5, 12] }), 1, null)).toEqual({ epOffset: [5] })
    })

    test('0 是合法偏移，不会被当成未设置', () => {
        expect(setFeedEpOffset(sub({ epOffset: [5] }), 1, 0)).toEqual({ epOffset: [5, 0] })
    })
})

describe('addFeed / removeFeed / raiseFeed', () => {
    test('新增的源继承默认配置，已有条目不动', () => {
        expect(addFeed(sub({ rss: ['u1'], epRegex: [' A '] }), 'u2')).toEqual({ rss: ['u1', 'u2'] })
    })

    test('删除源时其后的条目跟着前移', () => {
        const s = sub({ rss: ['u1', 'u2', 'u3'], epRegex: [' A ', ' B ', ' C '], epOffset: [1, 2, 3] })

        expect(removeFeed(s, 1)).toEqual({
            rss: ['u1', 'u3'],
            epRegex: [' A ', ' C '],
            epOffset: [1, 3],
        })
    })

    test('删除源 1 后由新的源 1 承接默认条目', () => {
        const s = sub({ epRegex: [' A ', ' B '] })

        expect(removeFeed(s, 0).epRegex).toEqual([' B '])
    })

    test('删掉最后一个源后默认恢复为内置值', () => {
        const s = sub({ rss: ['u1'], epRegex: [' A '], epOffset: [7] })

        expect(removeFeed(s, 0)).toEqual({ rss: [], epRegex: [DEFAULT_EP_REGEX], epOffset: [0] })
    })

    test('上移时配置跟着源走', () => {
        const s = sub({ epRegex: [' A ', ' B '], epOffset: [1, 2] })

        expect(raiseFeed(s, 1)).toEqual({
            rss: ['https://example.com/2', 'https://example.com/1'],
            epRegex: [' B ', ' A '],
            epOffset: [2, 1],
        })
    })

    test('上移没有独立配置的源时默认值不变', () => {
        const s = sub({ epRegex: [' A '], epOffset: [1] })

        expect(raiseFeed(s, 1)).toEqual({
            rss: ['https://example.com/2', 'https://example.com/1'],
            epRegex: [' A '],
            epOffset: [1],
        })
    })

    test('源 1 无法继续上移', () => {
        expect(raiseFeed(sub(), 0)).toEqual({})
    })
})

describe('导出数组', () => {
    test('写出每个源生效的值', () => {
        const s = sub({ rss: ['u1', 'u2', 'u3'], epRegex: [' A ', undefined, ' B '] })

        expect(feedArray(s.epRegex, s.rss.length, ' A ')).toEqual([' A ', ' A ', ' B '])
    })

    test('尾部与默认相同的项省略，整个字段都是默认时返回 null', () => {
        expect(subscribeEpRegex(sub({ rss: ['u1', 'u2'], epRegex: [' A '] }))).toEqual([' A '])
        expect(subscribeEpRegex(sub({ epRegex: [DEFAULT_EP_REGEX] }))).toBeNull()
        expect(subscribeEpOffset(sub({ epOffset: [DEFAULT_EP_OFFSET] }))).toBeNull()
        expect(subscribeEpOffset(sub({ epOffset: [5, 9] }))).toEqual([5, 9])
    })
})

describe('parseEpRegexField / parseEpOffsetField', () => {
    test('空白或缺失的项读成继承，源 1 回落内置默认', () => {
        expect(parseEpRegexField([' A ', '', null])).toEqual([' A '])
        expect(parseEpRegexField(undefined)).toEqual([DEFAULT_EP_REGEX])
        expect(parseEpOffsetField([3, null])).toEqual([3])
        expect(parseEpOffsetField({})).toEqual([DEFAULT_EP_OFFSET])
    })

    test('中间的空洞保留，尾部冗余项裁掉', () => {
        expect(parseEpRegexField([' A ', ' ', ' B '])).toEqual([' A ', undefined, ' B '])
        expect(parseEpRegexField([' A ', ' A '])).toEqual([' A '])
    })

    test('兼容旧的标量形式', () => {
        expect(parseEpRegexField(' 旧 ')).toEqual([' 旧 '])
        expect(parseEpOffsetField(4)).toEqual([4])
    })
})
