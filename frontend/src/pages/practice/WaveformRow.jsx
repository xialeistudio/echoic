export default function WaveformRow({ label, detail, containerRef, emptyState, actions }) {
  const hasActions = actions?.length > 0
  return (
    <div
      className="min-h-[72px] overflow-hidden rounded-lg border border-border/30 bg-muted/5"
      style={hasActions ? { display: 'grid', gridTemplateColumns: '1fr 36px' } : undefined}
    >
      <div className="min-w-0 px-3.5 py-2">
        <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
          <span>{detail ?? ''}</span>
          <span>{label ?? ''}</span>
        </div>
        <div className="relative h-[52px] overflow-hidden">
          {emptyState ?? <div ref={containerRef} className="h-full" />}
        </div>
      </div>
      {hasActions && (
        <div className="grid items-stretch border-l border-border/30" style={{ gridTemplateRows: `repeat(${actions.length}, 1fr)` }}>
          {actions.map((action, i) => (
            <div key={i} className="flex items-stretch">{action}</div>
          ))}
        </div>
      )}
    </div>
  )
}
