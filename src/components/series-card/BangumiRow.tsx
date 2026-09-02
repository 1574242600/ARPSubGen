import type { MikanData, MikanSeries } from '../../lib/types'
import GroupChips from './GroupChips'

interface BangumiRowProps {
    item: MikanSeries
    mikan: MikanData
    expanded: boolean
    recommend: boolean
    onToggle: () => void
    onPick: (bangumiId: number, groupId: number) => void
}

/** One catalogue row in the picker: title (+ optional 推荐 badge), expandable to groups. */
export default function BangumiRow({ item, mikan, expanded, recommend, onToggle, onPick }: BangumiRowProps) {
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
