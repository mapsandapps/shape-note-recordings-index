import { Book, Page, Recording, db } from "astro:db";

// https://astro.build/db/seed
export default async function seed() {
  await db.insert(Book).values([
    {
      id: 1,
      abbreviation: "SH",
      slug: "sh-2025",
      name: "Sacred Harp",
      year: "2025",
    },
    {
      id: 2,
      abbreviation: "CH",
      slug: "ch-2010",
      name: "Christian Harmony",
      year: "2010",
    },
  ]);

  await db.insert(Page).values([
    { id: 1, bookId: 2, page: "133", pageSort: 133, tuneName: "Juniata" },
    {
      id: 2,
      bookId: 2,
      page: "320",
      pageSort: 320,
      tuneName: "Longing for the Day",
    },
  ]);

  await db.insert(Recording).values([
    {
      id: 1,
      singing: "Georgia State Christian Harmony Convention, Day 1",
      year: 2025,
      recordist: "José Camacho",
      page: "320",
      bookId: 2,
      url: "https://www.youtube.com/watch?v=x_ho3uTwKc4&t=8916s",
    },
    {
      id: 2,
      singing: "Camp Doremi, Friday",
      year: 2015,
      recordist: "Nathan Rees",
      page: "320",
      bookId: 2,
      url: "https://archive.org/details/2015-doremi-saturday",
    },
    {
      id: 3,
      singing: "Camp Doremi",
      year: 2022,
      recordist: "Nathan Rees",
      page: "320",
      bookId: 2,
      url: "https://archive.org/details/2022-08-12-doremi-fri-23",
    },
    {
      id: 4,
      singing: "Georgia State Christian Harmony Convention, Day 1",
      year: 2025,
      recordist: "José Camacho",
      page: "133",
      bookId: 2,
      url: "https://www.youtube.com/watch?v=x_ho3uTwKc4&t=7329s",
    },
    {
      id: 5,
      singing: "County Line",
      year: 2010,
      recordist: "Nathan Rees",
      page: "133",
      bookId: 2,
      url: "https://archive.org/details/01-16-10-county-line",
    },
    {
      id: 6,
      singing: "County Line",
      year: 2011,
      recordist: "Nathan Rees",
      page: "133",
      bookId: 2,
      url: "https://archive.org/details/01-16-10-county-line_202601",
    },
    {
      id: 7,
      singing: "Camp Doremi",
      year: 2015,
      recordist: "Nathan Rees",
      page: "133",
      bookId: 2,
      url: "https://archive.org/details/2015-doremi-friday",
    },
    {
      id: 8,
      singing: "Camp Doremi, Friday",
      year: 2021,
      recordist: "Nathan Rees",
      page: "133",
      bookId: 2,
      url: "https://archive.org/details/2021-08-13-do-re-mi-fri",
    },
    {
      id: 9,
      singing: "Camp Doremi, Saturday",
      year: 2021,
      recordist: "Nathan Rees",
      page: "133",
      bookId: 2,
      url: "https://archive.org/details/2021-08-14-do-re-mi-sat",
    },
    {
      id: 10,
      singing: "Camp Doremi, Friday",
      year: 2022,
      recordist: "Nathan Rees",
      page: "133",
      bookId: 2,
      url: "https://archive.org/details/2022-08-12-doremi-fri-23",
    },
    {
      id: 11,
      singing: "Camp Doremi, Saturday",
      year: 2022,
      recordist: "Nathan Rees",
      page: "133",
      bookId: 2,
      url: "https://archive.org/details/2022-08-13-doremi-sat",
    },
  ]);
}
