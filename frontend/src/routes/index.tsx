import { createFileRoute } from "@tanstack/react-router";
import { Landing } from "@/components/sunproof/landing/Landing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SunProof — Diagnostic pentru furnizori și prosumatori" },
      {
        name: "description",
        content:
          "Rețea sau instalație locală, baterii blocate în vârful de seară, facturi reconciliate (Legea 160/2026). Diagnostic pentru furnizori de energie și prosumatori din România.",
      },
      {
        property: "og:title",
        content: "SunProof — Diagnostic pentru furnizori și prosumatori",
      },
      {
        property: "og:description",
        content:
          "Rețea sau instalație locală, baterii blocate în vârful de seară, facturi reconciliate (Legea 160/2026).",
      },
    ],
  }),
  component: Landing,
});
