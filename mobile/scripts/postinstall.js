#!/usr/bin/env node
// Patch ALL native modules for RN 0.81 Yoga API compatibility.
// Scans every .cpp/.mm/.h file in node_modules for StyleLength .unit() calls
// and replaces them with the Yoga 3.x equivalent (.isDefined()).
// Also patches react-native-screens parentShadowView if needed.

const fs = require('fs');
const path = require('path');

const nodeModules = path.join(__dirname, '..', 'node_modules');

// ─── Recursive file finder ────────────────────────────────────────────
function findFiles(dir, extensions, results = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return results; }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip deep directories that are unlikely to have relevant code
      if (entry.name === '__tests__' || entry.name === 'android') continue;
      findFiles(full, extensions, results);
    } else if (extensions.some(ext => entry.name.endsWith(ext))) {
      results.push(full);
    }
  }
  return results;
}

// ─── Patch 1: .unit() → .isDefined() on StyleLength ──────────────────
// In Yoga 3.x (RN 0.81), StyleLength removed .unit() in favor of .isDefined()
let patchedUnit = 0;
const cppFiles = findFiles(nodeModules, ['.cpp', '.mm', '.h']);
for (const file of cppFiles) {
  // Skip react-native core (it's correct for its own Yoga version)
  if (file.includes(path.join('react-native', 'ReactCommon'))) continue;

  let content;
  try { content = fs.readFileSync(file, 'utf8'); }
  catch { continue; }

  if (!content.includes('.unit()')) continue;

  let patched = content;
  // Replace specific known patterns
  patched = patched.replace(/(\w+)\.unit\(\)\s*!=\s*Unit::Undefined/g, '$1.isDefined()');
  patched = patched.replace(/(\w+)\.unit\(\)\s*==\s*Unit::Undefined/g, '!$1.isDefined()');

  if (patched !== content) {
    fs.writeFileSync(file, patched, 'utf8');
    patchedUnit++;
    console.log(`  Patched .unit() in ${path.relative(nodeModules, file)}`);
  }
}

if (patchedUnit > 0) {
  console.log(`Patched ${patchedUnit} file(s) for Yoga 3.x StyleLength compatibility`);
} else {
  console.log('All native modules already compatible with Yoga 3.x');
}

// ─── Patch 2: parentShadowView → parentTag ───────────────────────────
// In RN 0.81, ShadowViewMutation replaced parentShadowView with parentTag
let patchedParent = 0;
for (const file of cppFiles) {
  if (file.includes(path.join('react-native', 'ReactCommon'))) continue;

  let content;
  try { content = fs.readFileSync(file, 'utf8'); }
  catch { continue; }

  if (!content.includes('parentShadowView')) continue;

  let patched = content;
  patched = patched.replace(/mutation\.parentShadowView\.tag/g, 'mutation.parentTag');

  if (patched !== content) {
    fs.writeFileSync(file, patched, 'utf8');
    patchedParent++;
    console.log(`  Patched parentShadowView in ${path.relative(nodeModules, file)}`);
  }
}

if (patchedParent > 0) {
  console.log(`Patched ${patchedParent} file(s) for ShadowViewMutation compatibility`);
}

console.log('postinstall: native compatibility patches complete');
