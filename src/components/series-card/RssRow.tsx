import { MIKAN_BASE } from '../../lib/mikan'
import { btnIcon, inputFilled, type InputTone } from '../../lib/ui'

interface RssRowProps {
    url: string
    index: number
    tone: InputTone
    group: string | null
    hint: string | null
    onChange: (url: string) => void
    onMoveUp: () => void
    onRemove: () => void
}

/** One feed row: editable URL, a raise-priority control and a delete action. */
export default function RssRow({ url, index, tone, group, hint, onChange, onMoveUp, onRemove }: RssRowProps) {
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
