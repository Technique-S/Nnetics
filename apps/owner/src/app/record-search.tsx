
import {DemoButton} from "../components/demo/demo-button";
import type { ReactNode } from "react";

export function matchesRecords(query: string, ...values: (string | null | undefined)[]) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const terms = normalized.split(/\s+/);
  const text = values.filter(Boolean).join(" ").toLowerCase();
  return terms.every(term => text.includes(term));
}

export function RecordSearch({label, query, onQuery, onReset, children}: {
  label: string;
  query: string;
  onQuery: (value: string) => void;
  onReset?: () => void;
  children?: ReactNode;
}) {
  return <div className="record-filters">
    <label className="filter-label record-search">{label}<input type="search" value={query} onChange={event => onQuery(event.target.value)} placeholder="Enter a name or reference"/></label>
    {children}
    {onReset && <DemoButton type="button" className="text-button" onClick={onReset}>Reset filters</DemoButton>}
  </div>;
}
