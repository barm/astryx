// Copyright (c) Meta Platforms, Inc. and affiliates.

import assert from 'node:assert/strict';
import test from 'node:test';
import {JSDOM} from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  pretendToBeVisual: true,
  url: 'https://example.test/',
});
for (const name of [
  'CustomEvent',
  'Element',
  'HTMLElement',
  'MutationObserver',
  'Node',
  'customElements',
  'document',
]) {
  globalThis[name] = dom.window[name];
}

const preupgradeStack = document.createElement('ax-stack');
preupgradeStack.innerHTML = `<ax-breadcrumbs id="nested-breadcrumbs">
  <a href="#home">Home</a><span>Projects</span>
</ax-breadcrumbs><span>Body</span>`;
document.body.append(preupgradeStack);

const [{registerElement}, {default: definition}, {default: stackDefinition}] =
  await Promise.all([
    import('../src/runtime.mjs'),
    import('../src/Breadcrumbs.element.mjs'),
    import('../src/Stack.element.mjs'),
  ]);
registerElement(definition);
registerElement(stackDefinition);

async function settle() {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise(resolve => setTimeout(resolve, 0));
}

test('Breadcrumbs settles when upgraded inside another element host', async () => {
  await settle();
  const trail = preupgradeStack.querySelector('#nested-breadcrumbs');
  const link = trail.querySelector('a');
  const list = trail.querySelector('.ax-breadcrumbs__list');

  assert.equal(list.children.length, 2);
  assert.equal(link.parentElement.localName, 'li');
  assert.equal(trail.querySelectorAll(':scope > [data-ax-root]').length, 1);

  const added = document.createElement('a');
  added.href = '#added';
  added.textContent = 'Added';
  trail.append(added);
  await settle();

  assert.equal(trail.querySelector('.ax-breadcrumbs__list'), list);
  assert.equal(list.children.length, 3);
  assert.equal(added.parentElement.localName, 'li');
  preupgradeStack.remove();
});

test('Breadcrumbs wraps plain children in valid BEM list markup', async () => {
  const trail = document.createElement('ax-breadcrumbs');
  trail.setAttribute('separator', '›');
  trail.innerHTML = '<a href="#home">Home</a><span>Projects</span>';
  const link = trail.querySelector('a');
  const current = trail.querySelector('span');
  document.body.append(trail);
  await settle();

  const list = trail.querySelector('.ax-breadcrumbs__list');
  const renderedItems = [...list.children];
  assert.equal(renderedItems.length, 2);
  assert.ok(renderedItems.every(item => item.localName === 'li'));
  assert.ok(
    renderedItems.every(item =>
      item.classList.contains('ax-breadcrumbs__item'),
    ),
  );
  assert.equal(link.parentElement, renderedItems[0]);
  assert.equal(current.parentElement, renderedItems[1]);
  assert.equal(link.className, 'ax-breadcrumbs__link');
  assert.equal(current.className, 'ax-breadcrumbs__current');
  assert.equal(current.getAttribute('aria-current'), 'page');
  assert.ok(
    renderedItems.every(
      item =>
        item.querySelector('.ax-breadcrumbs__separator').textContent === '›',
    ),
  );
});

test('Breadcrumbs preserves plain child identity across attribute rerenders', async () => {
  const trail = document.createElement('ax-breadcrumbs');
  trail.innerHTML = '<a href="#home">Home</a><strong>Projects</strong>';
  const link = trail.querySelector('a');
  const current = trail.querySelector('strong');
  document.body.append(trail);
  await settle();

  trail.setAttribute('separator', '→');
  trail.setAttribute('variant', 'supporting');
  await settle();

  assert.equal(trail.querySelector('a'), link);
  assert.equal(trail.querySelector('strong'), current);
  assert.equal(current.getAttribute('aria-current'), 'page');
  assert.ok(
    [...trail.querySelectorAll('.ax-breadcrumbs__separator')].every(
      separator => separator.textContent === '→',
    ),
  );
  assert.ok(
    [...trail.querySelector('.ax-breadcrumbs__list').children].every(
      child => child.localName === 'li',
    ),
  );
});
