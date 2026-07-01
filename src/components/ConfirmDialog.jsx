import { X } from 'lucide-react'
import './ConfirmDialog.css'

export default function ConfirmDialog({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', isDanger = false, onConfirm, onCancel }) {
  return (
    <div className="confirm-dialog__backdrop" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <header className="confirm-dialog__head">
          <h3>{title}</h3>
          <button type="button" className="confirm-dialog__close" onClick={onCancel} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="confirm-dialog__body">
          <p>{message}</p>
        </div>

        <footer className="confirm-dialog__foot">
          <button type="button" className="confirm-dialog__btn confirm-dialog__btn--cancel" onClick={onCancel}>
            {cancelText}
          </button>
          <button type="button" className={`confirm-dialog__btn ${isDanger ? 'confirm-dialog__btn--danger' : 'confirm-dialog__btn--primary'}`} onClick={onConfirm}>
            {confirmText}
          </button>
        </footer>
      </div>
    </div>
  )
}
