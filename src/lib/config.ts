import { isValidEpisodeRegex } from './episode'
import { parseEpOffsetField, parseEpRegexField, subscribeEpOffset, subscribeEpRegex } from './feed'
import { mikanIdsOf } from './mikan'
import type { Subscription, SubscribeEntry } from './types'

export const UNTITLED = '未提供标题'

export interface ParseResult {
    subscriptions: Subscription[]
    skipped: number
}

/**
 * Decode the `?config=` parameter produced by the Sonarr console snippet:
 * URL-safe base64 (no padding) → gzip → JSON array of series.
 */
export async function decodeConfigParam(param: string): Promise<ParseResult> {
    const b64 = param
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(Math.ceil(param.length / 4) * 4, '=')
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
    const stream = new Blob([bytes])
        .stream()
        .pipeThrough(new DecompressionStream('gzip'))
    return parseImportedJson(await new Response(stream).text())
}

/**
 * Accepts both the Sonarr series list ([{tvdbId, season, title}]) and an
 * existing anirss.subscribe.json ([{tvdbId, season, rss?, epRegex?, epOffset?}],
 * where the two optional fields are per-feed arrays whose blank or missing
 * entries inherit entry 0). Every field except tvdbId and season is optional;
 * feed URLs are kept as-is, in their original priority order.
 */
export function parseImportedJson(text: string): ParseResult {
    let data: unknown
    try {
        data = JSON.parse(text)
    } catch {
        throw new Error('不是有效的 JSON')
    }
    if (!Array.isArray(data)) throw new Error('JSON 根节点必须是数组')

    const subscriptions: Subscription[] = []
    const seen = new Set<number>()
    let skipped = 0
    for (const raw of data) {
        const sub = toSubscription(raw)
        if (sub === null || seen.has(sub.tvdbId)) {
            skipped++
            continue
        }
        seen.add(sub.tvdbId)
        subscriptions.push(sub)
    }
    return { subscriptions, skipped }
}

function toSubscription(raw: unknown): Subscription | null {
    if (typeof raw !== 'object' || raw === null) return null
    const { tvdbId, season, title, epRegex, epOffset, rss } = raw as Record<string, unknown>
    if (!Number.isInteger(tvdbId) || (tvdbId as number) <= 0) return null
    if (!Number.isInteger(season) || (season as number) < 0) return null
    return {
        tvdbId: tvdbId as number,
        season: season as number,
        title: typeof title === 'string' ? title : '',
        rss: Array.isArray(rss) ? rss.filter((url): url is string => typeof url === 'string') : [],
        // Per-feed entries, entry 0 being the default the others inherit.
        epRegex: parseEpRegexField(epRegex),
        epOffset: parseEpOffsetField(epOffset),
    }
}

/**
 * Build anirss.subscribe.json entries. Episodes are configured per feed - entry
 * i belongs to rss[i] and entry 0 defaults the rest - and both fields are
 * written as plain arrays holding the value in force for every feed; a field
 * left at the built-in default is omitted, matching the patch's fallback
 * behaviour. title is carried along when the series has one (manual entries may
 * be untitled).
 */
export function buildSubscribeFile(subs: Subscription[]): SubscribeEntry[] {
    return subs
        .filter(sub => sub.rss.length > 0)
        .map(sub => {
            const entry: SubscribeEntry = {
                tvdbId: sub.tvdbId,
                season: sub.season,
                rss: sub.rss,
            }
            if (sub.title) entry.title = sub.title

            const epRegex = subscribeEpRegex(sub)
            if (epRegex !== null) entry.epRegex = epRegex

            const epOffset = subscribeEpOffset(sub)
            if (epOffset !== null) entry.epOffset = epOffset

            return entry
        })
}

/**
 * Problems that must be fixed before a subscription can be saved or exported:
 * feeds spanning several Mikan shows, or an episode regex that does not compile
 * (reported per feed, entry 0 being the default the others inherit).
 * Catalogue-free — conflict detection only inspects the feed urls, so it works
 * even while the Mikan directory is unavailable.
 */
export function subscriptionIssues(sub: Subscription): string[] {
    const ids = mikanIdsOf(sub.rss)
    const issues: string[] = []
    if (ids.length > 1) issues.push(`蜜柑 Id 冲突：${ids.join('、')}`)

    sub.epRegex.forEach((regex, index) => {
        if (regex === undefined || isValidEpisodeRegex(regex)) return
        issues.push(index === 0 ? '集数正则无效' : `第 ${index + 1} 个源的集数正则无效`)
    })

    return issues
}
