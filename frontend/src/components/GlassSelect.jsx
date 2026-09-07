import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import MaterialIcon from './MaterialIcon';

function getPos(el) {
  if (!el) return { top: 0, left: 0, width: 0 };
  const r = el.getBoundingClientRect();
  return { top: r.bottom + window.scrollY + 4, left: r.left + window.scrollX, width: r.width };
}

export default function GlassSelect({
  value = '',
  onChange,
  options = [],
  placeholder = 'Select...',
  disabled = false,
  className = '',
  style,
  id,
  'aria-label': ariaLabel,
  icon,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [hl, setHl] = useState(-1);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const portalRef = useRef(null);
  const searchRef = useRef(null);

  const opts = useMemo(() => options.map(o => typeof o === 'string' ? { value: o, label: o } : o), [options]);
  const filtered = useMemo(() => {
    if (!search) return opts;
    const q = search.toLowerCase();
    return opts.filter(o => o.label.toLowerCase().includes(q));
  }, [opts, search]);
  const selected = useMemo(() => opts.find(o => o.value === value), [opts, value]);

  useEffect(() => {
    if (!open) return;
    setPos(getPos(triggerRef.current));
    setSearch('');
    setHl(-1);
    if (filtered.length <= 8 && searchRef.current) searchRef.current.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapRef.current?.contains(e.target)) return;
      if (portalRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler, true);
    return () => document.removeEventListener('mousedown', handler, true);
  }, [open]);

  useEffect(() => {
    if (!open || hl < 0) return;
    const el = portalRef.current?.querySelector(`[data-idx="${hl}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [open, hl]);

  const handleKey = (e) => {
    if (disabled) return;
    if (!open) {
      if (['Enter', ' ', 'ArrowDown'].includes(e.key)) { e.preventDefault(); setOpen(true); }
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHl(i => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHl(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (hl >= 0 && filtered[hl]) { pick(filtered[hl].value); }
    }
    else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
  };

  const pick = (val) => {
    setOpen(false);
    requestAnimationFrame(() => onChange?.(val));
  };

  const dropdown = open ? ReactDOM.createPortal(
    <div ref={portalRef} className="glass-select-dropdown"
      style={{ position: 'absolute', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}>
      {opts.length > 8 && (
        <div className="glass-select-search-wrap">
          <MaterialIcon name="search" size={16} className="glass-select-search-icon" />
          <input ref={searchRef} type="text" className="glass-select-search"
            placeholder="Search..." value={search}
            onChange={e => { setSearch(e.target.value); setHl(0); }}
            onKeyDown={handleKey} />
        </div>
      )}
      {opts.length <= 8 && <div style={{ height: 0 }} />}
      <div className="glass-select-options">
        {filtered.length === 0 ? (
          <div className="glass-select-empty">No options found</div>
        ) : filtered.map((opt, i) => (
          <div key={opt.value} data-idx={i}
            className={`glass-select-option${opt.value === value ? ' glass-select-option--selected' : ''}${i === hl ? ' glass-select-option--highlight' : ''}`}
            role="option" aria-selected={opt.value === value}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); pick(opt.value); }}
            onMouseEnter={() => setHl(i)}>
            {opt.value === value && <span className="gs-icon-left" style={{ flexShrink: 0, width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}><MaterialIcon name="check" size={16} /></span>}
            <span className="glass-select-text">{opt.label}</span>
          </div>
        ))}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div ref={wrapRef}
      className={`glass-select-wrap${disabled ? ' glass-select-wrap--disabled' : ''}${open ? ' glass-select-wrap--open' : ''} ${className || ''}`}
      style={style} id={id}>
      <button ref={triggerRef} type="button" className="glass-select-trigger"
        onClick={() => !disabled && setOpen(o => !o)} onKeyDown={handleKey}
        disabled={disabled} aria-haspopup="listbox" aria-expanded={open}
        aria-label={ariaLabel} tabIndex={disabled ? -1 : 0}>
        {icon && <span className="gs-icon-left" style={{ flexShrink: 0, width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}><MaterialIcon name={icon} size={18} /></span>}
        <span className={`glass-select-text${!selected ? ' glass-select-text--placeholder' : ''}`}>
          {selected?.label || placeholder}
        </span>
        <span className="gs-icon-right" style={{ flexShrink: 0, width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 12 }}><MaterialIcon name="expand_more" size={18} /></span>
      </button>
      {dropdown}
    </div>
  );
}
