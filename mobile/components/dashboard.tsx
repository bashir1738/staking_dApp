import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { formatETH } from '@/lib/utils';

interface Props {
  totalStaked: bigint;
  totalRewardsPaid: bigint;
  totalClaimable: bigint;
  activeStakesCount: number;
}

interface StatProps {
  label: string;
  value: string;
  dim?: string;
}

function Stat({ label, value, dim }: StatProps) {
  return (
    <View style={styles.stat}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {dim && <Text style={styles.dim}>{dim}</Text>}
    </View>
  );
}

export function Dashboard({ totalStaked, totalRewardsPaid, totalClaimable, activeStakesCount }: Props) {
  return (
    <View style={styles.grid}>
      <Stat label="Total Staked" value={`${formatETH(totalStaked)} ETH`} />
      <Stat
        label="Your Positions"
        value={String(activeStakesCount)}
        dim={activeStakesCount === 1 ? 'active stake' : 'active stakes'}
      />
      <Stat label="Claimable" value={`${formatETH(totalClaimable, 6)} ETH`} dim="pending rewards" />
      <Stat label="Rewards Paid" value={`${formatETH(totalRewardsPaid)} ETH`} dim="all time" />
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  stat: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 16,
  },
  label: {
    color: Colors.text3,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  value: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  dim: {
    color: Colors.text3,
    fontSize: 11,
    marginTop: 4,
  },
});
