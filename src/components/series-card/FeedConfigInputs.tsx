import type { Subscription } from '../../lib/types'
import { DEFAULT_EP_OFFSET, DEFAULT_EP_REGEX, resolveEpOffset, resolveEpRegex, setFeedEpOffset, setFeedEpRegex } from '../../lib/feed'
import { isValidEpisodeRegex } from '../../lib/episode'
import { inputCompact } from '../../lib/ui'

interface FeedConfigInputsProps {
    sub: Subscription
    /** Feed whose config is edited; it is the default one when 0. */
    index: number
    patch: (p: Partial<Subscription>) => void
}

/**
 * Episode regex and offset of one feed, rendered inside its RSS row. Feed 1
 * (index 0) holds the default the patch falls back to, so its fields are what
 * every other feed inherits: clearing a lower feed's field puts it back on that
 * default, which is also what its placeholder shows. Laid out as a grid rather
 * than a wrapping row so the two fields always share one line.
 */
export default function FeedConfigInputs({ sub, index, patch }: FeedConfigInputsProps) {
    const isDefault = index === 0
    const regex = sub.epRegex[index] ?? ''
    const offset = sub.epOffset[index]
    const regexInvalid = regex !== '' && !isValidEpisodeRegex(regex)
    const label = `第 ${index + 1} 条订阅源`

    return (
        <div className="mt-2 space-y-1">
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_5.5rem] items-center gap-x-2">
                <label htmlFor={`${sub.tvdbId}-feed-${index}-regex`} className="text-xs text-md-on-surface-variant">
                    正则
                </label>
                <input
                    id={`${sub.tvdbId}-feed-${index}-regex`}
                    type="text"
                    className={inputCompact(regexInvalid ? 'error' : 'default')}
                    value={regex}
                    spellCheck={false}
                    placeholder={isDefault ? DEFAULT_EP_REGEX : resolveEpRegex(sub, 0)}
                    aria-label={`${label}的集数正则`}
                    onChange={e => patch(setFeedEpRegex(sub, index, e.target.value))}
                />
                <label htmlFor={`${sub.tvdbId}-feed-${index}-offset`} className="text-xs text-md-on-surface-variant">
                    偏移
                </label>
                <input
                    id={`${sub.tvdbId}-feed-${index}-offset`}
                    type="number"
                    className={inputCompact()}
                    value={offset === undefined ? '' : String(offset)}
                    placeholder={String(isDefault ? DEFAULT_EP_OFFSET : resolveEpOffset(sub, 0))}
                    aria-label={`${label}的集数偏移`}
                    onChange={e => patch(setFeedEpOffset(sub, index, e.target.value.trim() === '' ? null : Number(e.target.value)))}
                />
            </div>
            {regexInvalid && <p className="text-xs text-md-error">正则表达式无效</p>}
        </div>
    )
}
