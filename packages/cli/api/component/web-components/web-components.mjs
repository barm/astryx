// Copyright (c) Meta Platforms, Inc. and affiliates.

/**
 * @file Vanilla web-component projection for the component command.
 * @position api/component/web-components — routed by component.mjs for the web-components framework
 */

import {
  listVanillaComponentMarkup,
  readVanillaComponentMarkup,
} from '../_adapter.mjs';

/**
 * @param {string|undefined} name
 * @param {{cwd?: string, list?: boolean}} [options]
 * @returns {import('./web-components.type.mjs').ComponentWebComponentsResponse | import('./web-components.type.mjs').ComponentWebComponentsListResponse}
 */
export function componentWebComponents(name, options = {}) {
  const {cwd = process.cwd(), list = false} = options;
  if (list) {
    return {
      type: 'component.web-components.list',
      data: listVanillaComponentMarkup(cwd, 'web-components'),
    };
  }
  const data = readVanillaComponentMarkup(
    /** @type {string} */ (name),
    cwd,
    'web-components',
  );
  return {type: 'component.web-components', data};
}
