import type { MikanSeries } from './types'
import { normalizeTitle } from './mikan'

/**
 * Mikan season markers built from Chinese numerals (第二季 / 第十七季). They
 * only identify which season a catalogue page belongs to and would otherwise
 * dilute the similarity against the bare series title, so they are dropped
 * before comparing.
 */
const SEASON_MARKER_RE = /第[零一二三四五六七八九十百]+季/g

/**
 * Normalises a title for similarity comparison, additionally removing Mikan
 * season markers so '葬送的芙莉莲 第二季' compares equal to '葬送的芙莉莲'.
 */
function normalizeComparableTitle(title: string): string {
    return normalizeTitle(title).replace(SEASON_MARKER_RE, '')
}

/**
 * Jaccard similarity over 2-grams of the normalised titles, the usual way to
 * fuzzy-match short CJK titles. Mikan season markers (第X季) are ignored.
 * Returns 0 when either side normalises empty.
 */
export function jaccardSimilarity(a: string, b: string): number {
    const na = normalizeComparableTitle(a)
    const nb = normalizeComparableTitle(b)
    if (!na || !nb) return 0

    const gramsA = charBigrams(na)
    const gramsB = charBigrams(nb)
    let intersection = 0
    for (const gram of gramsA) {
        if (gramsB.has(gram)) intersection++
    }
    const union = gramsA.size + gramsB.size - intersection
    return union === 0 ? 0 : intersection / union
}

function charBigrams(text: string): Set<string> {
    const grams = new Set<string>()
    if (text.length === 1) {
        grams.add(text)
        return grams
    }
    for (let i = 0; i < text.length - 1; i++) {
        grams.add(text.slice(i, i + 2))
    }
    return grams
}

export const RECOMMEND_THRESHOLD = 0.4

/**
 * Catalogue entries whose title is more than 40% similar to the given title,
 * best matches first. Empty titles never recommend anything.
 */
export function recommendBangumi(title: string, catalogue: MikanSeries[]): MikanSeries[] {
    if (!title) return []
    return catalogue
        .map(item => ({ item, score: jaccardSimilarity(title, item.title) }))
        .filter(match => match.score > RECOMMEND_THRESHOLD)
        .sort((a, b) => b.score - a.score)
        .map(match => match.item)
}
