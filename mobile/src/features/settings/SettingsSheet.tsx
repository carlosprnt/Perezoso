// SettingsSheet — globally mounted "Ajustes" modal.
//
// Fully theme-aware: respects current dark/light mode for all colors.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated as RNAnimated,
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
  BarChart3,
  Bell,
  Check,
  Coins,
  Languages,
  Mail,
  RotateCcw,
  Share2,
  Shield,
  Star,
  Sun,
  Tag as TagIcon,
  X,
} from 'lucide-react-native';

import { haptic } from '../../lib/haptics';

import { fontFamily, fontSize } from '../../design/typography';
import { radius } from '../../design/radius';
import { useTheme } from '../../design/useTheme';
import {
  DestructiveCard,
  ProfileCard,
  SettingsRow,
  SettingsSectionCard,
  SettingsPaletteProvider,
  SubscriptionCard,
} from './components';
import { AdminStatsSheet } from './AdminStatsSheet';
import { CurrencySheet } from './CurrencySheet';
import { DemoSheet } from './DemoSheet';
import { LanguageSheet, languageLabel } from './LanguageSheet';
import { TagsBottomSheet } from './TagsBottomSheet';
import {
  useAdminStatsStore,
  useDemoSheetStore,
  usePreferencesStore,
  useSettingsStore,
  useTagsStore,
} from './useSettingsStore';
import { useSubscriptionsStore } from '../../stores/subscriptionsStore';
import { useAuthStore } from '../auth/useAuthStore';
import { usePaywallStore } from '../paywall/usePaywallStore';
import { openManageSubscriptions } from '../../services/purchases';
import { useReminderDismissalsStore } from '../dashboard/useReminderDismissalsStore';
import { useLanguageStore } from '../../lib/i18n/useLanguageStore';
import { useT } from '../../lib/i18n/LocaleProvider';

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
  const openAdminStats        = useAdminStatsStore((s) => s.openSheet);
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

  const currentLang = useLanguageStore((s) => s.language);
  const t = useT();

  const [currencySheetOpen, setCurrencySheetOpen] = useState(false);
  const [languageSheetOpen, setLanguageSheetOpen] = useState(false);
  const [resetToastVisible, setResetToastVisible] = useState(false);

  const insets = useSafeAreaInsets();

  const iconColor = isDark ? '#FFFFFF' : '#0F0F10';

  // ── Handlers ─────────────────────────────────────────────────────────
  const comingSoon = useCallback((label: string) => {
    Alert.alert(label, t('common.comingSoon'));
  }, [t]);

  const handleManagePlus = useCallback(() => {
    if (isPlusActive) {
      openManageSubscriptions();
      return;
    }
    close();
    setTimeout(() => openPaywall('general'), 400);
  }, [isPlusActive, openPaywall, close]);

  const handleCurrency = useCallback(() => setCurrencySheetOpen(true), []);

  const handleAppearance = useCallback(() => {
    setAppearance(appearance === 'Oscuro' ? 'Claro' : 'Oscuro');
  }, [appearance, setAppearance]);

  const handleDemo = useCallback(() => openDemo(), [openDemo]);
  const handleReview = useCallback(() => comingSoon(t('settings.review')), [comingSoon, t]);

  const handleShare = useCallback(() => {
    Share.share({
      message: t('settings.shareMessage'),
    }).catch(() => {});
  }, [t]);

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
    haptic.success();
    setResetToastVisible(true);
  }, [clearAllDismissals]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      t('settings.deleteTitle'),
      t('settings.deleteBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.deleteConfirm'),
          style: 'destructive',
          onPress: async () => {
            const res = await deleteAccount();
            if (!res.ok) {
              Alert.alert(t('settings.deleteFailed'), res.error ?? t('settings.unknownError'));
              return;
            }
            close();
          },
        },
      ],
    );
  }, [deleteAccount, close, t]);

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
            <Text style={[styles.title, { color: titleColor }]}>{t('settings.title')}</Text>
            <Pressable
              style={({ pressed }) => [
                styles.closeBtn,
                { backgroundColor: closeBtnBg },
                pressed && { opacity: 0.7 },
              ]}
              onPress={close}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('settings.close')}
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
              status={isPlusActive ? t('settings.pro.active') : t('settings.pro.unlock')}
              ctaLabel={isPlusActive ? t('settings.pro.manage') : t('settings.pro.upgrade')}
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
                    styles.resetBtnFull,
                    {
                      backgroundColor: isDark ? '#2C2C2E' : '#F2F2F4',
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                  accessibilityLabel={t('settings.restoreCardsLabel')}
                >
                  <RotateCcw size={17} color={isDark ? '#FFFFFF' : '#0F0F10'} strokeWidth={2.2} />
                  <Text style={[styles.resetBtnFullText, { color: isDark ? '#FFFFFF' : '#0F0F10' }]}>
                    {t('settings.restoreCards')}
                  </Text>
                </Pressable>
              </View>
            )}

            {/* 3 — Moneda + Notificaciones (grouped) */}
            <View style={styles.gap} />
            <SettingsSectionCard>
              <SettingsRow
                icon={<Coins size={20} color={iconColor} strokeWidth={2} />}
                label={t('settings.currency')}
                value={currency}
                onPress={handleCurrency}
              />
              <SettingsRow
                icon={<Bell size={20} color={iconColor} strokeWidth={2} />}
                label={t('settings.notifications')}
                switchValue={notificationsEnabled}
                onSwitchChange={setNotificationsEnabled}
              />
            </SettingsSectionCard>

            {/* 4 — Apariencia + Idioma */}
            <View style={styles.gap} />
            <SettingsSectionCard>
              <SettingsRow
                icon={<Sun size={20} color={iconColor} strokeWidth={2} />}
                label={t('settings.appearance')}
                value={appearance}
                onPress={handleAppearance}
                rightAccessory={
                  <View style={styles.appearanceRight}>
                    <Text style={[styles.appearanceValue, { color: '#8E8E93' }]}>
                      {appearance}
                    </Text>
                    <ArrowUpDown size={16} color="#8E8E93" strokeWidth={2.2} />
                  </View>
                }
              />
              <SettingsRow
                icon={<Languages size={20} color={iconColor} strokeWidth={2} />}
                label={t('settings.language')}
                value={currentLang === 'auto' ? t('language.auto') : languageLabel(currentLang)}
                onPress={() => setLanguageSheetOpen(true)}
              />
            </SettingsSectionCard>

            {/* 5 — Admin: Demo + Stats (only carlosprnt@gmail.com) */}
            {showDemo && (
              <>
                <View style={styles.gap} />
                <SettingsSectionCard>
                  <SettingsRow
                    icon={<Shield size={20} color={iconColor} strokeWidth={2} />}
                    label="Demo"
                    onPress={handleDemo}
                  />
                  <SettingsRow
                    icon={<BarChart3 size={20} color={iconColor} strokeWidth={2} />}
                    label="Stats"
                    onPress={openAdminStats}
                  />
                </SettingsSectionCard>
              </>
            )}

            {/* 6 — Etiquetas */}
            <View style={styles.gap} />
            <SettingsSectionCard>
              <SettingsRow
                icon={<TagIcon size={20} color={iconColor} strokeWidth={2} />}
                label={t('settings.tags')}
                value={`${tagsCount}`}
                onPress={openTags}
              />
            </SettingsSectionCard>

            {/* 7 — Reseña + Compartir (grouped) */}
            <View style={styles.gap} />
            <SettingsSectionCard>
              <SettingsRow
                icon={<Star size={20} color={iconColor} strokeWidth={2} />}
                label={t('settings.review')}
                onPress={handleReview}
              />
              <SettingsRow
                icon={<Share2 size={20} color={iconColor} strokeWidth={2} />}
                label={t('settings.share')}
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
              label={t('settings.deleteAccount')}
              onPress={handleDeleteAccount}
            />
          </ScrollView>

          {/* Inline success toast — renders on top of the Settings sheet
              content so the user sees feedback without leaving context. */}
          <InlineToast
            visible={resetToastVisible}
            message={t('settings.restoreCards.toast')}
            onHide={() => setResetToastVisible(false)}
            isDark={isDark}
          />

          {/* Secondary sheets */}
          <TagsBottomSheet />
          <DemoSheet />
          <AdminStatsSheet />
          <CurrencySheet
            visible={currencySheetOpen}
            onClose={() => setCurrencySheetOpen(false)}
          />
          <LanguageSheet
            visible={languageSheetOpen}
            onClose={() => setLanguageSheetOpen(false)}
          />
        </View>
      </SettingsPaletteProvider>
    </Modal>
  );
}

// ─── Inline toast — slides down at the top of the Settings sheet. ───
// Rendered inside the native pageSheet modal so it appears above the
// sheet content rather than being hidden behind the iOS modal.
function InlineToast({
  visible,
  message,
  onHide,
  isDark,
}: {
  visible: boolean;
  message: string;
  onHide: () => void;
  isDark: boolean;
}) {
  const translateY = useRef(new RNAnimated.Value(-100)).current;
  const opacity = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    RNAnimated.parallel([
      RNAnimated.timing(translateY, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
      RNAnimated.timing(opacity, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();

    const t = setTimeout(() => {
      RNAnimated.parallel([
        RNAnimated.timing(translateY, {
          toValue: -100,
          duration: 220,
          useNativeDriver: true,
        }),
        RNAnimated.timing(opacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => { if (finished) onHide(); });
    }, 2400);

    return () => clearTimeout(t);
  }, [visible, onHide, translateY, opacity]);

  if (!visible) return null;

  return (
    <RNAnimated.View
      pointerEvents="none"
      style={[
        styles.inlineToast,
        {
          backgroundColor: isDark ? '#1F2A1F' : '#E9F7EC',
          borderColor: isDark ? 'rgba(52,199,89,0.35)' : 'rgba(52,199,89,0.3)',
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View style={styles.inlineToastIcon}>
        <Check size={14} color="#FFFFFF" strokeWidth={3} />
      </View>
      <Text style={[styles.inlineToastText, { color: isDark ? '#E6F7EA' : '#0F4F20' }]}>
        {message}
      </Text>
    </RNAnimated.View>
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
    borderRadius: radius.full,
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
    ...fontFamily.medium,
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
  },
  resetBtnFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    width: '100%',
  },
  resetBtnFullText: {
    ...fontFamily.medium,
    fontSize: fontSize[15],
    letterSpacing: -0.2,
  },
  inlineToast: {
    position: 'absolute',
    top: 12,
    left: 18,
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    zIndex: 99,
    elevation: 99,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  inlineToastIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#30D158',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineToastText: {
    ...fontFamily.medium,
    fontSize: fontSize[14],
    letterSpacing: -0.1,
    flex: 1,
  },
  appearanceRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  appearanceValue: {
    ...fontFamily.medium,
    fontSize: fontSize[15],
    letterSpacing: -0.1,
  },
});
