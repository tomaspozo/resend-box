import { nanoid } from 'nanoid';
import type { Email, EmailStore } from './types.js';

/**
 * Creates a new empty email store
 */
export const createStore = (): EmailStore => ({
  emails: [],
});

/**
 * Adds an email to the store
 */
export const addEmail = (store: EmailStore, email: Omit<Email, 'id' | 'createdAt'>): Email => {
  const newEmail: Email = {
    ...email,
    id: nanoid(),
    createdAt: Date.now(),
  };
  store.emails.push(newEmail);
  return newEmail;
};

/**
 * Lists all emails in reverse chronological order (newest first)
 */
export const listEmails = (store: EmailStore): Email[] => {
  return [...store.emails].sort((a, b) => b.createdAt - a.createdAt);
};

/**
 * Finds an email by ID
 */
export const findEmailById = (store: EmailStore, id: string): Email | undefined => {
  return store.emails.find((email) => email.id === id);
};

/**
 * Clears all emails from the store
 */
export const clearEmails = (store: EmailStore): void => {
  store.emails = [];
};

/**
 * Removes a specific email by ID
 */
export const removeEmail = (store: EmailStore, id: string): boolean => {
  const index = store.emails.findIndex((email) => email.id === id);
  if (index === -1) {
    return false;
  }
  store.emails.splice(index, 1);
  return true;
};

