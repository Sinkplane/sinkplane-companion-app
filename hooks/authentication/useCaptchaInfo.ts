import { useQuery } from '@tanstack/react-query';
import { Platform } from 'react-native';
import { API_BASE_URL, API_ENDPOINTS } from '@/constants/api';

export interface CaptchaInfo {
  siteKey: string;
  enabled: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode: number;
}

async function fetchCaptchaInfo(): Promise<ApiResponse<CaptchaInfo>> {
  try {
    const url = `${API_BASE_URL}${API_ENDPOINTS.CAPTCHA_INFO}`;
    const response = await fetch(url, {
      method: 'GET',
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

export function useCaptchaInfo() {
  return useQuery({
    queryKey: ['captchaInfo'],
    queryFn: fetchCaptchaInfo,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}
