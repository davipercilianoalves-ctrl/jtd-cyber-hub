import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/layout/Layout";
import ProdutoForm from "@/pages/Produtos/ProdutoForm";

export const Route = createFileRoute("/_authenticated/produtos/editar")({
  component: () => {
    // In a flat file without $id, we might need a search param or similar, 
    // but let's just make it a valid route for now to stop the crash.
    return (
      <Layout title="Editar Produto" breadcrumb={`Produtos / Editar`}>
        <ProdutoForm />
      </Layout>
    );
  },
});
