/**
 * Test helpers for integration testing
 */

import type { EmailStore } from './types.js'
import { createStore, listEmails } from './store.js'

/**
 * Creates a test store and returns helper functions
 */
export const createTestStore = () => {
  const store = createStore()

  return {
    store,
    getEmails: () => listEmails(store),
    getEmailCount: () => store.emails.length,
  }
}
