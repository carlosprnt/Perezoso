#!/usr/bin/env node
// Patch react-native-safe-area-context for RN 0.81 Yoga API compatibility.
// Uses Node.js for full cross-platform compatibility (macOS/Linux/Windows).

const fs = require('fs');
const path = require('path');

const filePath = path.join(
  __dirname, '..', 'node_modules',
  'react-native-safe-area-context',
  'common', 'cpp', 'react', 'renderer', 'components',
  'safeareacontext', 'RNCSafeAreaViewShadowNode.cpp'
);

if (!fs.existsSync(filePath)) {
  process.exit(0);
}

let content = fs.readFileSync(filePath, 'utf8');

if (!content.includes('.unit()')) {
  console.log('react-native-safe-area-context: already compatible');
  process.exit(0);
}

content = content.replace(/edge\.unit\(\) != Unit::Undefined/g, 'edge.isDefined()');
content = content.replace(/axis\.unit\(\) != Unit::Undefined/g, 'axis.isDefined()');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Patched react-native-safe-area-context for Yoga 3.x compatibility');
