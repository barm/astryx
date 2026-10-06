// Copyright (c) Meta Platforms, Inc. and affiliates.

import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {fileURLToPath} from 'node:url';
import {afterEach, test} from 'node:test';
import {chromium} from 'playwright';
import {
  buildTaskPrompt,
  getDeliverySpecs,
  selectPrompts,
} from './constants.mjs';
import {
  captureAuthoredSources,
  evaluateRun,
  measureAdoptionInDocument,
  resolveJudgeAttempts,
  scanAuthoredSource,
} from './evaluator.mjs';
import {
  auditAgentContext,
  auditTranscriptCommands,
  countAstryxInvocations,
  countCliLookups,
  createPrivateRunRoot,
} from './process.mjs';
import {runnerInvocation, validateRunnerProfile} from './runner-profile.mjs';
import {
  buildVanillaAgentDocs,
  buildWebComponentsAgentDocs,
  prepareProject,
  reactNoBuildStarter,
  vanillaStarter,
  webComponentsStarter,
} from './projects.mjs';
import {summarize} from './report.mjs';

const temporaryDirectories = [];

function testRunnerProfile() {
  return validateRunnerProfile({
    schema: 1,
    runners: {
      claude: {
        command: '/runner/a',
        input: 'stdin',
        agentArgs: [
          'agent',
          '--policy-mode',
          '--mcp',
          '{{MCP_CONFIG}}',
          '--tools',
          '{{TOOLS}}',
        ],
        judgeArgs: [
          'judge',
          '--mcp',
          '{{MCP_CONFIG}}',
          '--tools',
          '{{TOOLS}}',
          '--schema',
          '{{JSON_SCHEMA}}',
        ],
        audit: {
          contextPolicies: {
            '1.0.0': {
              agents: ['runner-a'],
              plugins: [
                {name: 'plugin-a', path: 'builtin', source: 'plugin-a@builtin'},
                {name: 'plugin-b', path: 'builtin', source: 'plugin-b@builtin'},
              ],
            },
          },
          requiredStderr: ['configured policy active'],
          pluginInstallMarker: 'installing extension',
          knownAsymmetry: 'runner-a asymmetry',
          projectInstructions: 'runner-a instruction behavior',
          pathPolicy: 'test path policy',
        },
      },
      muse: {
        command: '/runner/b',
        input: 'none',
        maxModelSteps: 80,
        agentArgs: [
          'agent',
          '--project',
          '{{PROJECT}}',
          '--task',
          '{{TASK_FILE}}',
          '--steps',
          '{{MAX_MODEL_STEPS}}',
        ],
        audit: {
          pluginGateOffMarker: 'runner-b extensions disabled',
          pluginInstallMarker: 'installing extension',
          knownAsymmetry: 'runner-b asymmetry',
          pathPolicy: 'test path policy',
        },
      },
    },
    sandbox: {
      mountScript: 'exit 0',
      probeScript: 'exit 0',
      hostUserRoot: '/host/users',
      transcriptAuditPaths: ['/private/root', '/host/bin'],
      manifest: {runnerContext: {}, isolation: {}},
      probeReceipt: {configuredChecksPassed: true},
    },
    versionCommands: {
      node: {command: '/runtime/node', args: ['--version']},
    },
  });
}
afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map(directory =>
        fs.promises.rm(directory, {recursive: true, force: true}),
      ),
  );
});

test('generated prompts never leak expected components or Path A coaching', () => {
  const specs = getDeliverySpecs();
  const prompt = {
    id: 'x-1',
    prompt: 'Build a settings card.',
    expectedComponents: ['Card', 'Switch'],
  };
  const generated = Object.values(specs).map(spec =>
    buildTaskPrompt(prompt, spec, '<project-dir>', {timeoutMinutes: 15}),
  );
  for (const task of generated) {
    assert.doesNotMatch(task, /expectedComponents|Switch|Path A/);
    assert.match(task, /Build a settings card\./);
    assert.match(task, /use only the documentation and tools installed there/);
    assert.match(task, /You have up to 15 minutes/);
    assert.match(task, /screenshot <file-or-url> \[output\.png\]/);
  }
  assert.equal(
    new Set(
      generated.map(
        task =>
          task.match(/Time and browser:\n([\s\S]*?)\n\nFirst inspect/)?.[1],
      ),
    ).size,
    1,
  );
});

test('stratified sampling chooses distinct categories first', () => {
  const testSet = {
    prompts: [
      {id: 'a1', category: 'a'},
      {id: 'a2', category: 'a'},
      {id: 'b1', category: 'b'},
      {id: 'c1', category: 'c'},
    ],
  };
  assert.deepEqual(
    selectPrompts(testSet, {sample: 3}).map(prompt => prompt.id),
    ['a1', 'b1', 'c1'],
  );
});

test('seeded stratified sampling is stable and covers every category first', () => {
  const testSet = {
    prompts: [
      {id: 'a1', category: 'a'},
      {id: 'a2', category: 'a'},
      {id: 'b1', category: 'b'},
      {id: 'b2', category: 'b'},
      {id: 'c1', category: 'c'},
      {id: 'c2', category: 'c'},
    ],
  };
  const first = selectPrompts(testSet, {sample: 4, seed: 'fixed-seed'});
  const second = selectPrompts(testSet, {sample: 4, seed: 'fixed-seed'});
  assert.deepEqual(first, second);
  assert.equal(
    new Set(first.slice(0, 3).map(prompt => prompt.category)).size,
    3,
  );
});

test('React no-build starter externalizes React for core and theme and exercises hooks/icons', () => {
  const starter = reactNoBuildStarter('0.6.5');
  assert.match(
    starter,
    /@astryxdesign\/core@0\.6\.5\?external=react,react-dom/,
  );
  assert.match(
    starter,
    /@astryxdesign\/theme-neutral@0\.6\.5\/built\?external=react,react-dom/,
  );
  assert.match(starter, /React\.useState/);
  assert.match(starter, /A\.Banner/);
  assert.match(starter, /A\.TextInput/);
  assert.match(starter, /onChange=\$\{setValue\}/);
  assert.doesNotMatch(starter, /event\.target\.value/);
});

test('build-less configs use current pins and isolated framework onboarding', () => {
  const specs = getDeliverySpecs();
  assert.equal(
    specs.vanilla.vanillaCdnRef,
    'eb7a056250cf98d7d86342d24f1e0c744852bebb',
  );
  assert.equal(
    specs.vanilla.vanillaTarballUrl,
    'https://cdn.jsdelivr.net/gh/facebook/astryx@9f2b5b75b2b638b2759f28749a9036c314d6febd/packages/vanilla/dist/cli/astryx-cli-vanilla.tgz',
  );
  assert.equal(specs['web-components'].outputFile, 'index.html');
  assert.equal(
    specs['web-components'].vanillaTarballUrl,
    specs.vanilla.vanillaTarballUrl,
  );

  const publicDocs = `# Astryx
## Step 1 — Choose a path
Common path selection.
## Path A1 — Build-less HTML
### A1.1. Page setup
Pinned ${specs.vanilla.vanillaCdnRef}.
**Option 1 — install the preview CLI (Node 22.13+):**
\`\`\`sh
npm install -g https://cdn.jsdelivr.net/gh/facebook/astryx@9f2b5b75b2b638b2759f28749a9036c314d6febd/packages/vanilla/dist/cli/astryx-cli-vanilla.tgz

astryx component --list --framework html
\`\`\`
**Fallback — clone the pinned source commit:**
\`\`\`sh
git clone https://github.com/facebook/astryx.git astryx
\`\`\`
**Option 2 — direct file URLs:**
### A1.4. Rules for Path A1
- No React.
## Path A2 — Build-less web components
### A2.1. Page setup
<script src="https://cdn.jsdelivr.net/gh/facebook/astryx@${specs.vanilla.vanillaCdnRef}/packages/vanilla/dist/astryx-elements.classic.js"></script>
### A2.2. Start from a web-component template, then inspect components
astryx component --list --framework web-components
The same nine template IDs listed in Path A1 are available.
### A2.3. Rules for Path A2
- Attributes mirror React prop names in kebab-case.
## Path B — React with a dev server
React instructions.`;

  const vanillaStarterSource = vanillaStarter(specs.vanilla);
  assert.match(vanillaStarterSource, /<!doctype html>/i);
  assert.match(vanillaStarterSource, /astryx-vanilla\.css/);
  assert.match(vanillaStarterSource, /class="ax-card"/);
  const vanillaDocs = buildVanillaAgentDocs(publicDocs, specs.vanilla);
  assert.match(vanillaDocs, /npx astryx component --list --framework html/);
  assert.doesNotMatch(
    vanillaDocs,
    /Path A1|Path A2|Path B|git clone|npm install -g|web components/,
  );

  const elementStarter = webComponentsStarter(specs['web-components']);
  assert.match(elementStarter, /astryx-elements\.classic\.js/);
  assert.match(elementStarter, /<ax-stack gap="4">/);
  assert.match(elementStarter, /<ax-card>/);
  assert.match(elementStarter, /<ax-heading slot="header" level="1">/);
  assert.match(elementStarter, /<ax-text as="p" type="supporting"/);
  const elementDocs = buildWebComponentsAgentDocs(
    publicDocs,
    specs['web-components'],
  );
  assert.match(
    elementDocs,
    /npx astryx component --list --framework web-components/,
  );
  assert.doesNotMatch(
    elementDocs,
    /Path A1|Path A2|Path B|git clone|npm install -g|--framework html/,
  );
});

test('build-less starters render the same BEM class set without warnings', async () => {
  const specs = getDeliverySpecs();
  const browser = await chromium.launch({headless: true});
  try {
    const receipts = [];
    for (const [name, source] of [
      ['vanilla', vanillaStarter(specs.vanilla)],
      ['web-components', webComponentsStarter(specs['web-components'])],
    ]) {
      const page = await browser.newPage({viewport: {width: 800, height: 600}});
      const messages = [];
      page.on('console', message => {
        if (message.type() === 'warning' || message.type() === 'error') {
          messages.push(`${message.type()}: ${message.text()}`);
        }
      });
      page.on('pageerror', error =>
        messages.push(`pageerror: ${error.message}`),
      );
      await page.setContent(source, {waitUntil: 'networkidle'});
      if (name === 'web-components') {
        await page.evaluate(() => customElements.whenDefined('ax-card'));
      }
      await page.waitForTimeout(100);
      receipts.push({
        name,
        messages,
        classes: await page.evaluate(() =>
          [
            ...new Set(
              [...document.querySelectorAll('[class]')].flatMap(element =>
                [...element.classList].filter(className =>
                  className.startsWith('ax-'),
                ),
              ),
            ),
          ].sort(),
        ),
      });
      await page.close();
    }
    assert.deepEqual(receipts[0].messages, []);
    assert.deepEqual(receipts[1].messages, []);
    assert.deepEqual(receipts[1].classes, receipts[0].classes);
  } finally {
    await browser.close();
  }
});

test('adoption metric gives equivalent React and vanilla fixtures and raw HTML near zero', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const fixture = prefix => `
      <style>*{display:block;width:20px;height:20px}</style>
      <main class="${prefix}-stack">
        <article class="${prefix}-card">
          <h2 class="${prefix}-heading">Title</h2>
          <div class="${prefix}-text-input"><label>Name<input /></label></div>
          <button class="${prefix}-button">Save</button>
          <button class="${prefix}-stack">Raw nested action</button>
        </article>
        <dialog><button class="${prefix}-button">Hidden dialog action</button></dialog>
        <div aria-hidden="true"><button class="${prefix}-button">Hidden</button></div>
        <button id="inactive-tab" role="tab" aria-selected="false">Inactive tab</button>
        <div role="tabpanel" aria-labelledby="inactive-tab"><button class="${prefix}-button">Inactive panel action</button></div>
      </main>`;
    const raw = `
      <style>*{display:block;width:20px;height:20px}</style>
      <main><article><h2>Title</h2><label>Name<input /></label><button>Save</button></article></main>`;
    const scores = [];
    for (const html of [fixture('astryx'), fixture('ax'), raw]) {
      const page = await browser.newPage({viewport: {width: 800, height: 600}});
      await page.setContent(html);
      scores.push(await page.evaluate(measureAdoptionInDocument));
      await page.close();
    }
    assert.ok(
      Math.abs(scores[0].adoptionShare - scores[1].adoptionShare) <= 0.05,
    );
    assert.ok(scores[2].adoptionShare <= 0.05);
    assert.equal(
      scores[0].eligibleElementCount,
      scores[1].eligibleElementCount,
    );
    assert.equal(scores[0].eligibleElementCount, 6);
  } finally {
    await browser.close();
  }
});

test('web-component adoption uses rendered light DOM without host credit', async () => {
  const root = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), 'delivery-elements-fixtures-'),
  );
  temporaryDirectories.push(root);
  const specs = getDeliverySpecs();
  const spec = specs['web-components'];
  const sourceRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../../packages/vanilla',
  );
  const componentPairs = [
    ['Button.html', 'primary', 'primary'],
    ['Card.html', 'default', 'default'],
    ['CheckboxInput.html', 'default', 'default'],
    ['Collapsible.html', 'default', 'default'],
    ['Dialog.html', 'confirmation', 'open-and-close'],
    ['DropdownMenu.html', 'actions', 'actions'],
    ['Selector.html', 'default', 'default'],
    ['SideNav.html', 'default', 'default'],
    ['Switch.html', 'default', 'default'],
    ['TabList.html', 'panels', 'panels'],
    ['TextInput.html', 'default', 'default'],
    ['TopNav.html', 'default', 'default'],
  ];
  const vanillaFragments = [];
  const elementFragments = [];
  for (const [file, vanillaVariant, elementVariant] of componentPairs) {
    vanillaFragments.push(
      await readMarkupVariant(
        path.join(sourceRoot, 'markup'),
        file,
        vanillaVariant,
      ),
    );
    elementFragments.push(
      await readMarkupVariant(
        path.join(sourceRoot, 'elements-markup'),
        file,
        elementVariant,
      ),
    );
  }
  const parityRawControls =
    '<button>Raw action</button><input aria-label="Raw input" />';
  const rawControls =
    '<button>Raw one</button><button>Raw two</button><input aria-label="Raw input" /><a href="#raw">Raw link</a><h2>Raw heading</h2>';
  const vanillaDir = path.join(root, 'vanilla');
  const elementsDir = path.join(root, 'elements');
  await Promise.all(
    [vanillaDir, elementsDir].map(directory =>
      fs.promises.mkdir(directory, {recursive: true}),
    ),
  );
  await Promise.all([
    fs.promises.writeFile(
      path.join(vanillaDir, 'index.html'),
      buildPinnedBuildlessPage(
        specs.vanilla,
        `${vanillaFragments.join('\n')}\n${parityRawControls}`,
        false,
      ),
    ),
    fs.promises.writeFile(
      path.join(elementsDir, 'index.html'),
      buildPinnedBuildlessPage(
        spec,
        `${elementFragments.join('\n')}\n${parityRawControls}`,
        true,
      ),
    ),
  ]);
  const [vanilla, elements] = await Promise.all([
    evaluateRun({
      config: 'vanilla',
      projectDir: vanillaDir,
      prompt: {prompt: 'Render equivalent components.'},
      screenshotPath: path.join(root, 'vanilla.png'),
      baselineSources: {},
      skipJudge: true,
    }),
    evaluateRun({
      config: 'web-components',
      projectDir: elementsDir,
      prompt: {prompt: 'Render equivalent components.'},
      screenshotPath: path.join(root, 'elements.png'),
      baselineSources: {},
      skipJudge: true,
    }),
  ]);
  assert.equal(vanilla.render.passed, true, JSON.stringify(vanilla.render));
  assert.equal(elements.render.passed, true, JSON.stringify(elements.render));
  assert.ok(
    Math.abs(vanilla.render.adoptionShare - elements.render.adoptionShare) <=
      0.05,
    `vanilla=${vanilla.render.adoptionShare}, elements=${elements.render.adoptionShare}`,
  );

  const browser = await chromium.launch({headless: true});
  try {
    const measure = async body => {
      const page = await browser.newPage({viewport: {width: 800, height: 600}});
      await page.setContent(buildPinnedBuildlessPage(spec, body, true), {
        waitUntil: 'networkidle',
      });
      await page.evaluate(() => customElements.whenDefined('ax-text'));
      await page.waitForTimeout(100);
      const score = await page.evaluate(measureAdoptionInDocument, true);
      await page.close();
      return score;
    };

    const invented = await measure(
      `<ax-trial-banner>${rawControls}</ax-trial-banner>`,
    );
    assert.equal(invented.eligibleElementCount, 5);
    assert.equal(invented.adoptedElementCount, 0);

    const themed = await measure(`<ax-theme>${rawControls}</ax-theme>`);
    assert.equal(themed.eligibleElementCount, 5);
    assert.equal(themed.adoptedElementCount, 0);
    const cardWrapped = await measure(
      `<ax-theme><ax-card>${rawControls}</ax-card></ax-theme>`,
    );
    assert.ok(cardWrapped.eligibleElementCount >= 5);

    const raw = await measure(rawControls);
    const padded = await measure(
      `<ax-text>Padding text</ax-text><ax-badge>Padding badge</ax-badge><ax-divider></ax-divider>${rawControls}`,
    );
    assert.equal(padded.eligibleElementCount, raw.eligibleElementCount);
    assert.equal(padded.adoptedElementCount, raw.adoptedElementCount);
  } finally {
    await browser.close();
  }
});

test('real React-build and Vanilla markup fixtures score within five points', async () => {
  const root = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), 'delivery-real-fixtures-'),
  );
  temporaryDirectories.push(root);
  const reactDir = path.join(root, 'react');
  const vanillaDir = path.join(root, 'vanilla');
  const screenshotDir = path.join(root, 'screenshots');
  const specs = getDeliverySpecs();

  await prepareProject(specs['react-build'], reactDir);
  await fs.promises.writeFile(
    path.join(reactDir, 'src', 'App.tsx'),
    `import {useState} from 'react';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {Heading} from '@astryxdesign/core/Heading';
import {Layout, LayoutContent} from '@astryxdesign/core/Layout';
import {TextInput} from '@astryxdesign/core/TextInput';
import {TopNav, TopNavItem} from '@astryxdesign/core/TopNav';

export function App() {
  const [value, setValue] = useState('');
  return <>
    <TopNav heading="Astryx" startContent={<><TopNavItem label="Overview" href="#overview" isSelected /><TopNavItem label="Projects" href="#projects" /></>} />
    <Banner status="warning" title="Trial ending" description="Choose a plan." endContent={<Button label="Upgrade" />} />
    <Layout content={<LayoutContent>
      <Card><Heading level={2}>Workspace</Heading><TextInput label="Name" value={value} onChange={setValue} /></Card>
      <button>Raw layout action</button>
    </LayoutContent>} />
  </>;
}
`,
  );

  await fs.promises.mkdir(vanillaDir, {recursive: true});
  const markupRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../../packages/vanilla/markup',
  );
  const fragments = await Promise.all([
    readMarkupVariant(markupRoot, 'TopNav.html', 'default'),
    readMarkupVariant(markupRoot, 'Banner.html', 'informational-card'),
    readMarkupVariant(markupRoot, 'Card.html', 'default'),
    readMarkupVariant(markupRoot, 'TextInput.html', 'default'),
    readMarkupVariant(markupRoot, 'Layout.html', 'page-shell'),
  ]);
  fragments[4] = fragments[4].replace(
    '</main>',
    '<button>Raw layout action</button></main>',
  );
  const vanillaHtml = vanillaStarter(specs.vanilla).replace(
    /<body>[\s\S]*<\/body>/,
    `<body>${fragments.join('\n')}</body>`,
  );
  await fs.promises.writeFile(path.join(vanillaDir, 'index.html'), vanillaHtml);

  const [react, vanilla] = await Promise.all([
    evaluateRun({
      config: 'react-build',
      projectDir: reactDir,
      prompt: {prompt: 'Render equivalent fixture.'},
      screenshotPath: path.join(screenshotDir, 'react.png'),
      baselineSources: {},
      skipJudge: true,
    }),
    evaluateRun({
      config: 'vanilla',
      projectDir: vanillaDir,
      prompt: {prompt: 'Render equivalent fixture.'},
      screenshotPath: path.join(screenshotDir, 'vanilla.png'),
      baselineSources: {},
      skipJudge: true,
    }),
  ]);

  assert.equal(react.render.passed, true, JSON.stringify(react.render));
  assert.equal(vanilla.render.passed, true, JSON.stringify(vanilla.render));
  assert.ok(
    Math.abs(react.render.adoptionShare - vanilla.render.adoptionShare) <= 0.05,
    `react=${react.render.adoptionShare}, vanilla=${vanilla.render.adoptionShare}`,
  );
  for (const evaluation of [react, vanilla]) {
    const raw = evaluation.render.adoptionTargets.find(
      target => target.text === 'Raw layout action',
    );
    assert.equal(raw?.adopted, false, JSON.stringify(raw));
  }
  assert.equal(react.typecheck.errorCount, 0, react.typecheck.stderr);
});

function buildPinnedBuildlessPage(spec, body, elements) {
  const assetRoot = `https://cdn.jsdelivr.net/gh/facebook/astryx@${spec.vanillaCdnRef}/packages/vanilla/dist`;
  return `<!doctype html>
<html lang="en" data-astryx-theme="neutral" data-theme="light">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@astryxdesign/core@0.6.5/src/reset.css" />
  <link rel="stylesheet" href="${assetRoot}/astryx-vanilla.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@astryxdesign/theme-neutral@0.6.5/dist/theme.css" />
  <script defer src="${assetRoot}/astryx-vanilla.js"></script>
  ${elements ? `<script defer src="${assetRoot}/astryx-elements.classic.js"></script>` : ''}
</head>
<body>${body}</body>
</html>
`;
}

async function readMarkupVariant(root, file, variant) {
  const source = await fs.promises.readFile(path.join(root, file), 'utf8');
  const startMarker = `<!-- variant: ${variant} -->`;
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `${file} has ${variant}`);
  const bodyStart = start + startMarker.length;
  const next = source.indexOf('<!-- variant:', bodyStart);
  return source.slice(bodyStart, next < 0 ? source.length : next).trim();
}

test('source scanner separates comments and theme definitions from hard-coded values', async () => {
  const directory = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), 'delivery-source-'),
  );
  temporaryDirectories.push(directory);
  await fs.promises.writeFile(
    path.join(directory, 'index.html'),
    '<div style="color:#fff;margin:12px"></div>',
  );
  const baseline = await captureAuthoredSources(directory);
  await fs.promises.writeFile(
    path.join(directory, 'index.html'),
    `<!-- ignored #abc 999px -->
<div style="--brand: #fff; --gap: 12px"></div>
<style>:root[data-astryx-theme="brand"] { --color-accent: #123456; --space: 8px; }</style>`,
  );
  await fs.promises.writeFile(
    path.join(directory, 'new.html'),
    '<div style="color:#fff;margin:12px"></div><!-- #000 400px -->',
  );
  await fs.promises.writeFile(
    path.join(directory, 'new.ts'),
    `// ignored #abc 900px
/* ignored #fff 600px */
const theme = createTheme({accent: '#ff0000'});`,
  );
  const metrics = await scanAuthoredSource(directory, baseline);
  assert.deepEqual(metrics, {
    authoredFileCount: 3,
    inlineStyleAttributes: 1,
    customPropertyOnlyStyles: 1,
    themeDefinitionCount: 5,
    rawHexValues: 1,
    rawPixelValues: 1,
    hardCodedStyleCount: 3,
  });
});

test('all supported Astryx CLI invocation forms are counted', () => {
  const commands = [
    'npx astryx component Button',
    'npx --yes @astryxdesign/cli@0.6.5 docs tokens',
    'npm exec astryx -- search form',
    'pnpm exec astryx template dashboard',
    '/tmp/project/node_modules/.bin/astryx component Card',
    'node packages/cli/clients/cli/bin/astryx.mjs docs',
    'astryx help',
    'for x in Button; do npx astryx component "$x"; done',
    'value=$(npx astryx docs tokens)',
    '(npx astryx template dashboard)',
    'timeout 10 npx astryx search form',
  ];
  assert.equal(
    commands.reduce((sum, command) => sum + countAstryxInvocations(command), 0),
    commands.length,
  );
  const transcript = commands
    .map(command =>
      JSON.stringify({
        type: 'assistant',
        message: {content: [{type: 'tool_use', input: {command}}]},
      }),
    )
    .join('\n');
  assert.equal(countCliLookups(transcript), commands.length);
});

test('transcript audit flags every profile-configured sensitive path', () => {
  const profile = testRunnerProfile();
  const transcript = [
    'cat index.html',
    'sed s/data-theme="light"/data-theme="dark"/ index.html',
    'cat /private/root/secret',
    '/host/bin/private-tool --help',
  ]
    .map(command =>
      JSON.stringify({
        type: 'assistant',
        message: {content: [{type: 'tool_use', input: {command}}]},
      }),
    )
    .join('\n');
  const audit = auditTranscriptCommands(transcript, profile);
  assert.equal(audit.passed, false);
  assert.equal(audit.flaggedCommandCount, 2);
  assert.deepEqual(audit.touchedPaths, ['/host/bin', '/private/root']);
});

test('runner invocations come entirely from profile templates', () => {
  const profile = testRunnerProfile();
  const agent = runnerInvocation(profile, 'claude', 'agent', {
    MCP_CONFIG: '/sandbox/empty.json',
    TOOLS: 'Read,Write',
  });
  assert.equal(agent.command, '/runner/a');
  assert.deepEqual(agent.args, [
    'agent',
    '--policy-mode',
    '--mcp',
    '/sandbox/empty.json',
    '--tools',
    'Read,Write',
  ]);

  const judge = runnerInvocation(profile, 'claude', 'judge', {
    MCP_CONFIG: '/sandbox/empty.json',
    TOOLS: 'Read',
    JSON_SCHEMA: '{"type":"object"}',
  });
  assert.deepEqual(judge.args.slice(-2), ['--schema', '{"type":"object"}']);
  assert.throws(
    () => runnerInvocation(profile, 'claude', 'judge', {}),
    /requires value MCP_CONFIG/,
  );
});

test('context audit enforces the exact profile policy', () => {
  const profile = testRunnerProfile();
  const cleanInit = {
    type: 'system',
    subtype: 'init',
    cwd: '/mnt/run/project',
    claude_code_version: '1.0.0',
    tools: ['Read', 'Write'],
    agents: ['runner-a'],
    skills: [],
    slash_commands: [],
    mcp_servers: [],
    plugins: [
      {name: 'plugin-b', path: 'builtin', source: 'plugin-b@builtin'},
      {name: 'plugin-a', path: 'builtin', source: 'plugin-a@builtin'},
    ],
  };
  const clean = auditAgentContext(
    'claude',
    JSON.stringify(cleanInit),
    'configured policy active',
    profile,
  );
  assert.equal(clean.passed, true, JSON.stringify(clean.violations));
  assert.equal(clean.runnerVersion, '1.0.0');
  assert.equal(clean.plugins.length, 2);
  const unconfirmed = auditAgentContext(
    'claude',
    JSON.stringify(cleanInit),
    '',
    profile,
  );
  assert.equal(unconfirmed.passed, false);
  assert.equal(
    unconfirmed.violations.includes(
      'Claude did not confirm the configured launcher policy',
    ),
    true,
  );

  const unexpectedPlugin = structuredClone(cleanInit);
  unexpectedPlugin.plugins.push({
    name: 'plugin-c',
    path: 'builtin',
    source: 'plugin-c@builtin',
  });
  assert.equal(
    auditAgentContext(
      'claude',
      JSON.stringify(unexpectedPlugin),
      'configured policy active',
      profile,
    ).passed,
    false,
  );
  const unknownVersion = {...cleanInit, claude_code_version: '1.0.1'};
  assert.equal(
    auditAgentContext(
      'claude',
      JSON.stringify(unknownVersion),
      'configured policy active',
      profile,
    ).passed,
    false,
  );
  const contaminated = {
    ...cleanInit,
    skills: ['unexpected-skill'],
    slash_commands: ['unexpected-command'],
    mcp_servers: [{name: 'unexpected-server'}],
    agents: [...cleanInit.agents, 'unexpected-agent'],
  };
  const contaminatedTranscript = [
    JSON.stringify(contaminated),
    JSON.stringify({type: 'system', subtype: 'hook_started'}),
  ].join('\n');
  assert.equal(
    auditAgentContext(
      'claude',
      contaminatedTranscript,
      'configured policy active',
      profile,
    ).passed,
    false,
  );

  const muse = auditAgentContext(
    'muse',
    JSON.stringify({
      payload_type: 'task.lifecycle.proposed',
      payload: {event: {task_kind: 'reminder.agent.skill-reminder'}},
    }),
    'runner-b extensions disabled',
    profile,
  );
  assert.equal(muse.passed, true);
  assert.equal(muse.builtInReminderEvents, 1);
});

test('failed judge audits trigger one retry and never retain unsafe scores', () => {
  const failed = {
    promptFulfillment: 99,
    visualQuality: 99,
    success: true,
    contextAudit: {passed: false, violations: ['unsafe context']},
  };
  assert.equal(resolveJudgeAttempts([failed]), null);

  const passed = {
    promptFulfillment: 72,
    visualQuality: 81,
    success: true,
    contextAudit: {passed: true, violations: []},
  };
  const recovered = resolveJudgeAttempts([failed, passed], true);
  assert.equal(recovered.rejudged, true);
  assert.equal(recovered.promptFulfillment, 72);
  assert.equal(recovered.attempts.length, 2);

  const unavailable = resolveJudgeAttempts([failed, failed], true);
  assert.equal(unavailable.judgeUnavailable, true);
  assert.equal(unavailable.promptFulfillment, null);
  assert.equal(unavailable.visualQuality, null);
  assert.equal(unavailable.success, null);
  assert.equal(unavailable.attempts.length, 2);
});

test('private run roots use mode 0700', async () => {
  const privateRun = await createPrivateRunRoot('test-');
  temporaryDirectories.push(privateRun.root);
  assert.equal((await fs.promises.stat(privateRun.root)).mode & 0o777, 0o700);
  assert.equal(
    (await fs.promises.stat(privateRun.projectDir)).mode & 0o777,
    0o700,
  );
  assert.equal(
    (await fs.promises.stat(path.join(privateRun.root, 'bin', 'screenshot')))
      .mode & 0o777,
    0o700,
  );
});

test('summary includes failure zeros in medians and reports sample counts', () => {
  const results = [
    makeResult({passed: true, value: 80}),
    makeResult({passed: false, value: 0, timedOut: true}),
  ];
  const [row] = summarize(results);
  assert.equal(row.passRate, 0.5);
  assert.equal(row.timeouts, 1);
  assert.equal(row.transcriptFlaggedRuns, 0);
  assert.equal(row.medianAdoptionShare, 0.4);
  assert.equal(row.medianPromptFulfillment, 40);
  assert.equal(row.medianVisualQuality, 40);
  assert.equal(row.samples.adoption, 2);
  assert.equal(row.samples.prompt, 2);
  assert.equal(row.samples.axe, 1);
  assert.equal(row.medianThemeDefinitions, 20);
  assert.equal(row.medianBestBeforeTimeoutPrompt, 70);
  assert.equal(row.medianBestBeforeTimeoutVisual, 75);
  assert.equal(row.samples.bestBeforeTimeoutPrompt, 1);
});

function makeResult({passed, value, timedOut = false}) {
  return {
    config: 'vanilla',
    agent: 'muse',
    runner: {
      durationMs: value * 1000,
      usage: {inputTokens: value, outputTokens: 0},
      cliLookups: 0,
      timedOut,
      contextAudit: {passed: true},
      transcriptAudit: {passed: true},
    },
    evaluation: {
      build: {passed},
      render: {passed, adoptionShare: value / 100},
      source: {
        hardCodedStyleCount: value,
        themeDefinitionCount: value / 2,
      },
      accessibility: {violationCount: passed ? 0 : null},
      judge: {promptFulfillment: value, visualQuality: value},
      bestBeforeTimeout: timedOut
        ? {promptFulfillment: 70, visualQuality: 75}
        : undefined,
      typecheck: null,
    },
  };
}
