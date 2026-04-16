import { getSession, getAdminStats, getAllUsers, getAllRequests, getCategories, getSystemSettings, getPlatformAccounts } from '@/lib/actions';
import { redirect } from 'next/navigation';
import AdminDashboard from './AdminDashboard';

export default async function AdminPage() {
  const session = await getSession();

  if (!session || session.userType !== 'Admin') {
    redirect('/login');
  }

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
      userName={session.userName || 'Administrador'}
    />
  );
}
