// Copyright (c) Meta Platforms, Inc. and affiliates.

/**
 * @file Vanilla web-component template projection.
 * @position api/template/web-components — routed by template.mjs for the web-components framework
 */

import {
  ASTRYX_VANILLA_CDN_PLACEHOLDER,
  ASTRYX_VANILLA_CDN_REF,
  astryxVanillaCdnBase,
} from '../html/html.mjs';
import {
  listVanillaTemplateMarkup,
  readVanillaTemplateMarkup,
} from '../_adapter.mjs';

/**
 * @param {string|undefined} name
 * @param {{cwd?: string, list?: boolean, cdnRef?: string}} [options]
 * @returns {import('./web-components.type.mjs').TemplateWebComponentsResponse | import('./web-components.type.mjs').TemplateWebComponentsListResponse}
 */
export function templateWebComponents(name, options = {}) {
  const {
    cwd = process.cwd(),
    list = false,
    cdnRef = ASTRYX_VANILLA_CDN_REF,
  } = options;
  if (list) {
    return {
      type: 'template.web-components.list',
      data: listVanillaTemplateMarkup(cwd, 'web-components'),
    };
  }
  const raw = readVanillaTemplateMarkup(
    /** @type {string} */ (name),
    cwd,
    'web-components',
  );
  const cdnBase = astryxVanillaCdnBase(cdnRef);
  return {
    type: 'template.web-components',
    data: {
      template: raw.template,
      file: raw.file,
      cdnRef,
      cdnBase,
      source: raw.source.replaceAll(ASTRYX_VANILLA_CDN_PLACEHOLDER, cdnBase),
    },
  };
}
