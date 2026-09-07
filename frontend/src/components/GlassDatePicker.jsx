import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import MaterialIcon from './MaterialIcon';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function daysIn(y, m) { return new Date(y, m + 1, 0).getDate(); }
function firstDay(y, m) { return new Date(y, m, 1).getDay(); }
function toISO(y, m, d) { return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`; }
function fmtDisplay(v) {
  if (!v) return '';
  const p = v.split('-').map(Number);
  return `${String(p[2]).padStart(2, '0')} ${MONTHS[p[1] - 1].slice(0, 3)} ${p[0]}`;
}
function parseVal(v) {
  if (!v) return null;
  const p = v.split('-').map(Number);
  return { y: p[0], m: p[1] - 1, d: p[2] };
}
function getPos(el) {
  if (!el) return { top: 0, left: 0, width: 0 };
  const r = el.getBoundingClientRect();
  return { top: r.bottom + window.scrollY + 6, left: r.left + window.scrollX, width: r.width };
}

export default function GlassDatePicker({
  value = '',
  onChange,
  disabled = false,
  className = '',
  style,
  id,
  'aria-label': ariaLabel,
  placeholder = 'Select date',
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const portalRef = useRef(null);

  const sel = parseVal(value);
  const now = new Date();
  const [py, setPy] = useState(sel ? sel.y : now.getFullYear());
  const [pm, setPm] = useState(sel ? sel.m : now.getMonth());

  const syncPanel = useCallback(() => {
    const s = parseVal(value);
    if (s) { setPy(s.y); setPm(s.m); }
    else { const n = new Date(); setPy(n.getFullYear()); setPm(n.getMonth()); }
  }, [value]);

  useEffect(() => {
    if (!open) return;
    setPos(getPos(triggerRef.current));
    syncPanel();
  }, [open, syncPanel]);

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

  const days = useMemo(() => {
    const count = daysIn(py, pm);
    const offset = firstDay(py, pm);
    const arr = [];
    for (let i = 0; i < offset; i++) arr.push(null);
    for (let d = 1; d <= count; d++) arr.push(d);
    return arr;
  }, [py, pm]);

  const today = { y: now.getFullYear(), m: now.getMonth(), d: now.getDate() };

  const pick = (d) => {
    const val = toISO(py, pm, d);
    setOpen(false);
    requestAnimationFrame(() => onChange?.(val));
  };
  const prev = (e) => { e.stopPropagation(); if (pm === 0) { setPm(11); setPy(y => y - 1); } else setPm(m => m - 1); };
  const next = (e) => { e.stopPropagation(); if (pm === 11) { setPm(0); setPy(y => y + 1); } else setPm(m => m + 1); };
  const goToday = (e) => { e.stopPropagation(); const val = toISO(today.y, today.m, today.d); setOpen(false); requestAnimationFrame(() => onChange?.(val)); };
  const clear = (e) => { e.stopPropagation(); e.preventDefault(); setOpen(false); requestAnimationFrame(() => onChange?.('')); };

  const dropdown = open ? ReactDOM.createPortal(
    <div ref={portalRef} className="gdp-calendar"
      style={{ position: 'absolute', top: pos.top, left: pos.left, width: Math.max(pos.width, 290), zIndex: 9999 }}>
      <div className="gdp-cal-head">
        <button type="button" className="gdp-cal-nav" onMouseDown={prev}><MaterialIcon name="chevron_left" size={20} /></button>
        <span className="gdp-cal-title">{MONTHS[pm]} {py}</span>
        <button type="button" className="gdp-cal-nav" onMouseDown={next}><MaterialIcon name="chevron_right" size={20} /></button>
      </div>
      <div className="gdp-cal-weekdays">
        {DAYS.map(d => <div key={d} className="gdp-cal-wd">{d}</div>)}
      </div>
      <div className="gdp-cal-grid">
        {days.map((d, i) => {
          if (d === null) return <div key={`e${i}`} className="gdp-cal-day gdp-cal-day--empty" />;
          const isT = d === today.d && pm === today.m && py === today.y;
          const isS = sel && d === sel.d && pm === sel.m && py === sel.y;
          return (
            <button key={d} type="button"
              className={`gdp-cal-day${isT ? ' gdp-cal-day--today' : ''}${isS ? ' gdp-cal-day--sel' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); pick(d); }}>
              {d}
            </button>
          );
        })}
      </div>
      <div className="gdp-cal-foot">
        <button type="button" className="gdp-cal-today" onMouseDown={goToday}>Today</button>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div ref={wrapRef} className={`glass-datepicker-wrap${disabled ? ' glass-datepicker-wrap--disabled' : ''}${open ? ' glass-datepicker-wrap--open' : ''} ${className || ''}`} style={style} id={id}>
      <button ref={triggerRef} type="button" className="glass-select-trigger"
        onClick={() => !disabled && setOpen(o => !o)} disabled={disabled}
        aria-haspopup="dialog" aria-expanded={open} aria-label={ariaLabel}
        tabIndex={disabled ? -1 : 0}>
        <span className="gs-icon-left" style={{ flexShrink: 0, width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}><MaterialIcon name="calendar_today" size={18} /></span>
        <span className={`glass-select-text${!value ? ' glass-select-text--placeholder' : ''}`}>
          {value ? fmtDisplay(value) : placeholder}
        </span>
        {value && !disabled && (
          <span className="gdp-clear-btn" onMouseDown={clear} role="button" tabIndex={0}>
            <MaterialIcon name="close" size={14} />
          </span>
        )}
        <span className="gs-icon-right" style={{ flexShrink: 0, width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 12 }}><MaterialIcon name="expand_more" size={18} /></span>
      </button>
      {dropdown}
    </div>
  );
}
