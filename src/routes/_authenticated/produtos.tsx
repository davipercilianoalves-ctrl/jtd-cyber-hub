import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/produtos')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_authenticated/produtos"!</div>
}
