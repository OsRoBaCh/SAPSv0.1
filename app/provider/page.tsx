import { getSession, getProviderRequests, getUserProfile } from '@/lib/actions';
import ProviderDashboard from './ProviderDashboard';

export const dynamic = 'force-dynamic';

export default async function ProviderPage() {
  const session = await getSession();
  const userId = session?.userId || 'guest-provider-id';

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
