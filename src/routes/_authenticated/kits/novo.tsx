import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/layout/Layout";
import KitForm from "@/pages/Kits/KitForm";

export const Route = createFileRoute("/_authenticated/kits/novo")({
  component: () => (
    <Layout title="Novo Kit" breadcrumb="Kits / Novo">
      <KitForm />
    </Layout>
  ),
});
