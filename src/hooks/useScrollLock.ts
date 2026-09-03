import { useEffect } from 'react'

// Shared across every mounted dialog: the body stays locked while the count is
// above zero and is restored once the last dialog unmounts, so opening a
// confirm on top of an editor cannot unlock the background early.
let locks = 0
let restore: (() => void) | null = null

const lock = () => {
    if (locks++ > 0) return
    const { body } = document
    const prevOverflow = body.style.overflow
    const prevPaddingRight = body.style.paddingRight
    // Hiding the scrollbar widens the viewport by its width; pad it back so the
    // page behind the scrim does not shift sideways.
    const scrollbar = window.innerWidth - document.documentElement.clientWidth
    body.style.overflow = 'hidden'
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`
    restore = () => {
        body.style.overflow = prevOverflow
        body.style.paddingRight = prevPaddingRight
    }
}

const unlock = () => {
    if (--locks > 0) return
    restore?.()
    restore = null
}

/**
 * Freezes background scrolling for as long as the calling modal is mounted.
 */
export function useScrollLock(): void {
    useEffect(() => {
        lock()
        return unlock
    }, [])
}
