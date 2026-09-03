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

    test('忽略 Mikan 标题中的“第X季”季度标记', () => {
        expect(jaccardSimilarity('葬送的芙莉莲', '葬送的芙莉莲 第二季')).toBe(1)
        expect(jaccardSimilarity('葬送的芙莉莲 第一季', '葬送的芙莉莲 第十七季')).toBe(1)
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
    test('同番剧不同季度的条目（第X季）一并按满分推荐', () => {
        // 季度标记被剥离后 '葬送的芙莉莲 第二季' 与 '葬送的芙莉莲' 同为 1.0，
        // 稳定排序保持目录顺序 → [1, 2]
        const recs = recommendBangumi('葬送的芙莉莲', catalogue)

        expect(recs.map(item => item.id)).toEqual([1, 2])
    })

    test('略高于 40% 的弱匹配也推荐', () => {
        // '葬送的芙莉莲' vs '葬送的芙莉莲 第一季 番外篇'（剥离后 5 交 / 8 并）→ 0.625 > 0.4
        const weak: MikanSeries[] = [
            { id: 1, title: '葬送的芙莉莲 第一季 番外篇', dayofweek: 0, releaseGroups: [] },
        ]

        expect(recommendBangumi('葬送的芙莉莲', weak).map(item => item.id)).toEqual([1])
    })

    test('严格大于 40%：恰为 0.4 的条目不推荐', () => {
        // '你我他'(2 bigram) vs '你我他丙丁戊'(5 bigram：你我/你他/他丙/丙丁/丁戊)：
        // 交 2 并 5 → 0.4，被排除
        const boundary: MikanSeries[] = [
            { id: 1, title: '你我他', dayofweek: 0, releaseGroups: [] },
            { id: 2, title: '你我他丙丁戊', dayofweek: 0, releaseGroups: [] },
        ]

        expect(recommendBangumi('你我他', boundary).map(item => item.id)).toEqual([1])
    })

    test('无关标题不推荐', () => {
        expect(recommendBangumi('一部不存在的番剧', catalogue)).toEqual([])
    })

    test('空标题不产生推荐', () => {
        expect(recommendBangumi('', catalogue)).toEqual([])
        expect(recommendBangumi('  ', catalogue)).toEqual([])
    })
})
