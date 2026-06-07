import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { shortenAddress } from '@/lib/utils';

interface Props {
  isConnected: boolean;
  address: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function WalletButton({ isConnected, address, onConnect, onDisconnect }: Props) {
  if (!isConnected) {
    return (
      <TouchableOpacity style={styles.connectBtn} onPress={onConnect} activeOpacity={0.7}>
        <Text style={styles.connectText}>Connect Wallet</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.accountBtn} onPress={onDisconnect} activeOpacity={0.7}>
      <View style={styles.dot} />
      <Text style={styles.accountText}>
        {address ? shortenAddress(address) : 'Connected'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  connectBtn: {
    backgroundColor: '#3a3a3a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4a4a4a',
  },
  connectText: {
    color: '#e8e8e8',
    fontSize: 14,
    fontWeight: '500',
  },
  accountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface2,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.green,
  },
  accountText: {
    color: Colors.text,
    fontSize: 13,
    fontFamily: 'monospace',
  },
});
