import type { MikanData } from './types'
import { parseMikanRss } from './mikan'

/** True when the pattern compiles; the editor card and the list row both gate on it. */
export function isValidEpisodeRegex(regex: string): boolean {
    try {
        new RegExp(regex)
        return true
    } catch {
        return false
    }
}

/**
 * Mirrors AniRssCommandExecutor: first capture group (or whole match),
 * its leading number, plus the configured offset.
 */
export function parseEpisode(title: string, regex: string, offset: number): number | null {
    try {
        const match = new RegExp(regex).exec(title)
        if (!match) return null
        const raw = match[1] ?? match[0]
        const digits = raw.match(/\d+/)
        if (!digits) return null
        return Number(digits[0]) + offset
    } catch {
        return null
    }
}

export interface EpisodePreviewGroup {
    /** Bangumi-and-group pair, stable React key (`{bangumiId}:{groupId}`). */
    key: string
    name: string
    titles: string[]
    /** Position in the RSS list that contributed this group; its config applies. */
    feedIndex: number
}

/**
 * Preview samples for the episode parser, grouped by release group in feed
 * priority order. Each Mikan feed referenced by the RSS list contributes its
 * group's latest titles; feeds of groups missing from the catalogue (or with
 * no captured titles) are skipped.
 */
export function episodePreviewGroups(rss: string[], mikan: MikanData): EpisodePreviewGroup[] {
    const groups = new Map<string, EpisodePreviewGroup>()
    for (let feedIndex = 0; feedIndex < rss.length; feedIndex++) {
        const ref = parseMikanRss(rss[feedIndex])
        if (ref === null || ref.groupId === null) continue
        const bangumi = mikan.items.find(item => item.id === ref.bangumiId)
        const group = bangumi?.releaseGroups.find(g => g.id === ref.groupId)
        if (!group || group.items.length === 0) continue

        const key = `${ref.bangumiId}:${group.id}`
        if (groups.has(key)) continue
        groups.set(key, {
            key,
            name: mikan.releaseGroupNames[String(group.id)] ?? `字幕组 ${group.id}`,
            titles: [...group.items],
            feedIndex,
        })
    }
    return [...groups.values()]
}
