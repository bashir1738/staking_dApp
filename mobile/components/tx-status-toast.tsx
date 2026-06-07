import { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Linking,
} from 'react-native';
import { Colors } from '@/constants/theme';
import type { TxState } from '@/hooks/use-staking';

interface Props {
  txState: TxState;
  onDismiss: () => void;
}

const CFG = {
  idle: null,
  signing: { color: '#9e9e9e', label: 'Waiting for signature…', spin: true },
  pending: { color: Colors.amber, label: 'Transaction pending…', spin: true },
  confirmed: { color: Colors.green, label: 'Confirmed!', spin: false },
  error: { color: Colors.red, label: '', spin: false },
} as const;

export function TxStatusToast({ txState, onDismiss }: Props) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const cfg = CFG[txState.status];
    if (cfg && cfg.spin) {
      Animated.loop(
        Animated.timing(spin, { toValue: 1, duration: 800, useNativeDriver: true }),
      ).start();
    } else {
      spin.setValue(0);
    }
  }, [txState.status, spin]);

  if (txState.status === 'idle') return null;
  const cfg = CFG[txState.status];
  if (!cfg) return null;

  const label = txState.status === 'error' ? txState.message : cfg.label;
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const openEtherscan = () => {
    if (txState.hash) {
      Linking.openURL(`https://sepolia.etherscan.io/tx/${txState.hash}`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.toast}>
        {/* Indicator */}
        <View style={styles.indicator}>
          {cfg.spin ? (
            <Animated.View
              style={[styles.spinner, { borderColor: cfg.color, transform: [{ rotate }] }]}
            />
          ) : (
            <View style={[styles.dot, { backgroundColor: cfg.color }]}>
              <Text style={styles.dotIcon}>
                {txState.status === 'confirmed' ? '✓' : '✕'}
              </Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.label}>{label}</Text>
          {txState.hash && (
            <TouchableOpacity onPress={openEtherscan} activeOpacity={0.7}>
              <Text style={styles.hash}>
                {txState.hash.slice(0, 10)}…{txState.hash.slice(-8)} ↗
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity onPress={onDismiss} style={styles.dismiss} activeOpacity={0.7}>
          <Text style={styles.dismissText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    zIndex: 100,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: Colors.surface3,
    borderWidth: 1,
    borderColor: Colors.border2,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  indicator: {
    marginTop: 2,
  },
  spinner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderTopColor: 'transparent',
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotIcon: {
    fontSize: 9,
    color: '#000',
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  label: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  hash: {
    color: Colors.text3,
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  dismiss: {
    paddingLeft: 4,
  },
  dismissText: {
    color: Colors.text3,
    fontSize: 16,
  },
});
