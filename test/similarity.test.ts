import { describe, expect, test } from 'bun:test'
import { jaccardSimilarity, RECOMMEND_THRESHOLD, recommendBangumi } from '../src/lib/similarity'
import type { MikanSeries } from '../src/lib/types'

describe('jaccardSimilarity', () => {
    test('完全相同的标题相似度为 1', () => {
        expect(jaccardSimilarity('葬送的芙莉莲', '葬送的芙莉莲')).toBe(1)
    })

    test('忽略大小写、标点与空格', () => {
        expect(jaccardSimilarity('葬送的芙莉莲', '葬送的芙莉莲！！')).toBeGreaterThan(RECOMMEND_THRESHOLD)
        expect(jaccardSimilarity('Lycoris Recoil', 'lycoris recoil')).toBe(1)
    })

    test('无关标题相似度为 0', () => {
        expect(jaccardSimilarity('葬送的芙莉莲', '怪兽8号')).toBe(0)
    })

    test('单字标题可比较', () => {
        expect(jaccardSimilarity('葬送的芙莉莲', '葬')).toBe(0)
        expect(jaccardSimilarity('葬', '葬')).toBe(1)
    })

    test('空标题任意比较为 0', () => {
        expect(jaccardSimilarity('', '葬送的芙莉莲')).toBe(0)
        expect(jaccardSimilarity('葬送的芙莉莲', '!!!')).toBe(0)
    })
})

const catalogue: MikanSeries[] = [
    { id: 1, title: '葬送的芙莉莲', dayofweek: 0, releaseGroups: [] },
    { id: 2, title: '葬送的芙莉莲 第二季', dayofweek: 1, releaseGroups: [] },
    { id: 3, title: '怪兽8号', dayofweek: 2, releaseGroups: [] },
]

describe('recommendBangumi', () => {
    test('完全一致优先，次相似 (>50%) 随后，按分数降序', () => {
        // 葬送的芙莉莲 vs 葬送的芙莉莲 第二季：交 5 bigram / 并 8 → 0.625 > 0.5
        const recs = recommendBangumi('葬送的芙莉莲', catalogue)

        expect(recs.map(item => item.id)).toEqual([1, 2])
    })

    test('严格大于 50%：恰为 0.5 的条目不推荐', () => {
        // '无职'(1 bigram) vs '无职职'(2 bigram：无职/职职)：交 1 并 2 → 0.5，被排除
        const boundary: MikanSeries[] = [
            { id: 1, title: '无职', dayofweek: 0, releaseGroups: [] },
            { id: 2, title: '无职职', dayofweek: 0, releaseGroups: [] },
        ]

        expect(recommendBangumi('无职', boundary).map(item => item.id)).toEqual([1])
    })

    test('无关标题不推荐', () => {
        expect(recommendBangumi('一部不存在的番剧', catalogue)).toEqual([])
    })

    test('空标题不产生推荐', () => {
        expect(recommendBangumi('', catalogue)).toEqual([])
        expect(recommendBangumi('  ', catalogue)).toEqual([])
    })
})
