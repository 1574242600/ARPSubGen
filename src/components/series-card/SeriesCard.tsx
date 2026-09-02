import { memo, useCallback, useMemo, type ReactNode } from 'react'
import type { MikanData, Subscription } from '../../lib/types'
import { UNTITLED } from '../../lib/config'
import { isValidEpisodeRegex } from '../../lib/episode'
import { parseMikanRss, resolveBangumi, resolveReleaseGroup } from '../../lib/mikan'
import { btnTonal, cardSurface, inputFilled } from '../../lib/ui'
import RssRow from './RssRow'
import MikanAdder from './MikanAdder'
import EpisodePreview from './EpisodePreview'

interface SeriesCardProps {
    sub: Subscription
    mikan: MikanData
    onUpdate: (tvdbId: number, patch: Partial<Subscription>) => void
    /** Optional action row pinned at the card bottom (e.g. the dialog's save bar). */
    footer?: ReactNode
}

function SeriesCardInner({ sub, mikan, onUpdate, footer }: SeriesCardProps) {
    /** Binds the card's tvdbId once; keeps the memoised card out of re-renders. */
    const patch = useCallback((p: Partial<Subscription>) => onUpdate(sub.tvdbId, p), [onUpdate, sub.tvdbId])

    const regexInvalid = useMemo(() => !isValidEpisodeRegex(sub.epRegex), [sub.epRegex])

    const { ids: mikanIds, bangumi } = useMemo(
        () => resolveBangumi(sub.rss, mikan),
        [sub.rss, mikan],
    )
    const conflicted = mikanIds.length > 1
    const mikanId = conflicted ? null : (mikanIds[0] ?? null)

    /** Swap a feed with the one above it (raising its priority). */
    const raiseUrl = (index: number) => {
        if (index === 0) return
        const next = [...sub.rss]
        const [moved] = next.splice(index, 1)
        next.splice(index - 1, 0, moved)
        patch({ rss: next })
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
                                    onChange={next => patch({ rss: sub.rss.map((item, i) => (i === index ? next : item)) })}
                                    onMoveUp={() => raiseUrl(index)}
                                    onRemove={() => patch({ rss: sub.rss.filter((_, i) => i !== index) })}
                                />
                            )
                        })}
                    </ul>
                )}

                <div className="flex flex-wrap items-center gap-3">
                    <MikanAdder mikan={mikan} current={bangumi} title={sub.title} onAdd={url => patch({ rss: [...sub.rss, url] })} />
                    <button
                        type="button"
                        className={btnTonal}
                        onClick={() => patch({ rss: [...sub.rss, ''] })}
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
                            onChange={e => patch({ epRegex: e.target.value })}
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
                            onChange={e => patch({ epOffset: Number(e.target.value) || 0 })}
                        />
                    </div>
                </div>

                <EpisodePreview sub={sub} mikan={mikan} />
            </section>

            {footer !== undefined && (
                <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-md-outline/10 pt-5">
                    {footer}
                </div>
            )}
        </article>
    )
}

export default memo(SeriesCardInner)
