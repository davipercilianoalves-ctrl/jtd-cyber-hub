import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/produtos/$id/editar')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_authenticated/produtos/$id/editar"!</div>
}
