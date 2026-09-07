export function SkeletonBlock({ width, height, borderRadius, style, className = '' }) {
  return (
    <div
      className={`skeleton ${className}`}
      aria-hidden="true"
      style={{ width, height, borderRadius: borderRadius || 8, ...style }}
    />
  );
}

export function SkeletonText({ lines = 3, width }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton skeleton-text"
          style={{
            width: i === lines - 1 ? '60%' : (width || '100%'),
            marginBottom: i < lines - 1 ? 8 : 0
          }}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ stat }) {
  if (stat) {
    return (
      <div className="skeleton-card skeleton-stat" aria-hidden="true">
        <div className="skeleton skeleton-stat-icon" />
        <div className="skeleton-stat-content">
          <div className="skeleton skeleton-text-sm" style={{ width: '40%' }} />
          <div className="skeleton skeleton-text" style={{ width: '60%', height: 24, marginTop: 4 }} />
          <div className="skeleton skeleton-text-sm" style={{ width: '50%', marginTop: 4 }} />
        </div>
      </div>
    );
  }
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div className="skeleton skeleton-title" />
      <SkeletonText lines={2} />
    </div>
  );
}

export function SkeletonKpiGrid({ count = 8 }) {
  return (
    <div className="responsive-kpi-grid" role="status" aria-busy="true" aria-label="Loading data" style={{ marginBottom: 24 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card skeleton-kpi" aria-hidden="true">
          <div className="skeleton skeleton-kpi-value" />
          <div className="skeleton skeleton-kpi-label" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonStatGrid({ count = 6 }) {
  return (
    <div role="status" aria-busy="true" aria-label="Loading statistics" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14, marginBottom: 24 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} stat />
      ))}
    </div>
  );
}

export function SkeletonChartRow() {
  return (
    <div className="responsive-grid-2" role="status" aria-busy="true" aria-label="Loading charts" style={{ marginBottom: 24 }}>
      <div className="skeleton skeleton-chart" aria-hidden="true" />
      <div className="skeleton skeleton-chart" aria-hidden="true" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div className="skeleton-card" role="status" aria-busy="true" aria-label="Loading table" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="skeleton-table-row" aria-hidden="true" style={{ background: 'var(--bg-secondary, #f8fafc)' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 12 }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-table-row" aria-hidden="true">
          {Array.from({ length: 5 }).map((_, j) => (
            <div key={j} className="skeleton" style={{ height: 12, width: j === 0 ? '70%' : '90%' }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="animate-fade-in" role="status" aria-busy="true" aria-label="Loading dashboard">
      <div style={{ marginBottom: 24 }}>
        <div className="skeleton skeleton-title" aria-hidden="true" style={{ width: 200 }} />
        <div className="skeleton skeleton-text-sm" aria-hidden="true" style={{ width: 300, marginTop: 8 }} />
      </div>
      <SkeletonKpiGrid count={6} />
      <SkeletonStatGrid count={6} />
      <SkeletonChartRow />
    </div>
  );
}
