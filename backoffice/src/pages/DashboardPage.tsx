export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Tableau de bord</h1>
      <p className="mt-2 text-neutral-500">
        Statistiques du marketplace (ventes, inscriptions, annonces actives) — branchées sur la query{' '}
        <code className="rounded bg-neutral-100 px-1">adminStats</code> au Sprint 5.
      </p>
    </div>
  )
}
