// Copyright (c) Meta Platforms, Inc. and affiliates.
/* global URLSearchParams, addEventListener, customElements, document, location, matchMedia, queueMicrotask, setTimeout */
/**
 * @input A Vanilla Astryx state-recipes page and an optional #state=<name> hash.
 * @output Deterministic, same-document interaction states for people and visual harnesses.
 * @position Shared controller for the HTML and web-component state recipe galleries.
 */

const STATE_RECIPES = new Map([
  ['default', null],
  ['hover-open', 'hover'],
  ['loading', 'submit'],
  ['success', 'submit'],
  ['upload-progress', 'upload'],
  ['upload-done', 'upload'],
  ['upload-error', 'upload'],
  ['password-weak', 'password'],
  ['password-medium', 'password'],
  ['password-strong', 'password'],
  ['password-visible', 'password'],
  ['nav-collapsed', 'navigation'],
  ['nav-expanded', 'navigation'],
]);

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const isElementHost = element => element?.localName?.startsWith('ax-');
const innerControl = element =>
  isElementHost(element)
    ? element.querySelector('button, input, a, [role="button"]')
    : element;

function requestedState() {
  const state = new URLSearchParams(location.hash.slice(1)).get('state');
  return STATE_RECIPES.has(state) ? state : 'default';
}

function setButton(button, {label, disabled = false, busy = false}) {
  const labelNode = button.querySelector('[data-state-role="button-label"]');
  if (labelNode) labelNode.textContent = label;
  else button.textContent = label;

  if (isElementHost(button)) button.toggleAttribute('is-disabled', disabled);
  else button.disabled = disabled;

  queueMicrotask(() => {
    const control = innerControl(button);
    control?.setAttribute('aria-busy', String(busy));
  });
}

function setHover(open) {
  const host = $('[data-state-role="hover-host"]');
  if (isElementHost(host)) host.toggleAttribute('is-open', open);

  queueMicrotask(() => {
    const trigger = host.querySelector(
      '[data-ax-hover-card-trigger], button, a',
    );
    const surface = host.querySelector('[data-ax-hover-card-content]');
    if (!surface) return;
    surface.hidden = !open;
    surface.dataset.axOpen = String(open);
    trigger?.setAttribute('aria-expanded', String(open));
  });
}

function setSubmission(state) {
  const button = $('[data-state-role="submit-button"]');
  const status = $('[data-state-role="submit-status"]');
  const loading = state === 'loading';
  const success = state === 'success';
  setButton(button, {
    label: loading ? 'Saving…' : success ? 'Saved' : 'Save changes',
    disabled: loading,
    busy: loading,
  });
  status.textContent = loading
    ? 'Saving changes…'
    : success
      ? 'Changes saved successfully.'
      : 'Ready to save.';
  status.dataset.status = success ? 'success' : loading ? 'loading' : 'idle';
}

function setProgress(host, {label, value, variant, valueLabel}) {
  if (isElementHost(host)) {
    host.setAttribute('label', label);
    host.setAttribute('value', String(value));
    host.setAttribute('variant', variant);
    host.toggleAttribute('has-value-label', true);
    queueMicrotask(() => {
      host
        .querySelector('[role="progressbar"]')
        ?.setAttribute('aria-valuetext', valueLabel);
    });
    return;
  }

  host.classList.remove(
    'ax-progress-bar--success',
    'ax-progress-bar--warning',
    'ax-progress-bar--error',
    'ax-progress-bar--neutral',
  );
  host.classList.add(`ax-progress-bar--${variant}`);
  host.style.setProperty('--ax-progress-value', `${value}%`);
  host.querySelector('.ax-progress-bar__label').textContent = label;
  host.querySelector('.ax-progress-bar__value').textContent = valueLabel;
  const track = host.querySelector('[role="progressbar"]');
  track.setAttribute('aria-valuenow', String(value));
  track.setAttribute('aria-valuetext', valueLabel);
}

function setUpload(state) {
  const host = $('[data-state-role="upload-progress"]');
  const status = $('[data-state-role="upload-status"]');
  const configurations = {
    idle: {
      label: 'Upload ready',
      value: 0,
      valueLabel: 'Not started',
      variant: 'neutral',
      message: 'Choose files to begin.',
    },
    'upload-progress': {
      label: 'Uploading files',
      value: 64,
      valueLabel: '64%',
      variant: 'accent',
      message: 'Uploading 3 files — 64% complete.',
    },
    'upload-done': {
      label: 'Upload complete',
      value: 100,
      valueLabel: '100%',
      variant: 'success',
      message: 'All 3 files uploaded.',
    },
    'upload-error': {
      label: 'Upload failed',
      value: 64,
      valueLabel: 'Stopped at 64%',
      variant: 'error',
      message: 'Upload stopped at 64%. Retry when the connection is restored.',
    },
  };
  const configuration = configurations[state] ?? configurations.idle;
  setProgress(host, configuration);
  status.textContent = configuration.message;
  status.dataset.status = configuration.variant;
}

function setPassword(state) {
  const field = $('[data-state-role="password-field"]');
  const toggle = $('[data-state-role="password-toggle"]');
  const meter = $('[data-state-role="password-progress"]');
  const status = $('[data-state-role="password-status"]');
  const configurations = {
    default: {
      value: '',
      valueLabel: 'Not entered',
      label: 'Enter a password to see its strength.',
      progress: 0,
      variant: 'neutral',
      visible: false,
    },
    'password-weak': {
      value: 'astryx',
      valueLabel: 'Weak',
      label: 'Weak — add length, numbers, and symbols.',
      progress: 25,
      variant: 'error',
      visible: false,
    },
    'password-medium': {
      value: 'Astryx2026',
      valueLabel: 'Medium',
      label: 'Medium — add a symbol or more words.',
      progress: 60,
      variant: 'warning',
      visible: false,
    },
    'password-strong': {
      value: 'Astryx!2026Secure',
      valueLabel: 'Strong',
      label: 'Strong password.',
      progress: 100,
      variant: 'success',
      visible: false,
    },
    'password-visible': {
      value: 'Astryx!2026Secure',
      valueLabel: 'Strong',
      label: 'Strong password. Password is visible.',
      progress: 100,
      variant: 'success',
      visible: true,
    },
  };
  const configuration = configurations[state] ?? configurations.default;

  if (isElementHost(field)) {
    field.setAttribute('value', configuration.value);
    field.setAttribute('type', configuration.visible ? 'text' : 'password');
  } else {
    field.value = configuration.value;
    field.type = configuration.visible ? 'text' : 'password';
  }
  setProgress(meter, {
    label: 'Password strength',
    value: configuration.progress,
    variant: configuration.variant,
    valueLabel: configuration.valueLabel,
  });
  setButton(toggle, {
    label: configuration.visible ? 'Hide password' : 'Show password',
  });
  queueMicrotask(() => {
    innerControl(toggle)?.setAttribute(
      'aria-pressed',
      String(configuration.visible),
    );
  });
  status.textContent = configuration.label;
  status.dataset.status = configuration.variant;
}

function setNavigation(state) {
  const shell = $('[data-state-role="nav-shell"]');
  const toggle = $('[data-state-role="nav-toggle"]');
  const items = $$('[data-state-nav-item]');
  const viewportIsCompact = matchMedia('(max-width: 48rem)').matches;
  const forced = state === 'nav-collapsed' || state === 'nav-expanded';
  const compact = forced || viewportIsCompact;
  const expanded =
    state === 'nav-expanded' || (!compact && state !== 'nav-collapsed');

  const navigationItems = shell.querySelector('.ax-top-nav__items');
  if (navigationItems) navigationItems.id = 'state-navigation-items';
  shell.dataset.compact = String(compact);
  for (const item of items) item.hidden = compact && !expanded;
  toggle.hidden = !compact;
  setButton(toggle, {label: expanded ? 'Close menu' : 'Open menu'});
  queueMicrotask(() => {
    const control = innerControl(toggle);
    control?.setAttribute('aria-expanded', String(expanded));
    control?.setAttribute('aria-controls', 'state-navigation-items');
  });
}

function focusRecipe(recipe) {
  for (const section of $$('[data-state-recipe]')) {
    section.hidden = Boolean(recipe && section.dataset.stateRecipe !== recipe);
  }
}

async function applyState(state = requestedState()) {
  await Promise.all(
    $$('[data-state-role]')
      .filter(isElementHost)
      .map(host => customElements.whenDefined(host.localName)),
  );

  setHover(false);
  setSubmission('idle');
  setUpload('idle');
  setPassword('default');
  setNavigation('default');

  const recipe = STATE_RECIPES.get(state);
  focusRecipe(recipe);
  if (state === 'hover-open') setHover(true);
  if (state === 'loading' || state === 'success') setSubmission(state);
  if (state.startsWith('upload-')) setUpload(state);
  if (state.startsWith('password-')) setPassword(state);
  if (state.startsWith('nav-')) setNavigation(state);

  document.documentElement.dataset.activeState = state;
  document.body.dataset.activeState = state;
}

function setHashState(state) {
  location.hash = `state=${state}`;
}

function initializeInteractions() {
  $('[data-state-role="submit-form"]')?.addEventListener('submit', event => {
    event.preventDefault();
    setHashState('loading');
    setTimeout(() => setHashState('success'), 900);
  });

  $('[data-state-role="password-toggle"]')?.addEventListener('click', () => {
    const control = innerControl($('[data-state-role="password-toggle"]'));
    setHashState(
      control?.getAttribute('aria-pressed') === 'true'
        ? 'password-strong'
        : 'password-visible',
    );
  });

  const passwordHost = $('[data-state-role="password-field"]');
  const passwordInput = isElementHost(passwordHost)
    ? passwordHost.querySelector('input')
    : passwordHost;
  passwordInput?.addEventListener('input', event => {
    const length = event.target.value.length;
    setPassword(
      length >= 14
        ? 'password-strong'
        : length >= 9
          ? 'password-medium'
          : length > 0
            ? 'password-weak'
            : 'default',
    );
  });

  $('[data-state-role="nav-toggle"]')?.addEventListener('click', () => {
    const control = innerControl($('[data-state-role="nav-toggle"]'));
    setHashState(
      control?.getAttribute('aria-expanded') === 'true'
        ? 'nav-collapsed'
        : 'nav-expanded',
    );
  });

  addEventListener('hashchange', () => void applyState());
  addEventListener('resize', () => {
    if (!requestedState().startsWith('nav-')) setNavigation('default');
  });
}

addEventListener(
  'load',
  () => {
    initializeInteractions();
    void applyState();
  },
  {once: true},
);
