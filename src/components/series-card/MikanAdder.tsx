import { useMemo, useState } from 'react'
import type { MikanData, MikanSeries } from '../../lib/types'
import { WEEKDAY_LABELS, mikanRssUrl, normalizeTitle } from '../../lib/mikan'
import { recommendBangumi } from '../../lib/similarity'
import { btnGhost, btnTonal, chipActive, chipIdle, inputFilled } from '../../lib/ui'
import BangumiRow from './BangumiRow'
import GroupChips from './GroupChips'

interface MikanAdderProps {
    mikan: MikanData
    current: MikanSeries | null
    title: string
    onAdd: (url: string) => void
}

/**
 * Adds another feed to the card. When the RSS list already resolves to a
 * catalogue entry, the panel shows only that show's release groups; the
 * search / weekday browser is reserved for cards with no recognisable bangumi,
 * where Jaccard-matched titles (>40%, ignoring 第X季 markers) float to the top
 * marked as recommended.
 */
export default function MikanAdder({ mikan, current, title, onAdd }: MikanAdderProps) {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [expanded, setExpanded] = useState<number | null>(null)
    const [day, setDay] = useState(() => new Date().getDay())

    const recommended = useMemo(
        () => (current === null ? recommendBangumi(title, mikan.items) : []),
        [current, title, mikan],
    )
    const recommendedIds = useMemo(
        () => new Set(recommended.map(item => item.id)),
        [recommended],
    )

    const results = useMemo(() => {
        const q = normalizeTitle(query)
        return q
            ? mikan.items.filter(item => normalizeTitle(item.title).includes(q)).slice(0, 12)
            : mikan.items.filter(item => item.dayofweek === day && !recommendedIds.has(item.id))
    }, [query, day, mikan, recommendedIds])

    const close = () => {
        setOpen(false)
        setQuery('')
        setExpanded(null)
    }

    const add = (bangumiId: number, groupId: number) => {
        onAdd(mikanRssUrl(bangumiId, groupId))
        close()
    }

    if (!open) {
        return (
            <button
                type="button"
                className={btnTonal}
                onClick={() => {
                    if (current) setDay(current.dayofweek)
                    setOpen(true)
                }}
            >
                从蜜柑添加
            </button>
        )
    }

    // Bangumi already identified: only this show's release groups matter.
    if (current !== null) {
        return (
            <div className="w-full rounded-3xl bg-md-surface-container-low p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="text-base font-medium text-md-on-surface">{current.title}</span>
                    <span className="rounded-full bg-md-on-secondary-container/10 px-3 py-1 text-xs text-md-on-secondary-container">
                        {WEEKDAY_LABELS[current.dayofweek] ?? '未知'}更新
                    </span>
                    <button type="button" className={`${btnGhost} ml-auto`} onClick={close}>
                        关闭
                    </button>
                </div>
                <GroupChips series={current} mikan={mikan} onAdd={add} />
            </div>
        )
    }

    // No recognisable bangumi yet: browse the catalogue to pick the first feed.
    return (
        <div className="w-full rounded-3xl bg-md-surface-container-low p-4">
            <div className="mb-3 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                    <input
                        type="text"
                        className={inputFilled()}
                        placeholder="搜索蜜柑番剧标题，如：无职转生"
                        autoFocus
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                </div>
                <button type="button" className={btnGhost} onClick={close}>
                    取消
                </button>
            </div>

            {query === '' && (
                <div className="mb-3 flex flex-wrap gap-2">
                    {WEEKDAY_LABELS.map((label, index) => (
                        <button
                            key={label}
                            type="button"
                            aria-pressed={day === index}
                            className={day === index ? chipActive : chipIdle}
                            onClick={() => setDay(index)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            )}

            <ul className="max-h-72 space-y-1 overflow-y-auto">
                {query === '' && recommended.map(item => (
                    <BangumiRow
                        key={item.id}
                        item={item}
                        mikan={mikan}
                        expanded={expanded === item.id}
                        recommend
                        onToggle={() => setExpanded(expanded === item.id ? null : item.id)}
                        onPick={add}
                    />
                ))}
                {results.map(item => (
                    <BangumiRow
                        key={item.id}
                        item={item}
                        mikan={mikan}
                        expanded={expanded === item.id}
                        recommend={recommendedIds.has(item.id)}
                        onToggle={() => setExpanded(expanded === item.id ? null : item.id)}
                        onPick={add}
                    />
                ))}
                {results.length === 0 && (query !== '' || recommended.length === 0) && (
                    <li className="px-4 py-3 text-sm text-md-on-surface-variant">没有匹配的番剧</li>
                )}
            </ul>
        </div>
    )
}
