import { useQuery } from '@tanstack/react-query';

import { API_BASE_URL } from '@/constants/api';
import { Creator } from '@/types/creator-list.interface';

const fetchCreatorList = async (token: string, creatorIds: string[]): Promise<Creator[]> => {
  const params = new URLSearchParams();
  creatorIds.forEach((id, index) => params.append(`ids[${index}]`, id));

  const response = await fetch(`${API_BASE_URL}/api/v3/creator/list?${params.toString()}`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `sails.sid=${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch creator list: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.info(data);
  return data;
};

export const useGetCreatorList = (token?: string, creatorIds?: string[]) =>
  useQuery({
    queryKey: ['creatorList', token, creatorIds],
    queryFn: () => fetchCreatorList(token!, creatorIds!),
    enabled: !!token && !!creatorIds && creatorIds.length > 0,
    staleTime: 30000, // 30 seconds
    gcTime: 30000, // 30 seconds (formerly cacheTime)
  });
