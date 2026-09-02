import { useCallback, useEffect, useState } from 'react'
import type { MikanData, SonarrSeries, Subscription } from '../../lib/types'
import { UNTITLED } from '../../lib/config'
import SeriesRow from './SeriesRow'
import AddSeriesDialog from './AddSeriesDialog'
import SeriesDialog from '../series-card/SeriesDialog'
import ConfirmDialog from '../ConfirmDialog'

interface SeriesListProps {
    subs: Subscription[]
    mikan: MikanData
    onUpdate: (tvdbId: number, patch: Partial<Subscription>) => void
    onRemove: (tvdbId: number) => void
    onAdd: (input: SonarrSeries) => void
}

/**
 * Read-only index of every subscription, one compact row each. Editing happens
 * exclusively in a dialog opened from a row's trailing edit button, so the
 * card markup never floods the page. Deleting asks for explicit confirmation.
 */
export default function SeriesList({ subs, mikan, onUpdate, onRemove, onAdd }: SeriesListProps) {
    const [editingId, setEditingId] = useState<number | null>(null)
    const [deletingId, setDeletingId] = useState<number | null>(null)
    const [adding, setAdding] = useState(false)
    const editing = editingId === null ? null : subs.find(sub => sub.tvdbId === editingId) ?? null
    const deleting = deletingId === null ? null : subs.find(sub => sub.tvdbId === deletingId) ?? null

    // Everything the user does after import lives in memory only, so reloading
    // or closing the tab would silently drop it. Guard the whole list session,
    // including open dialogs with uncommitted drafts.
    useEffect(() => {
        const onBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault()
            event.returnValue = ''
        }
        window.addEventListener('beforeunload', onBeforeUnload)
        return () => window.removeEventListener('beforeunload', onBeforeUnload)
    }, [])

    const openEditor = useCallback((tvdbId: number) => setEditingId(tvdbId), [])
    const closeEditor = useCallback(() => setEditingId(null), [])
    const requestDelete = useCallback((tvdbId: number) => setDeletingId(tvdbId), [])
    const cancelDelete = useCallback(() => setDeletingId(null), [])
    const openAdder = useCallback(() => setAdding(true), [])
    const closeAdder = useCallback(() => setAdding(false), [])

    const add = useCallback((input: SonarrSeries) => {
        onAdd(input)
        setAdding(false)
    }, [onAdd])

    const commit = useCallback((sub: Subscription) => {
        onUpdate(sub.tvdbId, sub)
        setEditingId(null)
    }, [onUpdate])

    const confirmDelete = useCallback(() => {
        if (deletingId === null) return
        onRemove(deletingId)
        if (deletingId === editingId) setEditingId(null)
        setDeletingId(null)
    }, [deletingId, editingId, onRemove])

    return (
        <section>
            <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-xl font-medium text-md-on-surface">已导入剧集</h2>
                <p className="text-xs text-md-on-surface-variant">点击行末按钮编辑或删除剧集</p>
            </header>
            <ul className="divide-y divide-md-outline/10 overflow-hidden rounded-3xl bg-md-surface-container shadow-sm">
                {subs.map(sub => (
                    <SeriesRow
                        key={sub.tvdbId}
                        sub={sub}
                        mikan={mikan}
                        onEdit={openEditor}
                        onDelete={requestDelete}
                    />
                ))}
            </ul>

            <button
                type="button"
                className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-md-outline/40 px-4 py-3 text-sm font-medium text-md-primary transition-colors duration-200 hover:border-md-primary hover:bg-md-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-md-primary focus-visible:ring-offset-2 active:scale-[0.99]"
                onClick={openAdder}
            >
                <span className="icon-[mdi--plus] text-2xl" aria-hidden="true" />
                新增剧集
            </button>

            {editing !== null && (
                <SeriesDialog
                    key={editing.tvdbId}
                    sub={editing}
                    mikan={mikan}
                    onSave={commit}
                    onClose={closeEditor}
                />
            )}

            {deleting !== null && (
                <ConfirmDialog
                    title={`删除「${deleting.title || UNTITLED}」？`}
                    body="该剧集及其 RSS 订阅配置将从列表中移除，如需恢复只能重新导入。"
                    onConfirm={confirmDelete}
                    onClose={cancelDelete}
                />
            )}

            {adding && (
                <AddSeriesDialog
                    existingIds={subs.map(sub => sub.tvdbId)}
                    onAdd={add}
                    onClose={closeAdder}
                />
            )}
        </section>
    )
}
