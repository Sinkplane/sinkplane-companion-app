// ============================================================================
// Cloudflare Turnstile Integration
// ============================================================================

import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';

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
export function generateTurnstileHTML(siteKey: string, theme: 'light' | 'dark' | 'auto' = 'light'): string {
  const leftPadding = 1;
  const rightPadding = 1;
  const topPadding = 1;
  const bottomPadding = 1;

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
            left: ${leftPadding}px;
            right: ${rightPadding}px;
            top: ${topPadding}px;
            bottom: ${bottomPadding}px;

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

        function sendError(err) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ event: 'error', data: err }));
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
  errorCode?: string;
  errorMessage?: string;
}

export function parseTurnstileMessage(data: string): TurnstileMessage | null {
  try {
    return JSON.parse(data) as TurnstileMessage;
  } catch {
    return null;
  }
}

export interface TurnstileWidgetProps extends TurnstileProps {
  containerStyle?: object;
  errorStyle?: object;
  loadingColor?: string;
}

export type TurnstileWidgetHandle = TurnstileWebViewRef;

export const TurnstileWidget = forwardRef<TurnstileWidgetHandle, TurnstileWidgetProps>((props, ref) => {
  const { siteKey, theme = 'light', onSuccess, onError, onExpire, onTimeout, containerStyle, errorStyle, loadingColor = '#888' } = props;

  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Expose reset method to parent
  useImperativeHandle(ref, () => ({
    reset: () => {
      if (webViewRef.current && isMounted) {
        webViewRef.current.injectJavaScript('resetTurnstile();');
        setHasError(false);
      }
    },
  }));

  const handleMessage = (event: WebViewMessageEvent) => {
    const message: TurnstileMessage | null = parseTurnstileMessage(event.nativeEvent.data);

    if (!message) {
      return;
    }

    switch (message.event) {
      case 'mount':
        setIsLoading(false);
        setIsMounted(true);
        break;

      case 'success':
        if (message.token) {
          onSuccess(message.token);
        }
        break;

      case 'error':
        console.error('[Turnstile] Error callback triggered', {
          message,
          errorCode: message.errorCode,
          errorMessage: message.errorMessage,
        });
        setHasError(true);
        onError?.();
        break;

      case 'expire':
        onExpire?.();
        break;

      case 'timeout':
        onTimeout?.();
        break;
    }
  };

  const htmlContent = generateTurnstileHTML(siteKey, theme);

  if (hasError) {
    return (
      <View style={[styles.errorContainer, errorStyle]}>
        <Text style={styles.errorText}>Captcha not supported in this environment.</Text>
        <Text style={[styles.errorText, { fontSize: 12, fontWeight: '400', marginTop: 4 }]}>
          Try using the web version or contact support.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, containerStyle]}>
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={loadingColor} size={40} />
        </View>
      )}
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent, baseUrl: 'https://www.floatplane.com' }}
        onMessage={handleMessage}
        onError={syntheticEvent => {
          const { nativeEvent } = syntheticEvent;
          console.error('[Turnstile] WebView error:', nativeEvent);
        }}
        onHttpError={syntheticEvent => {
          const { nativeEvent } = syntheticEvent;
          console.error('[Turnstile] HTTP error:', nativeEvent.statusCode, nativeEvent.url);
        }}
        originWhitelist={['https://challenges.cloudflare.com']}
        style={[styles.webView, isLoading && styles.hidden]}
        scrollEnabled={false}
        bounces={false}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState={false}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    height: 67,
    flex: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  webView: {
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  hidden: {
    opacity: 0,
  },
  errorContainer: {
    height: 67,
    borderWidth: 1,
    borderColor: '#dc2626',
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  errorText: {
    fontWeight: '700',
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
  },
  loadingContainer: {
    backgroundColor: 'rgba(136, 136, 136, 0.1)',
    height: 67,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});

export default TurnstileWidget;
