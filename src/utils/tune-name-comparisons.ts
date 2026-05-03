import { sql } from "astro:db";

interface Page {
  tuneName: string;
  bookSlug: string;
}

// for Cooper Book songs, compare *only* the part of the name inside parentheses (if there are parentheses)
// for all other books, remove anything inside parentheses
export const getNormalizedCurrentPage = (page: Page) =>
  page.bookSlug.startsWith("cb-")
    ? // extract content inside parens, or use full name if no parens
      (
        page.tuneName
          .match(/\(([^)]+)\)/)?.[1]
          ?.trim()
          .toLowerCase() ?? page.tuneName
      ).toLowerCase()
    : // strip parens and surrounding spaces
      page.tuneName
        .replace(/\s*\([^)]*\)\s*/g, "")
        .trim()
        .toLowerCase();

// for Cooper Book songs, compare *only* the part of the name inside parentheses (if there are parentheses)
// for all other books, remove anything inside parentheses
export const getNormalizedComparisionPage = (Page: any) => sql<string>`
  LOWER(CASE
    WHEN ${Page.bookSlug} LIKE 'cb-%' THEN
      CASE
        WHEN ${Page.tuneName} LIKE '%(%)%'
        THEN TRIM(SUBSTR(
          ${Page.tuneName},
          INSTR(${Page.tuneName}, '(') + 1,
          INSTR(${Page.tuneName}, ')') - INSTR(${Page.tuneName}, '(') - 1
        ))
        ELSE ${Page.tuneName}
      END
    ELSE
      -- strip everything from the first '(' to the matching ')'
      TRIM(
        CASE
          WHEN ${Page.tuneName} LIKE '%(%)%'
          THEN TRIM(
            SUBSTR(${Page.tuneName}, 1, INSTR(${Page.tuneName}, '(') - 1) ||
            SUBSTR(${Page.tuneName}, INSTR(${Page.tuneName}, ')') + 1)
          )
          ELSE ${Page.tuneName}
        END
      )
  END)
`;
