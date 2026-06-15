import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SharePath } from "@/components/share/SharePath";
import { ContactMentorButton } from "@/components/mentor/ContactMentorButton";
import { AvatarMottoTooltip } from "@/components/profile/AvatarMottoTooltip";
import {
  getMentorBySlug,
  getPathsByMentor,
} from "@/data/lesson-paths";
import { displayMentorName } from "@/lib/mentor-display";

export const Route = createFileRoute("/m/$mentorSlug")({
  loader: ({ params }) => {
    const mentor = getMentorBySlug(params.mentorSlug);
    if (!mentor) throw notFound();
    const paths = getPathsByMentor(mentor.slug);
    return { mentor, paths };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { mentor } = loaderData;
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://Lemonaidely";
    const url = `${origin}/m/${mentor.slug}`;
    const title = `${displayMentorName(mentor.name)} — Aide on Lemonaidely`;
    const description = mentor.bio.slice(0, 155);

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:type", content: "profile" },
        { property: "og:title", content: `${displayMentorName(mentor.name)} — Aide on Lemonaidely` },
        { property: "og:description", content: description },
        { property: "og:image", content: mentor.avatarUrl },
        { property: "og:image:alt", content: mentor.name },
        { property: "og:url", content: url },
        { property: "og:site_name", content: "Lemonaidely" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: `${displayMentorName(mentor.name)} — Aide on Lemonaidely` },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: mentor.avatarUrl },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Person",
            name: displayMentorName(mentor.name),
            image: mentor.avatarUrl,
            description,
            url,
            jobTitle: "Aide",
          }),
        },
      ],
    };
  },
  component: MentorPage,
});

function MentorPage() {
  const { mentor, paths } = Route.useLoaderData();
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/m/${mentor.slug}`
      : `/m/${mentor.slug}`;

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-4 py-10 lg:grid-cols-[2fr_1fr]">
      <main>
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <AvatarMottoTooltip motto={null}>
              <img
                src={mentor.avatarUrl}
                alt={displayMentorName(mentor.name)}
                className="size-24 rounded-full object-cover"
              />
            </AvatarMottoTooltip>
            <div>
              <h1
                className="text-3xl text-foreground"
                style={{ fontFamily: "Lora, ui-serif, Georgia, serif" }}
              >
                {displayMentorName(mentor.name)}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">Aide</p>
            </div>
          </div>
          <ContactMentorButton mentorName={displayMentorName(mentor.name)} />
        </header>

        <p className="mt-6 text-base text-foreground">{mentor.bio}</p>

        <section className="mt-10">
          <h2
            className="text-xl text-foreground"
            style={{ fontFamily: "Lora, ui-serif, Georgia, serif" }}
          >
            Courses {displayMentorName(mentor.name)} teaches
          </h2>
          <ul className="mt-3 space-y-3">
            {paths.map((p: typeof paths[number]) => (
              <li key={p.id}>
                <Link
                  to="/p/$pathSlug"
                  params={{ pathSlug: p.slug }}
                  className="block rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-accent"
                >
                  <p className="text-base font-medium text-foreground">{p.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {p.description}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <aside className="lg:pt-2">
        <SharePath
          url={url}
          title={`${displayMentorName(mentor.name)}'s mentor profile`}
          mentorName={displayMentorName(mentor.name)}
          compact
        />
      </aside>
    </div>
  );
}
