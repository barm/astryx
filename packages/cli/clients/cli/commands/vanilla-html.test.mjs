// Copyright (c) Meta Platforms, Inc. and affiliates.

import {describe, expect, it} from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {runCli} from '../../../test-utils/run-cli.mjs';
import {ASTRYX_VANILLA_CDN_REF} from '../../../api/template/html/html.mjs';

const REPO = path.resolve(import.meta.dirname, '../../../../..');
const FIXTURE = path.resolve(
  import.meta.dirname,
  '../../../test/fixtures/vanilla-project',
);
const SLOW = 30_000;

async function json(args, cwd = FIXTURE) {
  const result = await runCli(['--json', ...args], cwd);
  return {...result, payload: JSON.parse(result.stdout)};
}

const htmlFlags = [['--framework', 'html'], ['--html']];

describe('vanilla framework CLI forms', () => {
  it.each(htmlFlags)(
    'prints component HTML with %j',
    async (...flags) => {
      const result = await runCli(['component', 'Button', ...flags], FIXTURE);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain(
        '<!-- docs: A button triggers an action. -->',
      );
      expect(result.stdout).toContain('<!-- variant: primary -->');
    },
    SLOW,
  );

  it.each(htmlFlags)(
    'lists component HTML with %j',
    async (...flags) => {
      const result = await json(['component', '--list', ...flags]);
      expect(result.code).toBe(0);
      expect(result.payload).toMatchObject({
        type: 'component.html.list',
        data: [{name: 'Button', file: 'Button.html'}],
      });
    },
    SLOW,
  );

  it(
    'prints and lists web-component markup',
    async () => {
      const shown = await json([
        'component',
        'Button',
        '--framework',
        'web-components',
      ]);
      expect(shown.payload.type).toBe('component.web-components');
      expect(shown.payload.data.source).toContain('<ax-button');

      const listed = await json([
        'component',
        '--list',
        '--framework',
        'web-components',
      ]);
      expect(listed.payload).toMatchObject({
        type: 'component.web-components.list',
        data: [{name: 'Button', file: 'Button.html'}],
      });
    },
    SLOW,
  );

  it.each(htmlFlags)(
    'prints an HTML template with %j',
    async (...flags) => {
      const result = await json(['template', 'dashboard', ...flags]);
      expect(result.code).toBe(0);
      expect(result.payload.type).toBe('template.html');
      expect(result.payload.data.cdnRef).toBe(ASTRYX_VANILLA_CDN_REF);
      expect(result.payload.data.source).not.toContain(
        '__ASTRYX_VANILLA_CDN__',
      );
    },
    SLOW,
  );

  it.each(htmlFlags)(
    'lists HTML templates with %j',
    async (...flags) => {
      const result = await json(['template', '--list', ...flags]);
      expect(result.payload).toMatchObject({
        type: 'template.html.list',
        data: [{id: 'dashboard', file: 'dashboard.html'}],
      });
    },
    SLOW,
  );

  it(
    'prints and lists web-component templates',
    async () => {
      const shown = await json([
        'template',
        'dashboard',
        '--framework',
        'web-components',
      ]);
      expect(shown.payload.type).toBe('template.web-components');
      expect(shown.payload.data.source).toContain('<ax-button');
      expect(shown.payload.data.source).not.toContain('__ASTRYX_VANILLA_CDN__');

      const listed = await json([
        'template',
        '--list',
        '--framework',
        'web-components',
      ]);
      expect(listed.payload).toMatchObject({
        type: 'template.web-components.list',
        data: [{id: 'dashboard', file: 'dashboard.html'}],
      });
    },
    SLOW,
  );

  it(
    'keeps explicit react equivalent to the default',
    async () => {
      const implicitComponent = await json(['component', 'Button'], REPO);
      const explicitComponent = await json(
        ['component', 'Button', '--framework', 'react'],
        REPO,
      );
      expect(explicitComponent.payload).toEqual(implicitComponent.payload);

      const implicitTemplate = await json(['template', 'app-shell'], REPO);
      const explicitTemplate = await json(
        ['template', 'app-shell', '--framework', 'react'],
        REPO,
      );
      expect(explicitTemplate.payload).toEqual(implicitTemplate.payload);
    },
    SLOW,
  );

  it(
    'overrides the CDN ref for web-component templates',
    async () => {
      const result = await json([
        'template',
        'dashboard',
        '--framework',
        'web-components',
        '--cdn-ref',
        'abc1234',
      ]);
      expect(result.payload.data.cdnRef).toBe('abc1234');
      expect(result.payload.data.source).toContain(
        '@abc1234/packages/vanilla/dist',
      );
    },
    SLOW,
  );

  it(
    'explains an empty web-component template list',
    async () => {
      const empty = fs.mkdtempSync(
        path.join(os.tmpdir(), 'astryx-vanilla-empty-'),
      );
      fs.mkdirSync(path.join(empty, 'packages/vanilla/elements-templates'), {
        recursive: true,
      });
      try {
        const result = await runCli(
          ['template', '--list', '--framework', 'web-components'],
          empty,
        );
        expect(result.code).toBe(0);
        expect(result.stdout).toContain(
          'No vanilla web-component templates found',
        );
      } finally {
        fs.rmSync(empty, {recursive: true, force: true});
      }
    },
    SLOW,
  );
});

describe('vanilla framework CLI validation', () => {
  it.each([
    [
      ['component', '--framework', 'html'],
      /requires a component name or --list/,
    ],
    [
      ['component', 'Button', '--list', '--framework', 'web-components'],
      /cannot be combined with a component name/,
    ],
    [
      ['component', 'Button', '--framework', 'html', '--source'],
      /cannot be combined with --source/,
    ],
    [
      ['template', '--framework', 'web-components'],
      /requires a template id or --list/,
    ],
    [
      ['template', 'dashboard', 'out.html', '--framework', 'html'],
      /cannot be combined with <path>/,
    ],
    [
      ['template', 'dashboard', '--framework', 'web-components', '--cdn'],
      /cannot be combined with --cdn/,
    ],
    [['template', 'dashboard', '--cdn-ref', 'abc1234'], /requires --html/],
    [
      ['template', '--list', '--framework', 'html', '--cdn-ref', 'abc1234'],
      /only valid with a named --framework html template/,
    ],
    [['component', 'Button', '--framework', 'vue'], /Unknown framework "vue"/],
    [
      ['template', 'dashboard', '--framework', 'vue'],
      /Unknown framework "vue"/,
    ],
    [
      ['component', 'Button', '--html', '--framework', 'html'],
      /--html cannot be combined with --framework/,
    ],
  ])(
    'rejects %j clearly',
    async (args, message) => {
      const result = await json(args);
      expect(result.code).toBe(1);
      expect(result.payload.code).toBe('ERR_INVALID_ARGUMENT');
      expect(result.payload.error).toMatch(message);
    },
    SLOW,
  );
});
