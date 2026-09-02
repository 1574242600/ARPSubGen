interface HeroProps {
    imported: number
    ready: number
}

export default function Hero({ imported, ready }: HeroProps) {
    if (imported === 0) return null

    return (
        <section className="relative mb-8 overflow-hidden rounded-3xl bg-md-surface-container p-6 shadow-sm">
            {/* Organic blur shapes — signature Material You atmosphere */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                <div className="absolute -left-16 -top-16 h-48 w-48 rounded-full bg-md-primary/20 blur-3xl" />
                <div className="absolute -bottom-20 -right-10 h-52 w-52 rounded-full bg-md-secondary-container/70 blur-3xl" />
            </div>

            <div className="relative flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-md-primary px-4 py-2 text-sm font-medium text-md-on-primary shadow-sm">
                    已导入 {imported} 部剧集
                </span>
                <span className="rounded-full bg-md-tertiary px-4 py-2 text-sm font-medium text-md-on-tertiary shadow-sm">
                    {ready} 部就绪
                </span>
            </div>
        </section>
    )
}
