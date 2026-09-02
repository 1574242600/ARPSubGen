import type { MikanData } from './types'

export const MIKAN_BASE = 'https://mikanani.me'

const MIKAN_HOST = new URL(MIKAN_BASE).host
const MIKAN_RSS_PATH = '/RSS/Bangumi'

export function mikanRssUrl(bangumiId: number, groupId: number): string {
    return `${MIKAN_BASE}${MIKAN_RSS_PATH}?bangumiId=${bangumiId}&subgroupid=${groupId}`
}

export const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export function normalizeTitle(title: string): string {
    return title
        .toLowerCase()
        .replace(/[\p{P}\p{S}\s]/gu, '')
}

export interface MikanRssRef {
    bangumiId: number
    groupId: number | null
}

/** Parses a Mikan feed URL into its bangumi/group ids; null when it is not one. */
export function parseMikanRss(url: string): MikanRssRef | null {
    let parsed: URL
    try {
        parsed = new URL(url)
    } catch {
        return null
    }
    if (parsed.host !== MIKAN_HOST || parsed.pathname !== MIKAN_RSS_PATH) return null

    const bangumiId = Number(parsed.searchParams.get('bangumiId'))
    if (!Number.isInteger(bangumiId) || bangumiId <= 0) return null

    const raw = parsed.searchParams.get('subgroupid')
    const groupId = raw === null ? null : Number(raw)
    return {
        bangumiId,
        groupId: groupId !== null && Number.isInteger(groupId) && groupId > 0 ? groupId : null,
    }
}

/** Distinct Mikan bangumi ids referenced by a feed list, in first-seen order. */
export function mikanIdsOf(rss: string[]): number[] {
    const ids = new Set<number>()
    for (const url of rss) {
        const ref = parseMikanRss(url)
        if (ref) ids.add(ref.bangumiId)
    }
    return [...ids]
}

/**
 * Resolves the release-group name of a Mikan feed. Returns null when the feed
 * is not Mikan, carries no subgroupid, or the catalogue lacks that combination.
 */
export function resolveReleaseGroup(url: string, mikan: MikanData): string | null {
    const ref = parseMikanRss(url)
    if (ref === null || ref.groupId === null) return null
    const { bangumiId, groupId } = ref
    const bangumi = mikan.items.find(item => item.id === bangumiId)
    if (!bangumi?.releaseGroups.some(group => group.id === groupId)) return null
    return mikan.releaseGroupNames[String(groupId)] ?? null
}
