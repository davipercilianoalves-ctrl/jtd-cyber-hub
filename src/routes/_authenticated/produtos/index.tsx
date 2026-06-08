import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/layout/Layout";
import Produtos from "@/pages/Produtos/index";

export const Route = createFileRoute("/_authenticated/produtos/")({
  component: () => (
    <Layout title="Produtos" breadcrumb="Produtos">
      <Produtos />
    </Layout>
  ),
});
