import { Book, Page, Recording, db } from "astro:db";

// https://astro.build/db/seed
export default async function seed() {
  await db.insert(Book).values([
    {
      slug: "sh-2025",
      abbreviation: "SH",
      name: "Sacred Harp",
      year: "2025",
    },
    {
      slug: "ch-2010",
      abbreviation: "CH",
      name: "Christian Harmony",
      year: "2010",
    },
  ]);

  await db.insert(Page).values([
    {
      id: 1,
      bookSlug: "ch-2010",
      page: "133",
      pageSort: 133,
      tuneName: "Juniata",
    },
    {
      id: 2,
      bookSlug: "ch-2010",
      page: "320",
      pageSort: 320,
      tuneName: "Longing for the Day",
    },
    {
      id: 3,
      bookSlug: "ch-2010",
      page: "203",
      pageSort: 203,
      tuneName: "Cumberland",
    },
  ]);

  await db.insert(Recording).values([
    {
      id: 1,
      singing: "Georgia State Christian Harmony Convention, Day 1",
      date: "2025-12-13",
      recordist: "José Camacho",
      page: "320",
      bookSlug: "ch-2010",
      url: "https://www.youtube.com/watch?v=x_ho3uTwKc4&t=8916s",
      embedUrl:
        "https://www.youtube.com/embed/x_ho3uTwKc4?si=dWxg8zTKw9gH3641&amp;start=8916",
    },
    {
      id: 2,
      singing: "Camp Doremi, Saturday",
      date: "2015-08-08",
      recordist: "Nathan Rees",
      page: "320",
      bookSlug: "ch-2010",
      url: "https://archive.org/details/2015-doremi-saturday",
      embedUrl:
        "https://archive.org/embed/2015-doremi-saturday/2015Doremi_Saturday05.mp3",
    },
    {
      id: 3,
      singing: "Camp Doremi, Friday",
      date: "2022-08-12",
      recordist: "Nathan Rees",
      page: "320",
      bookSlug: "ch-2010",
      url: "https://archive.org/details/2022-08-12-doremi-fri-23",
      embedUrl:
        "https://archive.org/embed/2022-08-12-doremi-fri-23/2022_08_12DoremiFri_27.mp3",
    },
    {
      id: 4,
      singing: "Georgia State Christian Harmony Convention, Day 1",
      date: "2025-12-13",
      recordist: "José Camacho",
      page: "133",
      bookSlug: "ch-2010",
      url: "https://www.youtube.com/watch?v=x_ho3uTwKc4&t=7329s",
      embedUrl:
        "https://www.youtube.com/embed/x_ho3uTwKc4?si=cpoBuYXscG4vC327&amp;start=7329",
    },
    {
      id: 5,
      singing: "County Line",
      date: "2010-01-16",
      recordist: "Nathan Rees",
      page: "133",
      bookSlug: "ch-2010",
      url: "https://archive.org/details/01-16-10-county-line",
      embedUrl:
        "https://archive.org/embed/01-16-10-county-line/01_16_10CountyLine33.mp3",
    },
    {
      id: 6,
      singing: "County Line",
      date: "2011-01-16",
      recordist: "Nathan Rees",
      page: "133",
      bookSlug: "ch-2010",
      url: "https://archive.org/details/01-16-10-county-line_202601",
      embedUrl:
        "https://archive.org/embed/01-16-10-county-line_202601/01_16_10CountyLine33.mp3",
    },
    {
      id: 7,
      singing: "Camp Doremi, Friday",
      date: "2015-08-07",
      recordist: "Nathan Rees",
      page: "133",
      bookSlug: "ch-2010",
      url: "https://archive.org/details/2015-doremi-friday",
      embedUrl:
        "https://archive.org/embed/2015-doremi-friday/2015+Doremi+Friday19.mp3",
    },
    {
      id: 8,
      singing: "Camp Doremi, Saturday",
      date: "2021-08-14",
      recordist: "Nathan Rees",
      page: "133",
      bookSlug: "ch-2010",
      url: "https://archive.org/details/2021-08-14-do-re-mi-sat",
      embedUrl:
        "https://archive.org/embed/2021-08-14-do-re-mi-sat/2021_08_14DoReMi_Sat21.mp3",
    },
    {
      id: 9,
      singing: "Camp Doremi, Friday",
      date: "2022-08-12",
      recordist: "Nathan Rees",
      page: "133",
      bookSlug: "ch-2010",
      url: "https://archive.org/details/2022-08-12-doremi-fri-23",
      embedUrl:
        "https://archive.org/embed/2022-08-12-doremi-fri-23/2022_08_12DoremiFri_20.mp3",
    },
    {
      id: 10,
      singing: "Camp Doremi, Saturday",
      date: "2022-08-13",
      recordist: "Nathan Rees",
      page: "133",
      bookSlug: "ch-2010",
      url: "https://archive.org/details/2022-08-13-doremi-sat",
      embedUrl:
        "https://archive.org/embed/2022-08-13-doremi-sat/2022_08_13DoremiSat_37.mp3",
    },
    {
      id: 11,
      singing: "Georgia State Christian Harmony Convention, Day 1",
      date: "2025-12-13",
      recordist: "José Camacho",
      page: "203",
      bookSlug: "ch-2010",
      url: "https://www.youtube.com/watch?v=x_ho3uTwKc4&t=1809s",
      embedUrl:
        "https://www.youtube.com/embed/x_ho3uTwKc4?si=NDoi4BUbyg0elRov&amp;start=1809",
    },
    {
      id: 12,
      singing: "Camp Doremi, Thursday",
      date: "2018-08-16",
      recordist: "Nathan Rees",
      page: "203",
      bookSlug: "ch-2010",
      url: "https://archive.org/details/2018-08-16-camp-doremi-thurs-night/2018_08_16CampDoremiThursNight18.mp3",
      embedUrl:
        "https://archive.org/embed/2018-08-16-camp-doremi-thurs-night/2018_08_16CampDoremiThursNight18.mp3",
    },
    {
      id: 13,
      singing: "Camp Doremi, Thursday",
      date: "2017-08-17",
      recordist: "Nathan Rees",
      page: "203",
      bookSlug: "ch-2010",
      url: "https://archive.org/details/2017-08-10-doremi-thurs-night/2017_08_10DoremiThursNight116.mp3",
      embedUrl:
        "https://archive.org/embed/2017-08-10-doremi-thurs-night/2017_08_10DoremiThursNight116.mp3",
    },
    {
      id: 14,
      singing: "Camp Doremi, Saturday",
      date: "2017-08-19",
      recordist: "Nathan Rees",
      page: "203",
      bookSlug: "ch-2010",
      url: "https://archive.org/details/2017-08-10-doremi-sat-night/2017_08_10DoremiSatNight213.mp3",
      embedUrl:
        "https://archive.org/embed/2017-08-10-doremi-sat-night/2017_08_10DoremiSatNight213.mp3",
    },
  ]);
}
