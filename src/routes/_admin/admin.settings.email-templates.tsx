import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SettingsSubPage } from "@/components/admin/SettingsSubPage";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, RotateCcw, Copy } from "lucide-react";
import {
  listEmailTemplates,
  updateEmailTemplate,
  resetEmailTemplate,
  type EmailTemplateRow,
} from "@/lib/email-templates.functions";
import {
  listAlertTemplates,
  updateAlertTemplate,
  resetAlertTemplate,
  type AlertTemplateRow,
} from "@/lib/alert-templates.functions";
import { renderTemplateString } from "@/lib/email-templates.defaults";

const emailTemplatesQueryOptions = queryOptions({
  queryKey: ["admin", "email-templates"],
  queryFn: () => listEmailTemplates(),
});

const alertTemplatesQueryOptions = queryOptions({
  queryKey: ["admin", "alert-templates"],
  queryFn: () => listAlertTemplates(),
});

export const Route = createFileRoute("/_admin/admin/settings/email-templates")({
  component: PlatformCommunicationsPage,
  errorComponent: ({ error }) => (
    <div className="p-6 text-sm text-destructive">Failed to load templates: {error.message}</div>
  ),
});

function PlatformCommunicationsPage() {
  return (
    <SettingsSubPage
      title="Platform Communications"
      description="Manage every automated message the platform sends. Use {{variables}} for dynamic values."
      hideStatusFooter
    >
      <Tabs defaultValue="emails" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="emails">Email Templates</TabsTrigger>
          <TabsTrigger value="alerts">Site Header Alerts</TabsTrigger>
        </TabsList>
        <TabsContent value="emails">
          <EmailTemplatesTab />
        </TabsContent>
        <TabsContent value="alerts">
          <AlertTemplatesTab />
        </TabsContent>
      </Tabs>
    </SettingsSubPage>
  );
}

function copyVar(name: string) {
  const token = `{{${name}}}`;
  navigator.clipboard.writeText(token).then(
    () => toast.success(`Copied ${token}`),
    () => toast.error("Copy failed"),
  );
}

function VariableChips({ variables }: { variables: string[] }) {
  if (variables.length === 0) {
    return <span className="text-xs text-muted-foreground">No variables for this template.</span>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {variables.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => copyVar(v)}
          className="inline-flex items-center gap-1 rounded-md border bg-muted/50 px-2 py-1 font-mono text-xs hover:bg-muted"
        >
          <Copy className="size-3" /> {`{{${v}}}`}
        </button>
      ))}
    </div>
  );
}

/* ============================== EMAIL TAB ============================== */

function EmailTemplatesTab() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { data, isLoading } = useQuery({ ...emailTemplatesQueryOptions, enabled: mounted });
  const queryClient = useQueryClient();
  const updateFn = useServerFn(updateEmailTemplate);
  const resetFn = useServerFn(resetEmailTemplate);

  const templates: EmailTemplateRow[] = data ?? [];
  const [selectedId, setSelectedId] = useState<string>("");
  const selected = useMemo<EmailTemplateRow | undefined>(
    () => templates.find((t) => t.id === selectedId) ?? templates[0],
    [templates, selectedId],
  );

  const [subject, setSubject] = useState(selected?.subject ?? "");
  const [body, setBody] = useState(selected?.body ?? "");
  const editingFor = selected?.id;
  const [trackedId, setTrackedId] = useState(editingFor);
  if (editingFor && editingFor !== trackedId) {
    setTrackedId(editingFor);
    setSubject(selected!.subject);
    setBody(selected!.body);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      await updateFn({ data: { id: selected.id, subject, body } });
    },
    onSuccess: () => {
      toast.success("Email template saved");
      queryClient.invalidateQueries({ queryKey: ["admin", "email-templates"] });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save"),
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!selected) return null;
      return resetFn({ data: { id: selected.id, purpose: selected.purpose } });
    },
    onSuccess: (res) => {
      if (res) {
        setSubject(res.subject);
        setBody(res.body);
        toast.success("Restored default content");
        queryClient.invalidateQueries({ queryKey: ["admin", "email-templates"] });
      }
    },
    onError: (e: Error) => toast.error(e.message || "Failed to reset"),
  });

  if (!mounted || (isLoading && templates.length === 0)) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="w-full space-y-4 lg:w-2/5">
        <Card className="overflow-x-auto">
          <div className="border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Email triggers</h3>
            <p className="text-xs text-muted-foreground">{templates.length} system emails</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Purpose</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((t) => (
                <TableRow
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  data-state={t.id === selected?.id ? "selected" : undefined}
                  className="cursor-pointer"
                >
                  <TableCell className="font-medium">{t.display_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {t.purpose}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-semibold">Variables Cheat Sheet</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            Click a chip to copy. Tokens are replaced when the email is sent.
          </p>
          <VariableChips variables={selected?.variables ?? []} />
        </Card>
      </div>

      <div className="w-full lg:w-3/5">
        <Card className="flex flex-col">
          <div className="sticky top-0 z-10 border-b bg-card px-5 py-4">
            <h3 className="text-base font-semibold">{selected?.display_name ?? "Select a template"}</h3>
            {selected?.description && (
              <p className="text-xs text-muted-foreground">{selected.description}</p>
            )}
          </div>
          <div className="space-y-4 px-5 py-5">
            <div className="space-y-2">
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject line"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-body">Body</Label>
              <Textarea
                id="email-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={18}
                className="min-h-[400px] font-mono text-sm"
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 border-t bg-muted/30 px-5 py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => resetMutation.mutate()}
              disabled={resetMutation.isPending || !selected}
            >
              <RotateCcw className="mr-2 size-4" />
              Reset to default
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !selected}
            >
              {saveMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save changes
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ============================== ALERT TAB ============================== */

function AlertTemplatesTab() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { data, isLoading } = useQuery({ ...alertTemplatesQueryOptions, enabled: mounted });
  const queryClient = useQueryClient();
  const updateFn = useServerFn(updateAlertTemplate);
  const resetFn = useServerFn(resetAlertTemplate);

  const alerts: AlertTemplateRow[] = data ?? [];
  const [selectedId, setSelectedId] = useState<string>("");
  const selected = useMemo<AlertTemplateRow | undefined>(
    () => alerts.find((t) => t.id === selectedId) ?? alerts[0],
    [alerts, selectedId],
  );

  const [message, setMessage] = useState(selected?.message ?? "");
  const editingFor = selected?.id;
  const [trackedId, setTrackedId] = useState(editingFor);
  if (editingFor && editingFor !== trackedId) {
    setTrackedId(editingFor);
    setMessage(selected!.message);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      await updateFn({ data: { id: selected.id, message } });
    },
    onSuccess: () => {
      toast.success("Alert message saved");
      queryClient.invalidateQueries({ queryKey: ["admin", "alert-templates"] });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save"),
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!selected) return null;
      return resetFn({ data: { id: selected.id, purpose: selected.purpose } });
    },
    onSuccess: (res) => {
      if (res) {
        setMessage(res.message);
        toast.success("Restored default copy");
        queryClient.invalidateQueries({ queryKey: ["admin", "alert-templates"] });
      }
    },
    onError: (e: Error) => toast.error(e.message || "Failed to reset"),
  });

  // Build a sample-vars dictionary so the preview shows real-looking text.
  const sampleVars = useMemo<Record<string, string>>(() => {
    const samples: Record<string, string> = {
      course_title: "Intro to Watercolor",
      sender_name: "Alex Rivera",
      aide_name: "Jordan Patel",
      amount: "$240.00",
    };
    const out: Record<string, string> = {};
    for (const v of selected?.variables ?? []) {
      out[v] = samples[v] ?? `[${v}]`;
    }
    return out;
  }, [selected]);
  const preview = renderTemplateString(message, sampleVars);

  if (!mounted || (isLoading && alerts.length === 0)) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="w-full space-y-4 lg:w-2/5">
        <Card className="overflow-x-auto">
          <div className="border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Alert triggers</h3>
            <p className="text-xs text-muted-foreground">{alerts.length} header bell alerts</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Purpose</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts.map((t) => (
                <TableRow
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  data-state={t.id === selected?.id ? "selected" : undefined}
                  className="cursor-pointer"
                >
                  <TableCell className="font-medium">{t.display_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {t.purpose}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-semibold">Variables Cheat Sheet</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            Click a chip to copy. Tokens are replaced when the alert is shown.
          </p>
          <VariableChips variables={selected?.variables ?? []} />
        </Card>
      </div>

      <div className="w-full lg:w-3/5">
        <Card className="flex flex-col">
          <div className="sticky top-0 z-10 border-b bg-card px-5 py-4">
            <h3 className="text-base font-semibold">{selected?.display_name ?? "Select an alert"}</h3>
            {selected?.description && (
              <p className="text-xs text-muted-foreground">{selected.description}</p>
            )}
          </div>
          <div className="space-y-4 px-5 py-5">
            <div className="space-y-2">
              <Label htmlFor="alert-message">Alert message</Label>
              <Input
                id="alert-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder='e.g. New angler booking confirmed for "{{course_title}}"!'
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                Keep it short — this is the single-line text shown in the header bell dropdown.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                {preview || <span className="text-muted-foreground">—</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 border-t bg-muted/30 px-5 py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => resetMutation.mutate()}
              disabled={resetMutation.isPending || !selected}
            >
              <RotateCcw className="mr-2 size-4" />
              Reset to default
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !selected}
            >
              {saveMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save changes
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
