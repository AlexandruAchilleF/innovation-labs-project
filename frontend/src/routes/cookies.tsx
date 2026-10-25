import { createFileRoute } from "@tanstack/react-router";
import { LegalDocumentPage } from "@/components/sunproof/landing/LegalPages";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Politică de cookies și stocare locală — SunProof" },
      {
        name: "description",
        content:
          "Politica privind fișierele cookie și stocarea tehnică locală în platforma SunProof (Legea 506/2004 · fără module de urmărire publicitară).",
      },
    ],
  }),
  component: () => <LegalDocumentPage docKey="cookies" />,
});
