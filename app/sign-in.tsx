'use client';

import TurnstileWidget, { TurnstileWidgetHandle } from '@/components/Turnstile';
import { Colors } from '@/constants/theme';
import { useSession } from '@/hooks/authentication/auth.context';
import { useCaptchaInfo } from '@/hooks/authentication/useCaptchaInfo';
import { useLogin } from '@/hooks/authentication/useLogin';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);
  const { signIn } = useSession();
  const colorScheme = useColorScheme();
  const { mutate: login, isPending, error: loginError } = useLogin();
  const { data: captchaInfo } = useCaptchaInfo();

  const handleSignIn = async () => {
    if (!email || !password) {
      return;
    }

    // Check if captcha is required but not provided
    const captchaEnabled = !!captchaInfo?.data?.turnstile?.variants?.managed?.siteKey;
    if (captchaEnabled && !captchaToken) {
      return;
    }
    login(
      { username: email, password, captchaToken: captchaToken || undefined },
      {
        onSuccess: response => {
          if (response.success && response.data) {
            // Handle 2FA if needed
            if (response.data.needs2FA) {
              // TODO: Navigate to 2FA screen or handle 2FA flow
              return;
            }

            // Sign in successful
            if (response.data.user) {
              signIn({
                token: '', // Token is handled via cookies
                user: response.data.user,
                subscriptions: [],
              });
            }
          }
        },
        onError: () => {
          // Reset captcha on error
          turnstileRef.current?.reset();
          setCaptchaToken(null);
        },
      },
    );
  };

  useEffect(() => {
    if (captchaInfo) console.info(captchaInfo.data);
  }, [captchaInfo]);

  const colors = Colors[colorScheme ?? 'light'];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, justifyContent: 'center', flex: 1 }}
    >
      <View style={{ gap: 24 }}>
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 32, fontWeight: '700', color: colors.text }}>Sign In</Text>
          <Text style={{ fontSize: 16, color: colors.text + '99' }}>Welcome back to Sinkplane</Text>
        </View>

        <View style={{ gap: 16 }}>
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Email</Text>
            <TextInput
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              editable={!isPending}
              placeholderTextColor={colors.text + '66'}
              style={{
                borderWidth: 1,
                borderColor: colors.text + '33',
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                color: colors.text,
                backgroundColor: colors.background,
              }}
            />
          </View>

          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Password</Text>
            <TextInput
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!isPending}
              placeholderTextColor={colors.text + '66'}
              style={{
                borderWidth: 1,
                borderColor: colors.text + '33',
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                color: colors.text,
                backgroundColor: colors.background,
              }}
            />
          </View>
        </View>

        {captchaInfo?.data?.turnstile?.variants?.managed?.siteKey && (
          <TurnstileWidget
            ref={turnstileRef}
            siteKey={captchaInfo.data.turnstile.variants.managed.siteKey}
            theme={colorScheme ?? 'light'}
            onSuccess={token => {
              setCaptchaToken(token);
            }}
            onExpire={() => {
              setCaptchaToken(null);
            }}
            onError={() => {
              setCaptchaToken(null);
            }}
          />
        )}

        {loginError && <Text style={{ color: '#ef4444', fontSize: 14, textAlign: 'center' }}>{loginError.message}</Text>}

        <TouchableOpacity
          onPress={handleSignIn}
          disabled={isPending}
          style={{
            backgroundColor: colors.tint,
            padding: 14,
            borderRadius: 8,
            opacity: isPending ? 0.6 : 1,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
            {isPending && <ActivityIndicator color="white" style={{ marginRight: 8 }} />}
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>{isPending ? 'Signing in...' : 'Sign In'}</Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
