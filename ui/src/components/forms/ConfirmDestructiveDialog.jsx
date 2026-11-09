// Shared confirmation for delete, remove, discard and overwrite actions.
// `title` and `body` must name exactly what will be affected.
export default function ConfirmDestructiveDialog({ open, title, body, confirmLabel = 'Delete', cancelLabel = 'Cancel', onConfirm, onCancel }) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-heading/50 p-4" role="presentation" onClick={onCancel}>
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-destructive-title"
                aria-describedby="confirm-destructive-body"
                className="w-full max-w-md rounded-md bg-card p-6 shadow-lg"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 id="confirm-destructive-title" className="text-[20px] font-bold text-heading">{title}</h2>
                <p id="confirm-destructive-body" className="mt-2 text-[15px] text-secondary">{body}</p>
                <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={onCancel} className="h-11 rounded-md border border-secondary bg-card px-4 text-[15px] font-semibold text-heading md:h-10">{cancelLabel}</button>
                    <button type="button" onClick={onConfirm} className="h-11 rounded-md bg-danger-600 px-4 text-[15px] font-semibold text-white md:h-10">{confirmLabel}</button>
                </div>
            </div>
        </div>
    );
}
