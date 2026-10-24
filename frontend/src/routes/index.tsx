import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/triaj", search: { household: "RO-TM-001" } });
  },
  head: () => ({
    meta: [
      { title: "SunProof — Energy & Grid Intelligence" },
      { name: "description", content: "Platformă de diagnostic pentru furnizori de energie și prosumatori din România." },
      { property: "og:title", content: "SunProof — Energy & Grid Intelligence" },
      { property: "og:description", content: "Platformă de diagnostic pentru furnizori de energie și prosumatori din România." },
    ],
  }),
});
