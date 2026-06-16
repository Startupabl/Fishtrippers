import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CANCELLATION_POLICY_DETAILS,
  type CancellationPolicy,
} from "@/lib/operators.shared";

interface Props {
  cancellationPolicy: CancellationPolicy | null | undefined;
}

export function PoliciesBlock({ cancellationPolicy }: Props) {
  const policy = cancellationPolicy ? CANCELLATION_POLICY_DETAILS[cancellationPolicy] : null;

  return (
    <section id="policies" className="scroll-mt-32 space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">Policies</h2>
      <Accordion type="multiple" className="rounded-2xl border bg-card px-4">
        {policy && (
          <AccordionItem value="cancel">
            <AccordionTrigger>How cancellations work — {policy.title}</AccordionTrigger>
            <AccordionContent>
              <p className="mb-2 text-sm text-muted-foreground">{policy.summary}</p>
              <ul className="space-y-1 text-sm">
                {policy.terms.map((t, i) => (
                  <li key={i}>• {t}</li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        )}
        <AccordionItem value="listing">
          <AccordionTrigger>Listing policies</AccordionTrigger>
          <AccordionContent>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Pickup details are coordinated after booking.</li>
              <li>• No smoking on board.</li>
              <li>• Guests are responsible for required fishing licenses.</li>
              <li>• Children welcome unless captain notes otherwise.</li>
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  );
}
