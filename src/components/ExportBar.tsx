import { useMemo, useState } from 'react'
import type { SubscribeEntry } from '../lib/types'
import { btnFilled } from '../lib/ui'
import CodeDialog from './CodeDialog'

interface ExportBarProps {
    ready: number
    total: number
    /** Subscriptions with problems (Mikan id conflicts, invalid epRegex). */
    errors: number
    entries: SubscribeEntry[]
}

export default function ExportBar({ ready, total, errors, entries }: ExportBarProps) {
    const [dialog, setDialog] = useState<'json' | 'console' | null>(null)

    const json = useMemo(() => JSON.stringify(entries, null, 4), [entries])
    const blocked = ready === 0 || errors > 0

    const consoleScript = useMemo(() => `const subscribeConfig = ${json};

fetch('/api/v3/command', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': window.Sonarr.apiKey
    },
    body: JSON.stringify({ name: 'AniRss', subscribe: subscribeConfig })
})
    .then(r => r.json())
    .then(cmd => console.log('command id:', cmd.id, cmd));`, [json])

    return (
        <>
            <div className="fixed inset-x-0 bottom-6 z-20 flex justify-center px-4">
                <div className="flex flex-wrap items-center justify-center gap-4 rounded-full bg-md-surface-container py-3 pl-6 pr-3 shadow-lg ring-1 ring-md-outline/10">
                    <p className="text-sm font-medium text-md-on-surface">
                        {ready} / {total} 部就绪
                        {errors > 0 && (
                            <span className="ml-2 text-xs font-medium text-md-error">
                                {errors} 部存在错误，修复后再导出
                            </span>
                        )}
                    </p>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                            type="button"
                            className={btnFilled}
                            disabled={blocked}
                            title={blocked ? '存在错误或没有就绪条目' : undefined}
                            onClick={() => setDialog('json')}
                        >
                            导出 JSON
                        </button>
                        <button
                            type="button"
                            className={btnFilled}
                            disabled={blocked}
                            title={blocked ? '存在错误或没有就绪条目' : undefined}
                            onClick={() => setDialog('console')}
                        >
                            导出控制台代码
                        </button>
                    </div>
                </div>
            </div>

            {dialog === 'json' && (
                <CodeDialog
                    title="anirss.subscribe.json"
                    code={json}
                    copyLabel="复制 JSON"
                    downloadName="anirss.subscribe.json"
                    onClose={() => setDialog(null)}
                />
            )}
            {dialog === 'console' && (
                <CodeDialog
                    title="控制台代码"
                    code={consoleScript}
                    copyLabel="复制代码"
                    onClose={() => setDialog(null)}
                />
            )}
        </>
    )
}
