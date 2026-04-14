import { column, defineDb, defineTable } from "astro:db";

const Book = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    abbreviation: column.text(),
    name: column.text(),
    year: column.text(),
  },
});

const Recording = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    singing: column.text(),
    year: column.number(),
    recordist: column.text(),
    page: column.text(),
    bookId: column.number({ references: () => Book.columns.id }),
    url: column.text(),
  },
});

const Page = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    bookId: column.number({ references: () => Book.columns.id }),
    page: column.text(),
    tuneName: column.text(),
  },
});

// https://astro.build/db/config
export default defineDb({
  tables: { Book, Page, Recording },
});
