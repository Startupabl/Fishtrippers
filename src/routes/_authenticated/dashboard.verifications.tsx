import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";
import { DESIGN_SYSTEM } from "@/lib/brand";

const lora = { fontFamily: DESIGN_SYSTEM.fonts.serif };

export const Route = createFileRoute("/_authenticated/dashboard/verifications")({
  head: () => ({
    meta: [
      { title: "My Verifications — FishTrippers" },
      {
        name: "description",
        content: "Upload your credentials to earn your Verified badge.",
      },
    ],
  }),
  component: VerificationsPage,
});

function VerificationsPage() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 md:px-6 lg:px-8 py-8 md:py-12">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-amber-100">
          <ShieldCheck className="size-5 text-amber-900" />
        </div>
        <div>
          <h1 className="text-3xl text-foreground md:text-4xl" style={lora}>
            My Verifications
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload your captain/guide credentials to earn your Verified badge.
          </p>
        </div>
      </div>

      <Card className="mt-8 rounded-2xl border-border/60 p-8 text-center">
        <p className="text-base font-semibold text-foreground" style={lora}>
          Coming soon
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          We&apos;re building the document upload and review flow here. You&apos;ll
          be able to submit licenses, insurance, and certifications to get your
          Verified badge.
        </p>
      </Card>
    </div>
  );
}
