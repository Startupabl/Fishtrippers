import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, AlertTriangle, ArrowLeft, Info } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getMyOperator, updateOperatorCancellationPolicy } from "@/lib/operators.functions";
import {
  CANCELLATION_POLICIES,
  CANCELLATION_POLICY_DETAILS,
  WEATHER_POLICY_DISCLAIMER,
  type CancellationPolicy,
} from "@/lib/operators.shared";

export const Route = createFileRoute("/_authenticated/dashboard/manage-policies")({
  head: () => ({
    meta: [
      { title: "Manage Policies — FishTrippers" },
      {
        name: "description",
        content: "Review and update the cancellation policy for your listing.",
      },
    ],
  }),
  component: ManagePoliciesPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="mx-auto max-w-2xl p-8 text-center">
        <p className="text-sm text-destructive">Failed to load policies: {error.message}</p>
        <Button
          className="mt-4"
          onClick={() => {
            router.invalidate();
            reset();
          }}
        >
          Retry
        </Button>
      </div>
    );
  },
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl p-8 text-center text-sm text-muted-foreground">
      Listing not found.
    </div>
  ),
});

function ManagePoliciesPage() {
  const fetchOperator = useServerFn(getMyOperator);
  const updatePolicy = useServerFn(updateOperatorCancellationPolicy);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["my-operator"],
    queryFn: () => fetchOperator(),
  });

  const currentPolicy = (data?.operator?.cancellation_policy ?? null) as CancellationPolicy | null;
  const [selected, setSelected] = useState<CancellationPolicy | null>(null);
  const active = selected ?? currentPolicy;

  const mutation = useMutation({
    mutationFn: (policy: CancellationPolicy) =>
      updatePolicy({ data: { cancellation_policy: policy } }),
    onSuccess: () => {
      toast.success("Cancellation policy updated");
      queryClient.invalidateQueries({ queryKey: ["my-operator"] });
      setSelected(null);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update policy");
    },
  });

  if (isLoading) {
    return <div className="mx-auto max-w-5xl p-8 text-sm text-muted-foreground">Loading…</div>;
  }

  if (!data?.operator) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-center text-sm text-muted-foreground">
        You don't have a listing yet.
      </div>
    );
  }

  const dirty = selected !== null && selected !== currentPolicy;

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6 md:p-8">
      <div className="space-y-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2 gap-1">
          <Link to="/dashboard/my-listing">
            <ArrowLeft className="size-4" /> Back to My Listing
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Manage Policies</h1>
        <p className="text-muted-foreground">
          Choose the cancellation policy that applies to all your trips. Your current policy is
          highlighted.
        </p>
      </div>

      <section className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          {CANCELLATION_POLICIES.map((id) => {
            const policy = CANCELLATION_POLICY_DETAILS[id];
            const isActive = active === id;
            const isCurrent = currentPolicy === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSelected(id as CancellationPolicy)}
                className={cn(
                  "relative flex flex-col gap-3 rounded-xl border-2 p-5 text-left transition-all",
                  isActive
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40",
                )}
              >
                {isActive && (
                  <CheckCircle2 className="absolute right-3 top-3 h-5 w-5 text-primary" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-lg font-bold">{policy.title}</div>
                    {isCurrent && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{policy.summary}</div>
                </div>
                <ul className="space-y-2 text-sm">
                  {policy.terms.map((t, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-muted-foreground">•</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
      </section>

      <section className="flex gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-5 dark:bg-sky-950/30 dark:border-sky-900">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
        <div className="text-sm text-sky-950 dark:text-sky-100">
          <div className="font-bold">💡 How to Enforce Your Cancellation Policy</div>
          <p className="mt-1.5 leading-relaxed">
            If a guest cancels late or fails to show up, you cannot charge them from this page.
            Please navigate to your{" "}
            <Link
              to="/dashboard/upcoming-sessions"
              className="font-semibold underline underline-offset-2 hover:text-sky-700"
            >
              My Schedule
            </Link>{" "}
            page, find the specific reservation card, and click 'Report Issue' within 48 hours of
            the scheduled departure to initiate a claim.
          </p>
        </div>
      </section>

      <section className="flex gap-3 rounded-2xl border-2 border-amber-300/50 bg-amber-50/50 p-5 dark:bg-amber-950/20">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <div className="text-sm font-bold uppercase tracking-wide text-amber-900 dark:text-amber-300">
            Universal Weather Policy
          </div>
          <p className="mt-1 text-sm text-amber-950 dark:text-amber-100">
            {WEATHER_POLICY_DISCLAIMER}
          </p>
        </div>
      </section>

      <div className="flex justify-end gap-2">
        {dirty && (
          <Button variant="ghost" onClick={() => setSelected(null)} disabled={mutation.isPending}>
            Cancel
          </Button>
        )}
        <Button
          disabled={!dirty || mutation.isPending}
          onClick={() => selected && mutation.mutate(selected)}
          size="lg"
        >
          {mutation.isPending ? "Saving…" : "Save policy"}
        </Button>
      </div>
    </div>
  );
}
