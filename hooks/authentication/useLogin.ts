import { useMutation } from '@tanstack/react-query';
import { Platform } from 'react-native';
import { API_BASE_URL, API_ENDPOINTS } from '@/constants/api';
import { User } from '@/types/user.interface';

export interface LoginRequest {
  username: string;
  password: string;
  captchaToken?: string;
}

export interface LoginResponse {
  needs2FA: boolean;
  user?: User;
  message?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode: number;
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
      body: JSON.stringify({ loginRequest: request }),
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

export function useLogin() {
  return useMutation({
    mutationFn: login,
  });
}
