import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/layout/Layout";
import Financeiro from "@/pages/Financeiro";

export const Route = createFileRoute("/_authenticated/financeiro")({
  component: () => (
    <Layout title="Financeiro">
      <Financeiro />
    </Layout>
  ),
});
