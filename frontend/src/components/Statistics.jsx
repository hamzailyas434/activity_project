function Statistics({ statistics, year, month }) {
  if (!statistics || statistics.length === 0) {
    return null;
  }

  const getDaysInMonth = (year, month) => {
    return new Date(year, month, 0).getDate();
  };

  const totalDays = getDaysInMonth(year, month);

  const calculatePercentage = (completed) => {
    return totalDays > 0 ? Math.round((completed / totalDays) * 100) : 0;
  };

  return (
    <div className="statistics fade-in">
      <h2>📈 Monthly Statistics</h2>
      <div className="stats-grid">
        {statistics.map(stat => {
          const percentage = calculatePercentage(stat.completed_count);
          
          return (
            <div key={stat.id} className="stat-card">
              <h3>{stat.name}</h3>
              <div className="stat-value">{stat.completed_count}</div>
              <div className="stat-label">
                out of {totalDays} days ({percentage}%)
              </div>
              <div className="stat-progress">
                <div 
                  className="stat-progress-bar" 
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              {stat.last_completed && (
                <div className="stat-label" style={{ marginTop: '0.5rem' }}>
                  Last: {new Date(stat.last_completed).toLocaleDateString()}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Statistics;
