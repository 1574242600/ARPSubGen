import { useCopyFeedback } from '../hooks/useCopyFeedback'
import { useScrollLock } from '../hooks/useScrollLock'
import { btnFilled, btnGhost, cardSurface } from '../lib/ui'

interface CodeDialogProps {
    title: string
    code: string
    /** Label of the copy action, e.g. 复制 JSON / 复制代码. */
    copyLabel: string
    /** When set, a download action for this file name is added. */
    downloadName?: string
    onClose: () => void
}

/**
 * Code card dialog sharing the landing "控制台代码" style: title above
 * a scrollable pre block. 关闭 sits at the far left, copy (and optionally
 * download) are right-aligned. Closing is explicit only — the scrim does not
 * dismiss it.
 */
export default function CodeDialog({ title, code, copyLabel, downloadName, onClose }: CodeDialogProps) {
    const { copied, copy } = useCopyFeedback()

    useScrollLock()

    const copyCode = () => { void copy(code) }

    const download = () => {
        const blob = new Blob([code], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = downloadName ?? 'code'
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div className="fixed inset-0 z-40 overflow-y-auto overscroll-contain bg-md-on-background/40 backdrop-blur-sm">
            <div className="flex min-h-full items-center justify-center p-4">
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={title}
                    className={`${cardSurface} w-full max-w-3xl animate-toast-in`}
                >
                    <h3 className="mb-4 text-xl font-medium text-md-on-surface">{title}</h3>
                    <pre className="max-h-[55vh] overflow-auto rounded-2xl bg-md-surface-container-low p-5 text-sm leading-relaxed text-md-on-surface-variant shadow-inner">
                        <code>{code}</code>
                    </pre>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <button type="button" className={btnGhost} onClick={onClose}>
                            关闭
                        </button>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                            <button type="button" className={btnFilled} onClick={copyCode}>
                                {copied ? '已复制 ✓' : copyLabel}
                            </button>
                            {downloadName !== undefined && (
                                <button type="button" className={btnFilled} onClick={download}>
                                    下载配置文件
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
