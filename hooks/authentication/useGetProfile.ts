import { useQuery } from '@tanstack/react-query';

import { API_BASE_URL } from '@/constants/api';
import { IStatusResponse } from '@/types/status.interface';

const platform = 'android';
const version = '0.5.8';

const fetchProfile = async (token: string): Promise<IStatusResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/v3/status?platform=${platform}&version=${version}`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `sails.sid=${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch profile: ${response.status} - ${errorText}`);
  }

  const data = response.json();
  console.info('Fetched profile data:', data);
  return data;
};

export const useGetProfile = (token?: string) =>
  useQuery({
    queryKey: ['profile', token],
    queryFn: () => fetchProfile(token!),
    enabled: !!token,
  });
