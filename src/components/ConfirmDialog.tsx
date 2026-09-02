import { btnError, btnGhost, cardSurface } from '../lib/ui'

interface ConfirmDialogProps {
    title: string
    body: string
    /** Label of the destructive action, default 删除. */
    confirmLabel?: string
    onConfirm: () => void
    onClose: () => void
}

/**
 * Minimal explicit-confirmation dialog for destructive row actions. The scrim
 * does not dismiss it — the user picks 取消 or the destructive action.
 */
export default function ConfirmDialog({
    title,
    body,
    confirmLabel = '删除',
    onConfirm,
    onClose,
}: ConfirmDialogProps) {
    return (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-md-on-background/40 backdrop-blur-sm">
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
                            取消
                        </button>
                        <button type="button" className={btnError} onClick={onConfirm}>
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
