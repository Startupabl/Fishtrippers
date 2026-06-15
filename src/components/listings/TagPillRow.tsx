import { Link } from "@tanstack/react-router";

interface TagPillRowProps {
  tags?: string[] | null;
  className?: string;
}

// Soft citrus tint background, rich olive-green text. Hover transitions to a
// soft brand-green tint. Each pill is a Link that prefills the marketplace
// search input with the tag.
export function TagPillRow({ tags, className }: TagPillRowProps) {
  const clean = (tags ?? []).map((t) => t.trim()).filter(Boolean);
  if (clean.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className ?? ""}`}>
      {clean.map((tag, i) => (
        <Link
          key={`${tag}-${i}`}
          to="/search"
          search={{ q: tag, category: "", tags: [], level: "" as const }}
          className="group inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer"
          style={{
            backgroundColor: "#FFF8D6",
            color: "#556B2F",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#DDEFD3";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#FFF8D6";
          }}
        >
          <span aria-hidden="true" className="mr-0.5 opacity-70">#</span>
          {tag}
        </Link>
      ))}
    </div>
  );
}
