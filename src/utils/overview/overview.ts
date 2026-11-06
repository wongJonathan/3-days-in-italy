import type { IsoDate } from "../hours/calendar.ts";
import { formatDate } from "../format.ts";

/** How far down the visible list area the reading line sits. */
const LINE_SHARE = 1 / 3;

export const readingLine = ({
  areaTop,
  viewportHeight,
  scrollY,
}: {
  areaTop: number;
  viewportHeight: number;
  scrollY: number;
}): number =>
  areaTop + Math.min(scrollY, (viewportHeight - areaTop) * LINE_SHARE);

export const pickActive = (
  tops: number[],
  line: number,
  atEnd: boolean,
): number => {
  if (tops.length === 0) return -1;
  if (atEnd) return tops.length - 1;
  return tops.reduce((active, top, i) => (top <= line ? i : active), 0);
};

export const scrollTargetFor = ({
  itemTop,
  lineAt,
  maxScroll,
}: {
  itemTop: number;
  lineAt: (scroll: number) => number;
  maxScroll: number;
}): number => {
  const crossed = (scroll: number) => itemTop - scroll <= lineAt(scroll) - 1;
  let low = 0;
  let high = Math.max(0, Math.ceil(maxScroll));
  if (!crossed(high)) return high;
  // The item only rises toward the line as the page scrolls, so binary search.
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (crossed(mid)) high = mid;
    else low = mid + 1;
  }
  return low;
};

export const dayHeading = (
  index: number,
  date: IsoDate,
  city: string | null,
): string =>
  [`Day ${index + 1}`, formatDate(date), city].filter(Boolean).join(" · ");
