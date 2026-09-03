import { useCallback, useState } from 'react'
import type { MikanData, Subscription } from '../../lib/types'
import { subscriptionIssues } from '../../lib/config'
import { btnFilled, btnGhost } from '../../lib/ui'
import { useScrollLock } from '../../hooks/useScrollLock'
import SeriesCard from './SeriesCard'

interface SeriesDialogProps {
    sub: Subscription
    mikan: MikanData
    onSave: (sub: Subscription) => void
    onClose: () => void
}

/**
 * Modal editor: edits hit a local draft so nothing reaches the subscription
 * list until 保存. Saving is blocked while the draft carries problems
 * (Mikan id conflicts, an epRegex that does not compile). The dialog stays
 * open on outside clicks — only 取消 discards and closes it.
 */
export default function SeriesDialog({ sub, mikan, onSave, onClose }: SeriesDialogProps) {
    // Mounted per opened series (SeriesList keys it by tvdbId), so a fresh
    // draft is guaranteed even when the same card is reopened later.
    const [draft, setDraft] = useState(sub)

    useScrollLock()

    const patch = useCallback((_tvdbId: number, p: Partial<Subscription>) => {
        setDraft(prev => ({ ...prev, ...p }))
    }, [])

    const dirty = draft !== sub
    const issues = subscriptionIssues(draft)
    const saveDisabled = !dirty || issues.length > 0

    return (
        <div className="fixed inset-0 z-40 overflow-y-auto overscroll-contain bg-md-on-background/40 backdrop-blur-sm">
            <div className="flex min-h-full items-center justify-center p-4">
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={`编辑 ${sub.title || '节目'}`}
                    className="w-full max-w-3xl animate-toast-in"
                >
                    <SeriesCard
                        sub={draft}
                        mikan={mikan}
                        onUpdate={patch}
                        footer={
                            <>
                                {issues.length > 0 && (
                                    <span className="mr-auto text-xs font-medium text-md-error">
                                        存在错误，请修复后再保存
                                    </span>
                                )}
                                <button type="button" className={btnGhost} onClick={onClose}>
                                    取消
                                </button>
                                <button
                                    type="button"
                                    className={btnFilled}
                                    disabled={saveDisabled}
                                    onClick={() => onSave(draft)}
                                >
                                    保存
                                </button>
                            </>
                        }
                    />
                </div>
            </div>
        </div>
    )
}
