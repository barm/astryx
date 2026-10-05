// Copyright (c) Meta Platforms, Inc. and affiliates.

/**
 * @typedef {object} TemplateWebComponentsListEntry
 * @property {string} id
 * @property {string} file
 */

/**
 * @typedef {object} TemplateWebComponentsListResponse
 * @property {'template.web-components.list'} type
 * @property {TemplateWebComponentsListEntry[]} data
 */

/**
 * @typedef {object} TemplateWebComponentsResponse
 * @property {'template.web-components'} type
 * @property {{template: string, file: string, cdnRef: string, cdnBase: string, source: string}} data
 */

/**
 * @typedef {object} TemplateWebComponentsOptions
 * @property {string} [cwd]
 * @property {boolean} [list]
 * @property {string} [cdnRef]
 */

export {};
