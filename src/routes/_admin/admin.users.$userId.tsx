import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createFileRoute, Link, useRouter, useSearch } from "@tanstack/react-router";
import { ArrowLeft, Copy } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import {
  blockUserIp,
  confirmUser,
  generateStripeDashboardLink,
  getAdminUserDetail,
  impersonateUser,
  setAdminRole,
} from "@/lib/admin.functions";
import { Switch } from "@/components/ui/switch";
import { useAuthStore } from "@/stores/useAuthStore";
import { formatCurrency } from "@/lib/format-currency";
import { formatPhoneDisplay } from "@/lib/phone-format";
import { formatAddressLines, hasAnyAddress, type AddressFields } from "@/lib/address-format";
import { startImpersonation } from "@/lib/impersonation";


const searchSchema = z.object({
  impersonating: z.coerce.boolean().optional(),
});

export const Route = createFileRoute("/_admin/admin/users/$userId")({
  validateSearch: searchSchema,
  component: UserDetailPage,
});

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function fmtMoney(minor: number | null | undefined, currency: string | null | undefined): string {
  if (minor == null) return "—";
  try {
    return formatCurrency(minor, currency ?? "USD");
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency ?? "USD"}`;
  }
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-lime-600">
      {children}
    </h2>
  );
}

function UserDetailPage() {
  const { userId } = Route.useParams();
  const search = useSearch({ from: Route.id });
  const fetchDetail = useServerFn(getAdminUserDetail);
  const confirmFn = useServerFn(confirmUser);
  const blockFn = useServerFn(blockUserIp);
  const impersonateFn = useServerFn(impersonateUser);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "users", userId],
    queryFn: () => fetchDetail({ data: { userId } }),
  });

  const confirmMut = useMutation({
    mutationFn: () => confirmFn({ data: { userId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users", userId] });
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("User verified");
    },
    onError: () => toast.error("Failed to confirm"),
  });

  const blockMut = useMutation({
    mutationFn: () => blockFn({ data: { userId } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["admin", "users", userId] });
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success(`IP ${r.ip} blocked`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to block IP"),
  });

  const router = useRouter();
  const impersonateMut = useMutation({
    mutationFn: async () => {
      const r = await impersonateFn({ data: { userId } });
      await startImpersonation({
        tokenHash: r.tokenHash,
        targetUserId: userId,
        targetEmail: r.email ?? null,
      });
      return r;
    },
    onSuccess: () => {
      toast.success("Signed in as user");
      router.navigate({ to: "/dashboard" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to start impersonation"),
  });


  const stripeLinkFn = useServerFn(generateStripeDashboardLink);
  const stripeLinkMut = useMutation({
    mutationFn: () => stripeLinkFn({ data: { userId } }),
    onSuccess: (r) => {
      if (!r.url) return toast.error("No link returned");
      window.open(r.url, "_blank", "noopener");
      toast.success("Stripe dashboard link opened");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to generate link"),
  });

  const setAdminRoleFn = useServerFn(setAdminRole);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const setAdminMut = useMutation({
    mutationFn: (grant: boolean) => setAdminRoleFn({ data: { userId, grant } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["admin", "users", userId] });
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success(r.isAdmin ? "Administrator privileges granted" : "Administrator privileges revoked");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update admin role"),
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading user…</div>;
  }
  if (error || !data) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load user.
      </div>
    );
  }

  const p = data.profile;
  const a = data.auth;
  const fullName = [p.first_name, p.last_name].filter(Boolean).join(" ") || "—";
  const username = p.display_name || "—";
  const isUnverified = p.user_status === "unverified";
  const isBlocked = p.user_status === "blocked";
  const emailClass = isBlocked
    ? "text-muted-foreground line-through"
    : isUnverified
    ? "text-red-500"
    : "text-lime-600";
  const addressFields = {
    address_line1: p.address_line1,
    address_line2: p.address_line2,
    city: p.city,
    state_province: p.state_province,
    postal_code: p.postal_code,
    country: p.country,
  };

  return (
    <div className="space-y-5">
      {search.impersonating && (
        <div className="sticky top-14 z-10 -mx-4 mb-2 flex items-center justify-between border-b border-lime-300 bg-lime-100 px-4 py-2 text-sm text-lime-900 lg:-mx-8 lg:px-8">
          <span className="font-medium">You are viewing this user's session.</span>
          <Link to="/admin/users/$userId" params={{ userId }} className="font-semibold underline">
            Return to Admin
          </Link>
        </div>
      )}

      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          to="/admin/users"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Back to User List
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => impersonateMut.mutate()}
            disabled={impersonateMut.isPending}
            className="rounded bg-accent px-3 py-1 text-xs font-medium text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
          >
            {impersonateMut.isPending ? "Generating…" : "Login As"}
          </button>
        </div>
      </div>

      {/* Account settings */}
      <section className="rounded-lg border bg-white p-4">
        <SectionHeader>Account Settings</SectionHeader>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Full Name</dt>
            <dd className="font-medium">{fullName}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Username</dt>
            <dd className="font-medium">{username}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Email</dt>
            <dd className="inline-flex items-center gap-2">
              <span className={`font-medium ${emailClass}`}>{p.email ?? "—"}</span>
              {isUnverified && (
                <button
                  onClick={() => confirmMut.mutate()}
                  disabled={confirmMut.isPending}
                  className="rounded border border-lime-500 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-lime-600 hover:bg-lime-50 disabled:opacity-50"
                >
                  Confirm
                </button>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Phone Number</dt>
            <dd className="font-medium"><AdminPhoneCell value={p.phone_number} /></dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-muted-foreground">Physical Address</dt>
            <dd className="font-medium"><AdminAddressBlock fields={addressFields} /></dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Time Zone</dt>
            <dd className="font-medium">{p.timezone ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Provider</dt>
            <dd className="font-medium capitalize">{a.provider ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Roles</dt>
            <dd className="font-medium">{data.roles.join(", ") || "—"}</dd>
          </div>
        </dl>
      </section>

      {/* Administrative Privileges */}
      <section className="rounded-lg border bg-white p-4">
        <SectionHeader>Administrative Privileges</SectionHeader>
        {(() => {
          const isTargetAdmin = data.roles.includes("admin");
          const isSelf = currentUserId === userId;
          if (isSelf) {
            return (
              <p className="text-xs text-muted-foreground">
                You cannot modify your own admin status.
              </p>
            );
          }
          return (
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">
                  {isTargetAdmin
                    ? "Revoke Administrator Privileges"
                    : "Grant Administrator Privileges"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isTargetAdmin
                    ? "Removes access to /admin routes immediately."
                    : "Grants full access to /admin routes immediately."}
                </p>
              </div>
              <Switch
                checked={isTargetAdmin}
                disabled={setAdminMut.isPending}
                onCheckedChange={(checked) => setAdminMut.mutate(checked)}
                aria-label="Toggle administrator privileges"
              />
            </div>
          );
        })()}
      </section>


      {/* Financial & Stripe Status */}
      <FinancialStripeCard
        profile={p}
        listingsCount={data.listings.length}
        roles={data.roles}
        onGenerateLink={() => stripeLinkMut.mutate()}
        linkPending={stripeLinkMut.isPending}
      />

      {/* Activity & Security Log */}
      <section className="rounded-lg border bg-white p-4">
        <SectionHeader>Activity &amp; Security Log</SectionHeader>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Last Login</dt>
            <dd className="font-medium">{fmtDate(a.last_sign_in_at)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Login Count</dt>
            <dd className="font-medium tabular-nums">{p.login_count}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Registered</dt>
            <dd className="font-medium">{fmtDate(a.created_at ?? p.created_at)}</dd>
          </div>
        </dl>

        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              IP History (last 5)
            </h3>
            {p.last_ip && !isBlocked && (
              <button
                onClick={() => {
                  if (window.confirm(`Block IP ${p.last_ip}?`)) blockMut.mutate();
                }}
                disabled={blockMut.isPending}
                className="text-xs text-red-500 hover:underline disabled:opacity-50"
              >
                Block current IP
              </button>
            )}
          </div>
          {data.ipHistory.length === 0 ? (
            <p className="text-xs text-muted-foreground">No IP records yet.</p>
          ) : (
            <ul className="divide-y rounded border text-xs">
              {data.ipHistory.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <span className="font-mono">{row.ip}</span>
                  <span className="text-muted-foreground">{fmtDate(row.seen_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Listings */}
      <section className="rounded-lg border bg-white p-4">
        <SectionHeader>Listings ({data.listings.length})</SectionHeader>
        {data.listings.length === 0 ? (
          <p className="text-xs text-muted-foreground">No listings.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b bg-muted/30 text-left text-muted-foreground">
                <tr>
                  <th className="px-2 py-1.5 font-medium">Title</th>
                  <th className="px-2 py-1.5 font-medium">Status</th>
                  <th className="px-2 py-1.5 font-medium">Moderation</th>
                  <th className="px-2 py-1.5 font-medium">Price</th>
                  <th className="px-2 py-1.5 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {data.listings.map((j) => (
                  <tr key={j.id} className="border-b border-border/60">
                    <td className="px-2 py-1.5 font-medium">{j.title}</td>
                    <td className="px-2 py-1.5">{j.status}</td>
                    <td className="px-2 py-1.5">{j.moderation_status}</td>
                    <td className="px-2 py-1.5 tabular-nums">
                      {fmtMoney(j.base_price_minor, j.currency)}
                    </td>
                    <td className="px-2 py-1.5 text-muted-foreground">{fmtDate(j.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Bookings */}
      <section className="rounded-lg border bg-white p-4">
        <SectionHeader>Bookings ({data.bookings.length})</SectionHeader>
        {data.bookings.length === 0 ? (
          <p className="text-xs text-muted-foreground">No bookings.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b bg-muted/30 text-left text-muted-foreground">
                <tr>
                  <th className="px-2 py-1.5 font-medium">Charter</th>
                  <th className="px-2 py-1.5 font-medium">Status</th>
                  <th className="px-2 py-1.5 font-medium">Total</th>
                  <th className="px-2 py-1.5 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {data.bookings.map((b) => (
                  <tr key={b.id} className="border-b border-border/60">
                    <td className="px-2 py-1.5 font-medium">{b.course_title ?? "—"}</td>
                    <td className="px-2 py-1.5">{b.status}</td>
                    <td className="px-2 py-1.5 tabular-nums">
                      {fmtMoney(b.total_price, b.currency)}
                    </td>
                    <td className="px-2 py-1.5 text-muted-foreground">{fmtDate(b.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function AdminPhoneCell({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const display = formatPhoneDisplay(value);
  return (
    <a href={`tel:${value}`} className="text-lime-600 hover:underline">
      {display}
    </a>
  );
}

function AdminAddressBlock({ fields }: { fields: AddressFields }) {
  if (!hasAnyAddress(fields)) return <span className="text-muted-foreground">—</span>;
  const lines = formatAddressLines(fields);
  const copyText = lines.join("\n");
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="whitespace-pre-line leading-relaxed">{lines.join("\n")}</div>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(copyText).then(
            () => toast.success("Address copied"),
            () => toast.error("Copy failed"),
          );
        }}
        className="inline-flex shrink-0 items-center gap-1 rounded border border-input px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label="Copy address"
      >
        <Copy className="size-3.5" /> Copy
      </button>
    </div>
  );
}

type StripeProfileFields = {
  stripe_customer_id: string | null;
  stripe_connect_id: string | null;
};

function FinancialStripeCard({
  profile,
  listingsCount,
  roles,
}: {
  profile: StripeProfileFields;
  listingsCount: number;
  roles: string[];
  onGenerateLink?: () => void;
  linkPending?: boolean;
}) {
  const isAide = listingsCount > 0 || roles.includes("aide");
  const classification = isAide ? "Angler + Active Captain/Guide" : "Angler Only";

  return (
    <section className="rounded-lg border bg-white p-4">
      <SectionHeader>Account &amp; Billing</SectionHeader>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">Role</dt>
          <dd className="font-medium">{classification}</dd>
        </div>

        <div>
          <dt className="text-xs text-muted-foreground">Stripe Customer Status</dt>
          <dd>
            {profile.stripe_customer_id ? (
              <span className="font-mono text-xs">{profile.stripe_customer_id}</span>
            ) : (
              <span className="text-xs text-muted-foreground">No Purchase History</span>
            )}
          </dd>
        </div>
      </dl>
    </section>
  );
}

