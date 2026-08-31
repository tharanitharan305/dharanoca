import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Satellite } from "lucide-react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

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
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

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
      { title: "OrbitClear — Satellite Launch Window Advisor" },
      {
        name: "description",
        content:
          "Rule-based launch window advisor that checks satellite traffic near a launch site before recommending a safe launch time.",
      },
      { name: "author", content: "Dharan — Grade 12" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&family=Noto+Sans+Tamil:wght@400;500;600&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
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

const navItems = [
  { to: "/", label: "Launch Planner" },
  { to: "/traffic", label: "Traffic Data" },
  { to: "/how-it-works", label: "How it Works" },
] as const;

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={150}>
        <div className="starfield min-h-screen font-sans text-foreground">
          <div className="orbit-grid min-h-screen">
            <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur">
              <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-6 2xl:px-10">
                <Link to="/" className="flex items-center gap-2.5">
                  <span className="flex size-9 items-center justify-center rounded-md border border-primary/40 bg-primary/10">
                    <Satellite className="size-4 text-primary" />
                  </span>
                  <span className="leading-tight">
                    <span className="glow-text block font-display text-base font-semibold tracking-wide">
                      OrbitClear
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      Satellite Launch Window Advisor
                    </span>
                  </span>
                </Link>
                <nav className="flex gap-1 overflow-x-auto">
                  {navItems.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      className="rounded-md px-3 py-2 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
                      activeOptions={{ exact: item.to === "/" }}
                      activeProps={{
                        className:
                          "rounded-md px-3 py-2 text-sm whitespace-nowrap bg-primary/15 text-primary border border-primary/30",
                      }}
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>
            </header>

            {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
            <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
              <Outlet />
            </main>

            <footer className="border-t border-border/70 py-6 text-center text-xs text-muted-foreground">
              OrbitClear v2 — By Dharan (Grade 12)
            </footer>
          </div>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
