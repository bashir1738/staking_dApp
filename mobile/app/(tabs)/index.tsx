import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWallet } from '@/hooks/use-wallet';
import { useStaking } from '@/hooks/use-staking';
import { Colors } from '@/constants/theme';
import { WalletButton } from '@/components/wallet-button';
import { Dashboard } from '@/components/dashboard';
import { StakeForm } from '@/components/stake-form';
import { StakeCard } from '@/components/stake-card';
import { TxStatusToast } from '@/components/tx-status-toast';

export default function StakeScreen() {
  const wallet = useWallet();
  const staking = useStaking(wallet.signer, wallet.address);

  const isBusy = staking.txState.status === 'signing' || staking.txState.status === 'pending';
  const activeStakes = staking.stakes.filter((s) => s.active);
  const isDisabled = isBusy || (staking.isPaused && !staking.emergencyMode);
  const isOwner =
    !!wallet.address &&
    !!staking.contractOwner &&
    wallet.address.toLowerCase() === staking.contractOwner.toLowerCase();

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.appName}>Ola Stake</Text>
          <View style={styles.networkBadge}>
            <Text style={styles.networkBadgeText}>Sepolia</Text>
          </View>
        </View>
        <WalletButton
          isConnected={wallet.isConnected}
          address={wallet.address}
          onConnect={wallet.connect}
          onDisconnect={wallet.disconnect}
        />
      </View>

      {/* Wrong network banner */}
      {wallet.isConnected && !wallet.onSepolia && (
        <View style={styles.networkBanner}>
          <Text style={styles.networkBannerText}>⚠  Wrong network — switch to Sepolia</Text>
          <TouchableOpacity onPress={wallet.switchToSepolia} activeOpacity={0.7}>
            <Text style={styles.switchBtn}>Switch</Text>
          </TouchableOpacity>
        </View>
      )}

      {!wallet.isConnected ? (
        <Landing onConnect={wallet.connect} />
      ) : !wallet.onSepolia ? (
        <WrongNetwork onSwitch={wallet.switchToSepolia} />
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
          <Dashboard
            totalStaked={staking.totalStaked}
            totalRewardsPaid={staking.totalRewardsPaid}
            totalClaimable={staking.totalClaimable}
            activeStakesCount={activeStakes.length}
          />

          <View style={styles.divider} />

          {/* Emergency banner */}
          {staking.emergencyMode && (
            <View style={styles.emergencyBanner}>
              <Text style={styles.emergencyTitle}>! Emergency Mode Active</Text>
              <Text style={styles.emergencyText}>
                The contract is in emergency mode. You can withdraw your principal immediately — no rewards will be paid.
              </Text>
            </View>
          )}

          {/* Paused banner */}
          {staking.isPaused && !staking.emergencyMode && (
            <View style={styles.pausedBanner}>
              <Text style={styles.pausedTitle}>⏸ Contract Paused</Text>
              <Text style={styles.pausedText}>
                Staking, claiming, and withdrawals are temporarily disabled.
              </Text>
            </View>
          )}

          {/* Stake form */}
          <StakeForm
            onStake={staking.doStake}
            isDisabled={isDisabled || staking.emergencyMode}
            walletBalance={wallet.walletBalance}
          />

          <View style={styles.divider} />

          {/* Stakes section */}
          <View style={styles.stakesHeader}>
            <Text style={styles.stakesTitle}>Your Stakes</Text>
            {activeStakes.length > 0 && (
              <Text style={styles.stakeCount}>{activeStakes.length} active</Text>
            )}
          </View>

          {activeStakes.length === 0 ? (
            <View style={styles.emptyStakes}>
              <Text style={styles.emptyTitle}>No active stakes</Text>
              <Text style={styles.emptyText}>Stake some ETH above to start earning</Text>
            </View>
          ) : (
            activeStakes.map((stake) => (
              <StakeCard
                key={stake.tokenId.toString()}
                stake={stake}
                onClaim={staking.doClaimRewards}
                onUnstake={staking.doUnstake}
                onEmergencyWithdraw={staking.doEmergencyUserWithdraw}
                onTransfer={staking.doTransfer}
                isDisabled={isBusy}
                emergencyMode={staking.emergencyMode}
                isPaused={staking.isPaused}
              />
            ))
          )}
        </ScrollView>
      )}

      <TxStatusToast txState={staking.txState} onDismiss={staking.clearTxStatus} />
    </SafeAreaView>
  );
}

function Landing({ onConnect }: { onConnect: () => void }) {
  return (
    <ScrollView contentContainerStyle={styles.landingContent}>
      <Text style={styles.landingTitle}>Ola Stake</Text>
      <Text style={styles.landingSubtitle}>
        Stake your ETH on Sepolia and earn tiered APR rewards
      </Text>

      <View style={styles.tierGrid}>
        {[
          { range: '< 1 ETH', apr: '5%', label: 'Tier 1' },
          { range: '1 – 4.99 ETH', apr: '8%', label: 'Tier 2' },
          { range: '≥ 5 ETH', apr: '12%', label: 'Tier 3' },
        ].map((t) => (
          <View key={t.label} style={styles.tierCard}>
            <Text style={styles.tierLabel}>{t.label}</Text>
            <Text style={styles.tierApr}>{t.apr}</Text>
            <Text style={styles.tierRange}>{t.range}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.connectLargeBtn} onPress={onConnect} activeOpacity={0.8}>
        <Text style={styles.connectLargeBtnText}>Connect Wallet</Text>
      </TouchableOpacity>

      <Text style={styles.landingNote}>7-day lock period · −10% early exit penalty</Text>
    </ScrollView>
  );
}

function WrongNetwork({ onSwitch }: { onSwitch: () => void }) {
  return (
    <View style={styles.wrongNetCenter}>
      <View style={styles.wrongNetIcon}>
        <Text style={{ color: Colors.red, fontSize: 20 }}>⚠</Text>
      </View>
      <Text style={styles.wrongNetTitle}>Wrong Network</Text>
      <Text style={styles.wrongNetSub}>This app requires the Sepolia testnet</Text>
      <TouchableOpacity style={styles.switchLargeBtn} onPress={onSwitch} activeOpacity={0.7}>
        <Text style={styles.switchLargeBtnText}>Switch to Sepolia</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  appName: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  networkBadge: {
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border2,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  networkBadgeText: {
    color: Colors.text3,
    fontSize: 11,
    fontWeight: '500',
  },
  networkBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a0a00',
    borderBottomWidth: 1,
    borderBottomColor: '#3a1a00',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  networkBannerText: {
    color: Colors.amber,
    fontSize: 13,
  },
  switchBtn: {
    color: Colors.amber,
    fontSize: 13,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 0,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 20,
  },
  emergencyBanner: {
    backgroundColor: '#180808',
    borderWidth: 1,
    borderColor: '#5a1a1a',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  emergencyTitle: {
    color: '#fca5a5',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  emergencyText: {
    color: '#e08080',
    fontSize: 12,
    lineHeight: 18,
  },
  pausedBanner: {
    backgroundColor: '#111008',
    borderWidth: 1,
    borderColor: '#3a2a08',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  pausedTitle: {
    color: Colors.amber,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  pausedText: {
    color: '#c0a060',
    fontSize: 12,
    lineHeight: 18,
  },
  stakesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stakesTitle: {
    color: Colors.text3,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  stakeCount: {
    color: Colors.text3,
    fontSize: 12,
  },
  emptyStakes: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border2,
    borderRadius: 14,
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    color: Colors.text3,
    fontSize: 14,
  },
  emptyText: {
    color: Colors.text3,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },

  // Landing
  landingContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  landingTitle: {
    color: Colors.text,
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 10,
  },
  landingSubtitle: {
    color: Colors.text2,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 36,
  },
  tierGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 36,
    width: '100%',
  },
  tierCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  tierLabel: {
    color: Colors.text3,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  tierApr: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  tierRange: {
    color: Colors.text3,
    fontSize: 10,
    textAlign: 'center',
  },
  connectLargeBtn: {
    backgroundColor: '#3a3a3a',
    borderRadius: 14,
    paddingHorizontal: 40,
    paddingVertical: 16,
    marginBottom: 16,
  },
  connectLargeBtnText: {
    color: '#e8e8e8',
    fontSize: 16,
    fontWeight: '600',
  },
  landingNote: {
    color: Colors.text3,
    fontSize: 13,
  },

  // Wrong network
  wrongNetCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  wrongNetIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#180a0a',
    borderWidth: 1,
    borderColor: '#3a1515',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  wrongNetTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  wrongNetSub: {
    color: Colors.text2,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  switchLargeBtn: {
    backgroundColor: '#3a3a3a',
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  switchLargeBtnText: {
    color: '#e8e8e8',
    fontSize: 15,
    fontWeight: '500',
  },
});
