import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/layout/Layout";
import API from "@/pages/API";

export const Route = createFileRoute("/_authenticated/api")({
  component: () => <Layout title="API"><API /></Layout>,
});
