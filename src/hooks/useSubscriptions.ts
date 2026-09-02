import { useCallback, useEffect, useState } from 'react'
import { decodeConfigParam, parseImportedJson, type ParseResult } from '../lib/config'
import type { Subscription } from '../lib/types'
import type { ToastItem } from '../components/Toasts'

type PushToast = (tone: ToastItem['tone'], text: string) => void

/**
 * Owns the subscription list: initial import from the Sonarr `?config=` jump,
 * manual paste/upload import and per-series patches. All paths funnel through
 * `applyResult` so a bad payload reports once, in one place.
 */
export function useSubscriptions(pushToast: PushToast): {
    subs: Subscription[]
    configImported: boolean
    importJson: (json: string) => void
    updateSub: (tvdbId: number, patch: Partial<Subscription>) => void
} {
    const [subs, setSubs] = useState<Subscription[]>([])
    const [configImported, setConfigImported] = useState(false)

    /** Shared entry point for the URL payload and pasted/uploaded JSON. */
    const applyResult = useCallback((result: ParseResult) => {
        if (result.subscriptions.length === 0) {
            pushToast('error', '导入失败：没有可用条目，每个条目至少需要 tvdbId 与 season')
            return
        }
        setSubs(result.subscriptions)
        setConfigImported(true)
        if (result.skipped > 0) {
            pushToast('info', `已导入 ${result.subscriptions.length} 部剧集，跳过 ${result.skipped} 条无效或重复条目`)
        }
    }, [pushToast])

    const importJson = useCallback((json: string) => {
        try {
            applyResult(parseImportedJson(json))
        } catch (err) {
            pushToast('error', `导入失败：${err instanceof Error ? err.message : String(err)}`)
        }
    }, [applyResult, pushToast])

    useEffect(() => {
        const param = new URLSearchParams(window.location.search).get('config')
        if (!param) return
        decodeConfigParam(param)
            .then(applyResult)
            .catch(() => pushToast('error', '配置参数解析失败，请从 Sonarr 重新发起跳转'))
    }, [applyResult, pushToast])

    const updateSub = useCallback((tvdbId: number, patch: Partial<Subscription>) => {
        setSubs(prev => prev.map(sub => sub.tvdbId === tvdbId ? { ...sub, ...patch } : sub))
    }, [])

    return { subs, configImported, importJson, updateSub }
}
