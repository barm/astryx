// Copyright (c) Meta Platforms, Inc. and affiliates.

/**
 * @file manifest.mjs
 * @input Astryx component and shared StyleX source locations
 * @output Declarative readable-selector mappings and parity cases
 * @position Isolated spike manifest consumed by generate.mjs
 */

const core = 'packages/core/src';

export const mappings = [
  // Button root composition.
  {
    id: 'button.focus',
    source: `${core}/utils/focusOutline.stylex.ts`,
    binding: 'focusOutlineStyles',
    key: 'focusVisible',
    selector: ':where(.ax-button)',
  },
  {
    id: 'button.base',
    source: `${core}/Button/Button.tsx`,
    binding: 'styles',
    key: 'base',
    selector: ':where(.ax-button)',
  },
  {
    id: 'button.overlay',
    source: `${core}/utils/interactionOverlay.stylex.ts`,
    binding: 'interactionOverlayStyles',
    key: 'backgroundImage',
    selector: ':where(.ax-button)',
  },
  {
    id: 'button.pressable',
    source: `${core}/Button/Button.tsx`,
    binding: 'styles',
    key: 'pressable',
    selector: ':where(.ax-button)',
  },
  ...['sm', 'md', 'lg'].map(key => ({
    id: `button.size.${key}`,
    source: `${core}/Button/Button.tsx`,
    binding: 'sizeStyles',
    key,
    selector: `:where(.ax-button--${key})`,
  })),
  ...['primary', 'secondary', 'ghost', 'destructive'].map(key => ({
    id: `button.variant.${key}`,
    source: `${core}/Button/Button.tsx`,
    binding: 'variants',
    key,
    selector: `:where(.ax-button--${key})`,
  })),
  ...['none', 'low', 'med', 'high'].map(key => ({
    id: `button.elevation.${key}`,
    source: `${core}/Button/Button.tsx`,
    binding: 'elevationStyles',
    key,
    selector: `:where(.ax-button--elevation-${key})`,
  })),

  // Card owns appearance locally but composes its padding contract from Layout.
  {
    id: 'card.base',
    source: `${core}/Card/Card.tsx`,
    binding: 'styles',
    key: 'card',
    selector: ':where(.ax-card)',
  },
  {
    id: 'card.container',
    source: `${core}/Layout/container.stylex.ts`,
    binding: 'baseStyles',
    key: 'container',
    selector: ':where(.ax-card)',
  },
  ...[
    'containerPaddingInlineStart',
    'containerPaddingInlineEnd',
    'containerPaddingBlockStart',
    'containerPaddingBlockEnd',
    'layoutPaddingOuterX',
    'layoutPaddingOuterY',
    'layoutPaddingInnerX',
    'layoutPaddingInnerY',
  ].map(key => ({
    id: `card.padding.${key}`,
    source: `${core}/Layout/container.stylex.ts`,
    binding: 'cardDefaultPaddingStyles',
    key,
    selector: ':where(.ax-card)',
  })),
  {
    id: 'card.withBorder',
    source: `${core}/Card/Card.tsx`,
    binding: 'styles',
    key: 'withBorder',
    selector: ':where(.ax-card--default)',
  },
  ...[
    'default',
    'transparent',
    'muted',
    'blue',
    'cyan',
    'gray',
    'green',
    'orange',
    'pink',
    'purple',
    'red',
    'teal',
    'yellow',
  ].map(key => ({
    id: `card.variant.${key}`,
    source: `${core}/Card/Card.tsx`,
    binding: 'variantStyles',
    key,
    selector: `:where(.ax-card--${key})`,
  })),
  ...['none', 'low', 'med', 'high'].map(key => ({
    id: `card.elevation.${key}`,
    source: `${core}/Card/Card.tsx`,
    binding: 'elevationStyles',
    key,
    selector: `:where(.ax-card--elevation-${key})`,
  })),

  // TextInput composes its wrapper from Field and owns the native input styles.
  {
    id: 'textInput.wrapper',
    source: `${core}/Field/inputStyles.stylex.ts`,
    binding: 'inputWrapperStyles',
    key: 'base',
    selector: ':where(.ax-text-input)',
  },
  ...['sm', 'md', 'lg'].map(key => ({
    id: `textInput.size.${key}`,
    source: `${core}/TextInput/TextInput.tsx`,
    binding: 'sizeStyles',
    key,
    selector: `:where(.ax-text-input--${key})`,
  })),
  ...['warning', 'error', 'success'].flatMap(status => [
    {
      id: `textInput.status.${status}.border`,
      source: `${core}/Field/inputStyles.stylex.ts`,
      binding: 'inputStatusBorderStyles',
      key: status,
      selector: `:where(.ax-text-input--${status})`,
    },
    {
      id: `textInput.status.${status}.hover`,
      source: `${core}/Field/inputStyles.stylex.ts`,
      binding: 'inputStatusHoverShadowStyles',
      key: status,
      selector: `:where(.ax-text-input--${status})`,
    },
    {
      id: `textInput.status.${status}.focus`,
      source: `${core}/Field/inputStyles.stylex.ts`,
      binding: 'inputStatusFocusWithinStyles',
      key: status,
      selector: `:where(.ax-text-input--${status})`,
    },
  ]),
  {
    id: 'textInput.input',
    source: `${core}/TextInput/TextInput.tsx`,
    binding: 'styles',
    key: 'input',
    selector: ':where(.ax-text-input > input)',
  },
];

const cardPaddingRefs = [
  'card.container',
  'card.padding.containerPaddingInlineStart',
  'card.padding.containerPaddingInlineEnd',
  'card.padding.containerPaddingBlockStart',
  'card.padding.containerPaddingBlockEnd',
  'card.padding.layoutPaddingOuterX',
  'card.padding.layoutPaddingOuterY',
  'card.padding.layoutPaddingInnerX',
  'card.padding.layoutPaddingInnerY',
];

export const cases = [
  ...['primary', 'secondary', 'ghost', 'destructive'].map(variant => ({
    component: 'Button',
    variant,
    hookClass: 'astryx-button',
    attributes: {
      'data-size': 'md',
      'data-variant': variant,
      'data-elevation': 'none',
    },
    readableClasses: [
      'ax-button',
      'ax-button--md',
      `ax-button--${variant}`,
      'ax-button--elevation-none',
    ],
    parts: {
      root: [
        'button.focus',
        'button.base',
        'button.size.md',
        'button.overlay',
        'button.pressable',
        'button.elevation.none',
        `button.variant.${variant}`,
      ],
    },
    states: ['rest', 'hover', 'focus'],
  })),
  ...[
    'default',
    'transparent',
    'muted',
    'blue',
    'cyan',
    'gray',
    'green',
    'orange',
    'pink',
    'purple',
    'red',
    'teal',
    'yellow',
  ].map(variant => ({
    component: 'Card',
    variant,
    hookClass: 'astryx-card',
    attributes: {
      'data-variant': variant,
      'data-elevation': 'none',
    },
    readableClasses: [
      'ax-card',
      `ax-card--${variant}`,
      'ax-card--elevation-none',
    ],
    parts: {
      root: [
        'card.base',
        `card.variant.${variant}`,
        'card.elevation.none',
        ...cardPaddingRefs,
        ...(variant === 'default' ? ['card.withBorder'] : []),
      ],
    },
    states: ['rest'],
  })),
  ...['default', 'success', 'warning', 'error'].map(status => ({
    component: 'TextInput',
    variant: status,
    hookClass: 'astryx-text-input',
    attributes: {
      'data-size': 'md',
      ...(status === 'default' ? {} : {'data-status': status}),
    },
    readableClasses: [
      'ax-text-input',
      'ax-text-input--md',
      `ax-text-input--${status}`,
    ],
    parts: {
      root: [
        'textInput.wrapper',
        'textInput.size.md',
        ...(status === 'default'
          ? []
          : [
              `textInput.status.${status}.border`,
              `textInput.status.${status}.hover`,
              `textInput.status.${status}.focus`,
            ]),
      ],
      control: ['textInput.input'],
    },
    states: ['rest', 'hover', 'focus'],
  })),
];
