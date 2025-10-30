import { Pressable, ScrollView, StyleSheet, View, StatusBar, useColorScheme } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCompanionClient } from '@/hooks/useCompanionClient';

export default function HomeScreen() {
  const { discoveredTVs, connectedTV, isConnected } = useCompanionClient();
  const colorScheme = useColorScheme();

  const connectionMode = process.env.EXPO_PUBLIC_CONNECTION_MODE || 'discovery';
  const tvList =
    connectionMode === 'autoconnect' && connectedTV
      ? [connectedTV]
      : discoveredTVs;

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1F1F1F" />
      
      {/* Header */}
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>TVs</ThemedText>
      </View>

      {/* Main List */}
      <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
        {tvList.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <MaterialCommunityIcons name="magnify" size={64} color="#999" />
            <ThemedText style={styles.emptyStateText}>Searching for TVs...</ThemedText>
          </View>
        ) : (
          tvList.map((tv, index) => (
            <Pressable key={tv.id} onPress={() => {}} style={styles.listItemPressable}>
              <View
                style={[
                  styles.listItem,
                  index !== tvList.length - 1 && styles.listItemBorder,
                ]}
              >
                {/* Icon */}
                <View style={styles.iconContainer}>
                  <MaterialCommunityIcons
                    name={isConnected && connectedTV?.id === tv.id ? 'wifi' : 'wifi-off'}
                    size={32}
                    color={isConnected && connectedTV?.id === tv.id ? '#4CAF50' : '#999'}
                  />
                </View>

                {/* Content */}
                <View style={styles.contentContainer}>
                  <ThemedText style={styles.tvName}>{tv.name}</ThemedText>
                  <ThemedText style={styles.tvSubtitle}>
                    {tv.host}:{tv.port} • {tv.platform}
                  </ThemedText>
                </View>

                {/* Status Badge */}
                <View style={styles.trailingContainer}>
                  {isConnected && connectedTV?.id === tv.id && (
                    <View style={styles.connectedBadge}>
                      <ThemedText style={styles.connectedText}>Connected</ThemedText>
                    </View>
                  )}
                </View>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  listContainer: {
    flex: 1,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyStateText: {
    fontSize: 16,
    marginTop: 16,
    opacity: 0.7,
  },
  listItemPressable: {
    width: '100%',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  listItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  iconContainer: {
    marginRight: 16,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  tvName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  tvSubtitle: {
    fontSize: 13,
    opacity: 0.7,
  },
  trailingContainer: {
    marginLeft: 12,
    justifyContent: 'center',
  },
  connectedBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  connectedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
});
