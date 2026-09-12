import { useEffect, useRef } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Button } from './Button.jsx';

/**
 * Confirmation dialog built on the native <dialog> element, which gives us
 * focus trapping, Escape-to-close and a backdrop for free.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  confirmLoadingLabel,
  cancelLabel = 'Cancel',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function handleCancel(event) {
    event.preventDefault(); // keep React state as the source of truth
    if (!loading) onCancel();
  }

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      onCancel={handleCancel}
      onClick={(event) => {
        // Click on the backdrop (outside the dialog box) closes it
        if (event.target === ref.current && !loading) onCancel();
      }}
    >
      <div className="dialog__body">
        {danger && (
          <div className="dialog__icon">
            <TriangleAlert aria-hidden="true" />
          </div>
        )}
        <h2 className="dialog__title" id="confirm-dialog-title">
          {title}
        </h2>
        {description && (
          <p className="dialog__text" id="confirm-dialog-description">
            {description}
          </p>
        )}
      </div>
      <div className="dialog__actions">
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={danger ? 'danger' : 'primary'}
          onClick={onConfirm}
          loading={loading}
          loadingText={confirmLoadingLabel}
          autoFocus
        >
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
