import { createFileRoute } from "@tanstack/react-router";
import { LegalDocumentPage } from "@/components/sunproof/landing/LegalPages";

export const Route = createFileRoute("/confidentialitate")({
  head: () => ({
    meta: [
      { title: "Politică de confidențialitate (GDPR) — SunProof" },
      {
        name: "description",
        content:
          "Politica de confidențialitate și protecția datelor cu caracter personal și a telemetriei energetice pe platforma SunProof (Regulamentul UE 2016/679 · Legea 190/2018).",
      },
    ],
  }),
  component: () => <LegalDocumentPage docKey="confidentialitate" />,
});
