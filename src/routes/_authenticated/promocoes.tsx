import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/layout/Layout";
import Promocoes from "@/pages/Promocoes";

export const Route = createFileRoute("/_authenticated/promocoes")({
  component: () => (
    <Layout title="Promoções" breadcrumb="Promoções">
      <Promocoes />
    </Layout>
  ),
});
