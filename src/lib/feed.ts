import type { Subscription } from './types'

/** Built-in fallback, mirrored by the patch's AniRssSubscribeItem.DefaultEpRegex. */
export const DEFAULT_EP_REGEX = ' (\\d{2,}) '
export const DEFAULT_EP_OFFSET = 0

/**
 * Per-feed episode config, the shape the patch reads: entry `i` belongs to
 * `rss[i]`, entry 0 is the default for every feed the arrays do not reach, and
 * a hole (`undefined`) means "inherit entry 0". Entry 0 itself is never a hole.
 * All operations below keep the arrays index-aligned with `rss` and trimmed.
 */

/** Episode regex in force for the feed at `index`. */
export function resolveEpRegex(sub: Subscription, index: number): string {
    return sub.epRegex[index] ?? sub.epRegex[0] ?? DEFAULT_EP_REGEX
}

/** Episode offset in force for the feed at `index`, resolved like {@link resolveEpRegex}. */
export function resolveEpOffset(sub: Subscription, index: number): number {
    return sub.epOffset[index] ?? sub.epOffset[0] ?? DEFAULT_EP_OFFSET
}

/**
 * Writes the regex of the feed at `index`; an empty value clears the entry, so
 * the feed inherits entry 0 again. Clearing entry 0 resets it to the built-in
 * regex instead: it is the value every other feed falls back to.
 */
export function setFeedEpRegex(sub: Subscription, index: number, value: string): Partial<Subscription> {
    return { epRegex: withEntry(sub.epRegex, index, value.trim() === '' ? undefined : value, DEFAULT_EP_REGEX) }
}

/** Writes the offset of the feed at `index`; `null` clears it (inherit entry 0). */
export function setFeedEpOffset(sub: Subscription, index: number, value: number | null): Partial<Subscription> {
    return { epOffset: withEntry(sub.epOffset, index, value ?? undefined, DEFAULT_EP_OFFSET) }
}

/** Appends a feed; the entries of the existing feeds keep their index. */
export function addFeed(sub: Subscription, url: string): Partial<Subscription> {
    return { rss: [...sub.rss, url] }
}

/** Drops the feed at `index`; the entries behind it shift down with their feed. */
export function removeFeed(sub: Subscription, index: number): Partial<Subscription> {
    return {
        rss: sub.rss.filter((_, i) => i !== index),
        epRegex: dropEntry(sub.epRegex, index, DEFAULT_EP_REGEX),
        epOffset: dropEntry(sub.epOffset, index, DEFAULT_EP_OFFSET),
    }
}

/**
 * Raises the feed at `index` one position (higher priority). Both config
 * entries travel with their feed, so a feed keeps its own regex and offset.
 */
export function raiseFeed(sub: Subscription, index: number): Partial<Subscription> {
    if (index <= 0) return {}

    const rss = [...sub.rss]
    const [moved] = rss.splice(index, 1)
    rss.splice(index - 1, 0, moved)

    return {
        rss,
        epRegex: swapEntries(sub.epRegex, index, resolveEpRegex(sub, index - 1), resolveEpRegex(sub, index), DEFAULT_EP_REGEX),
        epOffset: swapEntries(sub.epOffset, index, resolveEpOffset(sub, index - 1), resolveEpOffset(sub, index), DEFAULT_EP_OFFSET),
    }
}

/**
 * Per-feed field as the subscribe file writes it: the value in force for every
 * feed, with the entries that only repeat entry 0 dropped from the tail - the
 * patch reads a missing entry as "use entry 0", so writing them adds noise.
 */
export function feedArray<T>(values: (T | undefined)[], feeds: number, base: T): T[] {
    const out: T[] = []
    for (let i = 0; i < feeds; i++) out.push(values[i] ?? base)

    while (out.length > 1 && out[out.length - 1] === base) out.pop()
    return out
}

/** File form of `epRegex`, or null when every feed uses the built-in default. */
export function subscribeEpRegex(sub: Subscription): string[] | null {
    const values = feedArray(sub.epRegex, sub.rss.length, sub.epRegex[0] ?? DEFAULT_EP_REGEX)
    return values.length === 1 && values[0] === DEFAULT_EP_REGEX ? null : values
}

/** File form of `epOffset`, or null when every feed uses the built-in default. */
export function subscribeEpOffset(sub: Subscription): number[] | null {
    const values = feedArray(sub.epOffset, sub.rss.length, sub.epOffset[0] ?? DEFAULT_EP_OFFSET)
    return values.length === 1 && values[0] === DEFAULT_EP_OFFSET ? null : values
}

/**
 * Reads the `epRegex` field of a subscribe file: blank or missing entries mean
 * "inherit entry 0", and entry 0 falls back to the built-in regex. The legacy
 * scalar form is read as entry 0.
 */
export function parseEpRegexField(value: unknown): (string | undefined)[] {
    const source = Array.isArray(value) ? value : [value]
    const out = source.map(raw => (typeof raw === 'string' && raw.trim() !== '' ? raw : undefined))
    if (out.length === 0 || out[0] === undefined) out[0] = DEFAULT_EP_REGEX
    return trimTail(out)
}

/** Reads the `epOffset` field of a subscribe file, exactly like {@link parseEpRegexField}. */
export function parseEpOffsetField(value: unknown): (number | undefined)[] {
    const source = Array.isArray(value) ? value : [value]
    const out = source.map(raw => (typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined))
    if (out.length === 0 || out[0] === undefined) out[0] = DEFAULT_EP_OFFSET
    return trimTail(out)
}

/**
 * Replaces entry `index`, extending the array with holes as needed. Entry 0 is
 * never left as a hole - it falls back to `base`.
 */
function withEntry<T>(values: (T | undefined)[], index: number, value: T | undefined, base: T): (T | undefined)[] {
    const next = values.slice()
    while (next.length <= index) next.push(undefined)
    next[index] = value
    if (next[0] === undefined) next[0] = base
    return trimTail(next)
}

/** Drops entry `index`; `base` takes over when the default entry was the one removed. */
function dropEntry<T>(values: (T | undefined)[], index: number, base: T): (T | undefined)[] {
    const next = values.filter((_, i) => i !== index)
    if (next.length === 0 || next[0] === undefined) next[0] = base
    return trimTail(next)
}

/** Writes `above` and `current` into the two entries being swapped. */
function swapEntries<T>(values: (T | undefined)[], index: number, above: T, current: T, base: T): (T | undefined)[] {
    return withEntry(withEntry(values, index - 1, current, base), index, above, base)
}

/** Drops trailing entries that inherit anyway, keeping the array minimal. */
function trimTail<T>(values: (T | undefined)[]): (T | undefined)[] {
    const next = values.slice()
    while (next.length > 1 && (next[next.length - 1] === undefined || next[next.length - 1] === next[0])) next.pop()
    return next
}
