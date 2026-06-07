import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Colors } from '@/constants/theme';
import { timeAgo } from '@/lib/utils';
import type { TxHistoryItem } from '@/hooks/use-staking';

interface Props { items: TxHistoryItem[] }

const LABELS: Record<TxHistoryItem['type'], string> = {
  staked:      'Staked',
  claimed:     'Claimed',
  unstaked:    'Unstaked',
  emergency:   'Emergency',
  transferred: 'Transferred',
};

export function TxHistory({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <View>
      <Text style={styles.heading}>Transaction History</Text>
      <View style={styles.list}>
        {items.map((item, i) => (
          <View
            key={item.hash}
            style={[
              styles.row,
              { backgroundColor: i % 2 === 0 ? Colors.surface : Colors.bg },
              i < items.length - 1 && styles.rowBorder,
            ]}
          >
            <View style={styles.left}>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{LABELS[item.type]}</Text>
              </View>
              {item.amountEth !== '0' && (
                <Text style={styles.amount}>{item.amountEth} ETH</Text>
              )}
              {item.stakeIndex !== undefined && (
                <Text style={styles.stakeIndex}>#{item.stakeIndex}</Text>
              )}
            </View>

            <View style={styles.right}>
              <Text style={styles.timeAgo}>{timeAgo(item.timestamp)}</Text>
              <TouchableOpacity
                onPress={() =>
                  Linking.openURL(`https://sepolia.etherscan.io/tx/${item.hash}`)
                }
                activeOpacity={0.7}
              >
                <Text style={styles.hash}>
                  {item.hash.slice(0, 8)}…{item.hash.slice(-6)} ↗
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    color: Colors.text3,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  list: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  typeBadge: {
    backgroundColor: Colors.surface3,
    borderWidth: 1,
    borderColor: Colors.border2,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 72,
    alignItems: 'center',
  },
  typeBadgeText: {
    color: Colors.text2,
    fontSize: 11,
    fontWeight: '500',
  },
  amount: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '500',
  },
  stakeIndex: {
    color: Colors.text3,
    fontSize: 11,
    fontFamily: 'monospace',
  },
  right: {
    alignItems: 'flex-end',
    gap: 4,
  },
  timeAgo: {
    color: Colors.text3,
    fontSize: 11,
  },
  hash: {
    color: Colors.text3,
    fontSize: 11,
    fontFamily: 'monospace',
  },
});
