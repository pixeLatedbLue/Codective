'use client';

export default function AnalysisSkeleton() {
  const shimmer = {
    background: 'linear-gradient(90deg, var(--bg-card) 25%, var(--bg-elevated) 50%, var(--bg-card) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.4s infinite',
    borderRadius: '8px',
  } as React.CSSProperties;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      {/* Top row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {[0, 1, 2].map(i => (
          <div key={i} className="card" style={{ padding: '28px', height: '220px' }}>
            <div style={{ ...shimmer, height: 14, width: '60%', marginBottom: '24px' }} />
            {i === 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '8px' }}>
                <div style={{ ...shimmer, width: 136, height: 136, borderRadius: '50%' }} />
              </div>
            )}
            {i === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ ...shimmer, height: 36, width: '55%' }} />
                <div style={{ ...shimmer, height: 14, width: '90%' }} />
                <div style={{ ...shimmer, height: 14, width: '75%' }} />
              </div>
            )}
            {i === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[80, 65, 90, 70].map((w, j) => (
                  <div key={j} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ ...shimmer, height: 12, width: `${w}%` }} />
                    <div style={{ ...shimmer, height: 6, width: '100%' }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Metrics grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card-elevated" style={{ padding: '16px', height: '90px' }}>
            <div style={{ ...shimmer, height: 11, width: '70%', marginBottom: '12px' }} />
            <div style={{ ...shimmer, height: 28, width: '45%' }} />
          </div>
        ))}
      </div>

      {/* Insights */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ ...shimmer, height: 80, borderRadius: '10px' }} />
        ))}
      </div>
    </div>
  );
}
