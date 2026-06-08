import { createFileRoute } from "@tanstack/react-router";
import { LoginForm } from "@/components/auth/LoginForm";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "JTD — Login" },
      { name: "description", content: "Acesso interno JTD." },
    ],
  }),
  component: LoginForm,
});
