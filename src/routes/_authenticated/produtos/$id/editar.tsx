import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/layout/Layout";
import ProdutoForm from "@/pages/Produtos/ProdutoForm";

export const Route = createFileRoute("/_authenticated/produtos/$id/editar")({
  component: () => {
    const { id } = Route.useParams();
    return (
      <Layout title="Editar Produto" breadcrumb="Produtos / Editar">
        <ProdutoForm productId={id} />
      </Layout>
    );
  },
});
