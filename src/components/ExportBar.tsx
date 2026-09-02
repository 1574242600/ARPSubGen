import { useState } from 'react'
import type { SubscribeEntry } from '../lib/types'
import { btnFilled, btnTonal } from '../lib/ui'

interface ExportBarProps {
    ready: number
    total: number
    entries: SubscribeEntry[]
}

export default function ExportBar({ ready, total, entries }: ExportBarProps) {
    const [copied, setCopied] = useState(false)

    const json = JSON.stringify(entries, null, 4)

    const copy = async () => {
        await navigator.clipboard.writeText(json)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const download = () => {
        const blob = new Blob([json], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'anirss.subscribe.json'
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div className="fixed inset-x-0 bottom-6 z-20 flex justify-center px-4">
            <div className="flex items-center gap-4 rounded-full bg-md-surface-container py-3 pl-6 pr-3 shadow-lg ring-1 ring-md-outline/10">
                <p className="text-sm font-medium text-md-on-surface">
                    {ready} / {total} 部就绪
                </p>
                <div className="flex gap-2">
                    <button
                        type="button"
                        className={btnTonal}
                        disabled={ready === 0}
                        onClick={copy}
                    >
                        {copied ? '已复制 ✓' : '复制 JSON'}
                    </button>
                    <button
                        type="button"
                        className={btnFilled}
                        disabled={ready === 0}
                        onClick={download}
                    >
                        下载配置文件
                    </button>
                </div>
            </div>
        </div>
    )
}
