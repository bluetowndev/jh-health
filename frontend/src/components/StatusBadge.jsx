import MaterialIcon from './MaterialIcon';

const STATUS_CONFIG = {
  open: { label: 'Open', icon: 'radio_button_checked', color: 'var(--info)' },
  in_progress: { label: 'In Progress', icon: 'pending', color: 'var(--warning)' },
  resolved: { label: 'Resolved', icon: 'check_circle', color: 'var(--success)' },
  closed: { label: 'Closed', icon: 'check_circle_outline', color: 'var(--gray-500)' },
  low: { label: 'Low', icon: 'south', color: 'var(--gray-500)' },
  medium: { label: 'Medium', icon: 'drag_handle', color: 'var(--warning)' },
  high: { label: 'High', icon: 'north', color: 'var(--accent)' },
  critical: { label: 'Critical', icon: 'priority_high', color: 'var(--danger)' },
};

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || { label: status || 'Unknown', icon: 'help', color: 'var(--gray-500)' };
  return (
    <span className={`material-badge material-badge--${status}`} role="status" aria-label={`Status: ${config.label}`}>
      <MaterialIcon name={config.icon} size={14} color={config.color} filled />
      {config.label}
    </span>
  );
}
