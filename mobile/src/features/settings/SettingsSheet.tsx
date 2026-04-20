// SettingsSheet — globally mounted "Ajustes" modal.
//
// Presentation
//   · Native iOS pageSheet (UISheetPresentationController). We rely on
//     UIKit for the handle bar, the dimmed backdrop, the rounded top
//     corners and the pan-down-to-dismiss gesture. No custom animation
//     code — matches every other sheet in the app.
//
// Composition
//   ┌──────────────────────────┐
//   │ Header                  X│   ← Ajustes + close pill
//   ├──────────────────────────┤
//   │ Perezoso Plus │ Gestionar│   ← SubscriptionCard
//   │ ProfileCard              │
//   │ Moneda / Notificaciones  │   ← grouped SectionCard
//   │ Apariencia               │
//   │ Admin / Demo             │   ← grouped SectionCard
//   │ Etiquetas ▸              │   ← opens TagsBottomSheet (secondary)
//   │ Reseña / Compartir       │
//   │ Twitter / Email          │
//   │ Eliminar cuenta          │   ← destructive card, red
//   └──────────────────────────┘
//
// Interactions
//   · Every row has a working onPress / Switch wired to mock state.
//   · "Etiquetas" is the only row that leaves the main sheet — it
//     presents `TagsBottomSheet`, which layers on top as a child sheet.
//   · "Eliminar cuenta" shows an Alert confirmation before calling the
//     caller-provided delete handler (mocked for now).

import React, { useCallback } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell,
  Check,
  Share2,
  Sparkles,
  Sun,
  Tag as TagIcon,
  X,
} from 'lucide-react-native';

import { fontFamily, fontSize } from '../../design/typography';
import {
  DestructiveCard,
  ProfileCard,
  SettingsRow,
  SettingsSectionCard,
  SubscriptionCard,
} from './components';
import { DemoSheet } from './DemoSheet';
import { TagsBottomSheet } from './TagsBottomSheet';
import {
  useDemoSheetStore,
  usePreferencesStore,
  useSettingsStore,
  useTagsStore,
} from './useSettingsStore';
import { useSubscriptionsStore } from '../../stores/subscriptionsStore';
import { useAuthStore } from '../auth/useAuthStore';
import { usePaywallStore } from '../paywall/usePaywallStore';

const TWITTER_HANDLE = '@carlosprnt';
const CONTACT_EMAIL  = 'hello@carlospariente.com';

export function SettingsSheet() {
  const isOpen = useSettingsStore((s) => s.isOpen);
  const close  = useSettingsStore((s) => s.close);

  const currency              = usePreferencesStore((s) => s.currency);
  const notificationsEnabled  = usePreferencesStore((s) => s.notificationsEnabled);
  const setNotificationsEnabled = usePreferencesStore((s) => s.setNotificationsEnabled);
  const appearance            = usePreferencesStore((s) => s.appearance);

  const tagsCount             = useTagsStore((s) => s.tags.length);
  const openTags              = useTagsStore((s) => s.openSheet);

  const openDemo              = useDemoSheetStore((s) => s.openSheet);
  const isPlusActive          = useSubscriptionsStore((s) => s.isPlusActive);
  const openPaywall           = usePaywallStore((s) => s.open);
  const deleteAccount         = useAuthStore((s) => s.deleteAccount);
  const user                  = useAuthStore((s) => s.user);
  const profileName  = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? 'Usuario';
  const profileEmail = user?.email ?? '';
  const profileAvatar = user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture;

  const insets = useSafeAreaInsets();

  // ── Individual row handlers ──────────────────────────────────────
  // Most are placeholders that pop an info alert — the real flows will
  // be wired up as each sub-feature lands. Kept close together so it's
  // obvious at a glance which rows are still mocked.
  const comingSoon = useCallback((label: string) => {
    Alert.alert(label, 'Próximamente disponible.');
  }, []);

  // "Mejorar" for free users → open the paywall sheet. Once the user
  // has Plus, the row label flips to "Gestionar" — that management flow
  // is still pending, so we keep the coming-soon alert for that branch.
  const handleManagePlus = useCallback(() => {
    if (isPlusActive) {
      comingSoon('Gestionar Perezoso Plus');
      return;
    }
    openPaywall('general');
  }, [isPlusActive, openPaywall, comingSoon]);
  const handleCurrency   = useCallback(() => comingSoon('Moneda'), [comingSoon]);
  const handleAppearance = useCallback(() => comingSoon('Apariencia'), [comingSoon]);
  const handleAdmin      = useCallback(() => comingSoon('Admin'), [comingSoon]);
  const handleDemo       = useCallback(() => openDemo(), [openDemo]);
  const handleReview     = useCallback(() => comingSoon('Dejar una reseña'), [comingSoon]);

  const handleShare = useCallback(() => {
    // Native share sheet — universal app share copy.
    Share.share({
      message: 'Perezoso — la forma perezosa de controlar tus suscripciones. https://perezoso.app',
    }).catch(() => { /* user cancel — no-op */ });
  }, []);

  const handleTwitter = useCallback(() => {
    Linking.openURL('https://twitter.com/carlosprnt').catch(() =>
      comingSoon(TWITTER_HANDLE),
    );
  }, [comingSoon]);

  const handleEmail = useCallback(() => {
    Linking.openURL(`mailto:${CONTACT_EMAIL}`).catch(() =>
      comingSoon(CONTACT_EMAIL),
    );
  }, [comingSoon]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'Eliminar cuenta',
      'Se eliminarán todos tus datos y suscripciones. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar cuenta',
          style: 'destructive',
          onPress: async () => {
            const res = await deleteAccount();
            if (!res.ok) {
              Alert.alert('No se pudo eliminar', res.error ?? 'Error desconocido');
              return;
            }
            // signOut inside deleteAccount flips auth → unauthenticated,
            // AuthGate redirects to login. Close the sheet so the user
            // isn't stuck looking at it during the transition.
            close();
          },
        },
      ],
    );
  }, [deleteAccount, close]);

  // ──────────────────────────────────────────────────────────────────

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={close}
      onDismiss={close}
    >
      <View style={styles.sheet}>
        {/* ── iOS-style drag handle + header ── */}
        <View style={styles.handleWrap}>
          <View style={styles.handle} />
        </View>
        <View style={styles.header}>
          <Text style={styles.title}>Ajustes</Text>
          <Pressable
            style={({ pressed }) => [
              styles.closeBtn,
              pressed && { opacity: 0.7 },
            ]}
            onPress={close}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Cerrar ajustes"
          >
            <X size={15} color="#3C3C43" strokeWidth={2.5} />
          </Pressable>
        </View>

        {/* ── Scrollable content ── */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 20) + 28 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* 1 — Subscription highlight */}
          <SubscriptionCard
            title="Perezoso Pro"
            status={isPlusActive ? 'Suscripción activa' : 'Desbloquea todas las funcionalidades'}
            ctaLabel={isPlusActive ? 'Gestionar' : 'Mejorar'}
            onManage={handleManagePlus}
          />

          {/* 2 — Profile */}
          <View style={styles.gap} />
          <ProfileCard
            name={profileName}
            email={profileEmail}
            avatarUrl={profileAvatar}
          />

          {/* 3 — Moneda + Notificaciones (grouped) */}
          <View style={styles.gap} />
          <SettingsSectionCard>
            <SettingsRow
              icon={<Text style={{ fontSize: 18, fontWeight: '700', color: '#0F0F10' }}>{'\u20AC'}</Text>}
              label="Moneda"
              value={currency}
              onPress={handleCurrency}
            />
            <SettingsRow
              icon={<Bell size={20} color="#0F0F10" strokeWidth={2} />}
              label="Notificaciones"
              switchValue={notificationsEnabled}
              onSwitchChange={setNotificationsEnabled}
            />
          </SettingsSectionCard>

          {/* 4 — Apariencia */}
          <View style={styles.gap} />
          <SettingsSectionCard>
            <SettingsRow
              icon={<Sun size={20} color="#0F0F10" strokeWidth={2} />}
              label="Apariencia"
              value={appearance}
              onPress={handleAppearance}
            />
          </SettingsSectionCard>

          {/* 5 — Admin + Demo (grouped) */}
          <View style={styles.gap} />
          <SettingsSectionCard>
            <SettingsRow
              icon={<Check size={20} color="#0F0F10" strokeWidth={2.4} />}
              label="Admin"
              onPress={handleAdmin}
            />
            <SettingsRow
              icon={<Sparkles size={20} color="#0F0F10" strokeWidth={2} />}
              label="Demo"
              onPress={handleDemo}
            />
          </SettingsSectionCard>

          {/* 6 — Etiquetas (opens TagsBottomSheet) */}
          <View style={styles.gap} />
          <SettingsSectionCard>
            <SettingsRow
              icon={<TagIcon size={20} color="#0F0F10" strokeWidth={2} />}
              label="Etiquetas"
              value={`${tagsCount}`}
              onPress={openTags}
            />
          </SettingsSectionCard>

          {/* 7 — Reseña + Compartir (grouped) */}
          <View style={styles.gap} />
          <SettingsSectionCard>
            <SettingsRow
              icon={<Sparkles size={20} color="#0F0F10" strokeWidth={2} />}
              label={'Dejar una rese\u00F1a'}
              onPress={handleReview}
            />
            <SettingsRow
              icon={<Share2 size={20} color="#0F0F10" strokeWidth={2} />}
              label="Compartir con un amigo"
              onPress={handleShare}
            />
          </SettingsSectionCard>

          {/* 8 — Contacto (grouped) */}
          <View style={styles.gap} />
          <SettingsSectionCard>
            <SettingsRow
              icon={<Text style={{ fontSize: 18, fontWeight: '700', color: '#0F0F10' }}>X</Text>}
              label={TWITTER_HANDLE}
              onPress={handleTwitter}
            />
            <SettingsRow
              icon={<Text style={{ fontSize: 18, fontWeight: '700', color: '#0F0F10' }}>@</Text>}
              label={CONTACT_EMAIL}
              onPress={handleEmail}
            />
          </SettingsSectionCard>

          {/* 9 — Destructive */}
          <View style={styles.gap} />
          <DestructiveCard
            label="Eliminar cuenta"
            onPress={handleDeleteAccount}
          />
        </ScrollView>

        {/* Secondary sheets — mounted inside the Settings Modal so they
            layer above this sheet but disappear when Settings closes. */}
        <TagsBottomSheet />
        <DemoSheet />
      </View>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 6,
  },

  // iOS-style drag handle at the top of the sheet.
  handleWrap: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 9999,
    backgroundColor: '#D4D4D4',
  },

  // Header mirrors the CreateSubscription / EditSubscription sheets
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  title: {
    ...fontFamily.bold,
    fontSize: fontSize[32],
    color: '#000000',
    letterSpacing: -0.6,
    flexShrink: 1,
    paddingRight: 12,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EBEBF0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
  },

  // Separation between cards — matches iOS "group" spacing
  gap: { height: 14 },
});
