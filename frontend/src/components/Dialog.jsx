import { useEffect, useId, useRef } from 'react';
import { Icon } from './Icon.jsx';

// Native modal <dialog>: focus is trapped by the browser and Escape closes it.
export function Dialog({ open, onClose, title, eyebrow, children, wide = false }) {
  const ref = useRef(null);
  const opener = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      opener.current = document.activeElement;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
    if (!open && opener.current instanceof HTMLElement) {
      opener.current.focus();
      opener.current = null;
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`dialog ${wide ? 'dialog-wide' : ''}`}
      aria-labelledby={titleId}
      onCancel={event => {
        event.preventDefault();
        onClose();
      }}
      onClick={event => {
        if (event.target === ref.current) onClose();
      }}
    >
      {open && (
        <div className="dialog-body">
          <div className="dialog-head">
            <div>
              {eyebrow && <p className="eyebrow">{eyebrow}</p>}
              <h2 id={titleId}>{title}</h2>
            </div>
            <button type="button" className="icon-button" onClick={onClose} aria-label="Fermer">
              <Icon name="close" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
