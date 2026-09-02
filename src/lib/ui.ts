/**
 * Material You component primitives, kept in one place so state layers,
 * easing and focus rings stay consistent across the app.
 */
const btnBase = [
    'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full',
    'text-sm font-medium tracking-[0.01em]',
    'transition-all duration-300 ease-md',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-md-primary focus-visible:ring-offset-2',
    'active:scale-95',
    'disabled:pointer-events-none disabled:opacity-50',
].join(' ')

export const btnFilled = `${btnBase} h-10 px-6 text-md-on-primary bg-md-primary shadow-sm hover:bg-md-primary/90 hover:shadow-md active:bg-md-primary/80`

export const btnTonal = `${btnBase} h-10 px-6 text-md-on-secondary-container bg-md-secondary-container hover:bg-md-secondary-container/90 active:bg-md-secondary-container/80`

export const btnGhost = `${btnBase} h-10 px-4 text-md-primary hover:bg-md-primary/10 active:bg-md-primary/5`

/** Destructive filled action (deletes, clears…), MD3 error-container look. */
export const btnError = `${btnBase} h-10 px-6 text-md-on-error bg-md-error shadow-sm hover:bg-md-error/90 hover:shadow-md active:bg-md-error/80`

/*
 * Icon-only buttons (MD3 icon-button spec: 40px). Sizes are separate exports
 * rather than appended classes: two `h-*` / `w-*` utilities on one element
 * resolve by stylesheet order, not by class order.
 */
const btnIconBase = `${btnBase} rounded-full px-0 text-md-on-surface-variant hover:bg-md-on-surface/10 hover:text-md-on-surface`

export const btnIcon = `${btnIconBase} h-10 w-10`

/* Selectable pill chips: idle is outlined, active is filled. */
export const chipIdle = 'rounded-full border border-md-outline px-3 py-1 text-xs text-md-primary transition-colors duration-200 hover:bg-md-primary/10'

export const chipActive = 'rounded-full bg-md-primary px-3 py-1 text-xs text-md-on-primary'

export type InputTone = 'default' | 'warning' | 'error'

const inputBase = [
    'w-full rounded-t-xl rounded-b-none border-b-2',
    'bg-md-surface-container-low px-4 text-md-on-background',
    'placeholder:text-md-on-background/50',
    'transition-colors duration-200',
    'focus:outline-none',
].join(' ')

const inputTone: Record<InputTone, string> = {
    default: 'border-md-outline hover:border-md-on-surface-variant/70 focus:border-md-primary',
    warning: 'border-amber-500 hover:border-amber-600 focus:border-amber-600',
    error: 'border-md-error hover:border-md-error focus:border-md-error',
}

/** Underlined text field; `tone` marks validation state through the bottom rule. */
export function inputFilled(tone: InputTone = 'default'): string {
    return `${inputBase} ${inputTone[tone]} h-14`
}

export function textareaFilled(tone: InputTone = 'default'): string {
    return `${inputBase} ${inputTone[tone]} min-h-32 resize-y py-3 font-mono text-sm leading-relaxed`
}

export const cardSurface = [
    'rounded-3xl bg-md-surface-container p-6 md:p-8',
    'shadow-sm transition-all duration-300 ease-md',
].join(' ')
