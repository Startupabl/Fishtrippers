import { Download, FileText, FileSpreadsheet, FileImage, File as FileIcon } from "lucide-react";
import {
  formatBytes,
  getMessageAttachmentSignedUrl,
} from "@/lib/message-attachment-upload";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  name: string;
  url: string;
  mime: string | null;
  size: number | null;
  mine: boolean;
}

function pickIcon(name: string, mime: string | null) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png"].includes(ext) || mime?.startsWith("image/")) return FileImage;
  if (["xls", "xlsx", "csv"].includes(ext)) return FileSpreadsheet;
  if (["pdf", "doc", "docx", "txt"].includes(ext)) return FileText;
  return FileIcon;
}

export function FileMessageBubble({ name, url, mime, size, mine }: Props) {
  const Icon = pickIcon(name, mime);

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    const signed = await getMessageAttachmentSignedUrl(url, 120);
    if (!signed) {
      toast.error("This attachment is no longer available.");
      return;
    }
    window.open(signed, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className={cn(
        "flex min-w-0 w-full max-w-full items-center gap-3 overflow-hidden rounded-2xl border px-3 py-2.5 shadow-sm",
        mine ? "border-transparent" : "border-border bg-white",
      )}
      style={mine ? { backgroundColor: "#FFF4C2" } : undefined}
    >
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          mine ? "bg-white/60" : "bg-muted",
        )}
      >
        <Icon className="size-5 text-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="min-w-0 truncate break-words text-sm font-semibold text-foreground [overflow-wrap:anywhere]">{name}</p>
        {size != null && (
          <p className="text-xs text-muted-foreground">{formatBytes(size)}</p>
        )}
      </div>
      <button
        type="button"
        onClick={handleDownload}
        aria-label={`Download ${name}`}
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-foreground/10"
      >
        <Download className="size-4" />
      </button>
    </div>
  );
}
