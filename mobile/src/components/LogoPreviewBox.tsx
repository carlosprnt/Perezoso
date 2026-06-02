// Logo preview box used in create and edit subscription forms.
//
// Square container with a stroke that previews the platform logo
// auto-detected from the typed name. A small X badge in the top-right
// lets the user dismiss the auto-detected suggestion when it's wrong;
// the parent owns the `suppressed` flag and the `onClear` handler.
//
// Priority for what the box renders:
//   1. Manual URL in `logoUrl` — always wins, bypasses `suppressed`.
//      Lets the user paste a URL in 'More options' and see it
//      immediately replace any auto-match.
//   2. Auto-detect via resolvePlatformLogoUrl(name) — unless the
//      user dismissed with X (`suppressed: true`).
//   3. Empty box (just the stroke).

import React from 'react';
import { View, Image, Pressable } from 'react-native';
import { X } from 'lucide-react-native';
import { resolvePlatformLogoUrl } from '../lib/constants/platforms';

interface LogoPreviewBoxProps {
  name: string;
  logoUrl: string;
  suppressed: boolean;
  onClear: () => void;
  isDark: boolean;
  size: number;
}

export function LogoPreviewBox({
  name,
  logoUrl,
  suppressed,
  onClear,
  isDark,
  size,
}: LogoPreviewBoxProps) {
  const resolvedUrl = logoUrl
    ? logoUrl
    : suppressed
      ? null
      : resolvePlatformLogoUrl(name, null, null);
  const innerPadding = 6;
  const imgSize = size - innerPadding * 2 - 2;
  const borderColor = isDark ? '#3A3A3C' : '#E8E8E8';

  return (
    <View
      style={{
        width: size,
        height: size,
        backgroundColor: 'transparent',
        borderRadius: 12,
        borderWidth: 1,
        borderColor,
        alignItems: 'center',
        justifyContent: 'center',
        padding: innerPadding,
      }}
    >
      {resolvedUrl ? (
        <Image
          source={{ uri: resolvedUrl }}
          style={{ width: imgSize, height: imgSize }}
          resizeMode="contain"
        />
      ) : null}
      {resolvedUrl ? (
        <Pressable
          onPress={onClear}
          hitSlop={10}
          style={{
            position: 'absolute',
            top: -6,
            right: -6,
            width: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: isDark ? '#48484A' : '#8E8E93',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          accessibilityRole="button"
          accessibilityLabel="Remove logo"
        >
          <X size={10} color="#FFFFFF" strokeWidth={3} />
        </Pressable>
      ) : null}
    </View>
  );
}
