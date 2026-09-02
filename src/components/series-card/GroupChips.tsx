import type { MikanData, MikanSeries } from '../../lib/types'
import { chipIdle } from '../../lib/ui'

interface GroupChipsProps {
    series: MikanSeries
    mikan: MikanData
    onAdd: (bangumiId: number, groupId: number) => void
}

/** Clickable chips, one per release group; each adds that group's feed. */
export default function GroupChips({ series, mikan, onAdd }: GroupChipsProps) {
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
