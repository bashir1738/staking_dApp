import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWallet } from '@/hooks/use-wallet';
import { useStaking } from '@/hooks/use-staking';
import { Colors } from '@/constants/theme';
import { TxHistory } from '@/components/tx-history';

export default function HistoryScreen() {
  const wallet = useWallet();
  const staking = useStaking(wallet.signer, wallet.address);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Transaction History</Text>
      </View>

      {!wallet.isConnected ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>↺</Text>
          <Text style={styles.emptyTitle}>Connect your wallet</Text>
          <Text style={styles.emptyText}>Connect to view your transaction history</Text>
        </View>
      ) : staking.txHistory.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>↺</Text>
          <Text style={styles.emptyTitle}>No transactions yet</Text>
          <Text style={styles.emptyText}>Your transactions will appear here after you stake</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={staking.isLoading}
              onRefresh={staking.refresh}
              tintColor={Colors.text3}
            />
          }
        >
          <TxHistory items={staking.txHistory} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    color: Colors.text3,
    marginBottom: 16,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  emptyText: {
    color: Colors.text3,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
});
