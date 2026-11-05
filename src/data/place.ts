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
