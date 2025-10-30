import { StyleSheet, Image, ActivityIndicator } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';
import { useSession } from '@/hooks/authentication/auth.context';

export default function TabTwoScreen() {
  const { user, isLoading } = useSession();

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
      headerImage={<IconSymbol size={310} color="#808080" name="person.fill" style={styles.headerImage} />}
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText
          type="title"
          style={{
            fontFamily: Fonts.rounded,
          }}
        >
          Account
        </ThemedText>
      </ThemedView>

      {user ? (
        <ThemedView style={styles.accountContainer}>
          {user.profileImage && (
            <Image
              source={{ uri: user.profileImage.path }}
              style={styles.profileImage}
            />
          )}

          <ThemedView style={styles.infoContainer}>
            <ThemedView style={styles.infoRow}>
              <ThemedText style={styles.label}>Display Name:</ThemedText>
              <ThemedText style={styles.value}>{user.displayName || 'N/A'}</ThemedText>
            </ThemedView>

            <ThemedView style={styles.infoRow}>
              <ThemedText style={styles.label}>Username:</ThemedText>
              <ThemedText style={styles.value}>@{user.username}</ThemedText>
            </ThemedView>

            <ThemedView style={styles.infoRow}>
              <ThemedText style={styles.label}>Email:</ThemedText>
              <ThemedText style={styles.value}>{user.email || 'N/A'}</ThemedText>
            </ThemedView>

            <ThemedView style={styles.infoRow}>
              <ThemedText style={styles.label}>User ID:</ThemedText>
              <ThemedText style={styles.value}>{user.id}</ThemedText>
            </ThemedView>

            {user.creators && user.creators.length > 0 && (
              <ThemedView style={styles.infoRow}>
                <ThemedText style={styles.label}>Creators:</ThemedText>
                <ThemedText style={styles.value}>{user.creators.join(', ')}</ThemedText>
              </ThemedView>
            )}

            {user.scheduledDeletionDate && (
              <ThemedView style={styles.infoRow}>
                <ThemedText style={styles.label}>Scheduled Deletion:</ThemedText>
                <ThemedText style={styles.value}>{new Date(user.scheduledDeletionDate).toLocaleDateString()}</ThemedText>
              </ThemedView>
            )}
          </ThemedView>
        </ThemedView>
      ) : (
        <ThemedText>No user information available. Please sign in.</ThemedText>
      )}
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerImage: {
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  accountContainer: {
    gap: 20,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    marginVertical: 16,
  },
  infoContainer: {
    gap: 12,
  },
  infoRow: {
    gap: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.7,
  },
  value: {
    fontSize: 16,
  },
});
