// frontend/src/types/module.types.js

/**
 * @typedef {'m1'|'m2'|'m3'|'m4'|'m5'|'m6'} ModuleKey
 */

/**
 * @typedef {Object} ModuleInfo
 * @property {ModuleKey} key
 * @property {string}    name
 * @property {string}    description
 * @property {boolean}   enabled
 * @property {string}    icon
 */

/** @type {ModuleInfo[]} */
export const MODULE_LIST = [
  { key: 'm1', name: 'Self-Learner',     description: 'Learn from any source. Ask, teach, quiz.',       enabled: true,  icon: '🧠' },
  { key: 'm2', name: 'Research Accel',   description: 'Parse papers, find connections, rank results.',   enabled: true,  icon: '🔬' },
  { key: 'm3', name: 'AI Builder',       description: 'Design, code and deploy ML models.',              enabled: true,  icon: '🏗️' },
  { key: 'm4', name: 'Time Reconstruct', description: 'Reconstruct history, project futures.',           enabled: true,  icon: '📅' },
  { key: 'm5', name: 'Intuition Engine', description: 'Bayesian reasoning, gap-filling, cross-synthesis.', enabled: true, icon: '🔮' },
  { key: 'm6', name: 'Reality Sim',      description: 'World-state observation and what-if simulation.',  enabled: true,  icon: '🌍' },
]
