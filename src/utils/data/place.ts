export type Place = {
  id: string;
  name: string;
  type: string;
  city: string;
  region: string;
  neighborhood: string | null;
  description: string;
  latitude: number;
  longitude: number;
  /** Free-text opening hours in many formats; parsed in a later step. */
  hours: string | null;
  duration_minutes: number | null;
  price_range: "€" | "€€" | "€€€" | "€€€€";
  rating: number;
  tags: string[];
  seasonal_notes: string | null;
  booking_required: boolean | null;
};

/**
 * How far a Place's hours can be trusted:
 * - known:   from the dataset or a person's lookup (manual correction).
 * - assumed: an `assumption` correction, or a vague phrase like "Evenings".
 * - unknown: no hours at all, or a format the parser can't read.
 */
export type HoursStatus = "known" | "assumed" | "unknown";

/** A Place as the app sees it, after the clean-data pipeline. */
export type CleanPlace = Place & { hours_status: HoursStatus };
