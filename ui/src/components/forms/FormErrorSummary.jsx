// One summary banner at the top of a form. `errors` is a list of strings or { id, message }.
// Each item links to its field when an id is given.
export default function FormErrorSummary({ errors = [], title = 'Please fix the following' }) {
    const items = errors
        .map((e) => (typeof e === 'string' ? { message: e } : e))
        .filter((e) => e && e.message);
    if (items.length === 0) return null;

    const focusField = (event, id) => {
        const el = id ? document.getElementById(id) : null;
        if (el) {
            event.preventDefault();
            el.focus();
        }
    };

    return (
        <div role="alert" className="mb-4 rounded-md border border-danger-700 bg-danger-50 px-4 py-3 text-danger-700">
            <p className="text-[15px] font-bold">{title}</p>
            <ul className="mt-1 list-disc pl-5 text-[13px] font-medium">
                {items.map((item, idx) => (
                    <li key={item.id || idx}>
                        {item.id ? (
                            <a href={`#${item.id}`} onClick={(e) => focusField(e, item.id)} className="underline">{item.message}</a>
                        ) : item.message}
                    </li>
                ))}
            </ul>
        </div>
    );
}
