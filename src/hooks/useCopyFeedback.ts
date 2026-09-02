import { useCallback, useEffect, useRef, useState } from 'react'

const RESET_MS = 2000

/**
 * Clipboard write with a transient "copied" flag that clears itself after a
 * short delay; the timer is cleaned up on unmount.
 */
export function useCopyFeedback(): { copied: boolean, copy: (text: string) => Promise<void> } {
    const [copied, setCopied] = useState(false)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const copy = useCallback(async (text: string) => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        if (timerRef.current !== null) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => setCopied(false), RESET_MS)
    }, [])

    useEffect(() => () => {
        if (timerRef.current !== null) clearTimeout(timerRef.current)
    }, [])

    return { copied, copy }
}
