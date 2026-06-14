import React from 'react';

export const PageHeader = ({ title, subtitle, actions, compact = false }) => (
  <div className={`flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 ${compact ? '' : ''}`}>
    <div className="min-w-0">
      <h1 className="page-title">{title}</h1>
      {subtitle && (
        typeof subtitle === 'string'
          ? <p className="page-subtitle">{subtitle}</p>
          : <div className="page-subtitle">{subtitle}</div>
      )}
    </div>
    {actions && <div className="toolbar-row">{actions}</div>}
  </div>
);

export const PageLoader = ({ className = 'py-24' }) => (
  <div className={`flex items-center justify-center ${className}`} role="status" aria-label="Loading">
    <div className="spinner h-9 w-9" />
  </div>
);

export const ProgressBar = ({ value = 0, max = 100, label }) => {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="space-y-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      {label && <p className="text-xs text-app-secondary">{label}</p>}
      <div className="progress-bar">
        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="empty-state" role="status">
    {Icon && (
      <div className="empty-state-icon-wrap" aria-hidden="true">
        <Icon className="empty-state-icon" />
      </div>
    )}
    <h3 className="empty-state-title">{title}</h3>
    {description && <p className="empty-state-desc">{description}</p>}
    {action && <div className="mt-6">{action}</div>}
  </div>
);

export const SkeletonCard = () => (
  <div className="surface-card space-y-4">
    <div className="skeleton h-3 w-28" />
    <div className="skeleton h-9 w-20" />
  </div>
);

export const SkeletonTable = ({ rows = 6, cols = 4 }) => (
  <div className="table-wrap">
    <div className="table-scroll p-4 space-y-3">
      <div className="flex gap-4 mb-2">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="skeleton h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className={`skeleton h-9 ${j === 0 ? 'flex-[2]' : 'flex-1'}`} />
          ))}
        </div>
      ))}
    </div>
  </div>
);

export const PageSkeleton = ({ cards = 4, table = true }) => (
  <div className="page-shell">
    <div className="space-y-3">
      <div className="skeleton h-8 w-64" />
      <div className="skeleton h-4 w-96 max-w-full" />
    </div>
    {cards > 0 && (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {Array.from({ length: cards }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )}
    {table && <SkeletonTable />}
  </div>
);

export const getRoleBadgeClass = () => 'badge';
