import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/produtos/novo')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_authenticated/produtos/novo"!</div>
}
