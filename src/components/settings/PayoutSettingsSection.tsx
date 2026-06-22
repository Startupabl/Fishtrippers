import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/useAuthStore";
import { Wallet } from "lucide-react";

type PayoutMethod = "ach" | "wallet" | "address";
type WalletProvider = "zelle" | "venmo" | "paypal";

type Details = {
  // ACH
  account_holder?: string;
  bank_name?: string;
  routing_number?: string;
  account_number?: string;
  // Wallet
  wallet_provider?: WalletProvider;
  wallet_handle?: string; // email or phone
  // Check by mail
  payee_name?: string;
  mail_line1?: string;
  mail_line2?: string;
  mail_city?: string;
  mail_state?: string;
  mail_postal?: string;
};

const achSchema = z.object({
  account_holder: z.string().trim().min(1, "Required").max(120),
  bank_name: z.string().trim().min(1, "Required").max(120),
  routing_number: z
    .string()
    .trim()
    .regex(/^\d{9}$/, "Must be 9 digits"),
  account_number: z
    .string()
    .trim()
    .regex(/^\d{4,17}$/, "Must be 4–17 digits"),
});

const walletSchema = z.object({
  wallet_provider: z.enum(["zelle", "venmo", "paypal"]),
  wallet_handle: z.string().trim().min(3, "Required").max(120),
});

const checkSchema = z.object({
  payee_name: z.string().trim().min(1, "Required").max(120),
  mail_line1: z.string().trim().min(1, "Required").max(120),
  mail_line2: z.string().trim().max(120).optional(),
  mail_city: z.string().trim().min(1, "Required").max(80),
  mail_state: z.string().trim().min(1, "Required").max(80),
  mail_postal: z.string().trim().min(2, "Required").max(20),
});

export function PayoutSettingsSection() {
  const user = useAuthStore((s) => s.user);
  const [isCaptain, setIsCaptain] = useState<boolean | null>(null);
  const [method, setMethod] = useState<PayoutMethod | "">("");
  const [details, setDetails] = useState<Details>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("operators")
        .select("id")
        .eq("owner_id", user.id)
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      setIsCaptain(!!data);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user || !isCaptain) return;
    (supabase as any)
      .from("profiles")
      .select("payout_method, payout_details")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }: { data: any }) => {
        if (!data) return;
        if (data.payout_method) setMethod(data.payout_method as PayoutMethod);
        if (data.payout_details && typeof data.payout_details === "object") {
          setDetails(data.payout_details as Details);
        }
      });
  }, [user, isCaptain]);

  const update = (patch: Partial<Details>) => setDetails((d) => ({ ...d, ...patch }));

  const canSubmit = useMemo(() => method !== "" && !saving, [method, saving]);

  async function onSave() {
    if (!user || !method) return;
    let payload: Details;
    try {
      if (method === "ach") {
        payload = achSchema.parse({
          account_holder: details.account_holder ?? "",
          bank_name: details.bank_name ?? "",
          routing_number: details.routing_number ?? "",
          account_number: details.account_number ?? "",
        });
      } else if (method === "wallet") {
        payload = walletSchema.parse({
          wallet_provider: details.wallet_provider,
          wallet_handle: details.wallet_handle ?? "",
        });
      } else {
        payload = checkSchema.parse({
          payee_name: details.payee_name ?? "",
          mail_line1: details.mail_line1 ?? "",
          mail_line2: details.mail_line2 ?? "",
          mail_city: details.mail_city ?? "",
          mail_state: details.mail_state ?? "",
          mail_postal: details.mail_postal ?? "",
        });
      }
    } catch (e: any) {
      const msg = e?.errors?.[0]?.message ?? "Please check the highlighted fields";
      toast.error(msg);
      return;
    }

    setSaving(true);
    const { error } = await (supabase as any)
      .from("profiles")
      .update({ payout_method: method, payout_details: payload })
      .eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Payout details saved");
  }

  if (!user || isCaptain === null) return null;
  if (!isCaptain) return null;

  return (
    <Card className="p-6">
      <div className="flex items-start gap-3">
        <Wallet className="mt-0.5 size-5 text-foreground/70" aria-hidden />
        <div className="flex-1">
          <h2 className="text-xl font-semibold">Payout Settings</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            How you'd like to receive payouts from cancellation reimbursements and other
            manually-processed payments. Visible only to you and platform admins.
          </p>
        </div>
      </div>

      <div className="mt-5 max-w-md">
        <Label htmlFor="payout-method">Preferred Payout Method</Label>
        <Select
          value={method || undefined}
          onValueChange={(v) => setMethod(v as PayoutMethod)}
        >
          <SelectTrigger id="payout-method" className="mt-1">
            <SelectValue placeholder="Choose a payout method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ach">Direct Deposit (ACH)</SelectItem>
            <SelectItem value="wallet">Digital Wallet (Zelle / Venmo / PayPal)</SelectItem>
            <SelectItem value="address">Check by Mail</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {method === "ach" ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field
            label="Account Holder Name"
            value={details.account_holder ?? ""}
            onChange={(v) => update({ account_holder: v })}
            autoComplete="name"
          />
          <Field
            label="Bank Name"
            value={details.bank_name ?? ""}
            onChange={(v) => update({ bank_name: v })}
          />
          <Field
            label="Routing Number"
            value={details.routing_number ?? ""}
            onChange={(v) => update({ routing_number: v.replace(/\D/g, "").slice(0, 9) })}
            inputMode="numeric"
          />
          <Field
            label="Account Number"
            value={details.account_number ?? ""}
            onChange={(v) => update({ account_number: v.replace(/\D/g, "").slice(0, 17) })}
            inputMode="numeric"
          />
        </div>
      ) : null}

      {method === "wallet" ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="wallet-provider">Platform</Label>
            <Select
              value={details.wallet_provider}
              onValueChange={(v) => update({ wallet_provider: v as WalletProvider })}
            >
              <SelectTrigger id="wallet-provider" className="mt-1">
                <SelectValue placeholder="Choose a provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zelle">Zelle</SelectItem>
                <SelectItem value="venmo">Venmo</SelectItem>
                <SelectItem value="paypal">PayPal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Field
            label="Email or Phone Number"
            value={details.wallet_handle ?? ""}
            onChange={(v) => update({ wallet_handle: v })}
            autoComplete="email"
          />
        </div>
      ) : null}

      {method === "address" ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field
            label="Full Name or Business Name (Payable to)"
            value={details.payee_name ?? ""}
            onChange={(v) => update({ payee_name: v })}
            className="sm:col-span-2"
          />
          <Field
            label="Mailing Address"
            value={details.mail_line1 ?? ""}
            onChange={(v) => update({ mail_line1: v })}
            className="sm:col-span-2"
            autoComplete="address-line1"
          />
          <Field
            label="Apt / Suite (optional)"
            value={details.mail_line2 ?? ""}
            onChange={(v) => update({ mail_line2: v })}
            className="sm:col-span-2"
            autoComplete="address-line2"
          />
          <Field
            label="City"
            value={details.mail_city ?? ""}
            onChange={(v) => update({ mail_city: v })}
            autoComplete="address-level2"
          />
          <Field
            label="State"
            value={details.mail_state ?? ""}
            onChange={(v) => update({ mail_state: v })}
            autoComplete="address-level1"
          />
          <Field
            label="ZIP / Postal Code"
            value={details.mail_postal ?? ""}
            onChange={(v) => update({ mail_postal: v })}
            autoComplete="postal-code"
          />
        </div>
      ) : null}

      {method ? (
        <div className="mt-6 flex justify-end">
          <Button onClick={onSave} disabled={!canSubmit}>
            {saving ? "Saving…" : "Save Payout Details"}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
  className,
  inputMode,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
  inputMode?: "numeric" | "text" | "tel" | "email";
  autoComplete?: string;
}) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      <Input
        className="mt-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode={inputMode}
        autoComplete={autoComplete}
      />
    </div>
  );
}
