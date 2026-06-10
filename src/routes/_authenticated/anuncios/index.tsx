import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/layout/Layout";
import Anuncios from "@/pages/Anuncios/index";

export const Route = createFileRoute("/_authenticated/anuncios/")({
  component: () => (
    <Layout title="Anúncios" breadcrumb="Anúncios">
      <Anuncios />
    </Layout>
  ),
});

