import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { BottomNav } from "@/components/layout/BottomNav";
import { useAuthListener } from "@/hooks/useAuthListener";
import { useFxRates } from "@/hooks/useFxRates";
import { CurrencyBootstrapper } from "@/components/layout/CurrencyBootstrapper";
import { ProfileCompletionRedirector } from "@/components/auth/ProfileCompletionRedirector";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "FishTrippers — Book your next fishing trip" },
      {
        name: "description",
        content:
          "FishTrippers is the marketplace for booking top-rated fishing charters and guides. Find your next trip or list your boat in minutes.",
      },
      { name: "author", content: "FishTrippers" },
      { property: "og:title", content: "FishTrippers — Book your next fishing trip" },
      {
        property: "og:description",
        content:
          "Discover top-rated fishing charters and guides. Book your next trip with FishTrippers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@FishTrippers" },
      { name: "twitter:title", content: "FishTrippers — Book your next fishing trip" },
      {
        name: "twitter:description",
        content:
          "Discover top-rated fishing charters and guides. Book your next trip with FishTrippers.",
      },
    ],
    scripts: [
      {
        src: "https://www.googletagmanager.com/gtag/js?id=G-DTV9TW1TEF",
        async: true,
      },
      {
        children:
          "window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-DTV9TW1TEF');",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function FxRatesLoader() {
  useFxRates();
  return null;
}

function CurrencyInit() {
  return (
    <>
      <FxRatesLoader />
      <CurrencyBootstrapper />
    </>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useAuthListener();
  const router = useRouter();
  const pathname = router.state.location.pathname;
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isDashboardRoute = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const isAuthRoute = pathname === "/login" || pathname === "/register";

  if (isAdminRoute) {
    return (
      <QueryClientProvider client={queryClient}>
        <FxRatesLoader />
        <ImpersonationBanner />
        <Outlet />
        <Toaster />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <FxRatesLoader />
      <ProfileCompletionRedirector />
      <ImpersonationBanner />
      <SiteHeader />
      <div className="min-w-0 max-w-full overflow-x-hidden pb-20 lg:pb-0">
        <Outlet />
        {!isDashboardRoute && !isAuthRoute && <SiteFooter />}
      </div>
      <BottomNav />
      <Toaster />
    </QueryClientProvider>
  );
}


