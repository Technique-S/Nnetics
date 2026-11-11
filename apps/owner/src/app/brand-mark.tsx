export function BrandMark() {
  return <svg className="nnetics-mark" width="36" height="36" viewBox="0 0 64 64" aria-hidden="true">
    <rect width="64" height="64" rx="14" fill="var(--brand-tile, var(--sidebar))"/>
    <path d="M16 46V18h6l17 21V18h6v28h-6L22 25v21Z" fill="var(--brand-letter, var(--sidebar-text))"/>
    <circle cx="50" cy="49" r="4" fill="var(--brand-dot)"/>
  </svg>;
}

export function WorkspacePreview() {
  return <aside className="entry-preview" aria-label="Demo workflow preview">
    <div className="entry-preview-brand"><BrandMark/>Nnetics</div>
    <div className="entry-preview-card">
      <strong>Contractor payments</strong>
      <ol>
        <li>Invite a contractor<small>Private link</small></li>
        <li>Review an invoice<small>Owner approval</small></li>
        <li>Simulate a payment<small>Receipt in Activity</small></li>
      </ol>
    </div>
    <p className="entry-preview-note">Explore the workflow with simulated NEAR.</p>
  </aside>;
}
