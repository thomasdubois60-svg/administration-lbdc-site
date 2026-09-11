const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 500;

const text = value => String(value ?? '').normalize('NFC').trim().replace(/\s+/g, ' ');

function eventDate(value) {
  const valueText = text(value);
  const french = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valueText);
  if (french) return `${french[3]}-${french[2]}-${french[1]}`;
  const iso = /^(\d{4}-\d{2}-\d{2})(?:T.*)?$/.exec(valueText);
  return iso ? iso[1] : valueText;
}

function eventTime(value) {
  const valueText = text(value);
  const match = /^(\d{1,2})[:h](\d{2})(?::(\d{2}))?$/.exec(valueText);
  if (!match) return valueText;
  return `${match[1].padStart(2, '0')}:${match[2]}${match[3] && match[3] !== '00' ? `:${match[3]}` : ''}`;
}

function eventKey(event) {
  if (!event || typeof event !== 'object') return null;
  const title = text(event.title), date = eventDate(event.date);
  // Undated empty cards are drafts, not the event being announced.
  if (!title || !date) return null;
  return JSON.stringify([title, date, eventTime(event.time), eventDate(event.endDate) || date, eventTime(event.endTime)]);
}

export function comparePublishedEvents(actual, expected) {
  if (!Array.isArray(actual) || !Array.isArray(expected)) return { success: false, matched: 0, total: 0 };
  const expectedKeys = expected.map(eventKey).filter(Boolean);
  const available = actual.map(eventKey).filter(Boolean);
  let matched = 0;
  for (const key of expectedKeys) {
    const index = available.indexOf(key);
    if (index !== -1) { matched += 1; available.splice(index, 1); }
  }
  // Ignore image URLs, optional presentation fields and internal metadata.
  // A different scheduled time or end remains a different event version.
  return { success: expectedKeys.length ? matched === expectedKeys.length : available.length === 0, matched, total: expectedKeys.length };
}

export async function confirmPublishedEvents(expected, readSavedFile, expectedSha) {
  const startedAt = Date.now();
  let attempts = 0, summary = { success: false, matched: 0, total: 0 }, reason = 'github-unavailable';
  while (attempts < MAX_ATTEMPTS) {
    attempts += 1;
    try {
      const { file, content } = await readSavedFile();
      if (expectedSha && file.sha === expectedSha) {
        summary = comparePublishedEvents(content.events, expected);
        if (summary.success) return { success: true, summary, attempts, elapsedMs: Date.now() - startedAt };
        reason = 'events-not-saved';
      } else { reason = 'github-version-mismatch'; }
    } catch { reason = 'github-unavailable'; }
    if (attempts < MAX_ATTEMPTS) await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
  }
  return { success: false, summary, attempts, elapsedMs: Date.now() - startedAt, reason };
}
