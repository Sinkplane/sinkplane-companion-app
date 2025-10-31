import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCompanionClient } from '@/hooks/companion-client.context';

export default function VideosScreen() {
  const { connectedDevices } = useCompanionClient();

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Videos</ThemedText>
      </View>

      <View style={styles.content}>
        {connectedDevices.length > 0 ? (
          <>
            <ThemedText style={styles.connectedText}>Connected to {connectedDevices[0].device.deviceName}</ThemedText>
            <ThemedText style={styles.statusText}>
              Status: {connectedDevices[0].device.isLoggedIn ? 'Logged In' : 'Not Logged In'}
            </ThemedText>
          </>
        ) : (
          <ThemedText style={styles.notConnectedText}>No TV connected. Please connect to a TV first.</ThemedText>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: '#212121',
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  connectedText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  statusText: {
    fontSize: 16,
    opacity: 0.8,
    textAlign: 'center',
  },
  notConnectedText: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
  },
});
