// SettingsSheet — globally mounted "Ajustes" modal.
//
// Fully theme-aware: respects current dark/light mode for all colors.

import React, { useCallback, useState } from 'react';
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
  ArrowUpDown,
  Bell,
  Coins,
  Mail,
  Share2,
  Shield,
  Star,
  Sun,
  Tag as TagIcon,
  X,
} from 'lucide-react-native';

import { fontFamily, fontSize } from '../../design/typography';
import { useTheme } from '../../design/useTheme';
import {
  DestructiveCard,
  ProfileCard,
  SettingsRow,
  SettingsSectionCard,
  SettingsPaletteProvider,
  SubscriptionCard,
} from './components';
import { CurrencySheet } from './CurrencySheet';
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
import { useReminderDismissalsStore } from '../dashboard/useReminderDismissalsStore';

const TWITTER_HANDLE = '@carlosprnt';
const CONTACT_EMAIL  = 'hello@carlospariente.com';

export function SettingsSheet() {
  const isOpen = useSettingsStore((s) => s.isOpen);
  const close  = useSettingsStore((s) => s.close);
  const { isDark, colors } = useTheme();

  const currency              = usePreferencesStore((s) => s.currency);
  const notificationsEnabled  = usePreferencesStore((s) => s.notificationsEnabled);
  const setNotificationsEnabled = usePreferencesStore((s) => s.setNotificationsEnabled);
  const appearance            = usePreferencesStore((s) => s.appearance);
  const setAppearance         = usePreferencesStore((s) => s.setAppearance);

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

  const clearAllDismissals = useReminderDismissalsStore((s) => s.clearAll);
  const hasDismissals = useReminderDismissalsStore(
    (s) => Object.keys(s.dismissals).length > 0,
  );

  const [currencySheetOpen, setCurrencySheetOpen] = useState(false);

  const insets = useSafeAreaInsets();

  const iconColor = isDark ? '#FFFFFF' : '#0F0F10';

  // ── Handlers ─────────────────────────────────────────────────────────
  const comingSoon = useCallback((label: string) => {
    Alert.alert(label, 'Próximamente disponible.');
  }, []);

  const handleManagePlus = useCallback(() => {
    if (isPlusActive) {
      comingSoon('Gestionar Perezoso Plus');
      return;
    }
    openPaywall('general');
  }, [isPlusActive, openPaywall, comingSoon]);

  const handleCurrency = useCallback(() => setCurrencySheetOpen(true), []);

  const handleAppearance = useCallback(() => {
    setAppearance(appearance === 'Oscuro' ? 'Claro' : 'Oscuro');
  }, [appearance, setAppearance]);

  const handleDemo = useCallback(() => openDemo(), [openDemo]);
  const handleReview = useCallback(() => comingSoon('Dejar una reseña'), [comingSoon]);

  const handleShare = useCallback(() => {
    Share.share({
      message: 'Perezoso — la forma perezosa de controlar tus suscripciones. https://perezoso.app',
    }).catch(() => {});
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

  const handleResetCards = useCallback(() => {
    clearAllDismissals();
    Alert.alert('Listo', 'Las tarjetas de notificaciones volverán a aparecer.');
  }, [clearAllDismissals]);

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
            close();
          },
        },
      ],
    );
  }, [deleteAccount, close]);

  // Demo visible only for carlosprnt@gmail.com
  const showDemo = profileEmail === 'carlosprnt@gmail.com';

  const sheetBg = isDark ? '#000000' : '#FFFFFF';
  const handleColor = isDark ? '#636366' : '#D4D4D4';
  const titleColor = isDark ? '#FFFFFF' : '#000000';
  const closeBtnBg = isDark ? '#2C2C2E' : '#EBEBF0';
  const closeBtnColor = isDark ? '#AEAEB2' : '#3C3C43';

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={close}
      onDismiss={close}
    >
      <SettingsPaletteProvider dark={isDark}>
        <View style={[styles.sheet, { backgroundColor: sheetBg }]}>
          {/* ── iOS-style drag handle + header ── */}
          <View style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: handleColor }]} />
          </View>
          <View style={styles.header}>
            <Text style={[styles.title, { color: titleColor }]}>Ajustes</Text>
            <Pressable
              style={({ pressed }) => [
                styles.closeBtn,
                { backgroundColor: closeBtnBg },
                pressed && { opacity: 0.7 },
              ]}
              onPress={close}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Cerrar ajustes"
            >
              <X size={15} color={closeBtnColor} strokeWidth={2.5} />
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

            {/* 2 — Profile + reset cards (only if there are dismissed cards) */}
            <View style={styles.gap} />
            <ProfileCard
              name={profileName}
              email={profileEmail}
              avatarUrl={profileAvatar}
            />
            {hasDismissals && (
              <View style={styles.resetBtnWrap}>
                <Pressable
                  onPress={handleResetCards}
                  style={({ pressed }) => [
                    styles.resetBtn,
                    { borderColor: isDark ? '#38383A' : '#D4D4D4' },
                    pressed && { opacity: 0.6 },
                  ]}
                  accessibilityLabel="Restaurar tarjetas de notificaciones"
                >
                  <Bell size={14} color={isDark ? '#AEAEB2' : '#6B6B6B'} strokeWidth={2} />
                  <Text style={[styles.resetBtnText, { color: isDark ? '#AEAEB2' : '#6B6B6B' }]}>
                    Restaurar tarjetas
                  </Text>
                </Pressable>
              </View>
            )}

            {/* 3 — Moneda + Notificaciones (grouped) */}
            <View style={styles.gap} />
            <SettingsSectionCard>
              <SettingsRow
                icon={<Coins size={20} color={iconColor} strokeWidth={2} />}
                label="Moneda"
                value={currency}
                onPress={handleCurrency}
              />
              <SettingsRow
                icon={<Bell size={20} color={iconColor} strokeWidth={2} />}
                label="Notificaciones"
                switchValue={notificationsEnabled}
                onSwitchChange={setNotificationsEnabled}
              />
            </SettingsSectionCard>

            {/* 4 — Apariencia */}
            <View style={styles.gap} />
            <SettingsSectionCard>
              <SettingsRow
                icon={<Sun size={20} color={iconColor} strokeWidth={2} />}
                label="Apariencia"
                value={appearance}
                onPress={handleAppearance}
                rightAccessory={
                  <View style={styles.appearanceRight}>
                    <Text style={[styles.appearanceValue, { color: isDark ? '#8E8E93' : '#8E8E93' }]}>
                      {appearance}
                    </Text>
                    <ArrowUpDown size={16} color={isDark ? '#8E8E93' : '#8E8E93'} strokeWidth={2.2} />
                  </View>
                }
              />
            </SettingsSectionCard>

            {/* 5 — Demo (only carlosprnt@gmail.com) */}
            {showDemo && (
              <>
                <View style={styles.gap} />
                <SettingsSectionCard>
                  <SettingsRow
                    icon={<Shield size={20} color={iconColor} strokeWidth={2} />}
                    label="Demo"
                    onPress={handleDemo}
                  />
                </SettingsSectionCard>
              </>
            )}

            {/* 6 — Etiquetas */}
            <View style={styles.gap} />
            <SettingsSectionCard>
              <SettingsRow
                icon={<TagIcon size={20} color={iconColor} strokeWidth={2} />}
                label="Etiquetas"
                value={`${tagsCount}`}
                onPress={openTags}
              />
            </SettingsSectionCard>

            {/* 7 — Reseña + Compartir (grouped) */}
            <View style={styles.gap} />
            <SettingsSectionCard>
              <SettingsRow
                icon={<Star size={20} color={iconColor} strokeWidth={2} />}
                label={'Dejar una rese\u00F1a'}
                onPress={handleReview}
              />
              <SettingsRow
                icon={<Share2 size={20} color={iconColor} strokeWidth={2} />}
                label="Compartir con un amigo"
                onPress={handleShare}
              />
            </SettingsSectionCard>

            {/* 8 — Contacto (grouped) */}
            <View style={styles.gap} />
            <SettingsSectionCard>
              <SettingsRow
                icon={<Text style={{ fontSize: 18, fontWeight: '700', color: iconColor }}>X</Text>}
                label={TWITTER_HANDLE}
                onPress={handleTwitter}
              />
              <SettingsRow
                icon={<Mail size={20} color={iconColor} strokeWidth={2} />}
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

          {/* Secondary sheets */}
          <TagsBottomSheet />
          <DemoSheet />
          <CurrencySheet
            visible={currencySheetOpen}
            onClose={() => setCurrencySheetOpen(false)}
          />
        </View>
      </SettingsPaletteProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    paddingTop: 6,
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 9999,
  },
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
    letterSpacing: -0.6,
    flexShrink: 1,
    paddingRight: 12,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  gap: { height: 14 },
  resetBtnWrap: {
    paddingTop: 10,
    alignItems: 'flex-start',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 9999,
    borderWidth: 1,
  },
  resetBtnText: {
    ...fontFamily.medium,
    fontSize: fontSize[13],
    letterSpacing: -0.1,
  },
  appearanceRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  appearanceValue: {
    ...fontFamily.regular,
    fontSize: fontSize[15],
    letterSpacing: -0.1,
  },
});
