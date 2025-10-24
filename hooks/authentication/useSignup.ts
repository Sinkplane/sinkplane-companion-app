import { useMutation } from '@tanstack/react-query';
import { Platform } from 'react-native';
import { API_BASE_URL, API_ENDPOINTS } from '@/constants/api';

export interface SignupRequest {
  username: string;
  email: string;
  password: string;
  captchaToken?: string;
}

export interface SignupResponse {
  success: boolean;
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

async function signup(request: SignupRequest): Promise<ApiResponse<SignupResponse>> {
  try {
    const url = `${API_BASE_URL}${API_ENDPOINTS.SIGNUP}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `Floatplane/${Platform.OS}`,
      },
      body: JSON.stringify({ signupRequest: request }),
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

export function useSignup() {
  return useMutation({
    mutationFn: signup,
  });
}
