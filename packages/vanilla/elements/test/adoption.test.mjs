// Copyright (c) Meta Platforms, Inc. and affiliates.
/**
 * @input Rendered light-DOM elements serialized, cloned, and re-rendered.
 * @output Regression coverage for adoption markers and behavior-owned state.
 * @position Round 3 correctness probes shared by all discovered definitions.
 */

import assert from 'node:assert/strict';
import {readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {JSDOM} from 'jsdom';

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  pretendToBeVisual: true,
  url: 'https://example.test/',
});
for (const name of [
  'CustomEvent',
  'Element',
  'Event',
  'FormData',
  'HTMLDialogElement',
  'HTMLElement',
  'MutationObserver',
  'Node',
  'customElements',
  'document',
]) {
  globalThis[name] = dom.window[name];
}

if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}

const {registerElements} = await import('../src/runtime.mjs');
const definitionFiles = (await readdir(path.join(packageRoot, 'elements/src')))
  .filter(file => file.endsWith('.element.mjs'))
  .sort((left, right) => left.localeCompare(right));
const definitions = await Promise.all(
  definitionFiles.map(async file => (await import(`../src/${file}`)).default),
);
registerElements(definitions);

async function settle() {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise(resolve => setTimeout(resolve, 0));
}

function directRootCount(host) {
  return [...host.children].filter(child => child.hasAttribute('data-ax-root'))
    .length;
}

function assertHealthy(host, expectedRoots, label) {
  assert.equal(
    directRootCount(host),
    expectedRoots,
    `${label}: generated roots`,
  );
  const ids = [...host.querySelectorAll('[id]')].map(element => element.id);
  assert.equal(ids.length, new Set(ids).size, `${label}: unique inner ids`);
  for (const buttonHost of [
    ...(host.matches('ax-button') ? [host] : []),
    ...host.querySelectorAll('ax-button'),
  ]) {
    assert.equal(
      buttonHost.querySelectorAll('button, a').length,
      1,
      `${label}: one native Button control`,
    );
  }
  if (host.matches('ax-text-input')) {
    assert.equal(
      host.querySelectorAll('input').length,
      1,
      `${label}: one input`,
    );
    assert.equal(
      host.querySelectorAll('label').length,
      1,
      `${label}: one label`,
    );
  }
}

test('every definition adopts serialized and cloned rendered markup', async () => {
  for (const definition of definitions) {
    const container = document.createElement('div');
    document.body.append(container);
    container.innerHTML = definition.examples[0].html;
    const source = container.querySelector(definition.tag);
    source.id = `source-${definition.name}`;
    await settle();
    const expectedRoots = directRootCount(source);
    assert.ok(
      expectedRoots > 0,
      `${definition.name}: rendered roots are marked`,
    );
    assertHealthy(source, expectedRoots, `${definition.name} initial`);

    container.innerHTML += definition.examples[0].html;
    await settle();
    const reparsedHosts = [...container.querySelectorAll(definition.tag)];
    assert.ok(
      reparsedHosts.length >= 2,
      `${definition.name}: appended example`,
    );
    for (const [index, host] of reparsedHosts.entries()) {
      assertHealthy(
        host,
        expectedRoots,
        `${definition.name} innerHTML += ${index}`,
      );
    }

    const renderedSource = reparsedHosts[0];
    const clone = renderedSource.cloneNode(true);
    clone.id = `clone-${definition.name}`;
    container.append(clone);
    await settle();
    assertHealthy(clone, expectedRoots, `${definition.name} clone`);
    assert.equal(
      [...clone.querySelectorAll('[id]')].some(element =>
        element.id.startsWith(`source-${definition.name}-`),
      ),
      false,
      `${definition.name}: clone regenerates host-derived ids`,
    );

    container.innerHTML = container.innerHTML;
    await settle();
    for (const [index, host] of [
      ...container.querySelectorAll(definition.tag),
    ].entries()) {
      assertHealthy(
        host,
        expectedRoots,
        `${definition.name} round trip ${index}`,
      );
    }
    container.remove();
  }
});

test('selected tab state survives unrelated child attribute renders', async () => {
  const tabList = document.createElement('ax-tab-list');
  tabList.setAttribute('value', 'a');
  tabList.innerHTML = `
    <ax-tab value="a" panel-id="pa" label="A"></ax-tab>
    <ax-tab value="b" panel-id="pb" label="B"></ax-tab>
    <section slot="panels" id="pa">PA</section>
    <section slot="panels" id="pb">PB</section>`;
  document.body.append(tabList);
  await settle();
  tabList.value = 'b';
  await settle();

  const selected = tabList.querySelector('ax-tab[value="b"]');
  const other = tabList.querySelector('ax-tab[value="a"]');
  selected.setAttribute('label', 'Bee');
  await settle();
  other.setAttribute('is-disabled', '');
  await settle();

  assert.equal(
    selected.querySelector('button').getAttribute('aria-selected'),
    'true',
  );
  assert.equal(selected.querySelector('button').tabIndex, 0);
  assert.equal(
    other.querySelector('button').getAttribute('aria-selected'),
    'false',
  );
  assert.equal(other.querySelector('button').tabIndex, -1);
  assert.equal(tabList.querySelector('#pb').hidden, false);
  assert.equal(tabList.querySelector('#pa').hidden, true);
});
