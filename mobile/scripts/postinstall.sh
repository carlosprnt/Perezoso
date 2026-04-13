#!/bin/bash
# Patch react-native-safe-area-context for RN 0.81 Yoga API compatibility.
# The library uses .unit() which was removed from StyleLength in Yoga 3.x.
# Replace with .isDefined() which is the equivalent API.

FILE="node_modules/react-native-safe-area-context/common/cpp/react/renderer/components/safeareacontext/RNCSafeAreaViewShadowNode.cpp"

if [ -f "$FILE" ]; then
  if grep -q "\.unit()" "$FILE"; then
    sed -i.bak 's/edge\.unit() != Unit::Undefined/edge.isDefined()/g' "$FILE"
    sed -i.bak 's/axis\.unit() != Unit::Undefined/axis.isDefined()/g' "$FILE"
    rm -f "${FILE}.bak"
    echo "Patched react-native-safe-area-context for Yoga 3.x compatibility"
  fi
fi
