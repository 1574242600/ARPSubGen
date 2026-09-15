import { memo, useCallback, useMemo, type ReactNode } from 'react'
import type { MikanData, Subscription } from '../../lib/types'
import { UNTITLED } from '../../lib/config'
import { addFeed, raiseFeed, removeFeed } from '../../lib/feed'
import { parseMikanRss, resolveBangumi, resolveReleaseGroup } from '../../lib/mikan'
import { btnTonal, cardSurface } from '../../lib/ui'
import RssRow from './RssRow'
import MikanAdder from './MikanAdder'
import EpisodePreview from './EpisodePreview'
import FeedConfigInputs from './FeedConfigInputs'

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

    const { ids: mikanIds, bangumi } = useMemo(
        () => resolveBangumi(sub.rss, mikan),
        [sub.rss, mikan],
    )
    const conflicted = mikanIds.length > 1
    const mikanId = conflicted ? null : (mikanIds[0] ?? null)

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

            <section>
                <h4 className="mb-2 text-sm font-medium text-md-on-surface-variant">
                    RSS 订阅源{' '}
                    <span className="font-normal">（序号越小优先级越高；源 1 的集数配置即默认，其余源留空即继承）</span>
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
                                    config={<FeedConfigInputs sub={sub} index={index} patch={patch} />}
                                    onChange={next => patch({ rss: sub.rss.map((item, i) => (i === index ? next : item)) })}
                                    onMoveUp={() => patch(raiseFeed(sub, index))}
                                    onRemove={() => patch(removeFeed(sub, index))}
                                />
                            )
                        })}
                    </ul>
                )}

                <div className="flex flex-wrap items-center gap-3">
                    <MikanAdder mikan={mikan} current={bangumi} title={sub.title} onAdd={url => patch(addFeed(sub, url))} />
                    <button
                        type="button"
                        className={btnTonal}
                        onClick={() => patch(addFeed(sub, ''))}
                    >
                        自定义添加
                    </button>
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
