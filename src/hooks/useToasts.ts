import { useCallback, useRef, useState } from 'react'
import type { ToastItem } from '../components/Toasts'

/** Transient notifications render as top-right toasts; keep the newest 4. */
const MAX_TOASTS = 4

type PushToast = (tone: ToastItem['tone'], text: string) => void

export function useToasts(): { toasts: ToastItem[], pushToast: PushToast, dismissToast: (id: number) => void } {
    const [toasts, setToasts] = useState<ToastItem[]>([])
    const nextToastId = useRef(1)

    const pushToast = useCallback<PushToast>((tone, text) => {
        const id = nextToastId.current++
        setToasts(prev => [...prev.slice(-(MAX_TOASTS - 1)), { id, tone, text }])
    }, [])

    const dismissToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(toast => toast.id !== id))
    }, [])

    return { toasts, pushToast, dismissToast }
}
