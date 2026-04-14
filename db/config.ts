import { column, defineDb, defineTable } from "astro:db";

const Book = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    name: column.text(),
    year: column.number(),
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

// https://astro.build/db/config
export default defineDb({
  tables: { Book, Recording },
});
