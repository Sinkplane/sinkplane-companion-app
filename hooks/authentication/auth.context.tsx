import { createContext, PropsWithChildren, use, useEffect, useState } from 'react';

import { Subscription } from '@/types/subscriptions.interface';
import { User } from '@/types/user.interface';
import { useStorageState } from '../storage/useStorageState';
import { useGetProfile } from './useGetProfile';
import { useGetSubscriptions } from './useGetSubscription';

interface SignInParams {
  token: string;
  user: User;
}

export interface AuthState {
  user?: User;
  subscriptions?: Subscription[];
  subscription?: Subscription;
  token?: string | null;
  signIn: (params: SignInParams) => void;
  signOut: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthState>({
  signIn: _ => null,
  signOut: () => null,
  isLoading: false,
});

// This hook can be used to access the user info.
export function useSession() {
  const value = use(AuthContext);
  if (!value) {
    throw new Error('useSession must be wrapped in a <SessionProvider />');
  }

  return value;
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [[tokenLoading, token], setToken] = useStorageState('token');
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User>();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>();
  const [subscription, setSubscription] = useState<Subscription>();
  const { refetch: refetchSubscriptions } = useGetSubscriptions(token ?? undefined);
  const { refetch: refetchProfile } = useGetProfile(token ?? undefined);

  useEffect(() => {
    if (token && !tokenLoading) {
      const fetchData = async () => {
        try {
          // Fetch profile
          const profileResult = await refetchProfile();
          console.info('[Auth] Fetched profile result:', profileResult);
          if (profileResult.data?.selfUser) {
            setUser(profileResult.data.selfUser);
          } else {
            console.error('[Auth] No user data in profile result');
          }

          // Fetch subscriptions
          const subscriptionsResult = await refetchSubscriptions();
          if (subscriptionsResult.data) {
            setSubscriptions(subscriptionsResult.data);
            if (subscriptionsResult.data.length) setSubscription(subscriptionsResult.data[0]);
          } else {
            console.error('[Auth] No subscriptions data in result');
          }
        } catch (error) {
          console.error('[Auth] Error fetching user data:', error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchData();
    } else if (!token && !tokenLoading) {
      setUser(undefined);
      setSubscriptions(undefined);
      setSubscription(undefined);
      setIsLoading(false);
    } else {
      console.info('[Auth] Waiting for token to load...');
    }
  }, [token, tokenLoading, refetchProfile, refetchSubscriptions]);

  const signIn = async ({ token: t, user: u }: SignInParams) => {
    // Perform sign-in logic here
    setToken(t);
    setUser(u);

    // Fetch subscriptions
    const { data } = await refetchSubscriptions();
    if (data) {
      setSubscriptions(data);
      if (data.length) setSubscription(data[0]);
    }
  };
  const signOut = () => {
    setToken(undefined);
    setUser(undefined);
    setSubscriptions(undefined);
  };

  return (
    <AuthContext
      value={{
        signIn,
        signOut,
        token,
        user,
        subscriptions,
        subscription,
        isLoading,
      }}
    >
      {children}
    </AuthContext>
  );
}
