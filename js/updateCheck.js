// Notices when a newer version of the site has been deployed and offers a refresh.
// GitHub Pages stamps every file of a deploy with the same Last-Modified time, so comparing the
// loaded page's time with the server's tells us whether this copy is outdated.
import { updateStatus } from './dom.js';

const CHECK_INTERVAL_MS = 5 * 60 * 1000;

// Last-Modified of the page as it was loaded (from the network or the browser cache).
const loadedVersion = new Date(document.lastModified);

let checkTimer = null;

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

async function fetchServerVersion() {
  const response = await fetch(location.href.split('#')[0], { method: 'HEAD', cache: 'no-store' });
  const lastModified = response.headers.get('Last-Modified');
  return lastModified ? new Date(lastModified) : null;
}

function showLastUpdated() {
  updateStatus.textContent = `Last updated ${dateFormat.format(loadedVersion)}. `;
}

function showUpdateAvailable() {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'update-refresh';
  button.textContent = 'Refresh to update';
  button.addEventListener('click', refreshToLatest);

  // The trailing period separates the link from the "Discuss errors…" text that follows.
  updateStatus.replaceChildren('A new version of the calculator is available! ', button, '. ');
  updateStatus.classList.add('update-available');
}

// Re-download every file this page has used, skipping the browser cache, then reload,
// so the reload can't mix new and old (still cached) files.
async function refreshToLatest() {
  const urls = new Set([location.href.split('#')[0]]);

  for (const entry of performance.getEntriesByType('resource')) {
    if (new URL(entry.name).origin === location.origin) {
      urls.add(entry.name);
    }
  }

  await Promise.allSettled([...urls].map((url) => fetch(url, { cache: 'reload' })));
  location.reload();
}

async function checkForUpdate() {
  try {
    const serverVersion = await fetchServerVersion();

    // Compare to the second: Last-Modified has no finer precision.
    if (serverVersion && Math.floor(serverVersion / 1000) > Math.floor(loadedVersion / 1000)) {
      showUpdateAvailable();
      clearInterval(checkTimer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    }
  } catch (error) {
    // Offline or blocked: try again on the next check.
    console.warn('Could not check for updates:', error);
  }
}

function onVisibilityChange() {
  if (document.visibilityState === 'visible') {
    checkForUpdate();
  }
}

export function initUpdateCheck() {
  showLastUpdated();
  checkForUpdate();
  checkTimer = setInterval(checkForUpdate, CHECK_INTERVAL_MS);
  document.addEventListener('visibilitychange', onVisibilityChange);
}
