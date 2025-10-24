import { useMutation } from '@tanstack/react-query';
import { Platform } from 'react-native';
import { API_BASE_URL, API_ENDPOINTS } from '@/constants/api';

export interface TwoFactorRequest {
  token: string;
}

export interface LoginResponse {
  needs2FA: boolean;
  user?: {
    id: string;
    username: string;
    email: string;
  };
  message?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode: number;
}

async function checkFor2FA(request: TwoFactorRequest): Promise<ApiResponse<LoginResponse>> {
  try {
    const url = `${API_BASE_URL}${API_ENDPOINTS.CHECK_2FA}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `Floatplane/${Platform.OS}`,
      },
      body: JSON.stringify({ checkFor2faLoginRequest: request }),
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

export function useCheckFor2FA() {
  return useMutation({
    mutationFn: checkFor2FA,
  });
}
