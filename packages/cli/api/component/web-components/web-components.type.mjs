// Copyright (c) Meta Platforms, Inc. and affiliates.

/**
 * @typedef {object} ComponentWebComponentsListEntry
 * @property {string} name
 * @property {string} file
 */

/**
 * @typedef {object} ComponentWebComponentsListResponse
 * @property {'component.web-components.list'} type
 * @property {ComponentWebComponentsListEntry[]} data
 */

/**
 * @typedef {object} ComponentWebComponentsResponse
 * @property {'component.web-components'} type
 * @property {{component: string, file: string, source: string}} data
 */

/**
 * @typedef {object} ComponentWebComponentsOptions
 * @property {string} [cwd]
 * @property {boolean} [list]
 */

export {};
