// Copyright (c) Meta Platforms, Inc. and affiliates.
/**
 * @input Built Vanilla Astryx CSS/JS/element bundles and the elements gallery.
 * @output Real-Chromium evidence for registration, interaction, forms, and a11y.
 * @position Browser acceptance suite for the web-component experiment.
 */

import assert from 'node:assert/strict';
import {createReadStream} from 'node:fs';
import {readdir, stat} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import {chromium} from 'playwright';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../..',
);
const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
]);

function startServer() {
  const server = createServer(async (request, response) => {
    const pathname = decodeURIComponent(
      new URL(request.url, 'http://localhost').pathname,
    );
    if (pathname === '/__empty.html') {
      response.writeHead(200, {'content-type': 'text/html; charset=utf-8'});
      response.end('<!doctype html><html><body></body></html>');
      return;
    }
    const filePath = path.resolve(repoRoot, `.${pathname}`);
    if (!filePath.startsWith(`${repoRoot}${path.sep}`)) {
      response.writeHead(403).end();
      return;
    }
    try {
      const details = await stat(filePath);
      if (!details.isFile()) throw new Error('not a file');
      response.writeHead(200, {
        'content-length': details.size,
        'content-type':
          mimeTypes.get(path.extname(filePath)) ?? 'application/octet-stream',
      });
      createReadStream(filePath).pipe(response);
    } catch {
      response.writeHead(404).end();
    }
  });
  return new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({server, baseURL: `http://127.0.0.1:${address.port}`});
    });
  });
}

const elementSourceRoot = path.join(repoRoot, 'packages/vanilla/elements/src');
const definitions = await Promise.all(
  (await readdir(elementSourceRoot))
    .filter(file => file.endsWith('.element.mjs'))
    .sort((left, right) => left.localeCompare(right))
    .map(
      async file =>
        (await import(pathToFileURL(path.join(elementSourceRoot, file))))
          .default,
    ),
);
const stateRecipes = definitions.flatMap(definition =>
  definition.examples
    .filter(example => example.recipe)
    .map(example => ({definition, example})),
);

const {server, baseURL} = await startServer();
const browser = await chromium.launch({headless: true});
const checks = [];
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleErrors = [];
  const consoleWarnings = [];
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
    if (message.type() === 'warning') consoleWarnings.push(message.text());
  });
  page.on('pageerror', error => consoleErrors.push(error.message));

  await page.goto(
    `${baseURL}/packages/vanilla/examples/elements-gallery.html`,
    {waitUntil: 'load'},
  );
  await page.waitForFunction(() => customElements.get('ax-selector'));
  await page.waitForFunction(() => {
    const sections = [...document.querySelectorAll('.gallery__theme')];
    return (
      sections.length === 6 &&
      sections.every(section => {
        const buttons = [...section.querySelectorAll('ax-button')];
        return (
          buttons.length > 0 &&
          buttons.every(button => button.querySelector('button, a'))
        );
      })
    );
  });

  assert.equal(await page.locator('.gallery__theme').count(), 6);
  const matrix = await page.locator('.gallery__theme').evaluateAll(sections =>
    sections.map(section => ({
      theme: section.dataset.astryxTheme,
      mode: section.dataset.theme,
      background: getComputedStyle(section).backgroundColor,
      buttonVisible:
        section.querySelector('ax-button > button').getBoundingClientRect()
          .width > 0,
    })),
  );
  assert.deepEqual(
    matrix.map(item => `${item.theme}:${item.mode}`),
    [
      'neutral:light',
      'neutral:dark',
      'butter:light',
      'butter:dark',
      'y2k:light',
      'y2k:dark',
    ],
  );
  assert.ok(matrix.every(item => item.background !== 'rgba(0, 0, 0, 0)'));
  for (const theme of ['neutral', 'butter', 'y2k']) {
    const [light, dark] = matrix.filter(item => item.theme === theme);
    assert.notEqual(
      light.background,
      dark.background,
      `${theme} mode colors differ`,
    );
  }
  assert.ok(matrix.every(item => item.buttonVisible));

  await page.evaluate(() => {
    for (const section of document.querySelectorAll('.gallery__theme')) {
      const banner = document.createElement('ax-banner');
      banner.setAttribute('data-ax-contrast-probe', '');
      banner.setAttribute('status', 'error');
      banner.setAttribute('title', 'Error');
      banner.setAttribute('description', 'Fix the highlighted fields.');
      section.querySelector('.gallery__examples').append(banner);
    }
  });
  await page.waitForFunction(
    () =>
      document.querySelectorAll(
        '.gallery__theme [data-ax-contrast-probe] .ax-banner__description',
      ).length === 6,
  );

  const bannerContrasts = await page
    .locator(
      '.gallery__theme ax-banner[status="error"] .ax-banner__description',
    )
    .evaluateAll(descriptions => {
      const parseColor = value => {
        const parts = value.match(/[\d.]+/g)?.map(Number) ?? [];
        return {
          r: parts[0] ?? 0,
          g: parts[1] ?? 0,
          b: parts[2] ?? 0,
          a: parts[3] ?? 1,
        };
      };
      const composite = (foreground, background) => {
        const alpha = foreground.a + background.a * (1 - foreground.a);
        if (alpha === 0) return {r: 0, g: 0, b: 0, a: 0};
        return {
          r:
            (foreground.r * foreground.a +
              background.r * background.a * (1 - foreground.a)) /
            alpha,
          g:
            (foreground.g * foreground.a +
              background.g * background.a * (1 - foreground.a)) /
            alpha,
          b:
            (foreground.b * foreground.a +
              background.b * background.a * (1 - foreground.a)) /
            alpha,
          a: alpha,
        };
      };
      const effectiveBackground = element => {
        const background = parseColor(
          getComputedStyle(element).backgroundColor,
        );
        if (background.a >= 0.999) return background;
        return composite(
          background,
          element.parentElement
            ? effectiveBackground(element.parentElement)
            : {r: 255, g: 255, b: 255, a: 1},
        );
      };
      const luminance = color => {
        const channel = value => {
          const normalized = value / 255;
          return normalized <= 0.04045
            ? normalized / 12.92
            : ((normalized + 0.055) / 1.055) ** 2.4;
        };
        return (
          0.2126 * channel(color.r) +
          0.7152 * channel(color.g) +
          0.0722 * channel(color.b)
        );
      };
      return descriptions.map(description => {
        const section = description.closest('.gallery__theme');
        const surface = description.closest('.ax-banner__surface');
        const foreground = parseColor(getComputedStyle(description).color);
        const background = effectiveBackground(surface);
        const light = Math.max(luminance(foreground), luminance(background));
        const dark = Math.min(luminance(foreground), luminance(background));
        return {
          theme: section.dataset.astryxTheme,
          mode: section.dataset.theme,
          ratio: (light + 0.05) / (dark + 0.05),
        };
      });
    });
  assert.equal(bannerContrasts.length, 6);
  assert.ok(
    bannerContrasts.every(item => item.ratio >= 4.5),
    JSON.stringify(bannerContrasts),
  );
  await page.locator('[data-ax-contrast-probe]').evaluateAll(nodes => {
    for (const node of nodes) node.remove();
  });
  checks.push(
    'error Banner description contrast is at least 4.5:1 in every theme and mode',
  );
  checks.push(
    'gallery renders auto-discovered examples in 3 themes × light/dark',
  );

  const first = page.locator('.gallery__theme').first();
  const input = first.locator('ax-text-input input').first();
  await input.fill('Elements');
  const selector = first.locator('ax-selector').first();
  const nativeSelect = selector.locator('select');
  await nativeSelect.click();
  assert.equal(
    await nativeSelect.evaluate(node => node === document.activeElement),
    true,
  );
  await page.keyboard.press('Escape');
  await nativeSelect.selectOption('design');
  assert.equal(
    await first.locator('ax-text-input').first().getAttribute('value'),
    'Elements',
  );
  assert.equal(await selector.getAttribute('value'), 'design');
  const submitted = await page.evaluate(async () => {
    const form = document.createElement('form');
    form.innerHTML = `
      <ax-text-input label="Project" html-name="project" value="Elements"></ax-text-input>
      <ax-selector label="Workspace" html-name="workspace" value="design">
        <option value="design">Design systems</option>
        <option value="tools">Developer tools</option>
      </ax-selector>`;
    document.body.append(form);
    await new Promise(resolve => setTimeout(resolve, 30));
    const data = Object.fromEntries(new FormData(form));
    form.remove();
    return data;
  });
  assert.deepEqual(submitted, {project: 'Elements', workspace: 'design'});
  await selector.locator('select').focus();
  await page.keyboard.press('ArrowDown');
  assert.equal(await selector.getAttribute('value'), 'tools');
  checks.push('TextInput and Selector reflect values and submit natively');

  const tabList = first.locator('ax-tab-list').first();
  const activity = tabList.locator('ax-tab[value="activity"] button');
  await activity.click();
  assert.equal(await tabList.getAttribute('value'), 'activity');
  assert.equal(await activity.getAttribute('aria-selected'), 'true');
  await activity.focus();
  await page.keyboard.press('ArrowLeft');
  assert.equal(await tabList.getAttribute('value'), 'overview');
  assert.equal(
    await tabList
      .locator('ax-tab[value="overview"] button')
      .getAttribute('aria-selected'),
    'true',
  );
  checks.push('TabList and Tab support pointer and keyboard activation');

  const trigger = first.locator('[data-ax-dialog-open] button').first();
  await trigger.click();
  const dialog = first.locator('ax-dialog dialog').first();
  assert.equal(await dialog.getAttribute('open'), '');
  assert.equal(
    await page.evaluate(() =>
      document.activeElement?.classList.contains('ax-dialog__title'),
    ),
    true,
  );
  await page.keyboard.press('Escape');
  assert.equal(await dialog.getAttribute('open'), null);
  assert.equal(
    await trigger.evaluate(node => node === document.activeElement),
    true,
  );
  const dialogHost = first.locator('ax-dialog').first();
  await dialogHost.evaluate(host => host.setAttribute('open', ''));
  await dialog.waitFor({state: 'visible'});
  assert.equal(await dialogHost.getAttribute('open'), '');
  await dialogHost.evaluate(host => host.removeAttribute('open'));
  await dialog.waitFor({state: 'hidden'});
  checks.push(
    'Dialog opens, closes with Escape, restores focus, and follows the open attribute',
  );

  const warningStart = consoleWarnings.length;
  await page.evaluate(async () => {
    const button = document.createElement('ax-button');
    button.setAttribute('mystery', 'one');
    button.setAttribute('variant', 'impossible');
    document.body.append(button);
    await Promise.resolve();
    button.setAttribute('mystery', 'two');
    button.setAttribute('variant', 'also-impossible');
    await Promise.resolve();
    button.remove();
  });
  const runtimeWarnings = consoleWarnings.slice(warningStart);
  assert.equal(
    runtimeWarnings.filter(message => message.includes('mystery')).length,
    1,
  );
  assert.equal(
    runtimeWarnings.filter(message => message.includes('variant')).length,
    1,
  );
  checks.push('unknown attributes and invalid enums warn once');

  const axe = await new AxeBuilder({page}).analyze();
  const serious = axe.violations.filter(violation =>
    ['serious', 'critical'].includes(violation.impact),
  );
  assert.deepEqual(
    serious.map(violation => ({
      id: violation.id,
      nodes: violation.nodes.map(node => ({
        target: node.target,
        html: node.html,
        summary: node.failureSummary,
      })),
    })),
    [],
  );
  checks.push('axe reports zero serious or critical violations');
  assert.deepEqual(consoleErrors, []);
  checks.push('gallery emits zero console errors');

  assert.equal(stateRecipes.length, 9);
  const recipePage = await context.newPage();
  const recipeMessages = [];
  recipePage.on('console', message => {
    if (['error', 'warning'].includes(message.type())) {
      recipeMessages.push(`${message.type()}: ${message.text()}`);
    }
  });
  recipePage.on('pageerror', error => recipeMessages.push(error.message));
  await recipePage.goto(
    `${baseURL}/packages/vanilla/examples/elements-gallery.html`,
    {waitUntil: 'load'},
  );
  await recipePage.waitForFunction(() => customElements.get('ax-text-input'));
  for (const {definition, example} of stateRecipes) {
    recipeMessages.length = 0;
    const label = `${definition.name}/${example.name}`;
    await recipePage.evaluate(
      ({html, label}) => {
        document.title = `${label} recipe`;
        document.body.replaceChildren();
        const main = document.createElement('main');
        const heading = document.createElement('h1');
        heading.textContent = `${label} recipe`;
        const recipe = document.createElement('section');
        recipe.innerHTML = html;
        main.append(heading, recipe);
        document.body.append(main);
        for (const script of [...recipe.querySelectorAll('script')]) {
          const executable = document.createElement('script');
          executable.textContent = script.textContent;
          script.replaceWith(executable);
        }
      },
      {html: example.html, label},
    );
    await recipePage.waitForTimeout(50);
    if (definition.name === 'Button') {
      assert.equal(
        await recipePage.locator('[role="status"]').count(),
        1,
        label,
      );
      if (example.name === 'state-loading') {
        assert.equal(
          await recipePage.locator('ax-button').getAttribute('aria-busy'),
          'true',
          label,
        );
      }
    }
    if (definition.name === 'ProgressBar') {
      const expectedValue = example.name === 'upload-done' ? '100' : '64';
      assert.equal(
        await recipePage
          .locator('ax-progress-bar [role="progressbar"]')
          .getAttribute('aria-valuenow'),
        expectedValue,
        label,
      );
    }
    if (definition.name === 'TextInput') {
      const input = recipePage.locator('ax-text-input input');
      await input.fill('hunter2');
      assert.equal(
        await recipePage
          .locator('#password-recipe-strength')
          .getAttribute('value'),
        '25',
        label,
      );
      await recipePage.locator('#password-recipe-toggle').click();
      assert.equal(
        await recipePage.locator('#password-recipe-field').getAttribute('type'),
        'text',
        label,
      );
      assert.equal(await input.inputValue(), 'hunter2', label);
    }
    if (definition.name === 'TopNav') {
      const toggle = recipePage.locator(
        '[aria-controls^="responsive-nav-items"]',
      );
      const items = recipePage.locator(
        `#${await toggle.getAttribute('aria-controls')}`,
      );
      const wasExpanded =
        (await toggle.getAttribute('aria-expanded')) === 'true';
      await toggle.click();
      assert.equal(
        await toggle.getAttribute('aria-expanded'),
        String(!wasExpanded),
        label,
      );
      assert.equal(await items.isHidden(), wasExpanded, label);
    }
    if (definition.name === 'HoverCard') {
      assert.equal(
        await recipePage
          .locator('ax-hover-card [data-ax-hover-card-trigger]')
          .getAttribute('aria-expanded'),
        'true',
        label,
      );
      assert.equal(
        await recipePage.locator('[data-ax-hover-card-content]').isVisible(),
        true,
        label,
      );
    }
    const recipeAxe = await new AxeBuilder({page: recipePage}).analyze();
    const recipeViolations = recipeAxe.violations.filter(violation =>
      ['serious', 'critical'].includes(violation.impact),
    );
    assert.deepEqual(
      recipeViolations.map(violation => ({
        id: violation.id,
        nodes: violation.nodes.map(node => ({
          target: node.target,
          html: node.html,
          summary: node.failureSummary,
        })),
      })),
      [],
      label,
    );
    assert.deepEqual(recipeMessages, [], label);
  }
  await recipePage.close();
  checks.push('every state recipe passes axe and emits no browser warnings');

  for (const [kind, script] of [
    ['classic', 'astryx-elements.classic.js'],
    ['ESM', 'astryx-elements.js'],
  ]) {
    const bundlePage = await browser.newPage();
    await bundlePage.goto(`${baseURL}/__empty.html`);
    if (kind === 'classic') {
      await bundlePage.addScriptTag({
        url: `${baseURL}/packages/vanilla/dist/${script}`,
      });
    } else {
      await bundlePage.addScriptTag({
        type: 'module',
        content: `import '${baseURL}/packages/vanilla/dist/${script}';`,
      });
    }
    await bundlePage.setContent(
      '<ax-button variant="primary">Ready</ax-button>',
    );
    await bundlePage.waitForFunction(() => customElements.get('ax-button'));
    await bundlePage.waitForSelector('ax-button > button.ax-button--primary');
    await bundlePage.close();
    checks.push(`${kind} bundle registers self-contained elements`);
  }

  console.log(
    JSON.stringify(
      {
        baseURL,
        browser: await browser.version(),
        checks,
        consoleErrors,
        matrix,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
