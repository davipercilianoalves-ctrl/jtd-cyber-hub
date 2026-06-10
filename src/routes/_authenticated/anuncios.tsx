import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/anuncios")({
  beforeLoad: () => {
    throw redirect({
      to: "/anuncios/",
    });
  },
});
