import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/layout/Layout";
import ProdutoForm from "@/pages/Produtos/ProdutoForm";

export const Route = createFileRoute("/_authenticated/produtos/novo")({
  component: () => (
    <Layout title="Novo Produto" breadcrumb="Produtos / Novo">
      <ProdutoForm />
    </Layout>
  ),
});
