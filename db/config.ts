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
    id: column.text({ primaryKey: true }),
    singing: column.text(),
    date: column.text(),
    recordist: column.text(),
    url: column.text({ unique: true }),
    createdAt: column.date(),
  },
});

const Lesson = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    recordingId: column.text({ references: () => Recording.columns.id }),
    page: column.text(),
    bookSlug: column.text({ references: () => Book.columns.slug }),
    url: column.text({ unique: true }),
    embedUrl: column.text({ unique: true, optional: true }),
    status: column.text({
      // other statuses can be in json files before they get added to the DB
      // but DB records should only have this one status
      enum: ["CONFIRMED"],
    }),
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
  tables: { Book, Lesson, Page, Recording },
});
