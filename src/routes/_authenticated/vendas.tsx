import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/layout/Layout";
import Vendas from "@/pages/Vendas";

export const Route = createFileRoute("/_authenticated/vendas")({
  component: () => <Layout title="Vendas"><Vendas /></Layout>,
});
