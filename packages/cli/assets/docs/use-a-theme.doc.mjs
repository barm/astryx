// Copyright (c) Meta Platforms, Inc. and affiliates.

/** @type {import('@astryxdesign/cli/authoring').ReferenceDoc} */

export const docs = {
  name: 'use-a-theme',
  title: 'Use a theme',
  category: 'guide',
  keywords: ['theme', 'Theme', 'dark mode', 'light', 'nested', 'provider', 'SSR', 'built', 'theme add', 'theme eject', 'available themes'],
  description: 'Add built themes to the generated app module, wrap the app in a provider, switch themes and dark mode, and fork source only when needed.',
  sections: [
    {
      id: 'quick-start',
      title: 'Wrap your app in a theme',
      content: [
        {
          type: 'code',
          lang: 'bash',
          label: 'Install and add a theme',
          code: 'npm install @astryxdesign/theme-neutral\nastryx theme add neutral',
        },
        {
          type: 'code',
          lang: 'tsx',
          label: 'Wire the generated module once',
          code: `import {Theme} from '@astryxdesign/core';
import {themes, defaultThemeSlug} from './astryx-themes';

function App() {
  return (
    <Theme theme={themes[defaultThemeSlug]}>
      <YourApp />
    </Theme>
  );
}`,
        },
        {
          type: 'code',
          lang: 'tsx',
          label: 'Switch among added themes',
          code: `import {useState} from 'react';
import {themes, type ThemeSlug} from './astryx-themes';

const [slug, setSlug] = useState<ThemeSlug>('neutral');
const app = <Theme theme={themes[slug]}><YourApp /></Theme>;`,
        },
        {
          type: 'prose',
          text: '`theme add` records an installed package theme and regenerates `src/astryx-themes.ts` or `.js` with its built module, production CSS, and optional font CSS. In a project without `src`, the module is at the project root. The first imported theme becomes the default. `theme use <slug>` changes that default, and `theme remove <slug>` removes a non-default theme.',
        },
        {
          type: 'prose',
          text: 'Customize a package theme with `defineTheme({extends: importedTheme, ...})`, then build and add that local theme. Use `theme eject` only when you want an independent source fork that no longer receives the package owner’s updates.',
        },
      ],
    },
    {
      title: 'Migrating Earlier Theme Copies',
      content: [
        {
          type: 'prose',
          text: 'A theme copied by the released `theme add` stays app source. The upgrade does not move, delete, or rewrite it. It only writes the missing same-stem descriptor with `maintained: false`, so the copy becomes a local theme.',
        },
        {
          type: 'code',
          lang: 'bash',
          label: 'Add descriptors to earlier copies',
          code: 'astryx upgrade --from 0.6.4 --path . --apply',
        },
        {
          type: 'prose',
          text: 'Before the upgrade runs, theme commands skip a descriptor-less copy in `src/themes`. `theme list` and doctor name it as unmigrated and show the upgrade command. A script that meant to copy source now runs `theme eject` with the same arguments. A script that meant to make the app use a theme runs `theme add`.',
        },
        {
          type: 'prose',
          text: '`ASTRYX_THEME` is no longer read. Run `theme add <slug>` and `theme use <slug>` to choose the default in a generated app theme module. When that module exists, component metadata reads its recorded default theme. Without the module, the released `package.json#astryx.theme` lookup keeps its meaning.',
        },
      ],
    },
    {
      title: 'Available Themes',
      content: [
        {
          type: 'prose',
          text: 'Install the theme package you want with `npm install @astryxdesign/theme-{name}`, then import its slug with `theme add <slug>`. The CLI imports the package’s built outputs for you.',
        },
        {type: 'table', headers: ['Theme', 'Add command', 'Description'], rows: [
          ['Neutral', 'astryx theme add neutral', 'Muted, minimal aesthetic with Figtree typography. A good starting point.'],
          ['Butter', 'astryx theme add butter', 'Golden, buttery surfaces with blue accents; Sarina + Outfit type.'],
          ['Chocolate', 'astryx theme add chocolate', 'Warm brown tones and cozy beige; Fraunces + Albert Sans type.'],
          ['Gothic', 'astryx theme add gothic', 'Dark-only atmospheric theme; deep blue-gray surfaces, distressed display type.'],
          ['Matcha', 'astryx theme add matcha', 'Earthy greens; DM Sans + Playwrite US Trad type.'],
          ['Stone', 'astryx theme add stone', 'Warm stone and slate tones; Montserrat + Figtree type.'],
          ['Y2K', 'astryx theme add y2k', 'Playful Y2K pop; periwinkle body, holographic accents, Poppins + Crimson Text.'],
        ]},
        {
          type: 'prose',
          text: 'Every first-party package exports its built theme at `@astryxdesign/theme-{name}/built`, production CSS at `/theme.css`, and font loading CSS at `/fonts.css`. `theme add` writes those imports into the generated app module.',
        },
      ],
    },
    {
      title: 'Theme Props',
      content: [
        {type: 'prose', text: "`<Theme>` takes `theme` (required), `mode` (`'system'` by default, or `'light'`/`'dark'`), and `children`. For every prop, run `astryx component Theme`."},
      ],
    },
    {
      id: 'integration-themes',
      title: 'Using a Theme from an Integration',
      content: [
        {
          type: 'prose',
          text: 'Install the integration as a direct dependency. Astryx discovers its themes and guides without an `astryx.config` entry. A theme can be added only when the installed package exports its built module and production stylesheet.',
        },
        {
          type: 'code',
          lang: 'bash',
          label: 'Install, inspect, and add',
          code: 'npm install @astryxdesign/core @acme/brand-integration\nastryx theme list --package @acme/brand-integration\nastryx docs brand-theme\nastryx theme add ocean --package @acme/brand-integration',
        },
        {
          type: 'prose',
          text: '`theme add` keeps the owner package in the app record and imports its built module, stylesheet, and optional font stylesheet. Package updates continue to reach the app. Run `theme eject ocean --package @acme/brand-integration` only to copy the source and descriptor into `src/themes/ocean` as an independent local fork.',
        },
      ],
    },
    {
      id: 'light-dark-mode',
      title: 'Dark mode',
      content: [
        {type: 'prose', text: "Use [light, dark] tuples in token values for automatic mode switching. Use mode='system' (default) on Theme to follow OS preference."},
        {type: 'code', lang: 'tsx', label: 'Light/dark tuple', code: "'--color-accent': ['#0064E0', '#2694FE'],\n//                   ^light     ^dark"},
        {type: 'code', lang: 'tsx', label: 'Toggle with a button', code: "const [mode, setMode] = useState<'light' | 'dark'>('light');\n\n<Theme theme={myTheme} mode={mode}>\n  <Button\n    label={mode === 'light' ? 'Switch to Dark' : 'Switch to Light'}\n    onClick={() => setMode(m => (m === 'light' ? 'dark' : 'light'))}\n  />\n</Theme>;"},
        {type: 'prose', text: 'To create a theme with custom dark mode colors, see {@link generic:author-a-theme}.'},
      ],
    },
    {
      id: 'nesting-themes',
      title: 'Nested themes',
      content: [
        {type: 'prose', text: 'Wrap different sections in separate `<Theme>` providers.'},
        {type: 'code', lang: 'tsx', label: 'Dark sidebar with light content', code: "<Theme theme={lightTheme} mode=\"light\">\n  <Layout\n    header={<LayoutHeader>...</LayoutHeader>}\n    start={\n      <Theme theme={darkTheme} mode=\"dark\">\n        <LayoutPanel>{/* Dark sidebar */}</LayoutPanel>\n      </Theme>\n    }\n    content={<LayoutContent>{/* Light content */}</LayoutContent>}\n  />\n</Theme>"},
      ],
    },
    {
      title: 'Runtime vs Built Themes',
      content: [
        {
          type: 'prose',
          text: 'Apps use built themes. The generated app module imports each theme object with its production CSS and optional font CSS, so every added theme is ready on first paint. Source-theme imports remain an authoring input for `theme build`, not the app wiring model.',
        },
        {type: 'table', headers: ['App concern', 'Package theme', 'Local theme'], rows: [
          ['Add', '`astryx theme add <slug> [--package <package>]`', '`astryx theme build <source>` then `astryx theme add <slug>`'],
          ['Module import', 'Package `./built` or `./themes/<slug>` export', 'Built `<slug>.js` beside the source'],
          ['Styles', '`./theme.css` or `./themes/<slug>.css`, plus optional font CSS', 'Built `<slug>.css`, plus optional `<slug>.fonts.css`'],
          ['Updates', 'Stay owned by the installed package', 'Stay owned and rebuilt by the app'],
        ]},
        {type: 'list', style: 'do', items: [
          'Import `themes` and `defaultThemeSlug` from the generated module once.',
          'Extend an imported built theme for ordinary customization.',
          'Use `theme eject` only when you want an independent source fork.',
        ]},
        {type: 'list', style: 'dont', items: [
          'Import package theme source into app runtime code.',
          "Import a built theme without its stylesheet; component overrides won't apply.",
          'Hand-edit the generated theme module; add, remove, and use regenerate it.',
        ]},
      ],
    },
  ],
};
