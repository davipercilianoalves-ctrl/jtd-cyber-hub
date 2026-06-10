import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/layout/Layout";
import AnuncioForm from "@/pages/Anuncios/AnuncioForm";

export const Route = createFileRoute("/_authenticated/anuncios/$id/editar")({
  component: () => (
    <Layout title="Editar Anúncio">
      <AnuncioForm />
    </Layout>
  ),
});
