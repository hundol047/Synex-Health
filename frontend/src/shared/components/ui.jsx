import React from 'react';

export function Card({ title, action, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      {title && (
        <div className="card-title-row">
          <h2>{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatTile({ label, value, unit = '', delta, deltaLabel, deltaDirection }) {
  return (
    <div className="stat-tile">
      <div className="label">{label}</div>
      <div className="value">{value ?? '—'}{value != null ? unit : ''}</div>
      {delta != null && (
        <div className={`delta ${deltaDirection || (delta > 0 ? 'up' : delta < 0 ? 'down' : '')}`}>
          {delta > 0 ? '+' : ''}{delta}{unit} {deltaLabel || ''}
        </div>
      )}
    </div>
  );
}

export function Badge({ children, tone = 'blue' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function DemoBadge({ label = '데모 데이터' }) {
  return <Badge tone="demo">{label}</Badge>;
}

export function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="card-title-row">
          <h2>{title}</h2>
          <button className="btn btn-ghost" onClick={onClose} aria-label="닫기">닫기</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Skeleton({ height = 20, width = '100%', style }) {
  return <div className="skeleton" style={{ height, width, ...style }} />;
}

export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="empty-state">
      {icon}
      <h3>{title}</h3>
      {description && <p className="muted">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="error-state">
      <strong>문제가 발생했습니다</strong>
      <span>{message}</span>
      {onRetry && <button className="btn btn-secondary" onClick={onRetry} style={{ alignSelf: 'flex-start' }}>다시 시도</button>}
    </div>
  );
}

export function Disclaimer({ children }) {
  return <div className="disclaimer-box">{children}</div>;
}
