import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";

type Props = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * "Plan a new trip" deletes the saved Trip, finalized days and all, and it
 * can't be undone. So it always asks first. Used by the editor and the
 * Trip Overview.
 */
export const NewTripDialog = ({ open, onCancel, onConfirm }: Props) => (
  <Dialog
    open={open}
    onClose={onCancel}
    aria-labelledby="new-trip-title"
    aria-describedby="new-trip-text"
  >
    <DialogTitle id="new-trip-title">Plan a new trip?</DialogTitle>
    <DialogContent>
      <DialogContentText id="new-trip-text">
        This deletes your current trip, including every finalized day. It can't
        be undone.
      </DialogContentText>
    </DialogContent>
    <DialogActions>
      {/* Keep is focused first: the safe choice is the default. */}
      <Button onClick={onCancel} autoFocus>
        Keep my trip
      </Button>
      <Button color="error" onClick={onConfirm}>
        Delete and start over
      </Button>
    </DialogActions>
  </Dialog>
);
