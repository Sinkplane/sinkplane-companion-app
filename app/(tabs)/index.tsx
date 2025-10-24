import { Image } from 'expo-image';
import { Button, ScrollView, StyleSheet } from 'react-native';

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCompanionClient } from '@/hooks/useCompanionClient';

import logo from '@/assets/images/partial-react-logo.png';

export default function HomeScreen() {
  const { discoveredTVs, connectedTV, isConnected, receivedMessages, connectToTV, connectManually, disconnect, sendCommand } =
    useCompanionClient();

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={<Image source={logo} style={styles.reactLogo} />}
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">TV Companion</ThemedText>
        <HelloWave />
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Connection Status</ThemedText>
        <ThemedText>{isConnected ? `✅ Connected to: ${connectedTV?.name}` : '❌ Not connected'}</ThemedText>
        <ThemedText>Discovered TVs: {discoveredTVs.length}</ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Manual Connection (Simulator)</ThemedText>
        <ThemedText>Connecting to TV on host network:</ThemedText>
        <Button title="Connect to 192.168.1.148:9999" onPress={() => connectManually('192.168.1.148', 9999, 'TV Simulator')} />
        <Button title="Try localhost:9999" onPress={() => connectManually('127.0.0.1', 9999, 'TV Simulator Local')} />
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Discovered TVs</ThemedText>
        {discoveredTVs.length === 0 ? (
          <ThemedText>Searching for TVs... (Note: Discovery doesn't work in simulator)</ThemedText>
        ) : (
          discoveredTVs.map(tv => (
            <ThemedView key={tv.id} style={styles.tvItem}>
              <ThemedText type="defaultSemiBold">{tv.name}</ThemedText>
              <ThemedText>
                Host: {tv.host}:{tv.port}
              </ThemedText>
              <ThemedText>Platform: {tv.platform}</ThemedText>
              <Button
                title={isConnected && connectedTV?.id === tv.id ? 'Disconnect' : 'Connect'}
                onPress={() => {
                  if (isConnected && connectedTV?.id === tv.id) {
                    disconnect();
                  } else {
                    connectToTV(tv);
                  }
                }}
              />
            </ThemedView>
          ))
        )}
      </ThemedView>

      {isConnected && (
        <ThemedView style={styles.stepContainer}>
          <ThemedText type="subtitle">Send Commands</ThemedText>
          <Button title="Send Test Command" onPress={() => sendCommand('test', { foo: 'bar' })} />
          <Button title="Play" onPress={() => sendCommand('play')} />
          <Button title="Pause" onPress={() => sendCommand('pause')} />
        </ThemedView>
      )}

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Messages ({receivedMessages.length})</ThemedText>
        <ScrollView style={styles.messageList}>
          {receivedMessages
            .slice(-5)
            .reverse()
            .map((msg, idx) => (
              <ThemedView key={idx} style={styles.message}>
                <ThemedText type="defaultSemiBold">{msg.type}</ThemedText>
                <ThemedText>{JSON.stringify(msg.payload, null, 2)}</ThemedText>
              </ThemedView>
            ))}
        </ScrollView>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  tvItem: {
    padding: 12,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
  },
  messageList: {
    maxHeight: 200,
  },
  message: {
    padding: 8,
    marginVertical: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
});
