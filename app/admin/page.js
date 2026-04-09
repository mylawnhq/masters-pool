import AdminDashboard from '@/components/AdminDashboard';

export const metadata = {
  title: "Admin — Mendoza's Masters Pool",
};

// Analytics data is queried client-side so it's always fresh.
export const dynamic = 'force-dynamic';

export default function AdminPage() {
  return <AdminDashboard />;
}
