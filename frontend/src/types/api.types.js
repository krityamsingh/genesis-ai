// frontend/src/types/api.types.js — JSDoc type definitions

/**
 * @typedef {Object} LearnResponse
 * @property {string}  response
 * @property {string}  source
 * @property {number}  knowledge_items_stored
 * @property {string}  domain
 * @property {string}  difficulty
 * @property {number}  skills_found
 * @property {number}  concepts_found
 * @property {number}  duration_sec
 * @property {string|null} error
 */

/**
 * @typedef {Object} TextResponse
 * @property {string} result
 * @property {string} module
 */

/**
 * @typedef {Object} RouteResponse
 * @property {string} module
 * @property {string} intent
 * @property {*}      response
 * @property {string} query
 */

/**
 * @typedef {Object} StatsResponse
 * @property {string} engine
 * @property {Object} kg
 * @property {Object} memory
 * @property {Object} router
 * @property {Object} m1
 */

export {}
