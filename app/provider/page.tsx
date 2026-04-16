import { getProviderRequests, getUserProfile } from '@/lib/actions';
import ProviderDashboard from './ProviderDashboard';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function ProviderPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('userId')?.value;
  const userType = cookieStore.get('userType')?.value;

  if (!userId || userType !== 'Prestador') {
    redirect('/login');
  }

  const requests = await getProviderRequests(userId);
  const userProfile = await getUserProfile(userId);

  return (
    <ProviderDashboard 
      initialRequests={requests} 
      userName={userProfile?.nomeCompleto || 'Prestador'} 
      userId={userId} 
      userProfile={userProfile}
    />
  );
}
