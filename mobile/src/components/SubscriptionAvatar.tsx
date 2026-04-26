// Phase 3 — Shared UI primitive: SubscriptionAvatar
// Replicates the web app's SubscriptionAvatar:
//   Like LogoAvatar but with more size variants, platform catalog support,
//   themed border, and inner padding when showing a logo image.
//
// Web sizes: sm(36) sm40(40) md(44) md48(48) lg(56) xl(72)
// Shape: rounded-xl (12px) by default, configurable
// With image: border border-[#E8E8E8] dark:border-[#3A3A3C] bg-white p-1.5
// Initials: deterministic pastel, same border

import React, { useState, useMemo } from 'react';
import { View, Text, Image, type ViewStyle, type StyleProp } from 'react-native';
import { useTheme } from '../design/useTheme';
import { fontFamily, fontSize } from '../design/typography';
import { radius } from '../design/radius';
import { borderWidth } from '../design/borders';
import { getAvatarPastel, getInitials } from './LogoAvatar';
import { resolvePlatformLogoUrl } from '../lib/constants/platforms';

type AvatarSize = 'sm' | 'sm40' | 'md' | 'md48' | 'lg' | 'xl';

const SIZE_CONFIG: Record<AvatarSize, {
  dimension: number;
  fontSize: number;
  fontFamily: string;
}> = {
  sm:   { dimension: 36, fontSize: fontSize[14], ...fontFamily.semibold },
  sm40: { dimension: 40, fontSize: fontSize[14], ...fontFamily.semibold },
  md:   { dimension: 44, fontSize: fontSize[14], ...fontFamily.semibold },
  md48: { dimension: 48, fontSize: fontSize[14], ...fontFamily.semibold },
  lg:   { dimension: 56, fontSize: fontSize[15], ...fontFamily.bold },
  xl:   { dimension: 72, fontSize: fontSize[20], ...fontFamily.bold },
};

interface SubscriptionAvatarProps {
  name: string;
  logoUrl?: string | null;
  /** Simple Icons slug — resolved to CDN URL */
  simpleIconSlug?: string | null;
  size?: AvatarSize;
  /** Override corner radius. Default: radius.xl (12px) */
  cornerRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export function SubscriptionAvatar({
  name,
  logoUrl,
  simpleIconSlug,
  size = 'md',
  cornerRadius = radius.xl,
  style,
}: SubscriptionAvatarProps) {
  const { isDark } = useTheme();
  const config = SIZE_CONFIG[size];
  const [imgError, setImgError] = useState(false);

  // Resolve image URL via platform catalog (returns PNG from Google Favicons)
  const resolvedUrl = useMemo(() => {
    return resolvePlatformLogoUrl(name, logoUrl, simpleIconSlug);
  }, [name, logoUrl, simpleIconSlug]);

  const borderColor = isDark ? '#3A3A3C' : '#E8E8E8';

  const containerBase: ViewStyle = {
    width: config.dimension,
    height: config.dimension,
    borderRadius: cornerRadius,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: borderWidth.default,
    borderColor,
  };

  // Image path
  if (resolvedUrl && !imgError) {
    const innerPadding = 6; // p-1.5
    const imageSize = config.dimension - innerPadding * 2 - 2; // subtract padding + border

    return (
      <View
        style={[
          containerBase,
          {
            backgroundColor: '#FFFFFF',
            padding: innerPadding,
          },
          style,
        ]}
      >
        <Image
          source={{ uri: resolvedUrl }}
          style={{
            width: imageSize,
            height: imageSize,
          }}
          resizeMode="contain"
          onError={() => setImgError(true)}
        />
      </View>
    );
  }

  // Initials fallback
  const pastel = getAvatarPastel(name);
  return (
    <View style={[containerBase, { backgroundColor: pastel.bg }, style]}>
      <Text
        style={{
          fontFamily: config.fontFamily,
          fontSize: config.fontSize,
          color: pastel.fg,
        }}
        numberOfLines={1}
      >
        {getInitials(name)}
      </Text>
    </View>
  );
}
