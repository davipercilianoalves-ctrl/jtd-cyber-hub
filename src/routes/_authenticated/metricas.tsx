import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/layout/Layout";
import Metricas from "@/pages/Metricas";

export const Route = createFileRoute("/_authenticated/metricas")({
  component: () => <Layout title="Métricas"><Metricas /></Layout>,
});
