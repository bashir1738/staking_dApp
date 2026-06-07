import { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet, Alert,
} from 'react-native';
import { ethers } from 'ethers';
import { Colors } from '@/constants/theme';
import { formatETH, formatDuration, getAPRLabel, lockTimeRemaining } from '@/lib/utils';
import type { StakeInfo } from '@/hooks/use-staking';

interface Props {
  stake: StakeInfo;
  onClaim: (tokenId: bigint) => Promise<void>;
  onUnstake: (tokenId: bigint) => Promise<void>;
  onEmergencyWithdraw: (tokenId: bigint) => Promise<void>;
  onTransfer: (tokenId: bigint, toAddress: string) => Promise<void>;
  isDisabled: boolean;
  emergencyMode: boolean;
  isPaused: boolean;
}

export function StakeCard({
  stake,
  onClaim,
  onUnstake,
  onEmergencyWithdraw,
  onTransfer,
  isDisabled,
  emergencyMode,
  isPaused,
}: Props) {
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferTo, setTransferTo] = useState('');
  const [transferError, setTransferError] = useState('');

  const apr = getAPRLabel(stake.amount);
  const duration = formatDuration(stake.startTime);
  const remaining = lockTimeRemaining(stake.startTime);
  const isLocked = !!remaining;
  const normalActionsBlocked = isPaused && !emergencyMode;

  const handleTransferConfirm = () => {
    setTransferError('');
    if (!ethers.isAddress(transferTo)) {
      setTransferError('Invalid Ethereum address');
      return;
    }
    onTransfer(stake.tokenId, transferTo).then(() => {
      setShowTransfer(false);
      setTransferTo('');
    });
  };

  const handleUnstake = () => {
    if (isLocked) {
      Alert.alert(
        'Early Unstake',
        `A 10% penalty (${remaining} remaining) applies. Continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Unstake', style: 'destructive', onPress: () => onUnstake(stake.tokenId) },
        ],
      );
    } else {
      onUnstake(stake.tokenId);
    }
  };

  const cardBorderColor = emergencyMode ? '#3a1a1a' : Colors.border;

  return (
    <View style={[styles.card, { borderColor: cardBorderColor }]}>
      {/* Top row */}
      <View style={styles.topRow}>
        <View>
          <View style={styles.amountRow}>
            <Text style={styles.amount}>{formatETH(stake.amount)}</Text>
            <Text style={styles.eth}> ETH</Text>
          </View>
          <Text style={styles.stakedAgo}>Staked {duration} ago</Text>
        </View>
        <View style={styles.badges}>
          <View style={styles.aprBadge}>
            <Text style={styles.aprBadgeText}>{apr} APR</Text>
          </View>
          <View style={styles.nftBadge}>
            <Text style={styles.nftBadgeText}>NFT #{stake.tokenId.toString()}</Text>
          </View>
        </View>
      </View>

      {/* Reward row */}
      <View style={styles.rewardRow}>
        <Text style={styles.rewardLabel}>Accrued rewards</Text>
        <View style={styles.rewardAmount}>
          <Text style={[styles.rewardValue, stake.pendingReward > 0n && styles.rewardValueActive]}>
            {formatETH(stake.pendingReward, 6)}
          </Text>
          <Text style={styles.rewardEth}> ETH</Text>
        </View>
      </View>

      {/* Status banner */}
      {emergencyMode ? (
        <View style={[styles.banner, styles.bannerRed]}>
          <Text style={styles.bannerIcon}>!</Text>
          <Text style={styles.bannerTextRed}>Emergency mode — withdraw principal now, no rewards paid</Text>
        </View>
      ) : isPaused ? (
        <View style={[styles.banner, styles.bannerAmber]}>
          <Text style={styles.bannerIcon}>⏸</Text>
          <Text style={styles.bannerTextAmber}>Contract paused — all actions disabled</Text>
        </View>
      ) : isLocked ? (
        <View style={[styles.banner, styles.bannerAmber]}>
          <Text style={styles.bannerIcon}>⚠</Text>
          <Text style={styles.bannerTextAmber}>Locked {remaining} remaining · 10% penalty applies</Text>
        </View>
      ) : (
        <View style={[styles.banner, styles.bannerGreen]}>
          <Text style={styles.bannerIcon}>✓</Text>
          <Text style={styles.bannerTextGreen}>Lock period complete — withdraw any time</Text>
        </View>
      )}

      {/* Actions */}
      {emergencyMode ? (
        <TouchableOpacity
          style={[styles.emergencyBtn, isDisabled && styles.btnDisabled]}
          onPress={() => onEmergencyWithdraw(stake.tokenId)}
          disabled={isDisabled}
          activeOpacity={0.7}
        >
          <Text style={styles.emergencyBtnText}>Emergency Withdraw (principal only)</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              (isDisabled || normalActionsBlocked || stake.pendingReward === 0n) && styles.btnDisabled,
            ]}
            onPress={() => onClaim(stake.tokenId)}
            disabled={isDisabled || normalActionsBlocked || stake.pendingReward === 0n}
            activeOpacity={0.7}
          >
            <Text style={styles.actionBtnText}>Claim</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionBtn,
              isLocked ? styles.unstakeBtnLocked : null,
              (isDisabled || normalActionsBlocked) && styles.btnDisabled,
            ]}
            onPress={handleUnstake}
            disabled={isDisabled || normalActionsBlocked}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionBtnText, isLocked && styles.unstakeBtnLockedText]}>
              {isLocked ? 'Unstake (−10%)' : 'Unstake'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.transferToggleBtn,
              showTransfer && styles.transferToggleBtnActive,
              (isDisabled || normalActionsBlocked) && styles.btnDisabled,
            ]}
            onPress={() => { setShowTransfer((v) => !v); setTransferError(''); }}
            disabled={isDisabled || normalActionsBlocked}
            activeOpacity={0.7}
          >
            <Text style={styles.transferToggleText}>⇄</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Transfer panel */}
      {showTransfer && !emergencyMode && (
        <View style={styles.transferPanel}>
          <Text style={styles.transferHint}>
            Transfer NFT #{stake.tokenId.toString()} — recipient gains full ownership of this stake.
          </Text>
          <TextInput
            style={[styles.transferInput, transferError ? styles.transferInputError : null]}
            placeholder="0x recipient address"
            placeholderTextColor={Colors.text3}
            value={transferTo}
            onChangeText={(v) => { setTransferTo(v); setTransferError(''); }}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {transferError ? <Text style={styles.transferError}>{transferError}</Text> : null}
          <View style={styles.transferActions}>
            <TouchableOpacity
              style={[styles.transferConfirm, (isDisabled || !transferTo) && styles.btnDisabled]}
              onPress={handleTransferConfirm}
              disabled={isDisabled || !transferTo}
              activeOpacity={0.7}
            >
              <Text style={styles.transferConfirmText}>Confirm</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.transferCancel}
              onPress={() => { setShowTransfer(false); setTransferTo(''); setTransferError(''); }}
              activeOpacity={0.7}
            >
              <Text style={styles.transferCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  amount: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: '600',
  },
  eth: {
    color: Colors.text2,
    fontSize: 16,
  },
  stakedAgo: {
    color: Colors.text3,
    fontSize: 13,
    marginTop: 2,
  },
  badges: {
    alignItems: 'flex-end',
    gap: 6,
  },
  aprBadge: {
    backgroundColor: Colors.surface3,
    borderWidth: 1,
    borderColor: Colors.border2,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  aprBadgeText: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: '500',
  },
  nftBadge: {
    backgroundColor: '#0d0d1a',
    borderWidth: 1,
    borderColor: '#2a2a4a',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  nftBadgeText: {
    color: '#818cf8',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  rewardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  rewardLabel: {
    color: Colors.text3,
    fontSize: 13,
  },
  rewardAmount: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  rewardValue: {
    color: Colors.text3,
    fontSize: 15,
    fontWeight: '600',
  },
  rewardValueActive: {
    color: Colors.text,
  },
  rewardEth: {
    color: Colors.text3,
    fontSize: 13,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  bannerRed: {
    backgroundColor: '#180808',
    borderWidth: 1,
    borderColor: '#4a1515',
  },
  bannerAmber: {
    backgroundColor: '#111008',
    borderWidth: 1,
    borderColor: '#2a2208',
  },
  bannerGreen: {
    backgroundColor: '#081208',
    borderWidth: 1,
    borderColor: '#0e2a0e',
  },
  bannerIcon: {
    fontSize: 14,
  },
  bannerTextRed: {
    color: '#fca5a5',
    fontSize: 12,
    flex: 1,
  },
  bannerTextAmber: {
    color: Colors.amber,
    fontSize: 12,
    flex: 1,
  },
  bannerTextGreen: {
    color: Colors.green,
    fontSize: 12,
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border2,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionBtnText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '500',
  },
  unstakeBtnLocked: {
    backgroundColor: '#180c0c',
    borderColor: '#3a1a1a',
  },
  unstakeBtnLockedText: {
    color: '#fca5a5',
  },
  transferToggleBtn: {
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border2,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  transferToggleBtnActive: {
    backgroundColor: '#0d0d1a',
    borderColor: '#4a4a8a',
  },
  transferToggleText: {
    color: '#818cf8',
    fontSize: 16,
  },
  emergencyBtn: {
    backgroundColor: '#2a0a0a',
    borderWidth: 1,
    borderColor: '#5a1a1a',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  emergencyBtnText: {
    color: '#fca5a5',
    fontSize: 13,
    fontWeight: '500',
  },
  btnDisabled: {
    opacity: 0.3,
  },
  transferPanel: {
    marginTop: 10,
    backgroundColor: '#0a0a14',
    borderWidth: 1,
    borderColor: '#2a2a4a',
    borderRadius: 10,
    padding: 12,
  },
  transferHint: {
    color: '#818cf8',
    fontSize: 11,
    marginBottom: 10,
  },
  transferInput: {
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: '#2a2a4a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 6,
  },
  transferInputError: {
    borderColor: '#5a1a1a',
  },
  transferError: {
    color: '#fca5a5',
    fontSize: 11,
    marginBottom: 8,
  },
  transferActions: {
    flexDirection: 'row',
    gap: 8,
  },
  transferConfirm: {
    flex: 1,
    backgroundColor: '#1a1a2a',
    borderWidth: 1,
    borderColor: '#4a4a8a',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  transferConfirmText: {
    color: '#818cf8',
    fontSize: 13,
    fontWeight: '500',
  },
  transferCancel: {
    flex: 1,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border2,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  transferCancelText: {
    color: Colors.text3,
    fontSize: 13,
  },
});
