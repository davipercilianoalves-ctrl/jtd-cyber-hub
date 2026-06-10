import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/layout/Layout";
import AnuncioForm from "@/pages/Anuncios/AnuncioForm";

export const Route = createFileRoute("/_authenticated/anuncios/novo")({
  component: () => (
    <Layout title="Novo Anúncio">
      <AnuncioForm />
    </Layout>
  ),
});
