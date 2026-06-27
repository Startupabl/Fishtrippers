import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { blockUserIp, confirmUser, deleteOrArchiveUser, listAdminUsers } from "@/lib/admin.functions";
import { Eye, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/users/")({
  component: UsersPage,
});

type AdminUser = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  user_status: "unverified" | "verified" | "blocked" | "archived" | string;
  last_ip: string | null;
  trips_count: number;
  bookings_count: number;

  user_number_id: string | null;
  full_name: string;
  full_name_is_fallback: boolean;
  roles: string[];
};

type SortKey = "user_number_id" | "full_name";
type SortDir = "asc" | "desc";

function SortHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  const indicator = active ? (dir === "asc" ? " ▲" : " ▼") : "";
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-lime-400"
    >
      {label}
      {indicator}
    </button>
  );
}

function UsersPage() {
  const fetchUsers = useServerFn(listAdminUsers);
  const confirmFn = useServerFn(confirmUser);
  const blockFn = useServerFn(blockUserIp);
  const qc = useQueryClient();
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir } | null>(null);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => fetchUsers(),
  });

  const confirmMut = useMutation({
    mutationFn: (userId: string) => confirmFn({ data: { userId } }),
    onMutate: async (userId) => {
      await qc.cancelQueries({ queryKey: ["admin", "users"] });
      const prev = qc.getQueryData<AdminUser[]>(["admin", "users"]);
      qc.setQueryData<AdminUser[]>(["admin", "users"], (old) =>
        (old ?? []).map((u) => (u.id === userId ? { ...u, user_status: "verified" } : u)),
      );
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(["admin", "users"], ctx.prev);
      toast.error("Failed to confirm user");
    },
    onSuccess: () => toast.success("User verified"),
  });

  const blockMut = useMutation({
    mutationFn: (userId: string) => blockFn({ data: { userId } }),
    onMutate: async (userId) => {
      await qc.cancelQueries({ queryKey: ["admin", "users"] });
      const prev = qc.getQueryData<AdminUser[]>(["admin", "users"]);
      qc.setQueryData<AdminUser[]>(["admin", "users"], (old) =>
        (old ?? []).map((u) => (u.id === userId ? { ...u, user_status: "blocked" } : u)),
      );
      return { prev };
    },
    onError: (e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(["admin", "users"], ctx.prev);
      toast.error(e instanceof Error ? e.message : "Failed to block IP");
    },
    onSuccess: (r) => toast.success(`IP ${r.ip} blocked`),
  });

  const deleteFn = useServerFn(deleteOrArchiveUser);
  const deleteMut = useMutation({
    mutationFn: (userId: string) => deleteFn({ data: { userId } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      if (r.mode === "deleted") toast.success("User deleted");
      else toast.success("User archived — active listings hidden");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to delete user"),
  });

  const confirmDelete = (userId: string) => {
    if (window.confirm("Are you sure you want to delete this record? This action cannot be undone.")) {
      deleteMut.mutate(userId);
    }
  };
  const confirmBlock = (ip: string, userId: string) => {
    if (window.confirm(`Block IP ${ip}? This will disable the user's account.`)) {
      blockMut.mutate(userId);
    }
  };

  const toggleSort = (key: SortKey) => {
    setSort((s) => {
      if (!s || s.key !== key) return { key, dir: "asc" };
      if (s.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  };

  const rows = useMemo(() => {
    let list = ((data ?? []) as AdminUser[]).slice();
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (u) =>
          (u.user_number_id ?? "").toLowerCase().includes(q) ||
          u.full_name.toLowerCase().includes(q) ||
          (u.email ?? "").toLowerCase().includes(q),
      );
    }
    if (sort) {
      list.sort((a, b) => {
        let diff = 0;
        if (sort.key === "user_number_id") {
          diff = (a.user_number_id ?? "").localeCompare(b.user_number_id ?? "");
        } else {
          diff = a.full_name.localeCompare(b.full_name);
        }
        return sort.dir === "asc" ? diff : -diff;
      });
    }
    return list;
  }, [data, sort, search]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by User ID, name, or email…"
          className="max-w-sm"
        />
        <p className="text-xs text-muted-foreground">
          {rows.length} {rows.length === 1 ? "user" : "users"}
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-xs">
          <thead className="border-b bg-muted/30">
            <tr className="text-left text-[11px] uppercase tracking-wide text-lime-500">
              <th className="px-2 py-2 font-semibold">
                <SortHeader
                  label="User ID"
                  active={sort?.key === "user_number_id"}
                  dir={sort?.dir ?? "asc"}
                  onClick={() => toggleSort("user_number_id")}
                />
              </th>
              <th className="px-2 py-2 font-semibold">
                <SortHeader
                  label="Full Name"
                  active={sort?.key === "full_name"}
                  dir={sort?.dir ?? "asc"}
                  onClick={() => toggleSort("full_name")}
                />
              </th>
              <th className="px-2 py-2 font-semibold">Email</th>
              <th className="px-2 py-2 font-semibold">IP</th>
              <th className="px-2 py-2 font-semibold">Listings</th>
              <th className="px-2 py-2 font-semibold">Bookings</th>
              <th className="px-2 py-2 text-right font-semibold">Manage</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-2 py-4 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-2 py-4 text-center text-muted-foreground">
                  No users.
                </td>
              </tr>
            )}
            {rows.map((u) => {
              const isUnverified = u.user_status === "unverified";
              const isBlocked = u.user_status === "blocked";
              const isArchived = u.user_status === "archived";
              const isAdmin = u.roles?.includes("admin") ?? false;
              const emailClass = isArchived
                ? "text-slate-400 line-through"
                : isBlocked
                ? "text-muted-foreground line-through"
                : isUnverified
                ? "text-red-500"
                : "text-lime-500";
              return (
                <tr key={u.id} className="border-b border-border/60 hover:bg-muted/30">
                  <td className="whitespace-nowrap px-2 py-1.5 font-mono">
                    #{u.user_number_id ?? "———"}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 font-medium">
                    {u.full_name_is_fallback ? (
                      <span className="italic text-muted-foreground">{u.full_name}</span>
                    ) : (
                      u.full_name
                    )}
                    {isAdmin && (
                      <span className="ml-1 font-medium text-lime-500"> (Admin)</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5">
                    <span className="inline-flex items-center gap-2">
                      <span className={emailClass}>{u.email ?? "—"}</span>
                      {isArchived && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                          Archived
                        </span>
                      )}
                      {isUnverified && (
                        <button
                          onClick={() => confirmMut.mutate(u.id)}
                          disabled={confirmMut.isPending}
                          className="rounded border border-lime-500 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-lime-500 hover:bg-lime-500/10 disabled:opacity-50"
                        >
                          Confirm
                        </button>
                      )}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5">
                    <span className="inline-flex items-center gap-2">
                      <span className="font-mono text-muted-foreground">{u.last_ip ?? "—"}</span>
                      {u.last_ip && !isBlocked && !isArchived && !isAdmin && (
                        <button
                          onClick={() => confirmBlock(u.last_ip!, u.id)}
                          disabled={blockMut.isPending}
                          className="text-red-400/80 hover:text-red-400 hover:underline disabled:opacity-50"
                        >
                          Block
                        </button>
                      )}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">{u.listings_count}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">{u.bookings_count}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right">
                    <span className="inline-flex items-center justify-end gap-1">
                      <Link
                        to="/admin/users/$userId"
                        params={{ userId: u.id }}
                        className="group relative inline-flex h-7 w-7 items-center justify-center rounded-md text-lime-500 hover:bg-lime-50 hover:text-lime-600"
                        aria-label="View User"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[10px] text-background opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                          View User
                        </span>
                      </Link>
                      {!isArchived && !isAdmin && (
                        <button
                          onClick={() => confirmDelete(u.id)}
                          disabled={deleteMut.isPending}
                          className="group relative inline-flex h-7 w-7 items-center justify-center rounded-md text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[10px] text-background opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                            Delete
                          </span>
                        </button>
                      )}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
