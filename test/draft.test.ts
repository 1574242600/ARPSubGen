import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { formatDraftTime, readDraft, writeDraft } from '../src/lib/draft'
import { DEFAULT_EP_OFFSET, DEFAULT_EP_REGEX, resolveEpOffset, resolveEpRegex } from '../src/lib/feed'
import type { Subscription } from '../src/lib/types'

const DRAFT_KEY = 'arpsubgen.draft'

/** In-memory stand-in for the browser store, so the module under test runs for real. */
function memoryStorage(): Storage {
    const items = new Map<string, string>()
    return {
        get length() {
            return items.size
        },
        clear: () => { items.clear() },
        getItem: (key: string) => items.get(key) ?? null,
        key: (index: number) => [...items.keys()][index] ?? null,
        removeItem: (key: string) => { items.delete(key) },
        setItem: (key: string, value: string) => { items.set(key, value) },
    }
}

function useStorage(storage: Storage | null): void {
    Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true })
}

/** Private-mode browsers throw as soon as `localStorage` itself is touched. */
function useThrowingStorage(): void {
    Object.defineProperty(globalThis, 'localStorage', {
        get: () => {
            throw new Error('denied')
        },
        configurable: true,
    })
}

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

/** Raw entry as it sits in the store, bypassing {@link writeDraft}. */
function seed(raw: unknown): void {
    globalThis.localStorage.setItem(DRAFT_KEY, typeof raw === 'string' ? raw : JSON.stringify(raw))
}

let store: Storage
beforeEach(() => {
    store = memoryStorage()
    useStorage(store)
})
afterEach(() => {
    Reflect.deleteProperty(globalThis, 'localStorage')
})

describe('writeDraft / readDraft', () => {
    test('写入后读回还原列表，逐源正则与偏移的继承空洞保留', () => {
        const subs = [
            sub({
                tvdbId: 100,
                title: 'A',
                rss: ['https://example.com/1', 'https://example.com/2', 'https://example.com/3'],
                epRegex: [' A ', undefined, ' B '],
                epOffset: [7, undefined, 9],
            }),
            sub({ tvdbId: 200, season: 2, title: '', rss: [] }),
        ]

        writeDraft(subs)
        const draft = readDraft()

        expect(draft).not.toBeNull()
        expect(draft!.subscriptions).toHaveLength(2)
        expect(draft!.subscriptions[0].title).toBe('A')
        expect(draft!.subscriptions[0].rss).toEqual(['https://example.com/1', 'https://example.com/2', 'https://example.com/3'])
        expect(resolveEpRegex(draft!.subscriptions[0], 0)).toBe(' A ')
        expect(resolveEpRegex(draft!.subscriptions[0], 1)).toBe(' A ')
        expect(resolveEpRegex(draft!.subscriptions[0], 2)).toBe(' B ')
        expect(resolveEpOffset(draft!.subscriptions[0], 0)).toBe(7)
        expect(resolveEpOffset(draft!.subscriptions[0], 2)).toBe(9)
        // A series without feeds still belongs to the draft: its config is work in progress.
        expect(draft!.subscriptions[1].rss).toEqual([])
    })

    test('写入时间随手记下，供界面显示', () => {
        const before = Date.now()
        writeDraft([sub()])

        expect(readDraft()!.savedAt).toBeGreaterThanOrEqual(before)
        expect(readDraft()!.savedAt).toBeLessThanOrEqual(Date.now())
    })

    test('列表清空时条目被移除，而不是留一份空草稿', () => {
        writeDraft([sub()])
        writeDraft([])

        expect(store.getItem(DRAFT_KEY)).toBeNull()
        expect(readDraft()).toBeNull()
    })

    test('没有条目、内容损坏、版本不符或时间非法的草稿一律视为不存在', () => {
        expect(readDraft()).toBeNull()

        seed('{ not json')
        expect(readDraft()).toBeNull()

        seed({ version: 1, savedAt: Date.now(), subscriptions: [{ tvdbId: 'x', season: 1 }] })
        expect(readDraft()).toBeNull()

        seed({ version: 2, savedAt: Date.now(), subscriptions: [{ tvdbId: 100, season: 1 }] })
        expect(readDraft()).toBeNull()

        seed({ version: 1, savedAt: 'yesterday', subscriptions: [{ tvdbId: 100, season: 1 }] })
        expect(readDraft()).toBeNull()

        seed({ version: 1, savedAt: Date.now(), subscriptions: 'nope' })
        expect(readDraft()).toBeNull()
    })

    test('存储不可用或拒绝访问时读写都不抛出', () => {
        useStorage(null)
        expect(readDraft()).toBeNull()
        expect(() => writeDraft([sub()])).not.toThrow()

        useThrowingStorage()
        expect(readDraft()).toBeNull()
        expect(() => writeDraft([sub()])).not.toThrow()
    })

    test('配额写满时放弃草稿但保留当前会话', () => {
        store.setItem = () => { throw new Error('quota exceeded') }

        expect(() => writeDraft([sub()])).not.toThrow()
    })
})

describe('formatDraftTime', () => {
    const now = new Date(2026, 0, 1).getTime()

    test('同年的时间省略年份，补零到分钟', () => {
        expect(formatDraftTime(new Date(2026, 8, 15, 9, 7).getTime(), now)).toBe('9月15日 09:07')
    })

    test('跨年的时间带上年份', () => {
        expect(formatDraftTime(new Date(2025, 11, 31, 23, 59).getTime(), now)).toBe('2025年12月31日 23:59')
    })
})
