export interface SubscriptionPlan {
  id: string;
  title: string;
  description: string;
  price: string;
  priceYearly: string;
  currency: string;
  logo: string | null;
  interval: string;
  featured: boolean;
  allowGrandfatheredAccess: boolean;
  discordServers: string[];
  discordRoles: string[];
  enabled: boolean;
  enabledGlobal: boolean;
}

export interface Subscription {
  startDate: string;
  endDate: string;
  paymentID: number;
  interval: string;
  paymentCancelled: boolean;
  plan: SubscriptionPlan; // Corrected type from Subscription to SubscriptionPlan
  creator: string;
}
