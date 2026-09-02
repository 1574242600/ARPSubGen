import { memo } from 'react'
import type { MikanData, Subscription } from '../../lib/types'
import { subscriptionIssues, UNTITLED } from '../../lib/config'
import { resolveBangumi } from '../../lib/mikan'
import { btnIcon } from '../../lib/ui'

interface SeriesRowProps {
    sub: Subscription
    mikan: MikanData
    onEdit: (tvdbId: number) => void
    onDelete: (tvdbId: number) => void
}

/** One subscription as a compact list line; edit opens the card in a dialog. */
function SeriesRowInner({ sub, mikan, onEdit, onDelete }: SeriesRowProps) {
    const { ids: mikanIds, bangumi } = resolveBangumi(sub.rss, mikan)
    const conflicted = mikanIds.length > 1
    const mikanId = conflicted ? null : (mikanIds[0] ?? null)
    const ready = sub.rss.length > 0
    const label = sub.title || UNTITLED
    const metaChip = 'rounded-full bg-md-surface-container-low px-3 py-1 text-xs text-md-on-surface-variant'
    const issues = subscriptionIssues(sub)

    return (
        <li>
            <div className="flex items-center gap-3 px-5 py-3 transition-colors duration-200 hover:bg-md-primary/5">
                <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-medium text-md-on-surface" title={sub.title || undefined}>
                        {label}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className={metaChip}>TVDB {sub.tvdbId}</span>
                        <span className={metaChip}>第 {sub.season} 季</span>
                        <span className={metaChip}>{sub.rss.length} 条 RSS</span>
                        {!conflicted && mikanId !== null && (
                            <span
                                className="max-w-full truncate rounded-full bg-md-secondary-container px-3 py-1 text-xs font-medium text-md-on-secondary-container"
                                title={bangumi?.title}
                            >
                                {bangumi ? `Mikan ${mikanId}: ${bangumi.title}` : `Mikan ${mikanId}`}
                            </span>
                        )}
                    </div>
                    {issues.length > 0 && (
                        <p className="mt-1 text-xs font-medium text-md-error">{issues.join('；')}</p>
                    )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <span
                        className={[
                            'rounded-full px-3 py-1 text-xs font-medium',
                            ready
                                ? 'bg-md-secondary-container text-md-on-secondary-container'
                                : 'bg-md-surface-container-low text-md-on-surface-variant',
                        ].join(' ')}
                    >
                        {ready ? '就绪' : '待配置'}
                    </span>
                    <button
                        type="button"
                        className={btnIcon}
                        aria-label={`编辑 ${label}`}
                        title="编辑 RSS 与集数解析"
                        onClick={() => onEdit(sub.tvdbId)}
                    >
                        <span className="icon-[mdi--pencil] text-2xl" aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        className={btnIcon}
                        aria-label={`删除 ${label}`}
                        title="删除此剧集"
                        onClick={() => onDelete(sub.tvdbId)}
                    >
                        <span className="icon-[mdi--delete] text-2xl" aria-hidden="true" />
                    </button>
                </div>
            </div>
        </li>
    )
}

export default memo(SeriesRowInner)
