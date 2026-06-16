import { Sparkles } from "lucide-react";

export function WhatsBitingStub() {
  return (
    <section id="biting" className="scroll-mt-32 space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">What&apos;s biting</h2>
      <div className="flex items-start gap-3 rounded-2xl border border-dashed bg-card p-6">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
        <div>
          <h3 className="font-semibold">Live fishing reports coming soon</h3>
          <p className="text-sm text-muted-foreground">
            We&apos;ll display recent catch reports and seasonal hot spots here once our reporting
            API is connected.
          </p>
        </div>
      </div>
    </section>
  );
}
