import { useCallback, useEffect, useState } from 'react'
import { decodeConfigParam, parseImportedJson, type ParseResult } from '../lib/config'
import { readDraft, writeDraft, type Draft } from '../lib/draft'
import { DEFAULT_EP_OFFSET, DEFAULT_EP_REGEX } from '../lib/feed'
import type { SonarrSeries, Subscription } from '../lib/types'
import type { ToastItem } from '../components/Toasts'

type PushToast = (tone: ToastItem['tone'], text: string) => void

/**
 * A `?config=` jump found saved work: the page offers the draft and the payload
 * it carried instead of silently dropping one of them.
 */
export interface DraftPrompt {
    /** Saved locally by the previous visit. */
    draft: Draft
    /** Imported from the query parameter just now. */
    imported: ParseResult
}

/**
 * Owns the subscription list: initial import from the Sonarr `?config=` jump,
 * the local draft offered alongside it, manual paste/upload import and
 * per-series patches. All import paths funnel through `applyResult` so a bad
 * payload reports once, in one place.
 */
export function useSubscriptions(pushToast: PushToast): {
    subs: Subscription[]
    configImported: boolean
    /** Locally saved work, or null when there is none to come back to. */
    draft: Draft | null
    /** Set only when a `?config=` jump met saved work. */
    draftPrompt: DraftPrompt | null
    importJson: (json: string) => void
    updateSub: (tvdbId: number, patch: Partial<Subscription>) => void
    removeSub: (tvdbId: number) => void
    addSub: (input: SonarrSeries) => void
    restoreDraft: () => void
    keepImported: () => void
} {
    const [subs, setSubs] = useState<Subscription[]>([])
    const [configImported, setConfigImported] = useState(false)
    const [draft, setDraft] = useState<Draft | null>(null)
    const [draftPrompt, setDraftPrompt] = useState<DraftPrompt | null>(null)

    /** Shared entry point for the URL payload, the draft and pasted/uploaded JSON. */
    const applyResult = useCallback((result: ParseResult) => {
        if (result.subscriptions.length === 0) {
            pushToast('error', '导入失败：没有可用条目，每个条目至少需要 tvdbId 与 season')
            return
        }
        setSubs(result.subscriptions)
        setConfigImported(true)
        if (result.skipped > 0) {
            pushToast('info', `已导入 ${result.subscriptions.length} 部节目，跳过 ${result.skipped} 条无效或重复条目`)
        }
        dropConfigParam()
    }, [pushToast])

    const importJson = useCallback((json: string) => {
        try {
            applyResult(parseImportedJson(json))
        } catch (err) {
            pushToast('error', `导入失败：${err instanceof Error ? err.message : String(err)}`)
        }
    }, [applyResult, pushToast])

    /**
     * Startup handshake. The draft is offered, never applied on its own, so a
     * `?config=` jump ends on a choice instead of losing either side. Both reads
     * happen here rather than in initial state, keeping the first client render
     * identical to the server-rendered markup.
     */
    useEffect(() => {
        const saved = readDraft()
        setDraft(saved)

        const param = new URLSearchParams(window.location.search).get('config')
        if (param === null) return

        let active = true
        decodeConfigParam(param)
            .then(result => {
                if (!active) return
                if (saved !== null && result.subscriptions.length > 0) {
                    setDraftPrompt({ draft: saved, imported: result })
                    return
                }
                applyResult(result)
            })
            .catch(() => {
                if (active) pushToast('error', '配置参数解析失败，请从 Sonarr 重新发起跳转')
            })
        return () => { active = false }
    }, [applyResult, pushToast])

    /**
     * The list is the draft: every committed change is stored, so "back to the
     * last edit" always means the state the page was left in. Skipped until an
     * import landed, which keeps the pending draft untouched while the user
     * decides between it and the imported payload.
     */
    useEffect(() => {
        if (!configImported) return
        writeDraft(subs)
    }, [subs, configImported])

    /** Puts the saved work back on screen; the home-screen button and the jump prompt share this. */
    const restoreDraft = useCallback(() => {
        const target = draftPrompt?.draft ?? draft
        if (target === null) return
        applyResult({ subscriptions: target.subscriptions, skipped: 0 })
        setDraftPrompt(null)
    }, [draftPrompt, draft, applyResult])

    /** Turns the saved work down in favour of the payload the jump carried. */
    const keepImported = useCallback(() => {
        if (draftPrompt === null) return
        applyResult(draftPrompt.imported)
        setDraftPrompt(null)
    }, [draftPrompt, applyResult])

    const updateSub = useCallback((tvdbId: number, patch: Partial<Subscription>) => {
        setSubs(prev => prev.map(sub => sub.tvdbId === tvdbId ? { ...sub, ...patch } : sub))
    }, [])

    const removeSub = useCallback((tvdbId: number) => {
        setSubs(prev => prev.filter(sub => sub.tvdbId !== tvdbId))
    }, [])

    /** Manual entry of a bare series; feeds start empty and defaults apply. */
    const addSub = useCallback((input: SonarrSeries) => {
        const sub: Subscription = {
            ...input,
            rss: [],
            epRegex: [DEFAULT_EP_REGEX],
            epOffset: [DEFAULT_EP_OFFSET],
        }
        setSubs(prev => [...prev, sub])
    }, [])

    return {
        subs, configImported, draft, draftPrompt, importJson,
        updateSub, removeSub, addSub, restoreDraft, keepImported,
    }
}

/**
 * A `?config=` parameter is spent once its payload has been loaded: dropping it
 * keeps a reload from importing the same list again — and, with a draft saved by
 * then, from asking about it again. The home screen and its "back to the last
 * edit" button are the way to pick the work up from there.
 */
function dropConfigParam(): void {
    const url = new URL(window.location.href)
    if (!url.searchParams.has('config')) return
    url.searchParams.delete('config')
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
}
