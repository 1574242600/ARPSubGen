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
    epRegex: string
    epOffset: number
}

/**
 * Entry of anirss.subscribe.json. Only tvdbId, season and rss are required;
 * epRegex/epOffset are omitted when they equal the defaults.
 */
export interface SubscribeEntry {
    tvdbId: number
    season: number
    rss: string[]
    epRegex?: string
    epOffset?: number
}
