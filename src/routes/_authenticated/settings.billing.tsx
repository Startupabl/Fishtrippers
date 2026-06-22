import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/useAuthStore";
import { formatCurrency } from "@/lib/format-currency";
import { AddressForm, type AddressFormValue } from "@/components/settings/AddressForm";
import { useProfileStore } from "@/stores/useProfileStore";
import { PayoutSettingsSection } from "@/components/settings/PayoutSettingsSection";


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

  if (!user) return null;

  return (
    <div className="space-y-6">
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
        <p className="mt-1 text-sm text-muted-foreground">Your booking deposits and purchases.</p>
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
    </div>
  );
}

