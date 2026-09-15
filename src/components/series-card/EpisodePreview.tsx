import { useMemo } from 'react'
import type { MikanData, Subscription } from '../../lib/types'
import { episodePreviewGroups, parseEpisode } from '../../lib/episode'
import { resolveEpOffset, resolveEpRegex } from '../../lib/feed'

interface EpisodePreviewProps {
    sub: Subscription
    mikan: MikanData
}

/**
 * Checks the episode parser against the latest titles of the Mikan release
 * groups the RSS list references, grouped per group, so a bad epRegex or a
 * wrongly ordered priority shows up before export. Each group parses with the
 * config of the feed it came from, which is labelled per group - two groups
 * only differ when their feeds were configured differently.
 */
export default function EpisodePreview({ sub, mikan }: EpisodePreviewProps) {
    const groups = useMemo(() => episodePreviewGroups(sub.rss, mikan), [sub.rss, mikan])

    // Parsed rows only depend on the groups plus the per-feed config; memoising
    // here keeps unrelated re-renders from re-running every parseEpisode.
    const parsedGroups = useMemo(
        () => groups.map(group => ({
            key: group.key,
            name: group.name,
            feedIndex: group.feedIndex,
            rows: group.titles.map(title => ({
                title,
                episode: parseEpisode(title, resolveEpRegex(sub, group.feedIndex), resolveEpOffset(sub, group.feedIndex)),
            })),
        })),
        [groups, sub],
    )

    if (parsedGroups.length === 0) {
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
                {parsedGroups.map(group => (
                    <div key={group.key}>
                        <p className="mb-1.5 flex items-center gap-2 text-xs font-medium text-md-on-surface-variant">
                            <span className="truncate">{group.name}</span>
                            <span className="shrink-0 rounded-full bg-md-surface-container-low px-2 py-0.5 font-normal">
                                源 {group.feedIndex + 1}
                            </span>
                        </p>
                        <ul className="space-y-2">
                            {group.rows.map(row => (
                                <li key={row.title} className="flex items-center gap-3 text-sm">
                                    <span className={[
                                        'flex h-7 shrink-0 items-center justify-center rounded-full px-3 text-xs font-medium',
                                        row.episode !== null
                                            ? 'bg-md-secondary-container text-md-on-secondary-container'
                                            : 'bg-md-tertiary/10 text-md-tertiary',
                                    ].join(' ')}>
                                        {row.episode !== null ? `第 ${row.episode} 集` : '未匹配'}
                                    </span>
                                    <span className="truncate text-md-on-surface-variant">{row.title}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    )
}
