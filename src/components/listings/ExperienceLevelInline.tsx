type Level = "Beginner" | "Intermediate" | "Advanced";

export function ExperienceLevelInline({
  level,
}: {
  level?: Level | null;
}) {
  if (!level) return null;
  return (
    <span className="text-sm font-semibold text-foreground">
      Level: {level}
    </span>
  );
}
