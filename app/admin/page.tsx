import { getSession, getAdminStats, getAllUsers, getAllRequests, getCategories, getSystemSettings, getPlatformAccounts } from '@/lib/actions';
import AdminDashboard from './AdminDashboard';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const session = await getSession();
  const userId = session?.userId || 'guest-admin-id';

  const [statsData, users, requests, categories, settings, accounts] = await Promise.all([
    getAdminStats(),
    getAllUsers(),
    getAllRequests(),
    getCategories(),
    getSystemSettings(),
    getPlatformAccounts()
  ]);

  return (
    <AdminDashboard 
      initialStats={statsData} 
      initialUsers={users} 
      initialRequests={requests}
      initialCategories={categories}
      initialSettings={settings}
      initialAccounts={accounts}
      userName={session?.userName || 'Administrador'}
    />
  );
}
