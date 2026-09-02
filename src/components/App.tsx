import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Hero from './Hero'
import Guide from './Guide'
import SeriesCard from './SeriesCard'
import ExportBar from './ExportBar'
import Toasts, { type ToastItem } from './Toasts'
import { buildSubscribeFile, decodeConfigParam, parseImportedJson, type ParseResult } from '../lib/config'
import type { MikanData, Subscription } from '../lib/types'
import { cardSurface } from '../lib/ui'

export default function App() {
    const [mikan, setMikan] = useState<MikanData | null>(null)
    const [subs, setSubs] = useState<Subscription[]>([])
    const [toasts, setToasts] = useState<ToastItem[]>([])
    const [configImported, setConfigImported] = useState(false)
    const [mikanError, setMikanError] = useState<string | null>(null)
    const nextToastId = useRef(1)

    /** Transient notifications render as top-right toasts; keep the newest 4. */
    const pushToast = (tone: ToastItem['tone'], text: string) => {
        setToasts(prev => [...prev.slice(-3), { id: nextToastId.current++, tone, text }])
    }

    const dismissToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(toast => toast.id !== id))
    }, [])

    /** Shared entry point for the URL payload and pasted/uploaded JSON. */
    const applyResult = (result: ParseResult) => {
        if (result.subscriptions.length === 0) {
            pushToast('error', '导入失败：没有可用条目，每个条目至少需要 tvdbId 与 season')
            return
        }
        setSubs(result.subscriptions)
        setConfigImported(true)
        if (result.skipped > 0) {
            pushToast('info', `已导入 ${result.subscriptions.length} 部剧集，跳过 ${result.skipped} 条无效或重复条目`)
        }
    }

    const importJson = (json: string) => {
        try {
            applyResult(parseImportedJson(json))
        } catch (err) {
            pushToast('error', `导入失败：${err instanceof Error ? err.message : String(err)}`)
        }
    }

    useEffect(() => {
        const param = new URLSearchParams(window.location.search).get('config')
        if (!param) return
        decodeConfigParam(param)
            .then(applyResult)
            .catch(() => pushToast('error', '配置参数解析失败，请从 Sonarr 重新发起跳转'))
    }, [])

    useEffect(() => {
        fetch('/mikan.json')
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                return res.json() as Promise<MikanData>
            })
            .then(setMikan)
            .catch(err => setMikanError(`蜜柑数据加载失败：${String(err)}`))
    }, [])

    const entries = useMemo(() => buildSubscribeFile(subs), [subs])

    const updateSub = (tvdbId: number, patch: Partial<Subscription>) => {
        setSubs(prev => prev.map(sub => sub.tvdbId === tvdbId ? { ...sub, ...patch } : sub))
    }

    const isLoading = !mikan && !mikanError

    return (
        <div className="min-h-screen bg-md-background">
            <main className="mx-auto max-w-4xl px-4 pt-8 pb-36 md:px-6 md:pt-12">
                <Hero imported={subs.length} ready={entries.length} />

                {mikanError && (
                    <div className={`${cardSurface} mb-8`} role="alert">
                        <p className="font-medium text-md-on-surface">{mikanError}</p>
                        <p className="mt-1 text-sm text-md-on-surface-variant">
                            番剧目录暂时不可用，请稍后刷新重试。
                        </p>
                    </div>
                )}

                {isLoading && (
                    <div className={`${cardSurface} animate-pulse`}>
                        <p className="text-md-on-surface-variant">正在加载蜜柑番剧目录…</p>
                    </div>
                )}

                {!isLoading && !configImported && <Guide onImport={importJson} />}

                {mikan && configImported && subs.length === 0 && (
                    <div className={`${cardSurface}`}>
                        <h2 className="mb-2 text-2xl font-medium text-md-on-surface">没有可配置的剧集</h2>
                        <p className="text-md-on-surface-variant">
                            导入的配置中没有剧集，请回到 Sonarr 确认存在已监控的动画剧集后重试。
                        </p>
                    </div>
                )}

                {mikan && subs.length > 0 && (
                    <div className="space-y-6">
                        {subs.map(sub => (
                            <SeriesCard
                                key={sub.tvdbId}
                                sub={sub}
                                mikan={mikan}
                                onChange={patch => updateSub(sub.tvdbId, patch)}
                            />
                        ))}
                    </div>
                )}
            </main>

            {configImported && subs.length > 0 && (
                <ExportBar ready={entries.length} total={subs.length} entries={entries} />
            )}

            <Toasts toasts={toasts} onDismiss={dismissToast} />
        </div>
    )
}
