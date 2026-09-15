import { useMemo } from 'react'
import Guide from './Guide'
import SeriesList from './series-list/SeriesList'
import ExportBar from './ExportBar'
import Toasts from './Toasts'
import ConfirmDialog from './ConfirmDialog'
import { buildSubscribeFile, subscriptionIssues } from '../lib/config'
import { formatDraftTime } from '../lib/draft'
import { cardSurface } from '../lib/ui'
import { useToasts } from '../hooks/useToasts'
import { useSubscriptions } from '../hooks/useSubscriptions'
import { useMikanCatalogue } from '../hooks/useMikanCatalogue'

export default function App() {
    const { toasts, pushToast, dismissToast } = useToasts()
    const { mikan, error: mikanError, isLoading } = useMikanCatalogue()
    const {
        subs, configImported, draft, draftPrompt, importJson,
        updateSub, removeSub, addSub, restoreDraft, keepImported,
    } = useSubscriptions(pushToast)

    const entries = useMemo(() => buildSubscribeFile(subs), [subs])
    const errorCount = useMemo(
        () => subs.filter(sub => subscriptionIssues(sub).length > 0).length,
        [subs],
    )

    return (
        <div className="min-h-screen bg-md-background">
            <main className="mx-auto max-w-4xl px-4 pt-8 pb-36 md:px-6 md:pt-12">
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

                {!isLoading && !configImported && (
                    <Guide onImport={importJson} draft={draft} onRestore={restoreDraft} />
                )}

                {mikan && configImported && subs.length === 0 && (
                    <div className={`${cardSurface}`}>
                        <h2 className="mb-2 text-2xl font-medium text-md-on-surface">没有可配置的节目</h2>
                        <p className="text-md-on-surface-variant">
                            导入的配置中没有节目，请回到 Sonarr 确认存在已监控的动画节目后重试。
                        </p>
                    </div>
                )}

                {mikan && subs.length > 0 && (
                    <SeriesList
                        subs={subs}
                        mikan={mikan}
                        onUpdate={updateSub}
                        onRemove={removeSub}
                        onAdd={addSub}
                    />
                )}
            </main>

            {configImported && subs.length > 0 && (
                <ExportBar ready={entries.length} total={subs.length} errors={errorCount} entries={entries} />
            )}

            <Toasts toasts={toasts} onDismiss={dismissToast} />

            {draftPrompt !== null && (
                <ConfirmDialog
                    title="回到上次修改？"
                    body={`本地保存着 ${formatDraftTime(draftPrompt.draft.savedAt)} 的修改（${draftPrompt.draft.subscriptions.length} 部节目），本次跳转又带来 ${draftPrompt.imported.subscriptions.length} 部节目，两者只能保留一个。`}
                    confirmLabel="回到上次修改"
                    cancelLabel="使用本次导入"
                    tone="filled"
                    onConfirm={restoreDraft}
                    onClose={keepImported}
                />
            )}
        </div>
    )
}
