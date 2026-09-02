import * as cheerio from 'cheerio'
import { readFile } from 'node:fs/promises'
import { MIKAN_BASE } from '../lib/mikan'

// Static endpoint: scrapes the Mikan homepage at build time and emits
// /mikan.json with series id/title/weekday plus per-series release groups and
// their latest 3 episodes, excluding the "剧场版" column.
// Scraping must use the same host the RSS links are built from, otherwise the
// catalogue ids/groups no longer resolve against a subscription's feeds.
const MIKAN_HOME = `${MIKAN_BASE}/`
const MIKAN_UA = 'Mozilla/5.0 (compatible; ARPSubGen/1.0)'
// The homepage groups series by weekday; data-dayofweek="7" is the "剧场版" column.
const THEATRE_SECTION = '7'
const REQUEST_TIMEOUT_MS = 30_000
const CONCURRENCY = 8
const EPISODES_PER_GROUP = 3

interface Bangumi {
    id: number
    title: string
    dayofweek: number
}

interface ReleaseGroup {
    id: number
    items: string[]
}

interface SeriesItem extends Bangumi {
    releaseGroups: ReleaseGroup[]
}

async function fetchWithTimeout(url: string): Promise<string> {
    const res = await fetch(url, {
        headers: { 'user-agent': MIKAN_UA },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (!res.ok) throw new Error(`failed to fetch ${url}: HTTP ${res.status}`)
    return res.text()
}

function scrapeSeries(html: string): Bangumi[] {
    const $ = cheerio.load(html)
    const series: Bangumi[] = []
    const seen = new Set<number>()
    $('div.sk-bangumi[data-dayofweek]').each((_, el) => {
        const dayofweek = Number($(el).attr('data-dayofweek'))
        if (dayofweek === Number(THEATRE_SECTION)) return
        $(el).find('li').each((_, li) => {
            const id = Number($(li).find('[data-bangumiid]').first().attr('data-bangumiid'))
            // .text() decodes HTML entities (&#xNN;, &amp;, &quot;, ...) for us.
            const title = $(li).find('a.an-text').text().trim()
            if (Number.isInteger(id) && !seen.has(id)) {
                seen.add(id)
                series.push({ id, title, dayofweek })
            }
        })
    })
    return series
}

function scrapeReleaseGroups(html: string): (ReleaseGroup & { name: string })[] {
    const $ = cheerio.load(html)
    // Group headers carry the name and id, indexed by data-bangumisubgroupindex.
    const headers = new Map<number, { id: number; name: string }>()
    $('li.js-expand_bangumi-subgroup').each((_, el) => {
        const index = Number($(el).attr('data-bangumisubgroupindex'))
        const id = Number($(el).find('.js-subscribe_bangumi').attr('data-subtitlegroupid'))
        const name = $(el).find('.tag-res-name').attr('title') ?? $(el).find('.tag-res-name').text()
        if (Number.isInteger(index) && Number.isInteger(id) && name) {
            headers.set(index, { id, name })
        }
    })
    // Episode frames sit next to the headers, keyed by the same index.
    const frames = new Map<number, string[]>()
    $('div[class*="js-expand_bangumi-subgroup-"][class*="-episodes"]').each((_, el) => {
        const match = /js-expand_bangumi-subgroup-(\d+)-episodes/.exec($(el).attr('class') ?? '')
        if (!match) return
        const index = Number(match[1])
        const episodes = $(el)
            .find('ul.res-detail-ul li a.magnet-link-wrap')
            .map((_, a) => $(a).text().trim())
            .get()
            .slice(0, EPISODES_PER_GROUP)
        frames.set(index, episodes)
    })
    const groups: (ReleaseGroup & { name: string })[] = []
    for (const [index, header] of headers) {
        groups.push({ id: header.id, name: header.name, items: frames.get(index) ?? [] })
    }
    return groups
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
    const results: R[] = new Array(items.length)
    let next = 0
    async function worker(): Promise<void> {
        while (next < items.length) {
            const i = next++
            results[i] = await fn(items[i])
        }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()))
    return results
}

// Dev server only: the endpoint re-runs on every request, and a full scrape
// touches ~90 pages (~15s). Serve the static output from a prior build instead
// of scraping; run `bun run build` when dist/mikan.json is missing or stale.
const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' }
const DEV_SNAPSHOT = '../../dist/mikan.json'

async function scrapeAll(): Promise<string> {
    const series = scrapeSeries(await fetchWithTimeout(MIKAN_HOME))
    const releaseGroupNames: Record<string, string> = {}
    const items: SeriesItem[] = await mapLimit(series, CONCURRENCY, async (bangumi) => {
        const groups: ReleaseGroup[] = []
        try {
            const html = await fetchWithTimeout(`${MIKAN_HOME}Home/ExpandBangumi?bangumiId=${bangumi.id}`)
            for (const group of scrapeReleaseGroups(html)) {
                releaseGroupNames[String(group.id)] = group.name
                groups.push({ id: group.id, items: group.items })
            }
        } catch (error) {
            console.warn(`failed to fetch release groups for #${bangumi.id}:`, error)
        }
        return { ...bangumi, releaseGroups: groups }
    })
    return JSON.stringify({ releaseGroupNames, items }, null, 2)
}

export async function GET(): Promise<Response> {
    if (import.meta.env.DEV) {
        try {
            const body = await readFile(new URL(DEV_SNAPSHOT, import.meta.url), 'utf8')
            return new Response(body, { headers: JSON_HEADERS })
        } catch (error) {
            throw new Error(
                `dist/${DEV_SNAPSHOT.split('/').pop()} is missing: run \`bun run build\` first`,
                { cause: error },
            )
        }
    }
    return new Response(await scrapeAll(), { headers: JSON_HEADERS })
}
