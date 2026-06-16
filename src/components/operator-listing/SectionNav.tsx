import { Anchor, Calendar, Fish, Info, MessageCircle, Sparkles } from "lucide-react";

const ITEMS = [
  { href: "#trips", label: "Trips & prices", icon: Calendar },
  { href: "#species", label: "Targeted species", icon: Fish },
  { href: "#boat", label: "Boat info", icon: Anchor },
  { href: "#biting", label: "What's biting", icon: Sparkles },
  { href: "#included", label: "What's included", icon: Info },
  { href: "#contact", label: "Contact captain", icon: MessageCircle },
];

interface Props {
  /** offset from top in px (banner height) */
  topOffset?: number;
}

export function SectionNav({ topOffset = 56 }: Props) {
  return (
    <nav
      className="sticky z-40 -mx-4 mt-6 border-y bg-background/95 px-4 py-2 backdrop-blur"
      style={{ top: topOffset }}
    >
      <ul className="mx-auto flex max-w-6xl gap-2 overflow-x-auto">
        {ITEMS.map((i) => (
          <li key={i.href} className="shrink-0">
            <a
              href={i.href}
              className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted"
            >
              <i.icon className="h-4 w-4 text-primary" />
              {i.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
