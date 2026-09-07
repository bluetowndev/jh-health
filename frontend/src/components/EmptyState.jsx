import MaterialIcon from './MaterialIcon';

export default function EmptyState({ icon = 'inbox', title, description, action }) {
  return (
    <div className="empty-state-modern animate-fade-in">
      <div className="empty-state-icon">
        <MaterialIcon name={icon} size={48} color="var(--gray-300)" />
      </div>
      <div className="empty-state-title">{title}</div>
      {description && <div className="empty-state-desc">{description}</div>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}
