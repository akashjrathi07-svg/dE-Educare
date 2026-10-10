// Shown instantly while a page's data loads, so navigation never feels stuck.
export default function Loading() {
  return (
    <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties} aria-busy="true" aria-label="Loading">
      <div className="skel" style={{ height: 34, width: '40%' }} />
      <div className="grid" style={{ '--min': '180px' } as React.CSSProperties}>
        {[0, 1, 2, 3].map(i => <div key={i} className="skel" style={{ height: 110 }} />)}
      </div>
      <div className="skel" style={{ height: 220 }} />
    </div>
  );
}
