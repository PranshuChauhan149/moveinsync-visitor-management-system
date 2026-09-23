import { AlertTriangle, RefreshCw } from 'lucide-react';

// EmptyState — shown when no data matches filters
export function EmptyState({ title = 'No results found', description, action, actionLabel = 'Clear filters', icon: Icon }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
        style={{ backgroundColor: 'var(--color-surface-2)' }}
      >
        {Icon ? <Icon size={24} style={{ color: 'var(--color-text-muted)' }} /> : (
          <div className="text-2xl">🔍</div>
        )}
      </div>
      <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>{title}</h3>
      {description && <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>{description}</p>}
      {action && (
        <button onClick={action} className="btn btn-secondary btn-sm">{actionLabel}</button>
      )}
    </div>
  );
}

// ErrorState — shown when an API call fails
export function ErrorState({ message = "We couldn't load the data.", onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-red-50">
        <AlertTriangle size={24} className="text-red-500" />
      </div>
      <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>Something went wrong</h3>
      <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn btn-secondary btn-sm gap-2">
          <RefreshCw size={14} />
          Try again
        </button>
      )}
    </div>
  );
}
