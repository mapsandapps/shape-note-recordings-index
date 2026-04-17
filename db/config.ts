import { column, defineDb, defineTable } from "astro:db";

const Book = defineTable({
  columns: {
    abbreviation: column.text(),
    slug: column.text({ primaryKey: true }),
    name: column.text(),
    year: column.text(),
  },
});

const Recording = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    singing: column.text(),
    date: column.text(),
    recordist: column.text(),
    page: column.text(),
    bookSlug: column.text({ references: () => Book.columns.slug }),
    url: column.text(),
    embedUrl: column.text(),
  },
});

const Page = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    bookSlug: column.text({ references: () => Book.columns.slug }),
    page: column.text(),
    pageSort: column.number(),
    tuneName: column.text(),
  },
});

// https://astro.build/db/config
export default defineDb({
  tables: { Book, Page, Recording },
});
