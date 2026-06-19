import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tags } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_admin/admin/search-seo/")({
  component: SearchSeoDashboard,
});

type CardDef = {
  title: string;
  description: string;
  icon: React.ReactNode;
  to?: string;
  comingSoon?: boolean;
};

const CARDS: CardDef[] = [
  {
    title: "Tag Management",
    description:
      "Curate, edit, merge, and organize the keywords and intent tags used across charter listings.",
    icon: <Tags className="size-5" />,
    to: "/admin/search-seo/tags",
  },
];

function SearchSeoDashboard() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Search & SEO</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Control how learners discover courses across search, tags, and metadata.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-2">
        {CARDS.map((c) => (
          <SeoCard key={c.title} card={c} />
        ))}
      </div>
    </div>
  );
}

function SeoCard({ card }: { card: CardDef }) {
  const content = (
    <Card
      className={cn(
        "group flex h-full flex-col gap-3 rounded-2xl border-border/60 p-5 transition-shadow",
        card.comingSoon
          ? "pointer-events-none opacity-60"
          : "cursor-pointer hover:shadow-md",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-foreground">
          {card.icon}
        </div>
        {card.comingSoon && (
          <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
            Coming Soon
          </Badge>
        )}
      </div>
      <div>
        <p className="text-base font-semibold text-foreground">{card.title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{card.description}</p>
      </div>
    </Card>
  );

  if (card.to && !card.comingSoon) {
    return (
      <Link to={card.to} className="block">
        {content}
      </Link>
    );
  }
  return content;
}
