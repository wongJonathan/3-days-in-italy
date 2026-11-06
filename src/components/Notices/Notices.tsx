import { Alert, Button, Stack } from "@mui/material";

type Props = {
  /** False in private mode or with a full quota (from useTrip). */
  canSave: boolean;
  /** Saved Stops dropped on load because their Place left the data (from useTrip). */
  removedStops: number;
  onDismissRemoved: () => void;
};

/** App-wide notices from the design doc's editor states (§3.9). */
export const Notices = ({ canSave, removedStops, onDismissRemoved }: Props) =>
  !canSave || removedStops > 0 ? (
    <Stack spacing={1} sx={{ mb: 1.5 }}>
      {/* Stays for the whole visit: there is nothing the traveler can do about it. */}
      {!canSave && (
        <Alert severity="warning" role="status">
          This browser can't save your trip. It will be lost when you close this
          tab.
        </Alert>
      )}
      {removedStops > 0 && (
        <Alert
          severity="info"
          role="status"
          action={
            <Button size="small" onClick={onDismissRemoved}>
              Dismiss
            </Button>
          }
        >
          {removedStops} Stop
          {removedStops === 1
            ? " no longer exists and was"
            : "s no longer exist and were"}{" "}
          removed.
        </Alert>
      )}
    </Stack>
  ) : null;
