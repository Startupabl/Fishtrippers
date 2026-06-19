import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Lock, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/useAuthStore";
import { formatCurrency } from "@/lib/format-currency";
import { AddressForm, type AddressFormValue } from "@/components/settings/AddressForm";
import { useProfileStore } from "@/stores/useProfileStore";


interface OrderRow {
  id: string;
  total_paid_minor: number;
  currency: string;
  created_at: string;
  order_status: string;
  receipt_url: string | null;
}

export const Route = createFileRoute("/_authenticated/settings/billing")({
  head: () => ({ meta: [{ title: "Billing — Settings" }] }),
  component: BillingPage,
});

function BillingPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [address, setAddress] = useState<AddressFormValue>({
    address_line1: "",
    address_line2: "",
    city: "",
    state_province: "",
    postal_code: "",
  });
  const [savingAddress, setSavingAddress] = useState(false);


  useEffect(() => {
    if (!user && typeof window !== "undefined") navigate({ to: "/login" });
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("orders")
      .select("id, total_paid_minor, currency, created_at, order_status, receipt_url")
      .eq("learner_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setOrders((data ?? []) as OrderRow[]));
  }, [user]);

  useEffect(() => {
    if (!user || !isAide) return;
    supabase
      .from("orders")
      .select("id, total_paid_minor, currency, created_at, order_status")
      .eq("mentor_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setEarnings((data ?? []) as OrderRow[]));
  }, [user, isAide]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("address_line1, address_line2, city, state_province, postal_code, country")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setAddress({
          address_line1: data.address_line1 ?? "",
          address_line2: data.address_line2 ?? "",
          city: data.city ?? "",
          state_province: data.state_province ?? "",
          postal_code: data.postal_code ?? "",
        });
        useProfileStore.getState().setProfile({ country: data.country ?? "US" });
      });
  }, [user]);

  // Handle return from Stripe onboarding.
  useEffect(() => {
    if (!user) return;
    if (search.stripe === "refresh") {
      setReturnState({ kind: "refresh" });
      navigate({ to: "/settings/billing", search: {}, replace: true });
      return;
    }
    if (search.stripe === "return") {
      (async () => {
        try {
          const res = await finalizeReturn();
          if (res.connected) {
            setReturnState({ kind: "success" });
            qc.invalidateQueries({ queryKey: ["my-stripe-ids", user.id] });
            await refetchIds();
          } else {
            setReturnState({ kind: "incomplete" });
          }
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Could not verify Stripe account");
        } finally {
          navigate({ to: "/settings/billing", search: {}, replace: true });
        }
      })();
    }
  }, [search.stripe, user, finalizeReturn, navigate, qc, refetchIds]);

  if (!user) return null;

  const isPayoutReady = !!stripeIds?.is_payout_ready;
  const hasStripeAccount = !!stripeIds?.stripe_connect_id;
  const hasListings = isAide;
  const totalEarn = earnings.reduce((s, o) => s + o.total_paid_minor, 0);
  const earnCurrency = earnings[0]?.currency ?? "USD";

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { url } = await startOnboarding();
      // Stripe sends X-Frame-Options: DENY, so navigating the current
      // window fails inside the Lovable preview iframe ("refused to connect").
      // Break out to the top window; fall back to a new tab if blocked.
      const inIframe = typeof window !== "undefined" && window.top !== window.self;
      if (inIframe) {
        try {
          window.top!.location.href = url;
        } catch {
          window.open(url, "_blank", "noopener,noreferrer");
          setConnecting(false);
        }
      } else {
        window.location.href = url;
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start onboarding");
      setConnecting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stripe return banners */}
      {returnState?.kind === "success" && (
        <Card className="border-emerald-300 bg-emerald-50 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 text-emerald-700" />
            <div className="flex-1 text-sm">
              <p className="font-semibold text-emerald-900">
                Success! Your payout account is connected. FishTrippers is
                reviewing your new listing and will send you a status update
                within 2 business days.
              </p>
            </div>
          </div>
        </Card>
      )}
      {returnState?.kind === "incomplete" && (
        <Card className="border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 text-amber-700" />
            <div className="flex-1 text-sm">
              <p className="font-semibold text-amber-900">
                Your Stripe onboarding isn't complete yet.
              </p>
              <p className="mt-1 text-amber-800">
                Finish the remaining steps to start accepting payments.
              </p>
              <Button
                size="sm"
                className="mt-3"
                disabled={connecting}
                onClick={handleConnect}
              >
                {connecting ? "Redirecting…" : "Resume onboarding"}
              </Button>
            </div>
          </div>
        </Card>
      )}
      {returnState?.kind === "refresh" && (
        <Card className="border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 text-amber-700" />
            <div className="flex-1 text-sm">
              <p className="font-semibold text-amber-900">Your Stripe session expired.</p>
              <p className="mt-1 text-amber-800">
                No worries — restart the onboarding to pick up where you left off.
              </p>
              <Button
                size="sm"
                className="mt-3"
                disabled={connecting}
                onClick={handleConnect}
              >
                {connecting ? "Redirecting…" : "Restart onboarding"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Payout setup — temporarily disabled */}
      {isAide && (
        <Card className="p-6" style={{ borderTop: `4px solid ${DESIGN_SYSTEM.colors.leafGreen}` }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Payout Setup</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Payouts are temporarily disabled while the platform is being updated.
              </p>
            </div>
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              Disabled
            </span>
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            <Banknote className="size-5" />
            Payout connections will be re-enabled soon. No action needed right now.
          </div>
        </Card>
      )}


      {/* Secure Payments notice */}
      {(!isAide || !isPayoutReady) && (
        <Card className="p-6">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 size-5 text-foreground/70" aria-hidden />
            <div className="flex-1">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold">Secure Payments</h2>
                <span className="rounded border bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Powered by Stripe
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Your payment security is our top priority. All payments and financial details are
                securely processed and managed entirely by Stripe, a global leader trusted by
                millions of businesses. We do not store or have access to your credit card data on
                our servers.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Billing address */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold">Billing address</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Used on receipts and to determine tax where applicable.
        </p>
        <div className="mt-4">
          <AddressForm value={address} onChange={setAddress} />
        </div>
        <div className="mt-6 flex justify-end">
          <Button
            onClick={async () => {
              setSavingAddress(true);
              const country = useProfileStore.getState().country;
              const { error } = await supabase
                .from("profiles")
                .update({
                  address_line1: address.address_line1.trim() || null,
                  address_line2: address.address_line2.trim() || null,
                  city: address.city.trim() || null,
                  state_province: address.state_province.trim() || null,
                  postal_code: address.postal_code.trim() || null,
                  country: country || null,
                })
                .eq("id", user.id);
              setSavingAddress(false);
              if (error) toast.error(error.message);
              else toast.success("Billing address saved");
            }}
            disabled={savingAddress}
          >
            {savingAddress ? "Saving…" : "Save address"}
          </Button>
        </div>
      </Card>

      {/* Transaction history */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold">Transaction history</h2>
        <p className="mt-1 text-sm text-muted-foreground">Courses you've purchased.</p>
        <div className="mt-4 divide-y">
          {orders.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            orders.map((o) => (
              <div key={o.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <div className="font-medium">Order {o.id.slice(0, 8)}</div>
                  <div className="text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {o.receipt_url ? (
                    <a
                      href={o.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      <ExternalLink className="size-3.5" /> Receipt
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                  <div className="text-right">
                    <div className="font-semibold">
                      {formatCurrency(o.total_paid_minor, o.currency)}
                    </div>
                    <div className="text-xs uppercase text-muted-foreground">{o.order_status}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Earnings — Aides who have connected Stripe */}
      {isAide && isPayoutReady && (
        <Card className="p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-semibold">Earnings history</h2>
            {earnings.length > 0 && (
              <div className="text-right">
                <div className="text-xs uppercase text-muted-foreground">Lifetime</div>
                <div className="text-lg font-semibold">
                  {formatCurrency(totalEarn, earnCurrency)}
                </div>
              </div>
            )}
          </div>
          <div className="mt-4 divide-y">
            {earnings.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">No earnings yet.</p>
            ) : (
              earnings.map((o) => (
                <div key={o.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <div className="font-medium">Order {o.id.slice(0, 8)}</div>
                    <div className="text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="font-semibold">
                    {formatCurrency(o.total_paid_minor, o.currency)}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
