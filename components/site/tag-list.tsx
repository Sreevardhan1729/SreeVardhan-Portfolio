export function TagList({ tags, label }: { tags: string[]; label: string }) {
  return (
    <ul aria-label={label} className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <li key={tag} className="rounded border border-rule px-1.5 py-0.5 font-mono text-[11px] text-muted">
          {tag}
        </li>
      ))}
    </ul>
  )
}
