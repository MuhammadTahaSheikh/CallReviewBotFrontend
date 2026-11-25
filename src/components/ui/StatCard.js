export default function StatCard({ label, value, hint, icon: Icon }) {
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <span className="stat-label">{label}</span>
        {Icon ? (
          <span className="stat-icon" aria-hidden="true">
            <Icon size={18} strokeWidth={1.75} />
          </span>
        ) : null}
      </div>
      <div className="stat-value">{value}</div>
      {hint ? <div className="stat-hint">{hint}</div> : null}
    </div>
  );
}
