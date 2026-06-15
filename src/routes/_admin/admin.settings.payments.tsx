import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Check, Trash2, Loader2 } from "lucide-react";
import { SettingsSubPage } from "@/components/admin/SettingsSubPage";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  getPaymentSettings,
  updatePaymentSettings,
  saveStripeSecret,
  clearStripeSecret,
  type StripeMode,
  type PaymentSettings,
} from "@/lib/platform-stripe.functions";

export const Route = createFileRoute("/_admin/admin/settings/payments")({
  head: () => ({ meta: [{ title: "Master Stripe Integration — Admin" }] }),
  component: PaymentsSettings,
});

function PaymentsSettings() {
  const fetchSettings = useServerFn(getPaymentSettings);
  const updateFn = useServerFn(updatePaymentSettings);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["payment-settings"],
    queryFn: () => fetchSettings(),
  });

  // Lifted local state for the non-secret fields so a single Save writes them all.
  const [testKey, setTestKey] = useState("");
  const [liveKey, setLiveKey] = useState("");
  const [feePct, setFeePct] = useState("");

  useEffect(() => {
    if (!data) return;
    setTestKey(data.stripe_test_publishable_key ?? "");
    setLiveKey(data.stripe_live_publishable_key ?? "");
    setFeePct(String(data.platform_fee_pct));
  }, [data]);

  const modeMut = useMutation({
    mutationFn: (mode: StripeMode) => updateFn({ data: { active_stripe_mode: mode } }),
    onSuccess: (res) => qc.setQueryData(["payment-settings"], res),
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Could not switch mode"),
  });

  const saveAllMut = useMutation({
    mutationFn: () => {
      const feeNum = Number(feePct);
      if (!Number.isFinite(feeNum) || feeNum < 0 || feeNum > 100) {
        throw new Error("Platform fee must be a number between 0 and 100");
      }
      return updateFn({
        data: {
          stripe_test_publishable_key: testKey.trim(),
          stripe_live_publishable_key: liveKey.trim(),
          platform_fee_pct: feeNum,
        },
      });
    },
    onSuccess: (res) => {
      qc.setQueryData(["payment-settings"], res);
      // Invalidate the public fee query so checkout / calculators pick it up.
      qc.invalidateQueries({ queryKey: ["platform-fee"] });
      toast.success("Payment settings saved");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Could not save settings"),
  });

  const dirty =
    !!data &&
    (testKey !== (data.stripe_test_publishable_key ?? "") ||
      liveKey !== (data.stripe_live_publishable_key ?? "") ||
      feePct !== String(data.platform_fee_pct));

  return (
    <SettingsSubPage
      title="Master Stripe Integration"
      description="Single source of truth for the platform's Stripe credentials and marketplace fee."
      hideStatusFooter
    >
      {isLoading || !data ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-10">
          <ModeToggle
            settings={data}
            onChange={(mode) => modeMut.mutate(mode)}
            saving={modeMut.isPending}
          />

          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Stripe credentials
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Publishable keys save with the form below. Secret and webhook
                values are stored server-only and managed individually for
                security.
              </p>
            </div>

            <Tabs defaultValue={data.active_stripe_mode}>
              <TabsList>
                <TabsTrigger value="test">Test mode keys</TabsTrigger>
                <TabsTrigger value="live">Live mode keys</TabsTrigger>
              </TabsList>
              <TabsContent value="test" className="mt-4">
                <div className="space-y-5">
                  <PublishableKeyField
                    value={testKey}
                    onChange={setTestKey}
                    placeholder="pk_test_…"
                  />
                  <SecretField
                    field={{ kind: "secret", mode: "test" }}
                    label="Stripe Secret Key"
                    placeholder="sk_test_…"
                    isSet={data.stripe_test_secret_set}
                  />
                </div>
              </TabsContent>
              <TabsContent value="live" className="mt-4">
                <div className="space-y-5">
                  <PublishableKeyField
                    value={liveKey}
                    onChange={setLiveKey}
                    placeholder="pk_live_…"
                  />
                  <SecretField
                    field={{ kind: "secret", mode: "live" }}
                    label="Stripe Secret Key"
                    placeholder="sk_live_…"
                    isSet={data.stripe_live_secret_set}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </section>

          <section className="space-y-4 border-t pt-6">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Webhook signing secrets
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                One slot per Stripe Dashboard webhook endpoint. The same handler
                URL receives events from both — incoming signatures are checked
                against every configured secret, so adding one cannot break the
                other.
              </p>
            </div>
            <SecretField
              field={{ kind: "webhook", integration: "checkout" }}
              label="Stripe Checkout Webhook Secret"
              placeholder="whsec_… (Checkout endpoint — checkout.session.completed)"
              isSet={data.stripe_checkout_webhook_set}
            />
            <SecretField
              field={{ kind: "webhook", integration: "connect" }}
              label="Stripe Connect Webhook Secret"
              placeholder="whsec_… (Connect endpoint — account.*, transfer.*, etc.)"
              isSet={data.stripe_connect_webhook_set}
            />
          </section>

          <section className="space-y-3 border-t pt-6">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Fee structure
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                The marketplace cut taken from each transaction. This value
                drives the calculator on the listing-creation flow, the
                booking-review breakdown, and the checkout total.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Platform fee (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step="0.1"
                value={feePct}
                onChange={(e) => setFeePct(e.target.value)}
                className="max-w-xs"
              />
            </div>
          </section>

          <div className="flex items-center justify-end gap-3 border-t pt-6">
            {dirty && (
              <span className="text-xs text-muted-foreground">
                You have unsaved changes
              </span>
            )}
            <Button
              type="button"
              size="lg"
              disabled={!dirty || saveAllMut.isPending}
              onClick={() => saveAllMut.mutate()}
            >
              {saveAllMut.isPending && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              Save changes
            </Button>
          </div>
        </div>
      )}
    </SettingsSubPage>
  );
}

function ModeToggle({
  settings,
  onChange,
  saving,
}: {
  settings: PaymentSettings;
  onChange: (mode: StripeMode) => void;
  saving: boolean;
}) {
  const active = settings.active_stripe_mode;
  return (
    <section className="rounded-lg border bg-muted/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Active environment</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Switch which key set the platform uses for live checkouts.
          </p>
        </div>
        <div className="inline-flex rounded-md border bg-background p-1">
          {(["test", "live"] as const).map((m) => (
            <button
              key={m}
              type="button"
              disabled={saving || m === active}
              onClick={() => onChange(m)}
              className={
                "rounded px-3 py-1.5 text-sm font-medium transition-colors " +
                (m === active
                  ? m === "live"
                    ? "bg-emerald-600 text-white"
                    : "bg-orange-500 text-white"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              {m === "test" ? "Test mode" : "Live mode"}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function PublishableKeyField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      <Label>Stripe Publishable Key</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />
    </div>
  );
}

type SecretFieldKey =
  | { kind: "secret"; mode: StripeMode }
  | { kind: "webhook"; integration: "checkout" | "connect" };

function SecretField({
  field,
  label,
  placeholder,
  isSet,
}: {
  field: SecretFieldKey;
  label: string;
  placeholder: string;
  isSet: boolean;
}) {
  const saveFn = useServerFn(saveStripeSecret);
  const clearFn = useServerFn(clearStripeSecret);
  const qc = useQueryClient();
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);

  const saveMut = useMutation({
    mutationFn: () => saveFn({ data: { field, value: value.trim() } }),
    onSuccess: (res) => {
      qc.setQueryData(["payment-settings"], res);
      setValue("");
      setShow(false);
      toast.success(`${label} saved securely`);
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Could not save value"),
  });

  const clearMut = useMutation({
    mutationFn: () => clearFn({ data: { field } }),
    onSuccess: (res) => {
      qc.setQueryData(["payment-settings"], res);
      toast.success(`${label} cleared`);
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Could not clear value"),
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {isSet && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
            <Check className="size-3" /> Configured
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type={show ? "text" : "password"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={isSet ? "•••••••• (replace)" : placeholder}
            className="pr-10"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={show ? "Hide value" : "Show value"}
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        <Button
          type="button"
          onClick={() => saveMut.mutate()}
          disabled={saveMut.isPending || value.trim().length < 4}
        >
          Save
        </Button>
        {isSet && (
          <Button
            type="button"
            variant="outline"
            onClick={() => clearMut.mutate()}
            disabled={clearMut.isPending}
            aria-label="Clear value"
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
