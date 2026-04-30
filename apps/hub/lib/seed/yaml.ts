import { stringify } from 'yaml';
import type { SeedAuthor, SeedFormState } from './state';

function todayIso(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function setOptional(obj: Record<string, unknown>, key: string, value: string): void {
  const v = value.trim();
  if (v) obj[key] = v;
}

function toAuthorObj(a: SeedAuthor): Record<string, unknown> {
  const obj: Record<string, unknown> = {
    family: a.family.trim(),
    given: a.given.trim(),
    kind: a.kind,
  };
  if (a.orcid.trim()) obj['orcid'] = a.orcid.trim();
  if (a.affiliation.trim()) obj['affiliation'] = a.affiliation.trim();
  return obj;
}

/**
 * Optional Software Heritage submission record. When provided, the seed
 * YAML gets `swhPending: true` and `swhSubmittedAt` so the backfill cron
 * knows to poll for the SWHID.
 */
export interface SwhSubmission {
  submittedAt: string;
}

export function toSeedYaml(state: SeedFormState, swh?: SwhSubmission): string {
  const today = todayIso();
  const id = state.id.trim();
  const name = state.canonicalName.trim();

  const aliases = [name.toLowerCase()];
  if (id !== name.toLowerCase() && id) aliases.push(id);

  const doc: Record<string, unknown> = {};
  doc['id'] = id;
  doc['canonicalName'] = name;
  doc['aliases'] = aliases;
  doc['ecosystem'] = state.ecosystem;
  doc['description'] = state.description.trim();
  doc['homepage'] = state.homepage.trim();

  setOptional(doc, 'repository', state.repository);
  setOptional(doc, 'license', state.license);

  const citation: Record<string, unknown> = {
    title: name,
    authors: state.authors.map(toAuthorObj),
    year: state.year.trim(),
  };
  if (state.version.trim()) citation['version'] = state.version.trim();
  if (state.doi.trim()) citation['doi'] = state.doi.trim();
  if (state.citationUrl.trim() && !state.doi.trim()) {
    citation['url'] = state.citationUrl.trim();
  } else if (!state.doi.trim()) {
    citation['url'] = state.homepage.trim();
  }
  if (state.publisher.trim()) citation['publisher'] = state.publisher.trim();

  doc['citation'] = citation;

  doc['provenance'] = {
    source: 'hand-curated',
    curator: state.contributorName.trim() || 'community-submission',
    dateAdded: today,
    lastReviewed: today,
  };

  doc['versionPolicy'] = 'unversioned';

  if (swh) {
    doc['swhPending'] = true;
    doc['swhSubmittedAt'] = swh.submittedAt;
  }

  const raw = stringify(doc, {
    indent: 2,
    lineWidth: 0,
    singleQuote: false,
  });
  return raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}
