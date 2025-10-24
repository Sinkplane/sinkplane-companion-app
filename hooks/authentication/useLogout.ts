import { useMutation } from '@tanstack/react-query';
import { Platform } from 'react-native';
import { API_BASE_URL, API_ENDPOINTS } from '@/constants/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode: number;
}

async function logout(): Promise<ApiResponse<void>> {
  try {
    const url = `${API_BASE_URL}${API_ENDPOINTS.LOGOUT}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `Floatplane/${Platform.OS}`,
      },
      credentials: 'include',
    });

    const data = await response.json();

    return {
      success: response.ok,
      data: response.ok ? data : undefined,
      error: !response.ok ? data.message || 'Request failed' : undefined,
      statusCode: response.status,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      statusCode: 0,
    };
  }
}

export function useLogout() {
  return useMutation({
    mutationFn: logout,
  });
}
