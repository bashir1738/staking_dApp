import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWallet } from '@/hooks/use-wallet';
import { useStaking } from '@/hooks/use-staking';
import { Colors } from '@/constants/theme';
import { AdminPanel } from '@/components/admin-panel';
import { shortenAddress, formatETH } from '@/lib/utils';
import { TxStatusToast } from '@/components/tx-status-toast';

export default function AccountScreen() {
  const wallet = useWallet();
  const staking = useStaking(wallet.signer, wallet.address);

  const isBusy = staking.txState.status === 'signing' || staking.txState.status === 'pending';
  const isOwner =
    !!wallet.address &&
    !!staking.contractOwner &&
    wallet.address.toLowerCase() === staking.contractOwner.toLowerCase();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Account</Text>
      </View>

      {!wallet.isConnected ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>⊙</Text>
          <Text style={styles.emptyTitle}>Not connected</Text>
          <Text style={styles.emptyText}>Connect your wallet on the Stake tab to see your account</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Account card */}
          <View style={styles.accountCard}>
            <View style={styles.avatarRow}>
              <View style={styles.avatar}>
                <View style={styles.avatarDot} />
              </View>
              <View>
                <Text style={styles.addressText}>
                  {wallet.address ? shortenAddress(wallet.address) : '—'}
                </Text>
                <Text style={styles.networkLabel}>Sepolia Testnet</Text>
              </View>
            </View>

            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>Wallet Balance</Text>
              <Text style={styles.balanceValue}>
                {formatETH(wallet.walletBalance, 4)} ETH
              </Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsCard}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Active Stakes</Text>
              <Text style={styles.statValue}>
                {staking.stakes.filter((s) => s.active).length}
              </Text>
            </View>
            <View style={[styles.statRow, styles.statRowBorder]}>
              <Text style={styles.statLabel}>Claimable Rewards</Text>
              <Text style={styles.statValue}>{formatETH(staking.totalClaimable, 6)} ETH</Text>
            </View>
            <View style={[styles.statRow, styles.statRowBorder]}>
              <Text style={styles.statLabel}>Contract Status</Text>
              <Text style={[
                styles.statValue,
                { color: staking.isPaused ? Colors.amber : Colors.green },
              ]}>
                {staking.isPaused ? 'Paused' : 'Active'}
              </Text>
            </View>
            {staking.emergencyMode && (
              <View style={[styles.statRow, styles.statRowBorder]}>
                <Text style={styles.statLabel}>Emergency Mode</Text>
                <Text style={[styles.statValue, { color: Colors.red }]}>ON</Text>
              </View>
            )}
          </View>

          {/* Disconnect */}
          <TouchableOpacity
            style={styles.disconnectBtn}
            onPress={wallet.disconnect}
            activeOpacity={0.7}
          >
            <Text style={styles.disconnectText}>Disconnect Wallet</Text>
          </TouchableOpacity>

          {/* Owner admin panel */}
          {isOwner && (
            <>
              <View style={styles.divider} />
              <AdminPanel
                isPaused={staking.isPaused}
                emergencyMode={staking.emergencyMode}
                onPause={staking.doPause}
                onUnpause={staking.doUnpause}
                onSetEmergencyMode={staking.doSetEmergencyMode}
                isDisabled={isBusy}
              />
            </>
          )}
        </ScrollView>
      )}

      <TxStatusToast txState={staking.txState} onDismiss={staking.clearTxStatus} />
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
    gap: 0,
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
  accountCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface3,
    borderWidth: 1,
    borderColor: Colors.border2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.green,
  },
  addressText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  networkLabel: {
    color: Colors.text3,
    fontSize: 12,
    marginTop: 2,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  balanceLabel: {
    color: Colors.text3,
    fontSize: 13,
  },
  balanceValue: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  statsCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  statRowBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  statLabel: {
    color: Colors.text3,
    fontSize: 13,
  },
  statValue: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  disconnectBtn: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: '#3a1515',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  disconnectText: {
    color: '#fca5a5',
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 20,
  },
});
