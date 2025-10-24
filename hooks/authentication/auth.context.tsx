import { createContext, PropsWithChildren, use } from 'react';

import { Subscription } from '@/types/subscriptions.interface';
import { User } from '@/types/user.interface';
import { useStorageState } from '../storage/useStorageState';

interface SignInParams {
  token: string;
  user: User;
  subscriptions: Subscription[];
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
  const [[isLoading, token], setToken] = useStorageState('token');
  const [[, user], setUser] = useStorageState('user');
  const [[, subscriptions], setSubscriptions] = useStorageState('subscriptions');
  const [[, subscription], setSubscription] = useStorageState('subscription');

  return (
    <AuthContext
      value={{
        signIn: ({ token: t, user: u, subscriptions: s }) => {
          // Perform sign-in logic here
          setToken(t);
          setUser(JSON.stringify(u));
          setSubscriptions(JSON.stringify(s));
          if (s.length) setSubscription(JSON.stringify(s[0]));
        },
        signOut: () => {
          setToken(null);
          setUser(null);
          setSubscriptions(null);
        },
        token,
        user: user ? JSON.parse(user) : undefined,
        subscriptions: subscriptions ? JSON.parse(subscriptions) : undefined,
        subscription: subscription ? JSON.parse(subscription) : undefined,
        isLoading,
      }}
    >
      {children}
    </AuthContext>
  );
}
