// Static endpoint: scrapes https://mikan.tangbai.cc/ at build time and emits
// /mikan.json with every series title, excluding the "剧场版" column.
const MIKAN_HOME = 'https://mikan.tangbai.cc/'
// The homepage groups series by weekday; data-dayofweek="7" is the "剧场版" column.
const THEATRE_SECTION = '7'

function decodeHtml(text: string): string {
    return text
        .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
        .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
}

async function fetchHome(): Promise<string> {
    const res = await fetch(MIKAN_HOME, {
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; ARPSubGen/1.0)' },
        signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) throw new Error(`failed to fetch ${MIKAN_HOME}: HTTP ${res.status}`)
    return res.text()
}

function scrapeTitles(html: string): string[] {
    const parts = html.split(/<div class="sk-bangumi" data-dayofweek="(\d+)">/).slice(1)
    const titles: string[] = []
    const seen = new Set<string>()
    for (let i = 0; i < parts.length; i += 2) {
        if (parts[i] === THEATRE_SECTION) continue
        const re = /class="an-text"[^>]*>([^<]+)<\/a>/g
        for (let m = re.exec(parts[i + 1]); m; m = re.exec(parts[i + 1])) {
            const title = decodeHtml(m[1])
            if (!seen.has(title)) {
                seen.add(title)
                titles.push(title)
            }
        }
    }
    return titles
}

export async function GET(): Promise<Response> {
    const titles = scrapeTitles(await fetchHome())
    return new Response(JSON.stringify(titles, null, 2), {
        headers: { 'content-type': 'application/json; charset=utf-8' },
    })
}
