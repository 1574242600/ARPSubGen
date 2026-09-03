import { useMemo, useState } from 'react'
import type { SonarrSeries } from '../../lib/types'
import { btnFilled, btnGhost, cardSurface, inputFilled } from '../../lib/ui'
import { useScrollLock } from '../../hooks/useScrollLock'

interface AddSeriesDialogProps {
    /** tvdbIds already in the list, to reject duplicates. */
    existingIds: number[]
    onAdd: (input: SonarrSeries) => void
    onClose: () => void
}

/**
 * Manual entry of a bare subscription: title (optional), TVDB id and season.
 * The TVDB id must be a positive integer and unique; defaults apply to the
 * remaining subscription fields once added.
 */
export default function AddSeriesDialog({ existingIds, onAdd, onClose }: AddSeriesDialogProps) {
    const [title, setTitle] = useState('')
    const [tvdbId, setTvdbId] = useState('')
    const [season, setSeason] = useState('1')

    useScrollLock()

    const tvdb = Number(tvdbId)
    const seasonNum = Number(season)
    const duplicate = Number.isInteger(tvdb) && tvdb > 0 && existingIds.includes(tvdb)

    const tvdbError = useMemo(() => {
        if (tvdbId !== '' && !(Number.isInteger(tvdb) && tvdb > 0)) return '请输入有效的 TVDB Id'
        if (duplicate) return '该 TVDB Id 已存在'
        return null
    }, [tvdb, tvdbId, duplicate])

    const seasonError = season !== '' && !(Number.isInteger(seasonNum) && seasonNum >= 0)
        ? '季数需为不小于 0 的整数'
        : null

    const canAdd = tvdbError === null && seasonError === null && tvdbId !== '' && season !== ''

    const add = () => {
        if (!canAdd) return
        onAdd({ tvdbId: tvdb, season: seasonNum, title: title.trim() })
        onClose()
    }

    return (
        <div className="fixed inset-0 z-40 overflow-y-auto overscroll-contain bg-md-on-background/40 backdrop-blur-sm">
            <div className="flex min-h-full items-center justify-center p-4">
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="新增节目"
                    className={`${cardSurface} w-full max-w-md animate-toast-in`}
                >
                    <h3 className="mb-5 text-xl font-medium text-md-on-surface">新增节目</h3>

                    <div>
                        <label htmlFor="add-title" className="mb-1.5 block text-sm font-medium text-md-on-surface">
                            标题 <span className="font-normal text-md-on-surface-variant">（可选）</span>
                        </label>
                        <input
                            id="add-title"
                            type="text"
                            className={inputFilled()}
                            placeholder="节目标题，留空显示 未提供标题"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="add-tvdb" className="mb-1.5 block text-sm font-medium text-md-on-surface">
                                TVDB Id
                            </label>
                            <input
                                id="add-tvdb"
                                type="text"
                                inputMode="numeric"
                                className={inputFilled(tvdbError ? 'error' : 'default')}
                                placeholder="如 371310"
                                autoFocus
                                value={tvdbId}
                                onChange={e => setTvdbId(e.target.value)}
                            />
                            {tvdbError !== null && (
                                <p className="mt-1 text-xs text-md-error">{tvdbError}</p>
                            )}
                        </div>
                        <div>
                            <label htmlFor="add-season" className="mb-1.5 block text-sm font-medium text-md-on-surface">
                                季数
                            </label>
                            <input
                                id="add-season"
                                type="text"
                                inputMode="numeric"
                                className={inputFilled(seasonError ? 'error' : 'default')}
                                value={season}
                                onChange={e => setSeason(e.target.value)}
                            />
                            {seasonError !== null && (
                                <p className="mt-1 text-xs text-md-error">{seasonError}</p>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
                        <button type="button" className={btnGhost} onClick={onClose}>
                            取消
                        </button>
                        <button type="button" className={btnFilled} disabled={!canAdd} onClick={add}>
                            新增
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
