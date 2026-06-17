import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ExternalLink, EyeOff, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { adminListPages, adminUpsertPage } from "@/lib/site-pages.functions";

export const Route = createFileRoute("/_admin/admin/settings/pages/$pageId")({
  component: PageEditor,
});

type Category = "explore" | "resources" | "legal";
type Status = "live" | "draft";

interface PageRow {
  id: string;
  slug: string;
  title: string;
  category: Category;
  order_priority: number;
  is_external: boolean;
  external_url: string | null;
  status: Status;
  description: string | null;
  content_html: string | null;
}

interface FormState {
  id?: string;
  slug: string;
  title: string;
  category: Category;
  order_priority: number;
  is_external: boolean;
  external_url: string;
  status: Status;
  description: string;
  content_html: string;
}

const EMPTY_FORM: FormState = {
  slug: "",
  title: "",
  category: "explore",
  order_priority: 100,
  is_external: false,
  external_url: "",
  status: "draft",
  description: "",
  content_html: "",
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function PageEditor() {
  const { pageId } = Route.useParams();
  const isNew = pageId === "new";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchPages = useServerFn(adminListPages);
  const upsert = useServerFn(adminUpsertPage);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "site_pages"],
    queryFn: () => fetchPages(),
    enabled: !isNew,
  });

  const existing = useMemo<PageRow | undefined>(() => {
    if (isNew || !data) return undefined;
    return (data as PageRow[]).find((p) => p.id === pageId);
  }, [data, pageId, isNew]);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (isNew) {
      setHydrated(true);
      return;
    }
    if (existing && !hydrated) {
      setForm({
        id: existing.id,
        slug: existing.slug,
        title: existing.title,
        category: existing.category,
        order_priority: existing.order_priority,
        is_external: existing.is_external,
        external_url: existing.external_url ?? "",
        status: existing.status,
        description: existing.description ?? "",
        content_html: existing.content_html ?? "",
      });
      setSlugTouched(true);
      setHydrated(true);
    }
  }, [existing, isNew, hydrated]);

  // Auto-slug from title for new pages until user edits slug.
  useEffect(() => {
    if (!isNew || slugTouched) return;
    const next = slugify(form.title);
    if (next !== form.slug) setForm((f) => ({ ...f, slug: next }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.title]);

  const upsertMut = useMutation({
    mutationFn: (input: FormState) =>
      upsert({
        data: {
          id: input.id,
          slug: input.slug,
          title: input.title,
          category: input.category,
          order_priority: input.order_priority,
          is_external: input.is_external,
          external_url: input.is_external ? input.external_url : null,
          status: input.status,
          description: input.description || null,
          content_html: input.is_external ? null : input.content_html || null,
        },
      }),
    onSuccess: (res) => {
      toast.success("Page saved");
      qc.invalidateQueries({ queryKey: ["admin", "site_pages"] });
      qc.invalidateQueries({ queryKey: ["site_pages", "live"] });
      if (isNew && res?.id) {
        navigate({
          to: "/admin/settings/pages/$pageId",
          params: { pageId: res.id },
          replace: true,
        });
      }
    },
    onError: (e: Error) => toast.error(e.message ?? "Save failed"),
  });

  function handleSave() {
    if (!form.title.trim()) return toast.error("Title is required");
    if (!form.slug.trim()) return toast.error("Slug is required");
    if (form.is_external && !form.external_url.trim())
      return toast.error("External URL is required");
    upsertMut.mutate(form);
  }

  if (!isNew && isLoading) {
    return (
      <div className="-m-4 flex h-[calc(100vh-3.5rem)] items-center justify-center text-sm text-muted-foreground lg:-m-8">
        Loading…
      </div>
    );
  }

  if (!isNew && !existing && hydrated) {
    return (
      <div className="-m-4 flex h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-3 lg:-m-8">
        <p className="text-sm text-muted-foreground">Page not found.</p>
        <Button asChild variant="outline">
          <Link to="/admin/settings/pages">Back to Pages</Link>
        </Button>
      </div>
    );
  }

  const liveHref =
    form.is_external && form.external_url ? form.external_url : `/pages/${form.slug || ""}`;

  return (
    <div className="-m-4 flex min-h-[calc(100vh-3.5rem)] flex-col bg-background lg:-m-8">
      {/* Editor top bar */}
      <div className="sticky top-14 z-20 flex h-14 items-center gap-3 border-b bg-white px-4 lg:px-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link to="/admin/settings/pages">
            <ArrowLeft className="size-4" /> Back
          </Link>
        </Button>
        <div className="mx-2 h-6 w-px bg-border" />
        <Input
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="Untitled page"
          className="h-9 max-w-xl border-transparent bg-transparent text-base font-semibold shadow-none focus-visible:border-input focus-visible:bg-background"
        />
        <Badge variant={form.status === "live" ? "default" : "secondary"}>
          {form.status === "live" ? "Live" : "Draft"}
        </Badge>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview((v) => !v)}
            className="text-muted-foreground"
          >
            {showPreview ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            {showPreview ? "Hide preview" : "Show preview"}
          </Button>
          <Button asChild variant="outline" size="sm" disabled={!form.slug}>
            <a href={liveHref} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" /> View Live
            </a>
          </Button>
          <Button size="sm" onClick={handleSave} disabled={upsertMut.isPending}>
            {upsertMut.isPending ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Body */}
      <div
        className={
          showPreview
            ? "grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2"
            : "min-h-0 flex-1"
        }
      >
        {/* Editor column */}
        <div className="flex min-w-0 flex-col gap-4 overflow-y-auto border-r p-6">
          {/* Meta row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setForm((f) => ({ ...f, slug: slugify(e.target.value) }));
                }}
                className="font-mono"
              />
              {form.slug && (
                <a
                  href={liveHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 truncate text-xs text-primary hover:underline"
                >
                  {form.is_external && form.external_url
                    ? form.external_url
                    : `${typeof window !== "undefined" ? window.location.origin : ""}/pages/${form.slug}`}
                  <ExternalLink className="size-3 shrink-0" />
                </a>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(v: Category) => setForm((f) => ({ ...f, category: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="learning_teaching">Learning & Teaching</SelectItem>
                  <SelectItem value="support_safety">Support & Safety</SelectItem>
                  <SelectItem value="legal">Legal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="priority">Order Priority</Label>
              <Input
                id="priority"
                type="number"
                min={0}
                value={form.order_priority}
                onChange={(e) =>
                  setForm((f) => ({ ...f, order_priority: Number(e.target.value) || 0 }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v: Status) => setForm((f) => ({ ...f, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <Label htmlFor="external" className="text-sm font-medium">
                External link
              </Label>
              <p className="text-xs text-muted-foreground">
                Link to a URL outside the app instead of an internal page.
              </p>
            </div>
            <Switch
              id="external"
              checked={form.is_external}
              onCheckedChange={(v) => setForm((f) => ({ ...f, is_external: v }))}
            />
          </div>

          {form.is_external ? (
            <div className="space-y-1.5">
              <Label htmlFor="external_url">External URL</Label>
              <Input
                id="external_url"
                type="url"
                placeholder="https://example.com"
                value={form.external_url}
                onChange={(e) => setForm((f) => ({ ...f, external_url: e.target.value }))}
              />
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="description">Short description (meta)</Label>
                <Textarea
                  id="description"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Content</Label>
                <RichTextEditor
                  value={form.content_html}
                  onChange={(html) => setForm((f) => ({ ...f, content_html: html }))}
                />
              </div>
            </>
          )}
        </div>

        {/* Preview column */}
        {showPreview && (
          <div className="hidden min-w-0 overflow-y-auto bg-muted/30 lg:block">
            <div className="mx-auto max-w-3xl px-8 py-10">
              <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Preview
              </div>
              {form.is_external ? (
                <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  This page is an external link to{" "}
                  <span className="font-mono text-foreground">
                    {form.external_url || "—"}
                  </span>
                  . Visitors will be redirected automatically.
                </div>
              ) : (
                <article className="prose prose-neutral max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary">
                  <h1>{form.title || "Untitled page"}</h1>
                  {form.description && (
                    <p className="lead text-base">{form.description}</p>
                  )}
                  {form.content_html ? (
                    <div dangerouslySetInnerHTML={{ __html: form.content_html }} />
                  ) : (
                    <p className="text-muted-foreground">
                      <em>Start writing to see your page come to life.</em>
                    </p>
                  )}
                </article>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
