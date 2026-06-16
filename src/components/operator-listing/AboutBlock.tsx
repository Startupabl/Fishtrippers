import type { BusinessType } from "@/lib/operators.shared";

interface Props {
  businessType: BusinessType | null | undefined;
  about: string | null | undefined;
}

export function AboutBlock({ businessType, about }: Props) {
  const text = about?.trim();
  if (!text) return null;
  const title = businessType === "charter" ? "About Our Charter" : "About Your Guide";
  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed text-foreground/90">{text}</p>
    </section>
  );
}
