export type BoxImageLibraryHit = {
  id: string;
  thumb: string;
  full: string;
  alt: string;
  attribution?: { name: string; profileUrl?: string; photoUrl?: string };
};

export type BoxImageLibraryResponse = {
  source: "unsplash" | "fallback";
  results: BoxImageLibraryHit[];
  page: number;
  hasMore: boolean;
  /** Подсказка в UI при отключённом API */
  notice?: string;
};
