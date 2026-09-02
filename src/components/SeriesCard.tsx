import { useMemo, useState } from 'react'
import type { MikanData, MikanSeries, Subscription } from '../lib/types'
import {
    MIKAN_BASE,
    WEEKDAY_LABELS,
    mikanIdsOf,
    mikanRssUrl,
    normalizeTitle,
    parseMikanRss,
    resolveReleaseGroup,
} from '../lib/mikan'
import { UNTITLED } from '../lib/config'
import { episodePreviewGroups, parseEpisode } from '../lib/episode'
import { recommendBangumi } from '../lib/similarity'
import { btnGhost, btnIcon, btnTonal, cardSurface, inputFilled, type InputTone } from '../lib/ui'

interface SeriesCardProps {
    sub: Subscription
    mikan: MikanData
    onChange: (patch: Partial<Subscription>) => void
}

const chipIdle = 'rounded-full border border-md-outline px-3 py-1 text-xs text-md-primary transition-colors duration-200 hover:bg-md-primary/10'
const chipActive = 'rounded-full bg-md-primary px-3 py-1 text-xs text-md-on-primary'

/** One feed row: editable URL, a raise-priority control and a delete action. */
function RssRow({ url, index, tone, group, hint, onChange, onMoveUp, onRemove }: {
    url: string
    index: number
    tone: InputTone
    group: string | null
    hint: string | null
    onChange: (url: string) => void
    onMoveUp: () => void
    onRemove: () => void
}) {
    return (
        <li className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
                <div className="relative">
                    <input
                        type="text"
                        className={`${inputFilled(tone)} ${group === null ? '' : 'pr-36'}`}
                        value={url}
                        spellCheck={false}
                        placeholder={`${MIKAN_BASE}/RSS/Bangumi?bangumiId=…`}
                        aria-label={`第 ${index + 1} 条订阅源`}
                        onChange={e => onChange(e.target.value)}
                    />
                    {group !== null && (
                        <span className="pointer-events-none absolute inset-y-0 right-3 flex max-w-32 items-center">
                            <span className="truncate rounded-full bg-md-secondary-container px-3 py-1 text-xs font-medium text-md-on-secondary-container">
                                {group}
                            </span>
                        </span>
                    )}
                </div>
                {hint !== null && <p className="mt-1 text-xs text-amber-700">{hint}</p>}
            </div>

            {/* Matches the input's h-14 height so the actions centre against the field. */}
            <div className="flex h-14 shrink-0 items-center gap-1">
                <button
                    type="button"
                    className={btnIcon}
                    disabled={index === 0}
                    aria-label={`上移第 ${index + 1} 条订阅源`}
                    title="提高优先级"
                    onClick={onMoveUp}
                >
                    <span className="icon-[mdi--arrow-up] text-2xl" aria-hidden="true" />
                </button>
                <button
                    type="button"
                    className={btnIcon}
                    aria-label={`删除第 ${index + 1} 条订阅源`}
                    title="删除此订阅源"
                    onClick={onRemove}
                >
                    <span className="icon-[mdi--delete] text-2xl" aria-hidden="true" />
                </button>
            </div>
        </li>
    )
}

/** Clickable chips, one per release group; each adds that group's feed. */
function GroupChips({ series, mikan, onAdd }: {
    series: MikanSeries
    mikan: MikanData
    onAdd: (bangumiId: number, groupId: number) => void
}) {
    if (series.releaseGroups.length === 0) {
        return <p className="text-sm text-md-on-surface-variant">该番剧暂无可用字幕组</p>
    }

    return (
        <div className="flex flex-wrap gap-2">
            {series.releaseGroups.map(group => (
                <button
                    key={group.id}
                    type="button"
                    className={chipIdle}
                    onClick={() => onAdd(series.id, group.id)}
                >
                    {mikan.releaseGroupNames[String(group.id)] ?? `字幕组 ${group.id}`}
                </button>
            ))}
        </div>
    )
}

/** One catalogue row in the picker: title (+ optional 推荐 badge), expandable to groups. */
function BangumiRow({ item, mikan, expanded, recommend, onToggle, onPick }: {
    item: MikanSeries
    mikan: MikanData
    expanded: boolean
    recommend: boolean
    onToggle: () => void
    onPick: (bangumiId: number, groupId: number) => void
}) {
    return (
        <li>
            <button
                type="button"
                aria-expanded={expanded}
                className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-md-on-surface transition-colors duration-200 hover:bg-md-primary/10"
                onClick={onToggle}
            >
                <span className="truncate">{item.title}</span>
                <span className="flex shrink-0 items-center gap-2">
                    {recommend && (
                        <span className="rounded-full bg-md-primary px-2.5 py-0.5 text-[11px] font-medium text-md-on-primary">
                            推荐
                        </span>
                    )}
                    <span className="text-xs text-md-on-surface-variant">
                        {item.releaseGroups.length} 个字幕组
                    </span>
                </span>
            </button>
            {expanded && (
                <div className="px-4 pb-3">
                    <GroupChips series={item} mikan={mikan} onAdd={onPick} />
                </div>
            )}
        </li>
    )
}

/**
 * Adds another feed to the card. When the RSS list already resolves to a
 * catalogue entry, the panel shows only that show's release groups; the
 * search / weekday browser is reserved for cards with no recognisable bangumi,
 * where Jaccard-matched titles (>50%) float to the top marked as recommended.
 */
function MikanAdder({ mikan, current, title, onAdd }: {
    mikan: MikanData
    current: MikanSeries | null
    title: string
    onAdd: (url: string) => void
}) {
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

/**
 * Checks the episode parser against the latest titles of the Mikan release
 * groups the RSS list references, grouped per group, so a bad epRegex or a
 * wrongly ordered priority shows up before export.
 */
function EpisodePreview({ sub, mikan }: {
    sub: Subscription
    mikan: MikanData
}) {
    const groups = useMemo(() => episodePreviewGroups(sub.rss, mikan), [sub.rss, mikan])

    if (groups.length === 0) {
        return (
            <p className="mt-4 text-xs text-md-on-surface-variant">
                暂无预览样本：添加蜜柑 RSS 源后可在导出前校验集数解析
            </p>
        )
    }

    return (
        <div className="mt-4">
            <p className="mb-3 text-sm font-medium text-md-on-surface-variant">集数预览（仅支持蜜柑 RSS）</p>
            <div className="space-y-4">
                {groups.map(group => (
                    <div key={group.key}>
                        <p className="mb-1.5 text-xs font-medium text-md-on-surface-variant">{group.name}</p>
                        <ul className="space-y-2">
                            {group.titles.map(title => {
                                const episode = parseEpisode(title, sub.epRegex, sub.epOffset)
                                return (
                                    <li key={title} className="flex items-center gap-3 text-sm">
                                        <span className={[
                                            'flex h-7 shrink-0 items-center justify-center rounded-full px-3 text-xs font-medium',
                                            episode !== null
                                                ? 'bg-md-secondary-container text-md-on-secondary-container'
                                                : 'bg-md-tertiary/10 text-md-tertiary',
                                        ].join(' ')}>
                                            {episode !== null ? `第 ${episode} 集` : '未匹配'}
                                        </span>
                                        <span className="truncate text-md-on-surface-variant">{title}</span>
                                    </li>
                                )
                            })}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default function SeriesCard({ sub, mikan, onChange }: SeriesCardProps) {
    const regexInvalid = useMemo(() => {
        try {
            new RegExp(sub.epRegex)
            return false
        } catch {
            return true
        }
    }, [sub.epRegex])

    const mikanIds = useMemo(() => mikanIdsOf(sub.rss), [sub.rss])
    const conflicted = mikanIds.length > 1
    const mikanId = conflicted ? null : (mikanIds[0] ?? null)
    const bangumi = mikanId === null ? null : mikan.items.find(item => item.id === mikanId) ?? null

    const setRss = (rss: string[]) => onChange({ rss })

    /** Swap a feed with the one above it (raising its priority). */
    const raiseUrl = (index: number) => {
        if (index === 0) return
        const next = [...sub.rss]
        const [moved] = next.splice(index, 1)
        next.splice(index - 1, 0, moved)
        setRss(next)
    }

    return (
        <article className={`${cardSurface} group hover:shadow-md`}>
            <header className="mb-5">
                <h3 className={`truncate text-2xl font-medium leading-snug ${sub.title ? 'text-md-on-surface' : 'text-md-on-surface-variant'}`}>
                    {sub.title || UNTITLED}
                </h3>
                <p className="mt-1 flex flex-wrap gap-2 text-xs text-md-on-surface-variant">
                    <span className="rounded-full bg-md-surface-container-low px-3 py-1">TVDB {sub.tvdbId}</span>
                    <span className="rounded-full bg-md-surface-container-low px-3 py-1">第 {sub.season} 季</span>
                    {!conflicted && mikanId !== null && (
                        <span
                            className="max-w-full truncate rounded-full bg-md-secondary-container px-3 py-1 font-medium text-md-on-secondary-container"
                            title={bangumi?.title}
                        >
                            {bangumi ? `Mikan ${mikanId}: ${bangumi.title}` : `Mikan ${mikanId}`}
                        </span>
                    )}
                </p>
            </header>

            <section className="mb-5">
                <h4 className="mb-2 text-sm font-medium text-md-on-surface-variant">
                    RSS 订阅源 <span className="font-normal">（序号越小优先级越高）</span>
                </h4>

                {conflicted && (
                    <p className="mb-2 text-xs font-medium text-md-error">
                        Mikan Id 冲突：当前包含 {mikanIds.join('、')}，请只保留其中一个
                    </p>
                )}

                {sub.rss.length > 0 && (
                    <ul className="mb-2 space-y-2">
                        {sub.rss.map((url, index) => {
                            const isMikan = parseMikanRss(url) !== null
                            const group = conflicted ? null : resolveReleaseGroup(url, mikan)
                            const unrecognized = isMikan && !conflicted && group === null
                            return (
                                <RssRow
                                    key={index}
                                    url={url}
                                    index={index}
                                    tone={conflicted && isMikan ? 'error' : unrecognized ? 'warning' : 'default'}
                                    group={group}
                                    hint={unrecognized ? '无法识别的发布组' : null}
                                    onChange={next => setRss(sub.rss.map((item, i) => (i === index ? next : item)))}
                                    onMoveUp={() => raiseUrl(index)}
                                    onRemove={() => setRss(sub.rss.filter((_, i) => i !== index))}
                                />
                            )
                        })}
                    </ul>
                )}

                <div className="flex flex-wrap items-center gap-3">
                    <MikanAdder mikan={mikan} current={bangumi} title={sub.title} onAdd={url => setRss([...sub.rss, url])} />
                    <button
                        type="button"
                        className={btnTonal}
                        onClick={() => setRss([...sub.rss, ''])}
                    >
                        自定义添加
                    </button>
                </div>
            </section>

            <section>
                <div className="flex flex-wrap gap-3">
                    <div className="min-w-0 flex-1">
                        <label
                            htmlFor={`${sub.tvdbId}-ep-regex`}
                            className="mb-1.5 block text-sm font-medium text-md-on-surface"
                        >
                            集数正则
                        </label>
                        <input
                            id={`${sub.tvdbId}-ep-regex`}
                            type="text"
                            className={inputFilled(regexInvalid ? 'error' : 'default')}
                            aria-label={`${sub.title} 集数正则`}
                            value={sub.epRegex}
                            onChange={e => onChange({ epRegex: e.target.value })}
                        />
                        {regexInvalid && (
                            <p className="mt-1 text-xs text-md-error">正则表达式无效</p>
                        )}
                    </div>
                    <div className="w-28 shrink-0">
                        <label
                            htmlFor={`${sub.tvdbId}-ep-offset`}
                            className="mb-1.5 block text-sm font-medium text-md-on-surface"
                        >
                            集数偏移
                        </label>
                        <input
                            id={`${sub.tvdbId}-ep-offset`}
                            type="number"
                            className={inputFilled()}
                            aria-label={`${sub.title} 集数偏移`}
                            value={sub.epOffset}
                            onChange={e => onChange({ epOffset: Number(e.target.value) || 0 })}
                        />
                    </div>
                </div>

                <EpisodePreview sub={sub} mikan={mikan} />
            </section>
        </article>
    )
}
