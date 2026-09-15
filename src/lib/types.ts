export interface MikanReleaseGroup {
    id: number
    items: string[]
}

export interface MikanSeries {
    id: number
    title: string
    dayofweek: number
    releaseGroups: MikanReleaseGroup[]
}

export interface MikanData {
    releaseGroupNames: Record<string, string>
    items: MikanSeries[]
}

export interface SonarrSeries {
    tvdbId: number
    season: number
    title: string
}

export interface Subscription extends SonarrSeries {
    /** Feed URLs, ordered by descending priority. */
    rss: string[]
    /**
     * Per-feed episode regex, index-aligned with rss: entry 0 is the default
     * (and feed 1's own config), a hole (`undefined`) inherits entry 0, and a
     * feed past the end of the array inherits it as well.
     */
    epRegex: (string | undefined)[]
    /** Per-feed episode offset, aligned and inherited exactly like `epRegex`. */
    epOffset: (number | undefined)[]
}

/**
 * Entry of anirss.subscribe.json. Only tvdbId, season and rss are required;
 * title is an optional human-readable label. epRegex/epOffset are per-feed
 * arrays indexed like rss — entry i configures rss[i], and entry 0 also serves
 * as the default for the feeds the array does not reach — and are omitted when
 * they equal the defaults. This generator writes a single entry, which the patch
 * applies to every feed of the subscription.
 */
export interface SubscribeEntry {
    tvdbId: number
    season: number
    rss: string[]
    title?: string
    epRegex?: string[]
    epOffset?: number[]
}
