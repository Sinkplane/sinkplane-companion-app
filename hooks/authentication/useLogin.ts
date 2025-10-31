import { API_BASE_URL, API_ENDPOINTS } from '@/constants/api';
import { ApiResponse } from '@/types/api-response.interface';
import { User } from '@/types/user.interface';
import CookieManager from '@react-native-cookies/cookies';
import { useMutation } from '@tanstack/react-query';
import { Platform } from 'react-native';

export interface LoginRequest {
  username: string;
  password: string;
  captchaToken?: string;
}

export interface LoginResponse {
  needs2FA: boolean;
  user?: User;
  message?: string;
  authToken?: string;
}

async function login(request: LoginRequest): Promise<ApiResponse<LoginResponse>> {
  try {
    const url = `${API_BASE_URL}${API_ENDPOINTS.LOGIN}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `Floatplane/${Platform.OS}`,
      },
      body: JSON.stringify({ ...request }),
      credentials: 'include',
    });

    const data = await response.json();
    // const cookie = response.c;
    const cookies = (await CookieManager.get('https://floatplane.com')) ?? {};
    const authToken = cookies['sails.sid'];
    if (!authToken || !authToken.value) throw new Error('auth token not retrievable');

    return {
      success: response.ok,
      data: response.ok ? { ...data, authToken: authToken.value } : undefined,
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

export function useLogin() {
  return useMutation({
    mutationFn: login,
  });
}
