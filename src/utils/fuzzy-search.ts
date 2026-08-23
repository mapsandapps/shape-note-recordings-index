import { db } from "../../db/db";
import { distance } from "fastest-levenshtein";
import type { PageDetail } from "../data-collection-scripts/types";

// try to find other tunes across all books that have the same or similar names. this serves two purposes: 1) you can find the same tune in other books and 2) if the song you're viewing isn't the one you were looking for.

// steps:
// 1. normalization, e.g. making names lowercase
// 2. remove generic parentheticals like "(First)"
// 3. split other parentheticals, e.g. "Come Holy Spirit (Abbeville)" will be treated like two names
// 4. matches:
//    4a. identical strings
//    4b. "contained" strings, e.g. "Peterboro" and "Peterborough"
//    4c. fuzzy matching based on Levenshtein distance, using the FUZZY_MATCH_LOOSENESS parameter below

// cases matched and not matched using this approach (with a FUZZY_MATCH_LOOSENESS of 0.2)
// doesn't match "Angel Band" and "Land of Beulah" directly, but does link both to "Angel Band (Land of Beulah)" from the Cooper Book
// matches "Anthem On The Saviour" to "Anthem on the Savior"
// matches "Mars Hill Morning" to "Mars Hill" and "Morning" (kind of silly) — actually no longer matches to "Morning" since "Morning" is on the CONTAINMENT_BLACKLIST
// matches "Odem", "Odem (First)" and "Odem (Second)"
// matches "Oh, Sing with Me" with "O Sing With Me!"
// matches "Peterboro" and "Peterborough"
// doesn't match "The Christian's Love" and "The Christian Warfare"
// "The Christian's Home" gets matched with many things, including "My Eternal Home (Home)" and "The Christian's Race"
// matches "Ata" with "Juniata"

/**
 * 0.1: tight matching
 * 0.2: medium
 * 0.3: loose matching
 */
// 0.2 but not 0.1 matches "Turn, Sinner, Turn" with "Turn Sinner Turn"
// you need 0.4 to match "Peterboro" with "Peterborough", but this special case is handled below
const FUZZY_MATCH_LOOSENESS = 0.2;

// remove these before deciding if two names match
const GENERIC_PARENTHETICALS = new Set(["first", "second", "third", "new"]);

// avoid matching e.g. "Home" with "The Christian's Home", "Love At Home", "I'm Going Home", "Heavenly Home", "Happy Home", etc.
// but this still allows "The Heavenly Home" to match with "Heavenly Home"
const CONTAINMENT_BLACKLIST = new Set([
  "home",
  "delight",
  "farewell",
  "friend",
  "hall",
  "love",
  "mary",
  "mission",
  "morning",
  "my home",
  "night",
  "ono",
  "peace",
  "praise",
  "rest",
  "spring",
  "time",
  "ward",
  "white",
  "zion",
]);

function normalizeSearchTerm(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function splitNameVariants(rawName: string): string[] {
  const match = rawName.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  if (!match) {
    return [normalizeSearchTerm(rawName)];
  }

  const [, base, paren] = match;
  const normalizedBase = normalizeSearchTerm(base);
  const normalizedParen = normalizeSearchTerm(paren);

  if (GENERIC_PARENTHETICALS.has(normalizedParen)) {
    return [normalizedBase];
  }

  return [normalizedBase, normalizedParen].filter(Boolean);
}

function normalizedNamesMatch(target: string, candidate: string): boolean {
  if (target === candidate) return true;

  const [shorter, longer] =
    target.length <= candidate.length
      ? [target, candidate]
      : [candidate, target];

  if (longer.includes(shorter) && !CONTAINMENT_BLACKLIST.has(shorter)) {
    return true;
  }

  const threshold = Math.max(
    1,
    Math.floor(target.length * FUZZY_MATCH_LOOSENESS),
  );
  return distance(target, candidate) <= threshold;
}

function bestMatch(target: string, variants: string[]): boolean {
  return variants.some((variant) => normalizedNamesMatch(target, variant));
}

function isCaseInsensitiveExact(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * @param page info about the current tune/page
 * @param excludeCurrentBook set to `true` if you want this to not return pages in this book that have the same/similar names as this tune
 * @returns tunes with the same or similar names
 */
export async function fuzzySearchNames(
  page: PageDetail,
  excludeCurrentBook: boolean = false,
) {
  const { tuneName, bookSlug: currentBookSlug, page: currentPage } = page;

  // always exclude the current page in the current book from the results
  // if `excludeCurrentBook` is true, also exclude other tunes in the current book with the same/similar name from the results
  const whereClause = excludeCurrentBook
    ? `WHERE Page.bookSlug != ?`
    : `WHERE NOT (Page.bookSlug = ? AND Page.page = ?)`;
  const candidateParams = excludeCurrentBook
    ? [currentBookSlug]
    : [currentBookSlug, currentPage];

  const candidateQuery = db.prepare(`
    SELECT Page.page, Page.tuneName, Page.bookSlug
    FROM Page
    ${whereClause}
  `);
  const candidates = candidateQuery.all(...candidateParams) as {
    page: string;
    tuneName: string;
    bookSlug: string;
  }[];

  const target = normalizeSearchTerm(tuneName);

  const matchedKeys = candidates
    .map((row) => {
      const variants = splitNameVariants(row.tuneName);
      const isMatch = bestMatch(target, variants);
      const isExactMatch = isCaseInsensitiveExact(row.tuneName, tuneName);
      return { row, isMatch, isExactMatch };
    })
    .filter(({ isMatch }) => isMatch)
    .map(({ row, isExactMatch }) => ({ ...row, isExactMatch }));

  if (matchedKeys.length === 0) return [];

  const pairsSql = matchedKeys.map(() => `(?, ?)`).join(", ");
  const params = matchedKeys.flatMap(({ page, bookSlug }) => [page, bookSlug]);

  const fullQuery = db.prepare(`
    SELECT
      Page.page,
      Page.tuneName,
      Page.bookSlug,
      Book.name AS bookName,
      Book.year AS bookYear,
      (
        SELECT COUNT(*) FROM Lesson
        WHERE Lesson.page = Page.page AND Lesson.bookSlug = Page.bookSlug
      ) AS lessonsCount
    FROM Page
    INNER JOIN Book ON Book.slug = Page.bookSlug
    WHERE (Page.page, Page.bookSlug) IN (${pairsSql})
  `);

  const fullResults = fullQuery.all(...params) as unknown as PageDetail[];

  // sort by exact matches first, then by book
  const matchInfo = new Map(
    matchedKeys.map(({ page, bookSlug, isExactMatch }, i) => [
      `${page}|${bookSlug}`,
      { order: i, isExactMatch },
    ]),
  );

  const results = fullResults.map((row) => ({
    ...row,
    isExactMatch: matchInfo.get(`${row.page}|${row.bookSlug}`)!.isExactMatch,
  }));

  // exact matches first, then preserve original candidate order within each group
  results.sort((a, b) => {
    const infoA = matchInfo.get(`${a.page}|${a.bookSlug}`)!;
    const infoB = matchInfo.get(`${b.page}|${b.bookSlug}`)!;
    if (infoA.isExactMatch !== infoB.isExactMatch) {
      return infoA.isExactMatch ? -1 : 1;
    }
    return infoA.order - infoB.order;
  });

  return results;
}
