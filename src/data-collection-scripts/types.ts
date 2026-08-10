// table
export interface Book {
  slug: string;
  abbreviation: string;
  name: string;
  year: string;
}

// table
export interface Recording {
  id: string;
  singing: string;
  date: string;
  recordist: string;
  url: string;
  createdAt: string;
}

// table
export interface Page {
  id: number;
  bookSlug: string;
  page: string;
  pageSort: number;
  tuneName: string;
}

// table
export interface Lesson {
  id: number;
  recordingId: string;
  page: string;
  bookSlug: string;
  url: string;
  embedUrl: string | null;
  status: "CONFIRMED";
}

export type PendingLesson = Partial<Omit<Lesson, "status">> & {
  status:
    | "CONFIRMED"
    | "PENDING"
    | "MISSING_DATA"
    | "DUPLICATE"
    | "PAGE_NUMBER_PROBLEM";
};

export type PendingRecording = Partial<Omit<Recording, "createdAt">> & {
  createdAt: string;
};

export interface PageDetail {
  page: string;
  tuneName: string;
  bookSlug: string;
  bookName: string;
  bookYear: string;
}

export interface LessonDetail {
  id: number;
  singing: string;
  date: string;
  recordist: string;
  url: string;
  embedUrl: string | null;
}
