type Props = {
  /** False in private mode or with a full quota (from useTrip). */
  canSave: boolean;
  /** Saved Stops dropped on load because their Place left the data (from useTrip). */
  removedStops: number;
  onDismissRemoved: () => void;
};

/** App-wide notices from the design doc's editor states (§3.9). */
export const Notices = ({ canSave, removedStops, onDismissRemoved }: Props) => (
  <>
    {/* Stays for the whole visit: there is nothing the traveler can do about it. */}
    {!canSave && (
      <p className="banner banner--notice" role="status">
        This browser can't save your trip. It will be lost when you close this
        tab.
      </p>
    )}
    {removedStops > 0 && (
      <p className="banner banner--notice" role="status">
        {removedStops} Stop
        {removedStops === 1
          ? " no longer exists and was"
          : "s no longer exist and were"}{" "}
        removed.{" "}
        <button
          type="button"
          className="button button--link"
          onClick={onDismissRemoved}
        >
          Dismiss
        </button>
      </p>
    )}
  </>
);
