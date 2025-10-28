import { useQuery } from '@tanstack/react-query';

import { Subscription } from '@/types/subscriptions.interface';

import { API_BASE_URL } from '@/constants/api';

const fetchSubscriptions = async (token: string): Promise<Subscription[]> => {
  const response = await fetch(`${API_BASE_URL}/api/v3/user/subscriptions?active=true`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `sails.sid=${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch subscriptions: ${response.status} - ${errorText}`);
  }

  return response.json();
};

export const useGetSubscriptions = (token?: string) =>
  useQuery({
    queryKey: ['subscriptions', token],
    queryFn: () => fetchSubscriptions(token!),
    enabled: !!token,
  });
