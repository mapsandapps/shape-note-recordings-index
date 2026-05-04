import { getYear } from "./dates";

const getSingingText = (singing: string, date: string) => {
  const year = getYear(date);

  return singing.includes(year) ? singing : `${singing}, ${year}`;
};

export const getShortSingingName = (singing: string, date: string) => {
  return (
    getSingingText(singing, date)
      .replace("Sacred Harp Singing at the ", "")
      // .replace("Sacred Harp Singing at ", "")
      // .replace("Sacred Harp Singing ", "")
      .replace(
        /(Jan|January|Feb|February|Mar|March|Apr|April|May|Jun|June|Jul|July|Aug|August|Sept|September|Oct|October|Nov|November|Dec|December)\.?\s\d{1,2},\s/g,
        "",
      )
  );
};
