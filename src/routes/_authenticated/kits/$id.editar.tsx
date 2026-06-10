import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/layout/Layout";
import KitForm from "@/pages/Kits/KitForm";

export const Route = createFileRoute("/_authenticated/kits/$id/editar")({
  component: () => (
    <Layout title="Editar Kit" breadcrumb="Kits / Editar">
      <KitForm />
    </Layout>
  ),
});
