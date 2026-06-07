import { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/theme';

const { width } = Dimensions.get('window');
export const ONBOARDING_KEY = 'ola_stake_onboarding_v1';

// ── Slide data ──────────────────────────────────────────────────────────────

interface Tier { apr: string; range: string; label: string }
interface Slide {
  id: string;
  accent: string;
  icon: string;
  eyebrow: string;
  title: string;
  body: string;
  tiers?: Tier[];
  features?: string[];
}

const SLIDES: Slide[] = [
  {
    id: '1',
    accent: '#4ade80',
    icon: 'Ξ',
    eyebrow: 'WELCOME',
    title: 'Stake ETH,\nEarn More',
    body: 'Put your ETH to work on Sepolia and earn fully on-chain tiered rewards — no custodians.',
  },
  {
    id: '2',
    accent: '#a78bfa',
    icon: '◈',
    eyebrow: 'HOW IT WORKS',
    title: 'The More\nYou Stake',
    body: 'Unlock higher APR as your stake grows. Every position is minted as an ERC-721 NFT you own.',
    tiers: [
      { label: 'Tier 1', apr: '5%',  range: '< 1 ETH' },
      { label: 'Tier 2', apr: '8%',  range: '1–4.99 ETH' },
      { label: 'Tier 3', apr: '12%', range: '≥ 5 ETH' },
    ],
  },
  {
    id: '3',
    accent: '#fbbf24',
    icon: '⬡',
    eyebrow: 'GET STARTED',
    title: 'Ready to\nEarn?',
    body: 'Connect your wallet and stake any amount of ETH to start compounding rewards today.',
    features: [
      'Claim rewards at any time',
      'Withdraw after the 7-day lock',
      'Transfer your NFT position',
    ],
  },
];

// ── Glow decoration ──────────────────────────────────────────────────────────

function GlowBg({ accent }: { accent: string }) {
  return (
    <View style={styles.glowWrap} pointerEvents="none">
      <View style={[styles.glowRing3, { backgroundColor: accent + '06' }]} />
      <View style={[styles.glowRing2, { backgroundColor: accent + '0C' }]} />
      <View style={[styles.glowRing1, { backgroundColor: accent + '14' }]} />
    </View>
  );
}

// ── Icon circle ──────────────────────────────────────────────────────────────

function IconCircle({ accent, icon }: { accent: string; icon: string }) {
  return (
    <View style={styles.iconOuter}>
      <View style={[styles.iconRingOuter, { borderColor: accent + '25' }]}>
        <View style={[styles.iconRingInner, { borderColor: accent + '50', backgroundColor: accent + '12' }]}>
          <Text style={[styles.iconGlyph, { color: accent }]}>{icon}</Text>
        </View>
      </View>
    </View>
  );
}

// ── Tier cards ───────────────────────────────────────────────────────────────

function TierCards({ tiers, accent }: { tiers: Tier[]; accent: string }) {
  return (
    <View style={styles.tiersRow}>
      {tiers.map((t, i) => (
        <View
          key={t.label}
          style={[
            styles.tierCard,
            i === 2 && { borderColor: accent + '60', backgroundColor: accent + '08' },
          ]}
        >
          <Text style={styles.tierLabel}>{t.label}</Text>
          <Text style={[styles.tierApr, { color: i === 2 ? accent : Colors.text }]}>{t.apr}</Text>
          <Text style={styles.tierRange}>{t.range}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Feature list ─────────────────────────────────────────────────────────────

function FeatureList({ features, accent }: { features: string[]; accent: string }) {
  return (
    <View style={styles.featureList}>
      {features.map((f, i) => (
        <View key={i} style={styles.featureRow}>
          <View style={[styles.featureCheckCircle, { backgroundColor: accent + '20', borderColor: accent + '40' }]}>
            <Text style={[styles.featureCheck, { color: accent }]}>✓</Text>
          </View>
          <Text style={styles.featureText}>{f}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Slide page ───────────────────────────────────────────────────────────────

function SlidePage({ slide }: { slide: Slide }) {
  return (
    <View style={styles.slide}>
      <GlowBg accent={slide.accent} />

      <IconCircle accent={slide.accent} icon={slide.icon} />

      <View style={styles.textBlock}>
        <Text style={[styles.eyebrow, { color: slide.accent }]}>{slide.eyebrow}</Text>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.body}>{slide.body}</Text>

        {slide.tiers && <TierCards tiers={slide.tiers} accent={slide.accent} />}
        {slide.features && <FeatureList features={slide.features} accent={slide.accent} />}
      </View>
    </View>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

interface Props { onComplete: () => void }

export function OnboardingScreen({ onComplete }: Props) {
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  // Animated width for each progress dot (active dot stretches to a pill)
  const dotWidths = useRef(
    SLIDES.map((_, i) => new Animated.Value(i === 0 ? 28 : 8)),
  ).current;
  const dotOpacities = useRef(
    SLIDES.map((_, i) => new Animated.Value(i === 0 ? 1 : 0.35)),
  ).current;

  const animateDots = useCallback((to: number) => {
    SLIDES.forEach((_, i) => {
      Animated.spring(dotWidths[i], {
        toValue: i === to ? 28 : 8,
        useNativeDriver: false,
        tension: 320,
        friction: 22,
      }).start();
      Animated.timing(dotOpacities[i], {
        toValue: i === to ? 1 : 0.35,
        duration: 200,
        useNativeDriver: false,
      }).start();
    });
  }, [dotWidths, dotOpacities]);

  const onMomentumEnd = useCallback((e: any) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== index) { setIndex(next); animateDots(next); }
  }, [index, animateDots]);

  const goNext = useCallback(() => {
    if (index < SLIDES.length - 1) {
      const next = index + 1;
      listRef.current?.scrollToIndex({ index: next, animated: true });
      setIndex(next);
      animateDots(next);
    } else {
      finish();
    }
  }, [index, animateDots]);

  const finish = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, '1');
    onComplete();
  }, [onComplete]);

  const isLast = index === SLIDES.length - 1;
  const accent = SLIDES[index].accent;

  return (
    <SafeAreaView style={styles.safe}>

      {/* ── Top bar ── */}
      <View style={styles.topBar}>
        {/* Progress pills */}
        <View style={styles.pillRow}>
          {SLIDES.map((_, i) => (
            <Animated.View
              key={i}
              style={[
                styles.pill,
                {
                  width: dotWidths[i],
                  opacity: dotOpacities[i],
                  backgroundColor: i === index ? accent : Colors.border3,
                },
              ]}
            />
          ))}
        </View>

        {/* Skip */}
        <TouchableOpacity
          onPress={finish}
          activeOpacity={0.6}
          style={[styles.skipBtn, isLast && styles.skipBtnHidden]}
          disabled={isLast}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* ── Slides ── */}
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onMomentumEnd}
        renderItem={({ item }) => <SlidePage slide={item} />}
        style={styles.list}
        bounces={false}
      />

      {/* ── Bottom bar ── */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.nextBtn,
            {
              backgroundColor: accent,
              ...Platform.select({
                ios: { shadowColor: accent, shadowOpacity: 0.45, shadowRadius: 20, shadowOffset: { width: 0, height: 6 } },
                android: { elevation: 10 },
              }),
            },
          ]}
          onPress={goNext}
          activeOpacity={0.85}
        >
          <Text style={styles.nextBtnText}>
            {isLast ? 'Get Started' : 'Continue'}
          </Text>
          {!isLast && <Text style={styles.nextArrow}>→</Text>}
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const ICON_SIZE = 112;
const RING_OUTER = ICON_SIZE + 28;
const RING_INNER = ICON_SIZE + 8;
const GLOW_BASE = width * 1.05;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bg,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 4,
    height: 52,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pill: {
    height: 4,
    borderRadius: 2,
  },
  skipBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  skipBtnHidden: {
    opacity: 0,
  },
  skipText: {
    color: Colors.text3,
    fontSize: 15,
    fontWeight: '500',
  },

  // List / slide
  list: {
    flex: 1,
  },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 28,
    overflow: 'hidden',
  },

  // Glow background concentric circles
  glowWrap: {
    position: 'absolute',
    top: -GLOW_BASE * 0.38,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    width: GLOW_BASE,
    height: GLOW_BASE,
  },
  glowRing1: {
    position: 'absolute',
    width: GLOW_BASE * 0.56,
    height: GLOW_BASE * 0.56,
    borderRadius: GLOW_BASE * 0.28,
  },
  glowRing2: {
    position: 'absolute',
    width: GLOW_BASE * 0.75,
    height: GLOW_BASE * 0.75,
    borderRadius: GLOW_BASE * 0.375,
  },
  glowRing3: {
    position: 'absolute',
    width: GLOW_BASE,
    height: GLOW_BASE,
    borderRadius: GLOW_BASE * 0.5,
  },

  // Icon
  iconOuter: {
    marginTop: 32,
    marginBottom: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconRingOuter: {
    width: RING_OUTER,
    height: RING_OUTER,
    borderRadius: RING_OUTER / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconRingInner: {
    width: RING_INNER,
    height: RING_INNER,
    borderRadius: RING_INNER / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlyph: {
    fontSize: 46,
    fontWeight: '200',
    lineHeight: 56,
  },

  // Text block
  textBlock: {
    width: '100%',
    flex: 1,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.5,
    marginBottom: 10,
  },
  title: {
    color: Colors.text,
    fontSize: 40,
    fontWeight: '700',
    lineHeight: 46,
    letterSpacing: -0.5,
    marginBottom: 14,
  },
  body: {
    color: Colors.text2,
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 28,
  },

  // Tier cards
  tiersRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tierCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 4,
  },
  tierLabel: {
    color: Colors.text3,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  tierApr: {
    fontSize: 26,
    fontWeight: '700',
  },
  tierRange: {
    color: Colors.text3,
    fontSize: 10,
    textAlign: 'center',
  },

  // Feature list
  featureList: {
    gap: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  featureCheckCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureCheck: {
    fontSize: 13,
    fontWeight: '700',
  },
  featureText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '400',
    flex: 1,
  },

  // Bottom bar
  bottomBar: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    paddingTop: 16,
  },
  nextBtn: {
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  nextBtnText: {
    color: '#000',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  nextArrow: {
    color: '#00000066',
    fontSize: 18,
    fontWeight: '700',
  },
});
