// Copyright (c) Meta Platforms, Inc. and affiliates.
/**
 * @input Theme and mode controls, their allowed options, and persisted choices.
 * @output Validated document theme/mode attributes and interactive switchers.
 * @position Progressive appearance-state behavior for Vanilla Astryx pages.
 */
/* global Element, HTMLSelectElement, Node, document */

import {elementsMatching} from './utils.js';

const themeDocuments = new WeakSet();
const shippedThemes = [
  'neutral',
  'butter',
  'y2k',
  'stone',
  'matcha',
  'chocolate',
  'gothic',
];
const modes = ['light', 'dark'];
const themeStorageKey = 'astryx-vanilla-theme';
const modeStorageKey = 'astryx-vanilla-mode';

function isTheme(value) {
  return typeof value === 'string' && /^[a-z][a-z0-9-]*$/.test(value);
}

function storageFor(root) {
  try {
    return root.ownerDocument?.defaultView?.localStorage ?? null;
  } catch {
    return null;
  }
}

function readStored(root, key) {
  try {
    return storageFor(root)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function persist(root, key, value) {
  try {
    storageFor(root)?.setItem(key, value);
  } catch {
    // Storage can be unavailable for sandboxed or local-file documents.
  }
}

function clearStored(root, key) {
  try {
    storageFor(root)?.removeItem(key);
  } catch {
    // Storage can be unavailable for sandboxed or local-file documents.
  }
}

function knownThemes(doc) {
  const themes = new Set(shippedThemes);
  for (const select of doc.querySelectorAll('[data-ax-theme-switch]')) {
    if (!(select instanceof HTMLSelectElement)) continue;
    for (const option of select.options) {
      if (isTheme(option.value)) themes.add(option.value);
    }
  }
  return themes;
}

export function setTheme(value, root = document.documentElement) {
  if (!isTheme(value)) return;
  root.dataset.astryxTheme = value;
  persist(root, themeStorageKey, value);
}

export function setMode(value, root = document.documentElement) {
  if (!modes.includes(value)) return;
  root.dataset.theme = value;
  persist(root, modeStorageKey, value);
}

function cycle(values, current) {
  return values[(Math.max(0, values.indexOf(current)) + 1) % values.length];
}

function restoreThemeMode(root, doc) {
  const theme = readStored(root, themeStorageKey);
  const mode = readStored(root, modeStorageKey);
  if (isTheme(theme) && knownThemes(doc).has(theme))
    root.dataset.astryxTheme = theme;
  else if (theme !== null) clearStored(root, themeStorageKey);
  if (modes.includes(mode)) root.dataset.theme = mode;
  else if (mode !== null) clearStored(root, modeStorageKey);
}

export function enhanceThemeModeSwitchers(root) {
  const doc = root.nodeType === Node.DOCUMENT_NODE ? root : root.ownerDocument;
  const currentTheme = doc.documentElement.dataset.astryxTheme || 'neutral';
  const currentMode = doc.documentElement.dataset.theme || 'light';
  for (const select of elementsMatching(root, '[data-ax-theme-switch]')) {
    if ([...select.options].some(option => option.value === currentTheme))
      select.value = currentTheme;
  }
  for (const select of elementsMatching(root, '[data-ax-mode-switch]')) {
    if ([...select.options].some(option => option.value === currentMode))
      select.value = currentMode;
  }
}

export function setupThemeModeSwitchers(doc) {
  if (themeDocuments.has(doc)) return;
  themeDocuments.add(doc);
  restoreThemeMode(doc.documentElement, doc);
  doc.addEventListener('change', event => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    if (target.matches('[data-ax-theme-switch]'))
      setTheme(target.value, doc.documentElement);
    if (target.matches('[data-ax-mode-switch]'))
      setMode(target.value, doc.documentElement);
  });
  doc.addEventListener('click', event => {
    const target =
      event.target instanceof Element
        ? event.target.closest('[data-ax-theme-toggle], [data-ax-mode-toggle]')
        : null;
    if (!target) return;
    if (target.matches('[data-ax-theme-toggle]'))
      setTheme(
        cycle(shippedThemes, doc.documentElement.dataset.astryxTheme),
        doc.documentElement,
      );
    if (target.matches('[data-ax-mode-toggle]'))
      setMode(
        cycle(modes, doc.documentElement.dataset.theme),
        doc.documentElement,
      );
  });
}

export const initThemeModeSwitchers = setupThemeModeSwitchers;
