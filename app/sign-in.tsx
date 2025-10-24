/**
 * Floatplane Authentication Types and Turnstile Helpers
 *
 * This module provides type definitions and Cloudflare Turnstile captcha
 * integration for Floatplane authentication in Expo/React Native.
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode: number;
}


// ============================================================================
// Cloudflare Turnstile Integration
// ============================================================================

export interface TurnstileProps {
  siteKey: string;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact' | 'flexible';
  onSuccess: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  onTimeout?: () => void;
}

export interface TurnstileWebViewRef {
  reset: () => void;
}

/**
 * Generate HTML for Cloudflare Turnstile widget
 */
export function generateTurnstileHTML(siteKey: string, theme: 'light' | 'dark' = 'light'): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=_turnstileCb" async defer></script>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
    <style>
        * {
            box-sizing: border-box;
        }

        html, body {
            padding: 0;
            margin: 0;
            width: 100vw;
            height: 100vh;
            overflow: hidden;
            background-color: transparent;
        }

        body {
            position: relative;
        }

        #myWidget {
            position: absolute;
            left: 1px;
            right: 1px;
            top: 1px;
            bottom: 1px;

            padding: 0;
            margin: 0;
            background-color: transparent;
            border: none;
        }
    </style>
</head>
<body>
    <div id="myWidget"></div>
    <script>
        let widgetId;

        function sendMount() {
            window.ReactNativeWebView.postMessage(JSON.stringify({ event: 'mount' }));
        }

        function sendSuccess(token) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ event: 'success', token }));
        }

        function sendError() {
            window.ReactNativeWebView.postMessage(JSON.stringify({ event: 'error' }));
        }

        function sendExpired() {
            window.ReactNativeWebView.postMessage(JSON.stringify({ event: 'expire' }));
        }

        function sendTimeout() {
            window.ReactNativeWebView.postMessage(JSON.stringify({ event: 'timeout' }));
        }

        function _turnstileCb() {
            sendMount();

            widgetId = turnstile.render('#myWidget', {
                sitekey: '${siteKey}',
                size: 'flexible',
                theme: '${theme}',
                callback: sendSuccess,
                'error-callback': sendError,
                'expired-callback': sendExpired,
                'timeout-callback': sendTimeout,
            });
        }

        function resetTurnstile() {
            if (widgetId) {
                sendExpired();
                turnstile.reset(widgetId);
            }
        }
    </script>
</body>
</html>
  `;
}

/**
 * Parse message from Turnstile WebView
 */
export interface TurnstileMessage {
  event: 'mount' | 'success' | 'error' | 'expire' | 'timeout';
  token?: string;
}

export function parseTurnstileMessage(data: string): TurnstileMessage | null {
  try {
    return JSON.parse(data) as TurnstileMessage;
  } catch {
    return null;
  }
}

