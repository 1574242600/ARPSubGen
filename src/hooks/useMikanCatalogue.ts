import { useEffect, useState } from 'react'
import type { MikanData } from '../lib/types'

export interface MikanCatalogueState {
    mikan: MikanData | null
    error: string | null
    isLoading: boolean
}

/** Fetches the build-time catalogue once; aborts on unmount (StrictMode-safe). */
export function useMikanCatalogue(): MikanCatalogueState {
    const [mikan, setMikan] = useState<MikanData | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const controller = new AbortController()
        fetch('/mikan.json', { signal: controller.signal })
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                return res.json() as Promise<MikanData>
            })
            .then(setMikan)
            .catch(err => {
                if (err instanceof Error && err.name === 'AbortError') return
                setError(`蜜柑数据加载失败：${String(err)}`)
            })
        return () => controller.abort()
    }, [])

    return { mikan, error, isLoading: mikan === null && error === null }
}
