import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/layout/Layout";
import Configuracoes from "@/pages/Configuracoes";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: () => <Layout title="Configurações"><Configuracoes /></Layout>,
});
