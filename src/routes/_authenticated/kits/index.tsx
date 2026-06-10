import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/layout/Layout";
import Kits from "@/pages/Kits/index";

export const Route = createFileRoute("/_authenticated/kits/")({
  component: () => (
    <Layout title="Kits e Composições" breadcrumb="Kits">
      <Kits />
    </Layout>
  ),
});
