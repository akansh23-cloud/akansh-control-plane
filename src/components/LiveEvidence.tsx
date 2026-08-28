import live from '@/content/evidence-live.json';
import styles from './LiveEvidence.module.css';

type CiRun = {
  status: string | null;
  conclusion: string | null;
  name: string | null;
  url: string | null;
  at: string | null;
};

type RepoEvidence = {
  repo: string;
  url: string;
  defaultBranch: string;
  pushedAt: string | null;
  stars: number | null;
  openIssues: number | null;
  language: string | null;
  ci: CiRun | null;
};

type LiveFile = {
  fetchedAt: string | null;
  source: string;
  repos: Record<string, RepoEvidence | null>;
};

const data = live as LiveFile;

const DATE = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/* Absolute dates, deliberately. A relative "2 days ago" is computed at
   build time and then lies a little more every day the build is served —
   and it would differ between server and client render. A date is true for
   as long as the page exists. */
function when(iso: string | null): string | null {
  if (!iso) return null;
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  return DATE.format(at);
}

/**
 * LIVE EVIDENCE.
 *
 * Read from src/content/evidence-live.json, which scripts/fetch-evidence.mjs
 * writes at build time from the GitHub API. Nothing here is typed by hand:
 * if the file has no value for a field, the field says so. A stamp that reads
 * "Verified 28 Aug 2026" is only ever printed from a real fetch.
 */
export function LiveEvidence({ repo, compact = false }: { repo: string; compact?: boolean }) {
  const entry = data.repos[repo] ?? null;
  const verified = when(data.fetchedAt);

  if (!entry) {
    return (
      <p className={styles.root} data-state="none" data-compact={compact || undefined}>
        <span className={styles.stamp}>Public repository</span>
        <span className={styles.line}>
          Live status not fetched in this build — run <code>npm run evidence</code> with
          network access, or check the repository directly.
        </span>
      </p>
    );
  }

  const ci = entry.ci;
  const ciOk = ci?.conclusion === 'success';
  const ciTone = !ci ? 'none' : ciOk ? 'ok' : ci.status === 'completed' ? 'fault' : 'hold';

  return (
    <dl className={styles.root} data-state="live" data-compact={compact || undefined}>
      <div className={styles.cell}>
        <dt className={styles.stamp}>Verified</dt>
        <dd className={styles.value}>{verified ?? 'unknown'}</dd>
      </div>
      <div className={styles.cell}>
        <dt className={styles.stamp}>Last push</dt>
        <dd className={styles.value}>{when(entry.pushedAt) ?? 'unknown'}</dd>
      </div>
      <div className={styles.cell} data-tone={ciTone}>
        <dt className={styles.stamp}>CI on {entry.defaultBranch}</dt>
        <dd className={styles.value}>
          {ci ? (
            <a href={ci.url ?? entry.url} target="_blank" rel="noreferrer noopener">
              {ci.status === 'completed' ? ci.conclusion ?? 'unknown' : ci.status ?? 'unknown'}
              {ci.at ? ` · ${when(ci.at)}` : ''}
            </a>
          ) : (
            'no workflow runs'
          )}
        </dd>
      </div>
      {!compact ? (
        <div className={styles.cell}>
          <dt className={styles.stamp}>Stars · open issues</dt>
          <dd className={styles.value}>
            {entry.stars ?? '—'} · {entry.openIssues ?? '—'}
          </dd>
        </div>
      ) : null}
    </dl>
  );
}
