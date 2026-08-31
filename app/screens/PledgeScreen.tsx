import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, Modal, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pledgeApi, socialBetApi, challengeApi, getStorageUrl } from '../../services/api';
import { storage } from '../../services/storage';

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG     = '#080808';
const CARD   = '#111111';
const CARD2  = '#191919';
const BORDER = '#242424';
const PINK   = '#FF0066';
const GOLD   = '#F59E0B';
const GREEN  = '#22C55E';
const TEXT   = '#ffffff';
const MUTED  = '#666666';
const SUB    = '#999999';

// ─── Types ────────────────────────────────────────────────────────────────────
type PledgeMember = {
  user_id: number; name: string; avatar: string | null;
  target_days: number | null; current_days: number | null;
  fulfilled: boolean; has_pledge: boolean;
};
type PledgeData = {
  month: number; year: number; my_pledge: number | null; pledges: PledgeMember[];
};

type SocialBet = {
  id: number;
  bet_type: 'first_to_fail' | 'first_to_quit' | 'most_days' | 'complete_all' | 'custom';
  description: string | null;
  stake: string | null;
  status: 'open' | 'resolved';
  outcome: boolean | null;
  resolved_at: string | null;
  resolved_by: string | null;
  creator: { id: number; name: string; avatar: string | null };
  target_user: { id: number; name: string; avatar: string | null };
  is_mine: boolean;
  is_about_me: boolean;
};

type Member = { user_id: number; name: string; avatar: string | null };

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                 'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const BET_TYPES: { key: SocialBet['bet_type']; label: string; icon: React.ComponentProps<typeof Ionicons>['name']; color: string }[] = [
  { key: 'first_to_fail',  label: 'Primero en fallar un día',   icon: 'close-circle-outline',    color: '#EF4444' },
  { key: 'first_to_quit',  label: 'Primero en rendirse',        icon: 'flag-outline',            color: '#F97316' },
  { key: 'most_days',      label: 'Más días al final del mes',  icon: 'trophy-outline',          color: GOLD },
  { key: 'complete_all',   label: 'Completará el reto',         icon: 'checkmark-circle-outline',color: GREEN },
  { key: 'custom',         label: 'Apuesta personalizada',      icon: 'create-outline',          color: '#A78BFA' },
];

function betLabel(type: SocialBet['bet_type']): { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; color: string } {
  return BET_TYPES.find(b => b.key === type) ?? BET_TYPES[4]!;
}

// ─── Mini avatar ──────────────────────────────────────────────────────────────
function Avatar({ url, name, size = 40 }: { url: string | null; name: string; size?: number }) {
  const r = size / 2;
  if (url) return <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: r }} contentFit="cover" />;
  return (
    <View style={{ width: size, height: size, borderRadius: r, backgroundColor: CARD2, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: PINK, fontWeight: '900', fontSize: size * 0.4 }}>{(name[0] ?? '?').toUpperCase()}</Text>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function PledgeScreen() {
  const { challengeId, enableBets, isCreator } = useLocalSearchParams<{
    challengeId: string; enableBets?: string; isCreator?: string;
  }>();
  const router  = useRouter();
  const insets  = useSafeAreaInsets();

  const canBet   = enableBets === 'true';
  const amCreator= isCreator === 'true';

  const [activeTab, setActiveTab] = useState<'promesas' | 'apuestas'>('promesas');

  // ── Promesas state ──
  const [pledgeData, setPledgeData] = useState<PledgeData | null>(null);
  const [loadingP, setLoadingP]     = useState(true);
  const [saving, setSaving]         = useState(false);
  const [daysInput, setDaysInput]   = useState('');
  const [editing, setEditing]       = useState(false);

  // ── Members state ──
  const [members, setMembers] = useState<Member[]>([]);

  // ── Apuestas state ──
  const [bets, setBets]               = useState<SocialBet[]>([]);
  const [loadingB, setLoadingB]       = useState(false);
  const [showNewBet, setShowNewBet]   = useState(false);
  const [betType, setBetType]         = useState<SocialBet['bet_type']>('first_to_fail');
  const [betTarget, setBetTarget]     = useState<Member | null>(null);
  const [betDesc, setBetDesc]         = useState('');
  const [betStake, setBetStake]       = useState('');
  const [creatingBet, setCreatingBet] = useState(false);
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [removingId, setRemovingId]   = useState<number | null>(null);

  const slideAnim = useRef(new Animated.Value(0)).current;

  const switchTab = (tab: 'promesas' | 'apuestas') => {
    setActiveTab(tab);
    Animated.spring(slideAnim, { toValue: tab === 'promesas' ? 0 : 1, useNativeDriver: false, tension: 80, friction: 12 }).start();
  };

  // ── Load pledges + members ──
  const loadPledges = useCallback(async () => {
    const token = await storage.get('token');
    if (!token || !challengeId) return;
    try {
      const [pledgeRes, lbRes] = await Promise.all([
        pledgeApi.get(challengeId, token),
        challengeApi.leaderboard(challengeId, 'mes', token),
      ]);
      setPledgeData(pledgeRes.data);
      if (pledgeRes.data.my_pledge) setDaysInput(String(pledgeRes.data.my_pledge));
      // Members from leaderboard (always has all members regardless of pledges)
      const lbMembers: Member[] = (lbRes.data.participants ?? []).map((p: any) => ({
        user_id: p.id,
        name: p.username,
        avatar: p.avatar_url,
      }));
      setMembers(lbMembers);
    } catch (_) {}
    setLoadingP(false);
  }, [challengeId]);

  // ── Load bets ──
  const loadBets = useCallback(async () => {
    if (!canBet) return;
    setLoadingB(true);
    const token = await storage.get('token');
    if (!token || !challengeId) { setLoadingB(false); return; }
    try {
      const res = await socialBetApi.list(challengeId, token);
      setBets(res.data.bets ?? []);
    } catch (_) {}
    setLoadingB(false);
  }, [challengeId, canBet]);

  useEffect(() => { loadPledges(); }, [loadPledges]);
  useEffect(() => { if (activeTab === 'apuestas') loadBets(); }, [activeTab, loadBets]);

  // ── Save personal pledge ──
  const savePledge = async () => {
    const days = parseInt(daysInput);
    if (!days || days < 1 || days > 31) { Alert.alert('Número inválido', 'Pon un número entre 1 y 31.'); return; }
    setSaving(true);
    const token = await storage.get('token');
    if (!token) return;
    try {
      await pledgeApi.set(challengeId!, days, token);
      setEditing(false);
      await loadPledges();
    } catch (_) { Alert.alert('Error', 'No se pudo guardar.'); }
    setSaving(false);
  };

  // ── Create social bet ──
  const createBet = async () => {
    if (!betTarget) { Alert.alert('Falta info', 'Selecciona un miembro.'); return; }
    if (betType === 'custom' && !betDesc.trim()) { Alert.alert('Falta info', 'Describe la apuesta.'); return; }
    setCreatingBet(true);
    const token = await storage.get('token');
    if (!token) return;
    try {
      await socialBetApi.create(challengeId!, {
        target_user_id: betTarget.user_id,
        bet_type: betType,
        description: betDesc.trim() || undefined,
        stake: betStake.trim() || undefined,
      }, token);
      setShowNewBet(false);
      setBetTarget(null); setBetDesc(''); setBetStake('');
      await loadBets();
    } catch (_) { Alert.alert('Error', 'No se pudo crear la apuesta.'); }
    setCreatingBet(false);
  };

  // ── Resolve bet ──
  const resolveBet = (bet: SocialBet, outcome: boolean) => {
    Alert.alert(
      outcome ? '¿Predicción correcta?' : '¿Predicción incorrecta?',
      `Marcarás la apuesta de ${bet.creator.name} sobre ${bet.target_user.name} como ${outcome ? 'ACERTADA ✅' : 'FALLADA ❌'}.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', onPress: async () => {
          setResolvingId(bet.id);
          const token = await storage.get('token');
          if (!token) return;
          try {
            await socialBetApi.resolve(bet.id, outcome, token);
            await loadBets();
          } catch (_) { Alert.alert('Error', 'No se pudo resolver.'); }
          setResolvingId(null);
        }},
      ],
    );
  };

  // ── Remove bet ──
  const removeBet = (bet: SocialBet) => {
    Alert.alert('Eliminar apuesta', '¿Seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        setRemovingId(bet.id);
        const token = await storage.get('token');
        if (!token) return;
        try {
          await socialBetApi.remove(bet.id, token);
          setBets(prev => prev.filter(b => b.id !== bet.id));
        } catch (_) { Alert.alert('Error', 'No se pudo eliminar.'); }
        setRemovingId(null);
      }},
    ]);
  };

  const monthName = pledgeData ? MONTHS[(pledgeData.month ?? 1) - 1] : '';
  const openBets     = bets.filter(b => b.status === 'open');
  const resolvedBets = bets.filter(b => b.status === 'resolved');

  const indicatorLeft = slideAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '50%'] });

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={TEXT} />
        </Pressable>
        <Text style={s.headerTitle}>La Apuesta</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Tab bar ── */}
      <View style={s.tabBar}>
        <Pressable style={s.tabItem} onPress={() => switchTab('promesas')}>
          <Text style={[s.tabLabel, activeTab === 'promesas' && { color: TEXT }]}>PROMESAS</Text>
        </Pressable>
        <Pressable style={s.tabItem} onPress={() => switchTab('apuestas')} disabled={!canBet}>
          <Text style={[s.tabLabel, activeTab === 'apuestas' && { color: TEXT }, !canBet && { opacity: 0.3 }]}>
            APUESTAS
          </Text>
          {!canBet && <Text style={s.lockedChip}>DESACTIVADO</Text>}
        </Pressable>
        <Animated.View style={[s.tabIndicator, { left: indicatorLeft }]} />
      </View>

      {/* ══════════════════════════════════════════════════════
          PROMESAS TAB
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'promesas' && (
        loadingP ? (
          <View style={s.center}><ActivityIndicator color={PINK} /></View>
        ) : (
          <ScrollView contentContainerStyle={s.scroll}>
            {/* Month header */}
            <View style={s.monthRow}>
              <MaterialCommunityIcons name="calendar-month" size={18} color={PINK} />
              <Text style={s.monthText}>{monthName} {pledgeData?.year}</Text>
            </View>
            <Text style={s.monthSub}>¿Cuántos días prometes ir al gym este mes?</Text>

            {/* My pledge card */}
            <View style={s.myCard}>
              {!editing && pledgeData?.my_pledge ? (
                <View style={s.myPledgeRow}>
                  <View>
                    <Text style={s.bigNumber}>{pledgeData.my_pledge}</Text>
                    <Text style={s.bigLabel}>días prometidos</Text>
                  </View>
                  <View style={{ flex: 1 }} />
                  <Pressable onPress={() => setEditing(true)} style={s.editChip}>
                    <Ionicons name="pencil-outline" size={13} color={MUTED} />
                    <Text style={s.editChipTxt}>Cambiar</Text>
                  </Pressable>
                </View>
              ) : (editing || !pledgeData?.my_pledge) ? (
                <View>
                  <Text style={s.myCardLabel}>Tu promesa del mes</Text>
                  <View style={s.inputRow}>
                    <TextInput
                      style={s.daysInput}
                      value={daysInput}
                      onChangeText={setDaysInput}
                      keyboardType="number-pad"
                      maxLength={2}
                      placeholder="0"
                      placeholderTextColor={MUTED}
                      autoFocus={editing}
                    />
                    <Text style={{ color: SUB, fontSize: 16, flex: 1 }}>días</Text>
                    <Pressable style={s.saveBtn} onPress={savePledge} disabled={saving}>
                      {saving
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <Text style={s.saveBtnTxt}>Guardar</Text>}
                    </Pressable>
                  </View>
                  {!editing && (
                    <Text style={{ color: MUTED, fontSize: 12, marginTop: 6 }}>
                      Todavía no has hecho tu promesa este mes.
                    </Text>
                  )}
                </View>
              ) : null}
            </View>

            {/* Members list */}
            <Text style={s.sectionTitle}>Sala completa</Text>
            {(pledgeData?.pledges ?? []).map(m => (
              <PledgeRow key={m.user_id} member={m} />
            ))}
          </ScrollView>
        )
      )}

      {/* ══════════════════════════════════════════════════════
          APUESTAS TAB
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'apuestas' && (
        !canBet ? (
          <View style={[s.center, { gap: 12, paddingHorizontal: 32 }]}>
            <Ionicons name="lock-closed-outline" size={44} color={MUTED} />
            <Text style={{ color: MUTED, textAlign: 'center', fontSize: 14, lineHeight: 22 }}>
              Las apuestas entre miembros no están habilitadas en esta sala.
              {amCreator ? '\n\nPuedes activarlas desde la configuración de la sala.' : ''}
            </Text>
          </View>
        ) : loadingB ? (
          <View style={s.center}><ActivityIndicator color={PINK} /></View>
        ) : (
          <ScrollView contentContainerStyle={s.scroll}>

            {/* Intro */}
            <View style={s.betBanner}>
              <View style={{ flex: 1 }}>
                <Text style={s.betBannerTitle}>Apuestas de la sala</Text>
                <Text style={s.betBannerSub}>Predice quién fallará, quién aguantará o quién romperá el récord</Text>
              </View>
              <Pressable style={s.newBetBtn} onPress={() => setShowNewBet(true)}>
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={s.newBetBtnTxt}>Nueva</Text>
              </Pressable>
            </View>

            {/* Open bets */}
            {openBets.length > 0 && (
              <>
                <Text style={s.sectionTitle}>EN JUEGO ({openBets.length})</Text>
                {openBets.map(bet => (
                  <BetCard
                    key={bet.id}
                    bet={bet}
                    amCreator={amCreator}
                    resolvingId={resolvingId}
                    removingId={removingId}
                    onResolve={resolveBet}
                    onRemove={removeBet}
                  />
                ))}
              </>
            )}

            {/* Resolved bets */}
            {resolvedBets.length > 0 && (
              <>
                <Text style={[s.sectionTitle, { marginTop: 20 }]}>RESUELTAS ({resolvedBets.length})</Text>
                {resolvedBets.map(bet => (
                  <BetCard
                    key={bet.id}
                    bet={bet}
                    amCreator={amCreator}
                    resolvingId={resolvingId}
                    removingId={removingId}
                    onResolve={resolveBet}
                    onRemove={removeBet}
                  />
                ))}
              </>
            )}

            {bets.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 40, gap: 10 }}>
                <MaterialCommunityIcons name="poker-chip" size={48} color={BORDER} />
                <Text style={{ color: MUTED, fontSize: 14, textAlign: 'center', lineHeight: 22 }}>
                  Nadie ha hecho ninguna apuesta todavía.{'\n'}¡Sé el primero!
                </Text>
                <Pressable style={s.newBetBtn} onPress={() => setShowNewBet(true)}>
                  <Ionicons name="add" size={15} color="#fff" />
                  <Text style={s.newBetBtnTxt}>Nueva apuesta</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        )
      )}

      {/* ══ NEW BET MODAL ══ */}
      <Modal visible={showNewBet} transparent animationType="slide" onRequestClose={() => setShowNewBet(false)}>
        <Pressable style={s.overlay} onPress={() => setShowNewBet(false)}>
          <Pressable onPress={e => e.stopPropagation()} style={s.sheet}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Nueva apuesta</Text>

            {/* Step 1: bet type */}
            <Text style={s.stepLabel}>1. ¿Qué predices?</Text>
            <View style={{ gap: 8, marginBottom: 20 }}>
              {BET_TYPES.map(bt => (
                <Pressable
                  key={bt.key}
                  onPress={() => setBetType(bt.key)}
                  style={[s.betTypeRow, betType === bt.key && { borderColor: bt.color, backgroundColor: bt.color + '12' }]}
                >
                  <View style={[s.betTypeIcon, { backgroundColor: bt.color + '20' }]}>
                    <Ionicons name={bt.icon} size={18} color={bt.color} />
                  </View>
                  <Text style={[s.betTypeLabel, betType === bt.key && { color: TEXT }]}>{bt.label}</Text>
                  {betType === bt.key && <Ionicons name="checkmark-circle" size={18} color={bt.color} />}
                </Pressable>
              ))}
            </View>

            {/* Custom description */}
            {betType === 'custom' && (
              <>
                <Text style={s.stepLabel}>Descripción *</Text>
                <TextInput
                  style={s.textArea}
                  value={betDesc}
                  onChangeText={setBetDesc}
                  placeholder="Ej: Será el primero en llegar tarde un lunes..."
                  placeholderTextColor={MUTED}
                  multiline maxLength={200}
                />
              </>
            )}

            {/* Step 2: target member */}
            <Text style={s.stepLabel}>2. ¿Sobre quién?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', gap: 10, paddingBottom: 4 }}>
                {members.map(m => {
                  const selected = betTarget?.user_id === m.user_id;
                  return (
                    <Pressable key={m.user_id} onPress={() => setBetTarget(m)}
                      style={[s.memberChip, selected && { borderColor: PINK, backgroundColor: PINK + '15' }]}
                    >
                      <Avatar url={getStorageUrl(m.avatar)} name={m.name} size={32} />
                      <Text style={[s.memberChipName, selected && { color: PINK }]} numberOfLines={1}>{m.name.split(' ')[0]}</Text>
                      {selected && <Ionicons name="checkmark-circle" size={14} color={PINK} />}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            {/* Step 3: optional stake */}
            <Text style={s.stepLabel}>3. Prenda (opcional)</Text>
            <TextInput
              style={[s.textArea, { height: 44, textAlignVertical: 'center', marginBottom: 24 }]}
              value={betStake}
              onChangeText={setBetStake}
              placeholder='Ej: "El que falle invita el café"'
              placeholderTextColor={MUTED}
              maxLength={150}
            />

            <Pressable
              style={[s.confirmBtn, (!betTarget || creatingBet) && { opacity: 0.5 }]}
              onPress={createBet}
              disabled={!betTarget || creatingBet}
            >
              {creatingBet
                ? <ActivityIndicator color="#fff" />
                : <><Ionicons name="checkmark" size={18} color="#fff" /><Text style={s.confirmBtnTxt}>Hacer apuesta</Text></>}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Pledge row ───────────────────────────────────────────────────────────────
function PledgeRow({ member: m }: { member: PledgeMember }) {
  const url = getStorageUrl(m.avatar);
  const pct = m.target_days && m.current_days !== null
    ? Math.min(100, Math.round((m.current_days / m.target_days) * 100))
    : 0;

  return (
    <View style={s.pledgeRow}>
      <Avatar url={url} name={m.name} size={42} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <Text style={s.pledgeName} numberOfLines={1}>{m.name}</Text>
          {m.fulfilled && (
            <View style={s.fulfilledBadge}>
              <Ionicons name="checkmark-circle" size={11} color={GREEN} />
              <Text style={{ color: GREEN, fontSize: 9, fontWeight: '800' }}>CUMPLIDA</Text>
            </View>
          )}
        </View>
        {m.has_pledge ? (
          <>
            <View style={s.pledgeBar}>
              <View style={[s.pledgeFill, { width: `${pct}%`, backgroundColor: m.fulfilled ? GREEN : PINK }]} />
            </View>
            <Text style={s.pledgeBarLabel}>{m.current_days} / {m.target_days} días · {pct}%</Text>
          </>
        ) : (
          <Text style={{ color: '#333', fontSize: 12 }}>Sin promesa este mes</Text>
        )}
      </View>
    </View>
  );
}

// ─── Bet card ─────────────────────────────────────────────────────────────────
function BetCard({
  bet, amCreator, resolvingId, removingId, onResolve, onRemove,
}: {
  bet: SocialBet;
  amCreator: boolean;
  resolvingId: number | null;
  removingId: number | null;
  onResolve: (bet: SocialBet, outcome: boolean) => void;
  onRemove: (bet: SocialBet) => void;
}) {
  const meta = betLabel(bet.bet_type);
  const isOpen = bet.status === 'open';

  return (
    <View style={[s.betCard, !isOpen && { opacity: 0.75 }]}>
      {/* Status stripe */}
      <View style={[s.betStripe, { backgroundColor: isOpen ? meta.color : (bet.outcome ? GREEN : '#EF4444') }]} />

      <View style={{ padding: 14 }}>
        {/* Type chip */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <View style={[s.betChip, { backgroundColor: meta.color + '20', borderColor: meta.color + '40' }]}>
            <Ionicons name={meta.icon} size={12} color={meta.color} />
            <Text style={[s.betChipTxt, { color: meta.color }]}>{meta.label}</Text>
          </View>
          {!isOpen && (
            <View style={[s.betChip, { backgroundColor: bet.outcome ? GREEN + '20' : '#EF444420', borderColor: bet.outcome ? GREEN + '40' : '#EF444440', marginLeft: 4 }]}>
              <Ionicons name={bet.outcome ? 'checkmark-circle' : 'close-circle'} size={12} color={bet.outcome ? GREEN : '#EF4444'} />
              <Text style={[s.betChipTxt, { color: bet.outcome ? GREEN : '#EF4444' }]}>{bet.outcome ? 'Acertó' : 'Falló'}</Text>
            </View>
          )}
        </View>

        {/* Participants */}
        <View style={s.betParticipants}>
          <View style={s.betPerson}>
            <Avatar url={getStorageUrl(bet.creator.avatar)} name={bet.creator.name} size={34} />
            <View>
              <Text style={s.betPersonRole}>Apostó</Text>
              <Text style={s.betPersonName}>{bet.creator.name.split(' ')[0]}</Text>
            </View>
          </View>
          <View style={s.betArrow}>
            <Ionicons name="arrow-forward" size={14} color={meta.color} />
          </View>
          <View style={[s.betPerson, { alignItems: 'flex-end' }]}>
            <Avatar url={getStorageUrl(bet.target_user.avatar)} name={bet.target_user.name} size={34} />
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.betPersonRole}>Sobre</Text>
              <Text style={s.betPersonName}>{bet.target_user.name.split(' ')[0]}</Text>
            </View>
          </View>
        </View>

        {/* Custom description */}
        {bet.bet_type === 'custom' && bet.description && (
          <Text style={s.betDesc}>"{bet.description}"</Text>
        )}

        {/* Stake */}
        {bet.stake && (
          <View style={s.stakeRow}>
            <MaterialCommunityIcons name="poker-chip" size={13} color={GOLD} />
            <Text style={s.stakeTxt}>{bet.stake}</Text>
          </View>
        )}

        {/* Resolution info */}
        {!isOpen && bet.resolved_by && (
          <Text style={s.resolvedBy}>Resuelta por {bet.resolved_by}</Text>
        )}

        {/* Actions (only room creator, only open bets) */}
        {isOpen && amCreator && (
          <View style={s.betActions}>
            <Pressable
              onPress={() => onResolve(bet, true)}
              disabled={resolvingId === bet.id}
              style={[s.actionBtn, { borderColor: GREEN + '60', backgroundColor: GREEN + '12' }]}
            >
              {resolvingId === bet.id
                ? <ActivityIndicator color={GREEN} size="small" />
                : <><Ionicons name="checkmark" size={14} color={GREEN} /><Text style={[s.actionBtnTxt, { color: GREEN }]}>Acertó</Text></>}
            </Pressable>
            <Pressable
              onPress={() => onResolve(bet, false)}
              disabled={resolvingId === bet.id}
              style={[s.actionBtn, { borderColor: '#EF444460', backgroundColor: '#EF444412' }]}
            >
              {resolvingId === bet.id
                ? <ActivityIndicator color="#EF4444" size="small" />
                : <><Ionicons name="close" size={14} color="#EF4444" /><Text style={[s.actionBtnTxt, { color: '#EF4444' }]}>Falló</Text></>}
            </Pressable>
            {(bet.is_mine || amCreator) && (
              <Pressable
                onPress={() => onRemove(bet)}
                disabled={removingId === bet.id}
                style={[s.actionBtn, { borderColor: BORDER }]}
              >
                {removingId === bet.id
                  ? <ActivityIndicator color={MUTED} size="small" />
                  : <Ionicons name="trash-outline" size={14} color={MUTED} />}
              </Pressable>
            )}
          </View>
        )}
        {isOpen && !amCreator && (bet.is_mine) && (
          <Pressable
            onPress={() => onRemove(bet)}
            disabled={removingId === bet.id}
            style={[s.actionBtn, { alignSelf: 'flex-end', marginTop: 8, borderColor: BORDER }]}
          >
            {removingId === bet.id
              ? <ActivityIndicator color={MUTED} size="small" />
              : <><Ionicons name="trash-outline" size={13} color={MUTED} /><Text style={[s.actionBtnTxt, { color: MUTED }]}>Quitar</Text></>}
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: BG },
  center:  { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll:  { padding: 16, paddingBottom: 40 },

  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BORDER },
  backBtn:     { width: 40 },
  headerTitle: { flex: 1, textAlign: 'center', color: TEXT, fontSize: 17, fontWeight: '700' },

  // Tab bar
  tabBar:      { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDER, position: 'relative' },
  tabItem:     { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 2 },
  tabLabel:    { color: MUTED, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  tabIndicator:{ position: 'absolute', bottom: 0, width: '50%', height: 2, backgroundColor: PINK, borderRadius: 2 },
  lockedChip:  { fontSize: 8, color: MUTED, fontWeight: '700', letterSpacing: 0.8, marginTop: 2 },

  // Month
  monthRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  monthText: { color: TEXT, fontSize: 22, fontWeight: '900' },
  monthSub:  { color: MUTED, fontSize: 13, marginBottom: 20 },

  // My card
  myCard:        { backgroundColor: CARD, borderRadius: 16, padding: 18, marginBottom: 24, borderWidth: 1, borderColor: BORDER },
  myCardLabel:   { color: MUTED, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  myPledgeRow:   { flexDirection: 'row', alignItems: 'center' },
  bigNumber:     { color: PINK, fontSize: 52, fontWeight: '900', lineHeight: 56 },
  bigLabel:      { color: MUTED, fontSize: 12 },
  editChip:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: BORDER },
  editChipTxt:   { color: MUTED, fontSize: 12 },
  inputRow:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  daysInput:     { backgroundColor: CARD2, color: PINK, fontSize: 36, fontWeight: '900', width: 70, textAlign: 'center', borderRadius: 10, paddingVertical: 6 },
  saveBtn:       { backgroundColor: PINK, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 11 },
  saveBtnTxt:    { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Pledge row
  pledgeRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: CARD, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: BORDER },
  pledgeName:     { color: TEXT, fontWeight: '700', fontSize: 14, flex: 1 },
  fulfilledBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: GREEN + '18', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3, marginLeft: 8 },
  pledgeBar:      { height: 5, backgroundColor: '#1e1e1e', borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  pledgeFill:     { height: 5, borderRadius: 3 },
  pledgeBarLabel: { color: MUTED, fontSize: 11 },

  sectionTitle: { color: MUTED, fontSize: 10, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 },

  // Bet banner
  betBanner:      { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: CARD, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: BORDER },
  betBannerTitle: { color: TEXT, fontWeight: '800', fontSize: 15, marginBottom: 3 },
  betBannerSub:   { color: MUTED, fontSize: 12, lineHeight: 17 },
  newBetBtn:      { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: PINK, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9 },
  newBetBtnTxt:   { color: '#fff', fontWeight: '800', fontSize: 13 },

  // Bet card
  betCard:         { backgroundColor: CARD, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' },
  betStripe:       { height: 3 },
  betChip:         { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  betChipTxt:      { fontSize: 11, fontWeight: '700' },
  betParticipants: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  betPerson:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  betPersonRole:   { color: MUTED, fontSize: 10, fontWeight: '700' },
  betPersonName:   { color: TEXT, fontWeight: '700', fontSize: 14 },
  betArrow:        { flex: 1, alignItems: 'center' },
  betDesc:         { color: SUB, fontSize: 13, fontStyle: 'italic', marginBottom: 8, lineHeight: 19 },
  stakeRow:        { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: GOLD + '15', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 8 },
  stakeTxt:        { color: GOLD, fontSize: 12, fontWeight: '600', flex: 1 },
  resolvedBy:      { color: MUTED, fontSize: 11, marginTop: 4 },
  betActions:      { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1, borderRadius: 10, paddingVertical: 9 },
  actionBtnTxt:    { fontSize: 12, fontWeight: '700' },

  // Modal / sheet
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet:       { backgroundColor: '#0f0f0f', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '92%' },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginBottom: 16 },
  sheetTitle:  { color: TEXT, fontSize: 18, fontWeight: '800', marginBottom: 20 },
  stepLabel:   { color: MUTED, fontSize: 10, fontWeight: '800', letterSpacing: 1.4, marginBottom: 10 },

  betTypeRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: BORDER, borderRadius: 12, padding: 12 },
  betTypeIcon:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  betTypeLabel: { flex: 1, color: SUB, fontSize: 14, fontWeight: '600' },

  memberChip:     { alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: BORDER, borderRadius: 12, minWidth: 70 },
  memberChipName: { color: SUB, fontSize: 11, fontWeight: '700' },

  textArea: { backgroundColor: CARD2, borderRadius: 12, padding: 12, color: TEXT, fontSize: 14, minHeight: 70, textAlignVertical: 'top', marginBottom: 16, borderWidth: 1, borderColor: BORDER },

  confirmBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: PINK, borderRadius: 14, paddingVertical: 14 },
  confirmBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
