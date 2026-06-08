import { createFileRoute } from "@tanstack/react-router";
import Fornecedores from "@/pages/Fornecedores";
import { Layout } from "@/components/layout/Layout";

export const Route = createFileRoute("/_authenticated/fornecedores")({
  component: () => (
    <Layout title="Fornecedores" breadcrumb="Fornecedores">
      <Fornecedores />
    </Layout>
  ),
});
