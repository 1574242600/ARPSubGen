import type { Subscription, SubscribeEntry } from './types'

export const DEFAULT_EP_REGEX = ' ([0-9]{2,}) '
export const DEFAULT_EP_OFFSET = 0
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
 * existing anirss.subscribe.json ([{tvdbId, season, rss?, epRegex?, epOffset?}]).
 * Every field except tvdbId and season is optional; feed URLs are kept as-is,
 * in their original priority order.
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
        epRegex: typeof epRegex === 'string' ? epRegex : DEFAULT_EP_REGEX,
        epOffset: typeof epOffset === 'number' && Number.isFinite(epOffset)
            ? epOffset
            : DEFAULT_EP_OFFSET,
    }
}

/**
 * Build anirss.subscribe.json entries. Default epRegex/epOffset are omitted,
 * matching the patch's fallback behaviour.
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
            if (sub.epRegex !== DEFAULT_EP_REGEX) entry.epRegex = sub.epRegex
            if (sub.epOffset !== DEFAULT_EP_OFFSET) entry.epOffset = sub.epOffset
            return entry
        })
}
