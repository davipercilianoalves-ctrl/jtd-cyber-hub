import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/layout/Layout";
import Compras from "@/pages/Compras";

export const Route = createFileRoute("/_authenticated/compras")({
  component: () => <Layout title="Compras"><Compras /></Layout>,
});
