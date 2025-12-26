/**
 * Logger utility for Backend (Node.js)
 * -----------------------------------
 * - Controlled via ENV
 * - Normal logs only in dev
 * - Errors always logged
 * - Safe for production
 */

const isDev = process.env.DEV_LOG === "true";

export const log = (...args) => {
  if (isDev) {
    console.log(...args);
    return;
  }

  // Always log errors in production
  if (args.some(arg => arg instanceof Error)) {
    console.error(...args);
  }
};
