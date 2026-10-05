// Copyright (c) Meta Platforms, Inc. and affiliates.

/**
 * @file Filesystem adapter for vanilla HTML and web-component templates.
 *
 * Environment access stays here so each template projection remains a pure
 * projection over one adapter result. Checkout assets are preferred; installed
 * packages fall back to the generated copy bundled under assets/vanilla.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {AstryxError} from '../error.mjs';
import {requireVanillaAssetsDir} from '../_vanilla-assets.mjs';
import {ERROR_CODES} from '../../foundation/response/error-codes.mjs';

/**
 * @param {string} cwd
 * @param {'html'|'web-components'} framework
 * @returns {{id: string, file: string}[]}
 */
export function listVanillaTemplateMarkup(cwd, framework) {
  const assetDir =
    framework === 'web-components' ? 'elements-templates' : 'templates';
  const templatesDir = path.join(requireVanillaAssetsDir(cwd), assetDir);
  if (!fs.existsSync(templatesDir)) return [];
  return fs
    .readdirSync(templatesDir, {withFileTypes: true})
    .filter(entry => entry.isFile() && entry.name.endsWith('.html'))
    .map(entry => ({
      id: entry.name.slice(0, -'.html'.length),
      file: entry.name,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** @param {string} cwd @returns {{id: string, file: string}[]} */
export function listVanillaTemplateHtml(cwd) {
  return listVanillaTemplateMarkup(cwd, 'html');
}

/**
 * @param {string} id
 * @param {string} cwd
 * @param {'html'|'web-components'} framework
 * @returns {{template: string, file: string, source: string}}
 */
export function readVanillaTemplateMarkup(id, cwd, framework) {
  const entries = listVanillaTemplateMarkup(cwd, framework);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
    throw new AstryxError(
      `Invalid vanilla template id "${id}"`,
      undefined,
      ERROR_CODES.ERR_INVALID_ARGUMENT,
    );
  }
  const match = entries.find(entry => entry.id === id);
  const label = framework === 'web-components' ? 'web-component' : 'HTML';
  if (!match) {
    throw new AstryxError(
      `Unknown vanilla ${label} template "${id}"`,
      entries.map(entry => ({
        name: entry.id,
        reason: `vanilla ${label} template`,
      })),
      ERROR_CODES.ERR_UNKNOWN_TEMPLATE,
    );
  }
  const assetDir =
    framework === 'web-components' ? 'elements-templates' : 'templates';
  const filePath = path.join(
    requireVanillaAssetsDir(cwd),
    assetDir,
    match.file,
  );
  return {
    template: id,
    file: match.file,
    source: fs.readFileSync(filePath, 'utf8'),
  };
}

/**
 * @param {string} id
 * @param {string} cwd
 * @returns {{template: string, file: string, source: string}}
 */
export function readVanillaTemplateHtml(id, cwd) {
  return readVanillaTemplateMarkup(id, cwd, 'html');
}
