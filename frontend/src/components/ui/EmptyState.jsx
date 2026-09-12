/** Friendly placeholder for "nothing here yet" and "no results". */
export function EmptyState({ icon: Icon, title, description, actions }) {
  return (
    <div className="empty">
      {Icon && (
        <div className="empty__icon">
          <Icon aria-hidden="true" />
        </div>
      )}
      <h2 className="empty__title">{title}</h2>
      {description && <p className="empty__text">{description}</p>}
      {actions && <div className="empty__actions">{actions}</div>}
    </div>
  );
}
