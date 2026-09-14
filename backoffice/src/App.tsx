import { NavLink, Route, Routes, Navigate } from 'react-router-dom'
import DashboardPage from './pages/DashboardPage'
import UsersPage from './pages/UsersPage'
import ListingsPage from './pages/ListingsPage'
import CategoriesPage from './pages/CategoriesPage'
import ReportsPage from './pages/ReportsPage'
import CampaignsPage from './pages/CampaignsPage'

const NAV_ITEMS = [
  { to: '/', label: 'Tableau de bord' },
  { to: '/users', label: 'Utilisateurs' },
  { to: '/listings', label: 'Annonces' },
  { to: '/categories', label: 'Catégories' },
  { to: '/reports', label: 'Signalements' },
  { to: '/campaigns', label: 'Campagnes & Boost' },
]

export default function App() {
  return (
    <div className="flex min-h-screen bg-neutral-50 text-neutral-900">
      <aside className="w-60 shrink-0 border-r border-neutral-200 bg-white p-4">
        <div className="mb-6 px-2 text-lg font-black text-red-600">Yüpixi Admin</div>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  isActive ? 'bg-red-50 text-red-600' : 'text-neutral-600 hover:bg-neutral-100'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-8">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/listings" element={<ListingsPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/campaigns" element={<CampaignsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
