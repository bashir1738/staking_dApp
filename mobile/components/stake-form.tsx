import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { ethers } from 'ethers';
import { Colors } from '@/constants/theme';
import { formatETH, getAPRLabel, getAPRBps } from '@/lib/utils';

interface Props {
  onStake: (amountEth: string) => Promise<void>;
  isDisabled: boolean;
  walletBalance: bigint;
}

const TIERS = [
  { range: '< 1 ETH', apr: '5%', bps: 500 },
  { range: '1–4.99 ETH', apr: '8%', bps: 800 },
  { range: '≥ 5 ETH', apr: '12%', bps: 1200 },
];

export function StakeForm({ onStake, isDisabled, walletBalance }: Props) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const amountWei = (() => {
    try { return amount && parseFloat(amount) > 0 ? ethers.parseEther(amount) : null; }
    catch { return null; }
  })();

  const activeAPR = amountWei ? getAPRLabel(amountWei) : null;
  const activeBps = amountWei ? getAPRBps(amountWei) : null;

  const est30d = amountWei && activeBps
    ? (amountWei * BigInt(activeBps) * 30n * 86400n) / (365n * 86400n * 10000n)
    : null;

  const handleMax = () => {
    if (walletBalance === 0n) return;
    const gas = ethers.parseEther('0.005');
    const max = walletBalance > gas ? walletBalance - gas : walletBalance;
    setAmount(ethers.formatEther(max));
    setError('');
  };

  const handleSubmit = async () => {
    setError('');
    const val = parseFloat(amount);
    if (!amount || isNaN(val) || val <= 0) {
      setError('Enter a valid ETH amount.');
      return;
    }
    if (val < 0.001) {
      setError('Minimum stake is 0.001 ETH.');
      return;
    }
    if (walletBalance > 0n && ethers.parseEther(amount) > walletBalance) {
      setError('Amount exceeds wallet balance.');
      return;
    }
    await onStake(amount);
    setAmount('');
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Stake ETH</Text>

      {/* Input */}
      <View style={[styles.inputRow, error ? styles.inputError : null]}>
        <TextInput
          style={styles.input}
          placeholder="0.0"
          placeholderTextColor={Colors.text3}
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={(v) => { setAmount(v); setError(''); }}
          editable={!isDisabled}
        />
        <View style={styles.inputRight}>
          <Text style={styles.ethLabel}>ETH</Text>
          {walletBalance > 0n && (
            <TouchableOpacity
              onPress={handleMax}
              disabled={isDisabled}
              style={styles.maxBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.maxText}>MAX</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {walletBalance > 0n && !error && (
        <Text style={styles.balanceHint}>
          Available: <Text style={{ color: Colors.text2 }}>{formatETH(walletBalance, 4)} ETH</Text>
        </Text>
      )}

      {/* APR preview / tier table */}
      {amountWei && est30d ? (
        <View style={styles.aprBox}>
          <View>
            <Text style={styles.aprLabelText}>APR for this amount</Text>
            <Text style={styles.aprValue}>{activeAPR}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.aprLabelText}>Est. reward / 30 days</Text>
            <Text style={styles.estReward}>+{formatETH(est30d, 6)} ETH</Text>
          </View>
        </View>
      ) : (
        <View style={styles.tierRow}>
          {TIERS.map((t) => (
            <View key={t.bps} style={styles.tierItem}>
              <Text style={styles.tierApr}>{t.apr}</Text>
              <Text style={styles.tierRange}>{t.range}</Text>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={[styles.submitBtn, (isDisabled || !amount) && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={isDisabled || !amount}
        activeOpacity={0.7}
      >
        <Text style={styles.submitText}>{isDisabled ? 'Processing…' : 'Stake ETH'}</Text>
      </TouchableOpacity>

      <Text style={styles.disclaimer}>7-day lock period · 10% early exit penalty</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 20,
  },
  title: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.border2,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 6,
  },
  inputError: {
    borderColor: '#4a1a1a',
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.text,
    fontSize: 18,
    fontWeight: '500',
  },
  inputRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 12,
  },
  ethLabel: {
    color: Colors.text2,
    fontSize: 14,
    fontWeight: '500',
  },
  maxBtn: {
    backgroundColor: Colors.surface3,
    borderWidth: 1,
    borderColor: Colors.border2,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  maxText: {
    color: Colors.text2,
    fontSize: 11,
    fontWeight: '500',
  },
  error: {
    color: Colors.red,
    fontSize: 12,
    marginBottom: 10,
  },
  balanceHint: {
    color: Colors.text3,
    fontSize: 12,
    marginBottom: 14,
  },
  aprBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
  },
  aprLabelText: {
    color: Colors.text3,
    fontSize: 11,
    marginBottom: 4,
  },
  aprValue: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  estReward: {
    color: Colors.text2,
    fontSize: 13,
    fontWeight: '500',
  },
  tierRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 14,
  },
  tierItem: {
    alignItems: 'center',
  },
  tierApr: {
    color: Colors.text2,
    fontSize: 14,
    fontWeight: '600',
  },
  tierRange: {
    color: Colors.text3,
    fontSize: 11,
    marginTop: 2,
  },
  submitBtn: {
    backgroundColor: '#3a3a3a',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  submitDisabled: {
    opacity: 0.35,
  },
  submitText: {
    color: '#e8e8e8',
    fontSize: 14,
    fontWeight: '600',
  },
  disclaimer: {
    color: Colors.text3,
    fontSize: 12,
    textAlign: 'center',
  },
});
