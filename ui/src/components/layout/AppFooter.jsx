// Global footer: copyright on the left, access notice on the right.
const AppFooter = () => (
    <footer className="flex h-11 shrink-0 items-center border-t border-muted bg-white px-6 font-body text-[13px] text-secondary">
        <div className="flex w-full items-center justify-between gap-2">
            <span>&copy; {new Date().getFullYear()} Department of Education InsightED HQ</span>
            <span>Authorized administrative access only</span>
        </div>
    </footer>
);

export default AppFooter;
