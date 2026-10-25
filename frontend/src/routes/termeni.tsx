import { createFileRoute } from "@tanstack/react-router";
import { LegalDocumentPage } from "@/components/sunproof/landing/LegalPages";

export const Route = createFileRoute("/termeni")({
  head: () => ({
    meta: [
      { title: "Termeni și condiții — SunProof" },
      {
        name: "description",
        content:
          "Termenii și condițiile de utilizare a platformei SunProof pentru furnizorii de energie electrică, echipele O&M și prosumatorii din România (Legea 160/2026 · SR EN 50549-1).",
      },
    ],
  }),
  component: () => <LegalDocumentPage docKey="termeni" />,
});
