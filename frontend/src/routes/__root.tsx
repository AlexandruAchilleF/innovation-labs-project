import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { AppShell } from "@/components/sunproof/shell/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { reportLovableError } from "../lib/lovable-error-reporting";

const ghostBtn =
  "inline-flex items-center justify-center rounded-[4px] border border-bone bg-transparent px-4 py-2 text-[14px] font-medium text-bone transition-colors hover:bg-slate";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-normal text-bone">404</h1>
        <h2 className="mt-4 font-display text-xl font-normal text-bone">Pagina nu a fost găsită</h2>
        <p className="mt-2 text-[14px] text-fog">Pagina căutată nu există sau a fost mutată.</p>
        <div className="mt-6">
          <Link to="/" className={ghostBtn}>
            Înapoi la hartă
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="max-w-md text-center">
        <h2 className="font-display text-2xl font-normal text-bone">Pagina nu s-a încărcat</h2>
        <p className="mt-2 text-[14px] text-fog">
          A apărut o eroare la noi. Reîncearcă sau întoarce-te la hartă.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className={ghostBtn}
          >
            Reîncearcă
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-[4px] border border-iron bg-transparent px-4 py-2 text-[14px] font-medium text-fog transition-colors hover:bg-slate hover:text-bone"
          >
            Înapoi la hartă
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
      { title: "SunProof — Energy & Grid Intelligence" },
      {
        name: "description",
        content: "Platformă de diagnostic pentru furnizori de energie și prosumatori din România.",
      },
      { property: "og:title", content: "SunProof — Energy & Grid Intelligence" },
      {
        property: "og:description",
        content: "Platformă de diagnostic pentru furnizori de energie și prosumatori din România.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;1,400&family=Inter:wght@400;500;600;700&family=Fira+Code:wght@400;500;600&display=swap",
      },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ro" className="dark">
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

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <AppShell>
        <Outlet />
      </AppShell>
      <Toaster />
    </QueryClientProvider>
  );
}
