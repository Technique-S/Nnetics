export function LoadingSkeleton() {
  return <div className="loading-skeleton" role="status" aria-label="Loading records" aria-busy="true"><span className="skeleton-line short"/><span className="skeleton-line"/><div className="skeleton-grid">{[0,1,2].map(i=><span className="skeleton-block" key={i}/>)}</div><span className="skeleton-line"/><span className="skeleton-line"/></div>;
}
