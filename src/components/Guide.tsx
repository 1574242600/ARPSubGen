import { useRef, useState, type ChangeEvent } from 'react'
import { useCopyFeedback } from '../hooks/useCopyFeedback'
import { formatDraftTime, type Draft } from '../lib/draft'
import { btnFilled, btnTonal, cardSurface, textareaFilled } from '../lib/ui'

const SONARR_SNIPPET = `(() => {

async function urlSafeBtoaWithGzip(str) {
  const data = new Uint8Array(await new Response(
    new Blob([new TextEncoder().encode(str)])
      .stream().pipeThrough(new CompressionStream("gzip"))
  ).arrayBuffer());

  return btoa(String.fromCharCode(...data))
    .replace(/\\+/g, "-").replace(/\\//g, "_").replace(/=+$/, "");
}

fetch("/api/v3/series", {
    "headers": {
        "X-Api-Key": window.Sonarr.apiKey
    }
})
.then(r => r.json())
.then(items => items.filter(item => item.seriesType === 'anime' &&  item.monitored === true && Date.parse(item.lastAired)  > Date.now() - 30 * 24 * 60 * 60 * 1000))
.then(items => items.map(item => { return { tvdbId: item.tvdbId, season: item.statistics.seasonCount, title: item.title } }))
.then(items => JSON.stringify(items))
.then(async json => window.location.href = \`https://arp-subgen.nworm.icu/?config=\${await urlSafeBtoaWithGzip(json)}\`)

})()`

const STEPS = [
    {
        title: '在 Sonarr 执行脚本',
        body: '打开 Sonarr 管理页面的开发者工具控制台，粘贴并执行下方脚本。它会筛选最近 30 天内开播、已监控的动画节目，打包跳转过来。',
    },
    {
        title: '添加 RSS 订阅源',
        body: '为每部节目添加蜜柑（或任意）RSS 源，序号越小优先级越高，可随时上下调整。蜜柑源的番剧与发布组会被自动识别。',
    },
    {
        title: '导出订阅配置',
        body: '确认每部节目的集数解析与 RSS 无误后，在 Sonarr 管理页面的开发者工具控制台执行「导出控制台代码」的脚本，将订阅即时下发并执行。',
    },
]

interface GuideProps {
    onImport: (json: string) => void
    /** Work saved by the previous visit, if any. */
    draft: Draft | null
    onRestore: () => void
}

export default function Guide({ onImport, draft, onRestore }: GuideProps) {
    const [json, setJson] = useState('')
    const fileRef = useRef<HTMLInputElement>(null)
    const { copied, copy } = useCopyFeedback()

    const copySnippet = () => { void copy(SONARR_SNIPPET) }

    const importText = () => {
        if (json.trim()) onImport(json)
    }

    const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (file) onImport(await file.text())
    }

    return (
        <div className="space-y-8">
            <div className="grid gap-6 md:grid-cols-3">
                {STEPS.map((step, index) => (
                    <div
                        key={step.title}
                        className={`${cardSurface} group relative hover:scale-[1.02] hover:shadow-md`}
                    >
                        <span className="relative mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-md-primary text-lg font-bold text-md-on-primary shadow-sm transition-all duration-300 ease-md group-hover:shadow-lg">
                            {index + 1}
                        </span>
                        <h3 className="mb-2 text-xl font-medium text-md-on-surface">{step.title}</h3>
                        <p className="text-sm leading-relaxed text-md-on-surface-variant">{step.body}</p>
                    </div>
                ))}
            </div>

            <div className={cardSurface}>
                <h3 className="mb-2 text-xl font-medium text-md-on-surface">导入已有订阅</h3>
                <p className="mb-4 text-sm leading-relaxed text-md-on-surface-variant">
                    粘贴 anirss.subscribe.json 内容或选择本地文件。除 tvdbId 与 season 外字段均可省略，
                    已有的 rss 列表会按原顺序还原。
                </p>
                <textarea
                    className={textareaFilled()}
                    placeholder={'[\n    {"tvdbId": 100, "season": 1}\n]'}
                    spellCheck={false}
                    value={json}
                    onChange={e => setJson(e.target.value)}
                />
                <div className="mt-4 flex flex-wrap gap-3">
                    <button
                        type="button"
                        className={btnFilled}
                        disabled={!json.trim()}
                        onClick={importText}
                    >
                        导入
                    </button>
                    <button
                        type="button"
                        className={btnTonal}
                        onClick={() => fileRef.current?.click()}
                    >
                        选择 JSON 文件
                    </button>
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".json,application/json"
                        className="hidden"
                        onChange={importFile}
                    />
                </div>

                {draft !== null && (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-md-surface-container-low px-4 py-3">
                        <p className="text-sm text-md-on-surface-variant">
                            上次修改：{formatDraftTime(draft.savedAt)} · {draft.subscriptions.length} 部节目
                        </p>
                        <button type="button" className={btnTonal} onClick={onRestore}>
                            回到上次修改
                        </button>
                    </div>
                )}
            </div>

            <div className={cardSurface}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-xl font-medium text-md-on-surface">控制台代码</h3>
                    <button type="button" className={btnFilled} onClick={copySnippet}>
                        {copied ? '已复制 ✓' : '复制代码'}
                    </button>
                </div>
                <pre className="overflow-x-auto rounded-2xl bg-md-surface-container-low p-5 text-sm leading-relaxed text-md-on-surface-variant shadow-inner"><code>{SONARR_SNIPPET}</code></pre>
            </div>
        </div>
    )
}
