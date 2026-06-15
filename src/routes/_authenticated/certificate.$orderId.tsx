import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Printer, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCertificate } from "@/lib/orders.functions";

export const Route = createFileRoute(
  "/_authenticated/certificate/$orderId",
)({
  head: () => ({ meta: [{ title: "Certificate of Completion — Lemonaidely" }] }),
  component: CertificatePage,
});

function CertificatePage() {
  const { orderId } = Route.useParams();
  const navigate = useNavigate();
  const fetchCert = useServerFn(getCertificate);

  const { data, isLoading, error } = useQuery({
    queryKey: ["certificate", orderId],
    queryFn: () => fetchCert({ data: { order_id: orderId } }),
  });

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading certificate…</p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">
          Certificate not available yet or you don't have access.
        </p>
        <Button variant="outline" onClick={() => navigate({ to: "/dashboard/learner/schedule" })}>
          Back to My Schedule
        </Button>
      </main>
    );
  }

  const issuedDate = new Date(data.issued_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 0; }
          html, body { background: white !important; }
          body * { visibility: hidden; }
          #certificate, #certificate * { visibility: visible; }
          #certificate {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <main className="min-h-screen bg-muted/40 py-8 px-4">
        <div className="no-print mx-auto mb-6 flex max-w-[1100px] items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="mr-2 size-4" /> Back
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="mr-2 size-4" /> Print / Save as PDF
          </Button>
        </div>

        <div
          id="certificate"
          className="mx-auto bg-white text-[#1a1a1a] shadow-lg"
          style={{
            width: "min(1100px, 100%)",
            aspectRatio: "297 / 210",
            padding: "56px 72px",
            position: "relative",
            border: "12px double #c9a84c",
            fontFamily: "Georgia, 'Times New Roman', serif",
          }}
        >
          {/* Corner flourishes */}
          <div
            style={{
              position: "absolute",
              top: 18,
              left: 18,
              right: 18,
              bottom: 18,
              border: "1px solid #c9a84c",
              pointerEvents: "none",
            }}
          />

          <div className="flex h-full flex-col items-center justify-between text-center">
            <div>
              <p
                style={{
                  letterSpacing: "0.5em",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#c9a84c",
                  textTransform: "uppercase",
                }}
              >
                Lemonaidely
              </p>
              <div
                style={{
                  height: 1,
                  width: 80,
                  background: "#c9a84c",
                  margin: "8px auto 0",
                }}
              />
            </div>

            <div>
              <h1
                style={{
                  fontSize: 52,
                  fontWeight: 400,
                  letterSpacing: "0.04em",
                  margin: 0,
                }}
              >
                Certificate of Completion
              </h1>
              <p
                style={{
                  marginTop: 28,
                  fontSize: 16,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "#666",
                }}
              >
                This certifies that
              </p>
              <p
                style={{
                  marginTop: 16,
                  fontSize: 40,
                  fontWeight: 600,
                  fontStyle: "italic",
                }}
              >
                {data.learner_name}
              </p>
              <p
                style={{
                  marginTop: 18,
                  fontSize: 16,
                  color: "#444",
                }}
              >
                has successfully completed the course
              </p>
              <p
                style={{
                  marginTop: 10,
                  fontSize: 26,
                  fontWeight: 600,
                }}
              >
                {data.course_title}
              </p>
              <p
                style={{
                  marginTop: 18,
                  fontSize: 15,
                  color: "#555",
                }}
              >
                Instructed by <strong>{data.aide_name}</strong>
              </p>
            </div>

            <div
              className="flex w-full items-end justify-between"
              style={{ fontSize: 12, color: "#555" }}
            >
              <div style={{ textAlign: "left", minWidth: 200 }}>
                <div style={{ borderBottom: "1px solid #999", height: 28 }} />
                <p style={{ marginTop: 4 }}>Instructor</p>
                <p style={{ fontWeight: 600, color: "#1a1a1a" }}>
                  {data.aide_name}
                </p>
              </div>

              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 11, letterSpacing: "0.2em", color: "#999" }}>
                  CERTIFICATE NUMBER
                </p>
                <p
                  style={{
                    marginTop: 4,
                    fontSize: 16,
                    fontWeight: 700,
                    letterSpacing: "0.15em",
                    color: "#c9a84c",
                  }}
                >
                  {data.cert_number}
                </p>
                <p style={{ marginTop: 4 }}>Issued {issuedDate}</p>
              </div>

              <div style={{ textAlign: "right", minWidth: 200 }}>
                <div style={{ borderBottom: "1px solid #999", height: 28 }} />
                <p style={{ marginTop: 4 }}>Issued by</p>
                <p style={{ fontWeight: 600, color: "#1a1a1a" }}>Lemonaidely</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
