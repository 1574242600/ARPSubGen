import { btnError, btnFilled, btnGhost, cardSurface } from '../lib/ui'
import { useScrollLock } from '../hooks/useScrollLock'

type ConfirmTone = 'error' | 'filled'

const confirmTone: Record<ConfirmTone, string> = {
    error: btnError,
    filled: btnFilled,
}

interface ConfirmDialogProps {
    title: string
    body: string
    /** Label of the confirming action, default 删除. */
    confirmLabel?: string
    /** Label of the dismissing action, default 取消. */
    cancelLabel?: string
    /**
     * Weight of the confirming action: `error` for destructive ones (MD3
     * error-container), `filled` when it is a plain choice between two outcomes.
     */
    tone?: ConfirmTone
    onConfirm: () => void
    onClose: () => void
}

/**
 * Minimal explicit-confirmation dialog. The scrim does not dismiss it — the user
 * picks one of the two actions, so a delete never happens by accident and a
 * decision that discards work (a draft, an import) is always taken on purpose.
 */
export default function ConfirmDialog({
    title,
    body,
    confirmLabel = '删除',
    cancelLabel = '取消',
    tone = 'error',
    onConfirm,
    onClose,
}: ConfirmDialogProps) {
    useScrollLock()

    return (
        <div className="fixed inset-0 z-40 overflow-y-auto overscroll-contain bg-md-on-background/40 backdrop-blur-sm">
            <div className="flex min-h-full items-center justify-center p-4">
                <div
                    role="alertdialog"
                    aria-modal="true"
                    aria-label={title}
                    className={`${cardSurface} w-full max-w-sm animate-toast-in`}
                >
                    <h3 className="text-lg font-medium text-md-on-surface">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-md-on-surface-variant">{body}</p>
                    <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
                        <button type="button" className={btnGhost} onClick={onClose}>
                            {cancelLabel}
                        </button>
                        <button type="button" className={confirmTone[tone]} onClick={onConfirm}>
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
