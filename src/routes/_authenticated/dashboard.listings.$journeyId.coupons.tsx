import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { ArrowLeft, Trash2, CalendarIcon, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  listPromoCodesForJourney,
  createPromoCode,
  deletePromoCode,
  type PromoCodeRow,
} from "@/lib/promo-codes.functions";

export const Route = createFileRoute("/_authenticated/dashboard/listings/$journeyId/coupons")({
  component: CouponsPage,
});

function CouponsPage() {
  const { journeyId } = Route.useParams();
  const listFn = useServerFn(listPromoCodesForJourney);
  const createFn = useServerFn(createPromoCode);
  const deleteFn = useServerFn(deletePromoCode);
  const qc = useQueryClient();

  const { data: codes = [], isLoading } = useQuery({
    queryKey: ["promo-codes", journeyId],
    queryFn: () => listFn({ data: { journeyId } }),
  });

  const createMut = useMutation({
    mutationFn: (vars: {
      code: string;
      discountType: "percent" | "fixed";
      discountValue: number;
      expiresAt: string | null;
      journeyId: string;
    }) => createFn({ data: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["promo-codes", journeyId] });
      toast.success("Coupon created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["promo-codes", journeyId] });
      toast.success("Coupon deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-border/60 bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4">
          <Logo size="md" />
          <Button asChild variant="ghost" size="sm" className="rounded-full">
            <Link to="/dashboard/aide/courses">
              <ArrowLeft className="mr-1 size-4" />
              Back to My Listings
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 md:py-12">
        <div className="flex items-center gap-3">
          <Ticket className="size-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Coupons &amp; Promotions</h1>
            <p className="text-sm text-muted-foreground">
              Create and manage discount codes for this listing.
            </p>
          </div>
        </div>

        <CreateCouponForm
          submitting={createMut.isPending}
          onSubmit={(v) => createMut.mutate({ ...v, journeyId })}
        />

        <ActiveCouponsTable
          loading={isLoading}
          rows={codes}
          onDelete={(id) => deleteMut.mutate(id)}
        />
      </main>
    </div>
  );
}

function CreateCouponForm({
  submitting,
  onSubmit,
}: {
  submitting: boolean;
  onSubmit: (v: {
    code: string;
    discountType: "percent" | "fixed";
    discountValue: number;
    expiresAt: string | null;
  }) => void;
}) {
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [value, setValue] = useState<number>(10);
  const [expiresAt, setExpiresAt] = useState<Date | undefined>(undefined);

  const valid =
    code.trim().length >= 3 &&
    code.trim().length <= 20 &&
    /^[A-Z0-9_-]+$/i.test(code.trim()) &&
    value > 0 &&
    (discountType === "fixed" || value <= 90);

  return (
    <Card className="rounded-3xl border-border/60 p-6">
      <h2 className="text-lg font-semibold">Create new code</h2>
      <form
        className="mt-4 grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          onSubmit({
            code: code.trim().toUpperCase(),
            discountType,
            discountValue: value,
            expiresAt: expiresAt ? expiresAt.toISOString() : null,
          });
          setCode("");
          setValue(discountType === "percent" ? 10 : 5);
          setExpiresAt(undefined);
        }}
      >
        <div className="sm:col-span-2">
          <Label htmlFor="code">Coupon code</Label>
          <Input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="AUTOMATE50"
            maxLength={20}
            className="mt-1 rounded-xl uppercase tracking-wider"
          />
        </div>

        <div>
          <Label>Discount type</Label>
          <Select
            value={discountType}
            onValueChange={(v) => setDiscountType(v as "percent" | "fixed")}
          >
            <SelectTrigger className="mt-1 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percent">Percentage (%)</SelectItem>
              <SelectItem value="fixed">Fixed amount ($)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="value">
            {discountType === "percent" ? "Percent off" : "Amount off ($)"}
          </Label>
          <Input
            id="value"
            type="number"
            min={1}
            max={discountType === "percent" ? 90 : 100000}
            value={value}
            onChange={(e) => setValue(Number(e.target.value) || 0)}
            className="mt-1 rounded-xl"
          />
        </div>

        <div className="sm:col-span-2">
          <Label>Expiry date (optional)</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "mt-1 w-full justify-start rounded-xl text-left font-normal",
                  !expiresAt && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 size-4" />
                {expiresAt ? format(expiresAt, "PPP") : "No expiry"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={expiresAt}
                onSelect={setExpiresAt}
                disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
              {expiresAt && (
                <div className="border-t p-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => setExpiresAt(undefined)}
                  >
                    Clear
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>

        <div className="sm:col-span-2 flex justify-end">
          <Button type="submit" disabled={!valid || submitting} className="rounded-2xl">
            {submitting ? "Saving…" : "Create coupon"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function ActiveCouponsTable({
  loading,
  rows,
  onDelete,
}: {
  loading: boolean;
  rows: PromoCodeRow[];
  onDelete: (id: string) => void;
}) {
  return (
    <Card className="rounded-3xl border-border/60 p-6">
      <h2 className="text-lg font-semibold">Active coupons</h2>

      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No coupons yet. Create one above to share with your audience.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const expired = r.expires_at
                  ? new Date(r.expires_at) < new Date()
                  : false;
                const status = expired
                  ? { label: "Expired", variant: "secondary" as const }
                  : r.is_active
                    ? { label: "Active", variant: "default" as const }
                    : { label: "Inactive", variant: "outline" as const };
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono font-medium uppercase">
                      {r.code}
                    </TableCell>
                    <TableCell>
                      {r.discount_type === "percent"
                        ? `${r.discount_value}% off`
                        : `$${r.discount_value} off`}
                    </TableCell>
                    <TableCell>
                      {r.expires_at
                        ? format(new Date(r.expires_at), "PP")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Delete coupon"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Delete coupon ${r.code}? This can't be undone.`,
                            )
                          ) {
                            onDelete(r.id);
                          }
                        }}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
