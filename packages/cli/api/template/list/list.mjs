// Copyright (c) Meta Platforms, Inc. and affiliates.

/**
 * @file `template.list` leaf — list discovered templates (page + block),
 * optionally narrowed by `--type` / `--package`.
 *
 * @position api/template/list — pure projection over an already-discovered
 *   template set; the template dispatcher routes `--list` (and the no-name,
 *   no-skeleton default) here.
 */

import {pkgOf} from '../../../foundation/discovery/template-adapter.mjs';
import {AstryxError} from '../../error.mjs';
import {ERROR_CODES} from '../../../foundation/response/error-codes.mjs';

/**
 * Project a discovered template set into the `template.list` envelope.
 * @param {import('../../../foundation/discovery/template-adapter.mjs').DiscoveredTemplate[]} templates
 * @param {{type?: 'page' | 'block', package?: string}} [options]
 * @returns {import('../template.type.mjs').TemplateListResponse}
 */
export function templateList(templates, options = {}) {
  const {type, package: packageFilter} = options;
  let filtered = templates;
  if (type) {
    filtered = filtered.filter(t => t.type === type);
    if (filtered.length === 0) {
      const validTypes = [...new Set(templates.map(t => t.type))].sort();
      throw new AstryxError(
        `Unknown template type "${type}". Valid types: ${validTypes.join(', ')}.`,
        validTypes.map(t => ({name: t, reason: 'valid type'})),
        ERROR_CODES.ERR_INVALID_ARGUMENT,
      );
    }
  }
  if (packageFilter) {
    filtered = filtered.filter(t => pkgOf(t) === packageFilter);
    if (filtered.length === 0) {
      const validPackages = [...new Set(templates.map(t => pkgOf(t)))].sort();
      throw new AstryxError(
        `No templates found in package "${packageFilter}".`,
        validPackages.map(p => ({name: p, reason: 'has templates'})),
        ERROR_CODES.ERR_INVALID_ARGUMENT,
      );
    }
  }
  return {
    type: 'template.list',
    data: filtered.map(t => ({
      id: t.dirName,
      name: t.name,
      displayName: t.displayName,
      description: t.description,
      type: t.type,
      package: pkgOf(t),
      replaces: t.replaces,
      category: t.category || undefined,
      componentsUsed: t.componentsUsed ?? undefined,
      aspectRatio: t.aspectRatio,
      exampleFor: t.exampleFor,
      alsoExampleFor: t.alsoExampleFor,
      alsoShowcaseFor: t.alsoShowcaseFor,
      isShowcase: t.isShowcase,
      // Discovery always sets isReady (defaulting to true), so `?? true` never
      // changes the emitted value — it only satisfies the required-boolean
      // field type where the DiscoveredTemplate typedef leaves it optional.
      isReady: t.isReady ?? true,
      scaffold: t.scaffold ?? false,
    })),
  };
}
