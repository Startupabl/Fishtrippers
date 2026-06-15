import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Pencil, Trash2, Image as ImageIcon, Upload, Loader2, X, CornerDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { uploadCategoryImage } from "@/lib/category-image-upload";
import { supabase } from "@/integrations/supabase/client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  listCategories,
  adminCreateCategory,
  adminUpdateCategory,
  adminDeleteCategory,
  type CategoryRow,
} from "@/lib/categories.functions";

export const Route = createFileRoute("/_admin/admin/settings/categories")({
  component: CategoriesSettings,
});

type EditingState =
  | { mode: "create" }
  | { mode: "edit"; category: CategoryRow }
  | null;

function CategoriesSettings() {
  const qc = useQueryClient();
  const fetchList = useServerFn(listCategories);
  const createFn = useServerFn(adminCreateCategory);
  const updateFn = useServerFn(adminUpdateCategory);
  const deleteFn = useServerFn(adminDeleteCategory);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => fetchList(),
  });

  const [editing, setEditing] = useState<EditingState>(null);
  const [pendingDelete, setPendingDelete] = useState<CategoryRow | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-categories"] });
    qc.invalidateQueries({ queryKey: ["categories"] });
    qc.invalidateQueries({ queryKey: ["featured-categories"] });
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Category deleted");
      invalidate();
      setPendingDelete(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <Link
        to="/admin/settings"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to Settings
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Categories</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage the categories shown across the homepage and Browse filter.
          </p>
        </div>
        <Button onClick={() => setEditing({ mode: "create" })}>
          <Plus className="size-4" /> Add category
        </Button>
      </div>

      <Card className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-32">Featured</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                  No categories yet. Click "Add category" to create the first one.
                </TableCell>
              </TableRow>
            ) : (
              (() => {
                const parents = categories.filter((c) => !c.parent_id);
                const childrenByParent = new Map<string, CategoryRow[]>();
                for (const c of categories) {
                  if (c.parent_id) {
                    const arr = childrenByParent.get(c.parent_id) ?? [];
                    arr.push(c);
                    childrenByParent.set(c.parent_id, arr);
                  }
                }
                const ordered: Array<{ row: CategoryRow; isChild: boolean }> = [];
                for (const p of parents) {
                  ordered.push({ row: p, isChild: false });
                  for (const child of childrenByParent.get(p.id) ?? []) {
                    ordered.push({ row: child, isChild: true });
                  }
                }
                // Orphans (child with missing parent) — render at end
                const seen = new Set(ordered.map((o) => o.row.id));
                for (const c of categories) {
                  if (!seen.has(c.id)) ordered.push({ row: c, isChild: !!c.parent_id });
                }
                return ordered.map(({ row: c, isChild }) => (
                  <TableRow key={c.id} className={isChild ? "bg-muted/30" : ""}>
                    <TableCell>
                      {c.image_url ? (
                        <img
                          src={c.image_url}
                          alt=""
                          className={cn(
                            "rounded-md object-cover",
                            isChild ? "size-8 ml-6" : "size-12",
                          )}
                        />
                      ) : (
                        <div
                          className={cn(
                            "flex items-center justify-center rounded-md bg-muted text-muted-foreground",
                            isChild ? "size-8 ml-6" : "size-12",
                          )}
                        >
                          <ImageIcon className={isChild ? "size-3.5" : "size-5"} />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className={cn("font-medium", isChild && "pl-2")}>
                      <span className="flex items-center gap-2">
                        {isChild && (
                          <CornerDownRight
                            className="size-4 text-muted-foreground"
                            aria-hidden
                          />
                        )}
                        <span className={isChild ? "text-sm text-foreground/80" : ""}>
                          {c.name}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell>
                      {c.is_featured ? (
                        <Badge variant="default">Featured</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditing({ mode: "edit", category: c })}
                          aria-label={`Edit ${c.name}`}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPendingDelete(c)}
                          aria-label={`Delete ${c.name}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ));
              })()
            )}
          </TableBody>
        </Table>
      </Card>

      <CategoryFormDialog
        open={editing !== null}
        initial={editing?.mode === "edit" ? editing.category : null}
        onClose={() => setEditing(null)}
        onSubmit={async (values) => {
          try {
            if (editing?.mode === "edit") {
              await updateFn({ data: { id: editing.category.id, ...values } });
              toast.success("Category updated");
            } else {
              await createFn({ data: values });
              toast.success("Category created");
            }
            invalidate();
            setEditing(null);
          } catch (e) {
            toast.error((e as Error).message);
          }
        }}
      />

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this category?</AlertDialogTitle>
            <AlertDialogDescription>
              "{pendingDelete?.name}" will be removed. Any sub-categories nested under it will
              also be deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface FormValues {
  name: string;
  image_url: string | null;
  is_featured: boolean;
}

function CategoryFormDialog({
  open,
  initial,
  onClose,
  onSubmit,
}: {
  open: boolean;
  initial: CategoryRow | null;
  onClose: () => void;
  onSubmit: (v: FormValues) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setImageUrl(initial?.image_url ?? "");
      setIsFeatured(initial?.is_featured ?? false);
    }
  }, [open, initial]);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) throw new Error("You must be signed in.");
      const url = await uploadCategoryImage(file, userData.user.id);
      setImageUrl(url);
      toast.success("Image uploaded");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Edit category" : "Add category"}</DialogTitle>
          <DialogDescription>
            Name and image appear on the homepage and Browse page filter.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cat-name">Category name</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. AI Basics"
              maxLength={80}
            />
          </div>

          <div className="space-y-2">
            <Label>Category image</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelected}
            />
            {imageUrl ? (
              <div className="space-y-2">
                <div className="relative">
                  <img
                    src={imageUrl}
                    alt=""
                    className="h-32 w-full rounded-md object-cover"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Upload className="size-4" />
                    )}
                    Replace image
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={uploading}
                    onClick={() => setImageUrl("")}
                  >
                    <X className="size-4" /> Remove
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                {uploading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Uploading…
                  </>
                ) : (
                  <>
                    <Upload className="size-4" /> Upload image
                  </>
                )}
              </Button>
            )}
            <p className="text-xs text-muted-foreground">PNG or JPG, up to 5 MB.</p>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label htmlFor="cat-featured" className="text-sm">
                Feature on homepage
              </Label>
              <p className="text-xs text-muted-foreground">
                Shown in the homepage category grid.
              </p>
            </div>
            <Switch
              id="cat-featured"
              checked={isFeatured}
              onCheckedChange={setIsFeatured}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            disabled={submitting || uploading || !name.trim()}
            onClick={async () => {
              setSubmitting(true);
              try {
                await onSubmit({
                  name: name.trim(),
                  image_url: imageUrl.trim() ? imageUrl.trim() : null,
                  is_featured: isFeatured,
                });
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {initial ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
