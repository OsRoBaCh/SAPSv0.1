import { getSession, getCategories, getClientRequests, getUserProfile, getSystemSettings, getPlatformAccounts } from '@/lib/actions';
import ClientDashboard from './ClientDashboard';

export const dynamic = 'force-dynamic';

export default async function ClientPage() {
  const session = await getSession();
  
  // We'll use the mocked session or a guest session
  const userId = session?.userId || 'guest-id';

  const [categories, requests, userProfile, settings, accounts] = await Promise.all([
    getCategories(),
    getClientRequests(userId),
    getUserProfile(userId),
    getSystemSettings(),
    getPlatformAccounts()
  ]);

  return (
    <ClientDashboard 
      categories={categories} 
      initialRequests={requests} 
      userId={userId} 
      userName={userProfile?.nomeCompleto || 'Cliente'} 
      userProfile={userProfile}
      settings={settings}
      accounts={accounts}
    />
  );
}
