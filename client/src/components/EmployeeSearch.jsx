import { useState, useRef, useEffect } from 'react';
import { Search, Check, X } from 'lucide-react';
import { userService } from '../services';
import Avatar from './Avatar';

/**
 * Searchable employee selector for host selection in visitor invite form.
 * Returns selected employee object via onSelect.
 */
export default function EmployeeSearch({ value, onSelect, onClear, placeholder = 'Search employees...', error = false }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = (q) => {
    clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await userService.getUsers({ search: q, role: 'HOST', limit: 8 });
        setResults(res.data.data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handleSelect = (emp) => {
    onSelect(emp);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  if (value) {
    return (
      <div
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${error ? 'border-red-500' : ''}`}
        style={{ backgroundColor: 'var(--color-surface)', borderColor: error ? '#dc2626' : 'var(--color-border)' }}
      >
        <Avatar name={value.name} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{value.name}</div>
          <div className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{value.department} · {value.email}</div>
        </div>
        <button onClick={onClear} className="btn-ghost p-1 rounded" aria-label="Clear selection">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); search(e.target.value); setOpen(true); }}
          onFocus={() => { setOpen(true); if (query) search(query); }}
          placeholder={placeholder}
          className={`input pl-9 ${error ? 'input-error' : ''}`}
          aria-label={placeholder}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
        />
      </div>

      {open && (query || results.length > 0) && (
        <div
          className="absolute top-full left-0 right-0 mt-1 card shadow-lg z-20 overflow-hidden animate-fade-in"
          role="listbox"
        >
          {loading && (
            <div className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>Searching...</div>
          )}
          {!loading && results.length === 0 && query && (
            <div className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>No employees found for "{query}"</div>
          )}
          {results.map((emp) => (
            <button
              key={emp._id}
              onClick={() => handleSelect(emp)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--color-surface-2)] focus:bg-[var(--color-surface-2)]"
              role="option"
              aria-selected={value?._id === emp._id}
            >
              <Avatar name={emp.name} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{emp.name}</div>
                <div className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{emp.department} · {emp.email}</div>
              </div>
              {value?._id === emp._id && <Check size={14} style={{ color: 'var(--color-approved)' }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
