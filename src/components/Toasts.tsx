import { useEffect } from 'react'

export interface ToastItem {
    id: number
    tone: 'error' | 'info'
    text: string
}

const AUTO_DISMISS_MS = 5000

interface ToastsProps {
    toasts: ToastItem[]
    onDismiss: (id: number) => void
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem, onDismiss: (id: number) => void }) {
    const isError = toast.tone === 'error'

    useEffect(() => {
        const timer = setTimeout(() => onDismiss(toast.id), AUTO_DISMISS_MS)
        return () => clearTimeout(timer)
    }, [toast.id, onDismiss])

    return (
        <div
            role={isError ? 'alert' : 'status'}
            className={[
                'pointer-events-auto flex animate-toast-in items-center gap-3 rounded-2xl p-4 shadow-lg ring-1',
                isError
                    ? 'bg-md-error text-md-on-error ring-md-error/20'
                    : 'bg-md-surface-container text-md-on-surface ring-md-outline/10',
            ].join(' ')}
        >
            <p className="flex-1 text-sm leading-relaxed">{toast.text}</p>
            <button
                type="button"
                aria-label="关闭通知"
                onClick={() => onDismiss(toast.id)}
                className={[
                    'flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full',
                    'transition-colors duration-200 active:scale-95',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                    isError
                        ? 'text-md-on-error/80 hover:bg-white/15 focus-visible:ring-md-on-error focus-visible:ring-offset-md-error'
                        : 'text-md-on-surface-variant hover:bg-md-primary/10 focus-visible:ring-md-primary active:bg-md-primary/5',
                ].join(' ')}
            >
                <span className="icon-[mdi--close] text-base" aria-hidden="true" />
            </button>
        </div>
    )
}

export default function Toasts({ toasts, onDismiss }: ToastsProps) {
    if (toasts.length === 0) return null

    return (
        <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2">
            {toasts.map(toast => (
                <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
            ))}
        </div>
    )
}
