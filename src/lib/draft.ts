import { parseSeriesList } from './config'
import type { Subscription } from './types'

/** Storage slot holding the work in progress, and the layout version written into it. */
const DRAFT_KEY = 'arpsubgen.draft'
const DRAFT_VERSION = 1

/** Saved work: the subscription list as it stood the last time it changed. */
export interface Draft {
    savedAt: number
    subscriptions: Subscription[]
}

interface StoredDraft {
    version: number
    savedAt: number
    subscriptions: unknown
}

/**
 * The list lives in localStorage so a reload is never a dead end, but the store
 * is best-effort: private-mode browsers throw on access, and a stale or
 * corrupted entry is dropped instead of repaired. Callers only ever see a draft
 * that is safe to put straight back on screen.
 */
export function readDraft(): Draft | null {
    const store = localStorageOrNull()
    if (store === null) return null

    let stored: StoredDraft
    try {
        const raw = store.getItem(DRAFT_KEY)
        if (raw === null) return null
        stored = JSON.parse(raw) as StoredDraft
    } catch {
        return null
    }
    if (stored === null || typeof stored !== 'object' || stored.version !== DRAFT_VERSION) return null
    if (!Number.isFinite(stored.savedAt)) return null

    const { subscriptions } = parseSeriesList(stored.subscriptions)
    if (subscriptions.length === 0) return null
    return { savedAt: stored.savedAt, subscriptions }
}

/**
 * Stores the current list; emptying it clears the entry, since a draft nobody
 * can come back to is worse than none. Losing the draft must never break
 * editing, so a failing store stays silent.
 */
export function writeDraft(subs: Subscription[]): void {
    const store = localStorageOrNull()
    if (store === null) return

    try {
        if (subs.length === 0) {
            store.removeItem(DRAFT_KEY)
            return
        }
        const stored: StoredDraft = { version: DRAFT_VERSION, savedAt: Date.now(), subscriptions: subs }
        store.setItem(DRAFT_KEY, JSON.stringify(stored))
    } catch {
        // Quota exceeded or storage disabled mid-session: keep editing in memory.
    }
}

/** `9月15日 21:07`, carrying the year once the draft is not from this year. */
export function formatDraftTime(savedAt: number, now: number = Date.now()): string {
    const at = new Date(savedAt)
    const clock = `${pad(at.getHours())}:${pad(at.getMinutes())}`
    const date = `${at.getMonth() + 1}月${at.getDate()}日`
    return at.getFullYear() === new Date(now).getFullYear()
        ? `${date} ${clock}`
        : `${at.getFullYear()}年${date} ${clock}`
}

function pad(value: number): string {
    return String(value).padStart(2, '0')
}

/** localStorage is missing during SSR and throws in private mode; both read as "no draft". */
function localStorageOrNull(): Storage | null {
    try {
        return globalThis.localStorage ?? null
    } catch {
        return null
    }
}
