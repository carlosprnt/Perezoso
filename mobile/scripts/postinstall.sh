#!/bin/bash
# Patch react-native-safe-area-context for RN 0.81 Yoga API compatibility.
# The library uses .unit() which was removed from StyleLength in Yoga 3.x.
# Replace with .isDefined() which is the equivalent API.
# Uses portable sed (works on both macOS and Linux).

FILE="node_modules/react-native-safe-area-context/common/cpp/react/renderer/components/safeareacontext/RNCSafeAreaViewShadowNode.cpp"

if [ -f "$FILE" ]; then
  if grep -q '\.unit()' "$FILE"; then
    cp "$FILE" "${FILE}.orig"
    sed 's/edge\.unit() != Unit::Undefined/edge.isDefined()/g; s/axis\.unit() != Unit::Undefined/axis.isDefined()/g' "${FILE}.orig" > "$FILE"
    rm -f "${FILE}.orig"
    echo "✅ Patched react-native-safe-area-context for Yoga 3.x compatibility"
  else
    echo "✅ react-native-safe-area-context already compatible"
  fi
fi
