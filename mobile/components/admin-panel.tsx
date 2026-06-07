import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';

interface Props {
  isPaused: boolean;
  emergencyMode: boolean;
  onPause: () => Promise<void>;
  onUnpause: () => Promise<void>;
  onSetEmergencyMode: (enabled: boolean) => Promise<void>;
  isDisabled: boolean;
}

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  disabled: boolean;
  danger?: boolean;
  active?: boolean;
}

function ActionButton({ label, onPress, disabled, danger, active }: ActionButtonProps) {
  const bg = danger
    ? (active ? '#2a0a0a' : '#1a0808')
    : (active ? '#0a1a0a' : '#0a1208');
  const border = danger
    ? (active ? '#7a1a1a' : '#3a1515')
    : (active ? '#1a5a1a' : '#152a15');
  const textColor = danger ? '#fca5a5' : '#86efac';

  return (
    <TouchableOpacity
      style={[styles.actionBtn, { backgroundColor: bg, borderColor: border }, disabled && styles.btnDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={[styles.actionBtnText, { color: textColor }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function AdminPanel({ isPaused, emergencyMode, onPause, onUnpause, onSetEmergencyMode, isDisabled }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.ownerBadge}>
        <Text style={styles.ownerBadgeText}>Owner Controls</Text>
      </View>

      {/* Status */}
      <View style={styles.statusRow}>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Contract</Text>
          <Text style={[styles.statusValue, { color: isPaused ? Colors.amber : Colors.green }]}>
            {isPaused ? 'Paused' : 'Active'}
          </Text>
        </View>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Emergency</Text>
          <Text style={[styles.statusValue, { color: emergencyMode ? Colors.red : Colors.green }]}>
            {emergencyMode ? 'ON' : 'OFF'}
          </Text>
        </View>
      </View>

      {/* Pause controls */}
      <Text style={styles.sectionLabel}>Pause system</Text>
      <View style={styles.btnRow}>
        <ActionButton
          label="Pause"
          onPress={onPause}
          disabled={isDisabled || isPaused}
          danger
          active={isPaused}
        />
        <ActionButton
          label="Unpause"
          onPress={onUnpause}
          disabled={isDisabled || !isPaused}
          active={!isPaused}
        />
      </View>

      {/* Emergency controls */}
      <Text style={[styles.sectionLabel, { marginTop: 14 }]}>Emergency mode</Text>
      <View style={styles.btnRow}>
        <ActionButton
          label="Enable Emergency"
          onPress={() => onSetEmergencyMode(true)}
          disabled={isDisabled || emergencyMode}
          danger
          active={emergencyMode}
        />
        <ActionButton
          label="Disable Emergency"
          onPress={() => onSetEmergencyMode(false)}
          disabled={isDisabled || !emergencyMode}
          active={!emergencyMode}
        />
      </View>

      <Text style={styles.ownerNote}>Only visible to the contract owner.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: '#2a2a1a',
    borderRadius: 14,
    padding: 16,
  },
  ownerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#1a1a08',
    borderWidth: 1,
    borderColor: '#3a3a15',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 14,
  },
  ownerBadgeText: {
    color: '#d4d48a',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statusItem: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusLabel: {
    color: Colors.text3,
    fontSize: 12,
  },
  statusValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionLabel: {
    color: Colors.text3,
    fontSize: 12,
    marginBottom: 8,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '500',
  },
  btnDisabled: {
    opacity: 0.3,
  },
  ownerNote: {
    color: Colors.text3,
    fontSize: 12,
    marginTop: 12,
  },
});
