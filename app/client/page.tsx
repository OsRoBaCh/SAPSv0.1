import { getCategories, getClientRequests, getUserProfile, getSystemSettings, getPlatformAccounts } from '@/lib/actions';
import ClientDashboard from './ClientDashboard';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function ClientPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('userId')?.value;
  const userType = cookieStore.get('userType')?.value;

  if (!userId || userType !== 'Cliente') {
    redirect('/login');
  }

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
