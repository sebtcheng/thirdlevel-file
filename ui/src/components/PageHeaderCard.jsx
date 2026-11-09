// Hero header card: title and subtitle on the left, toolkits (search, filters, actions, user) on the right.
// Wraps below the title on narrow screens.
const PageHeaderCard = ({ title, subtitle, children }) => (
    <section className="card-surface mx-4 mt-4 flex flex-wrap items-center justify-between gap-4 px-6 py-5 md:mx-8 md:mt-6">
        <div className="min-w-0">
            <h1 className="page-title text-[32px] leading-tight text-heading">{title}</h1>
            {subtitle ? <p className="page-subtitle mt-1 text-[15px] text-secondary">{subtitle}</p> : null}
        </div>
        {children ? <div className="flex flex-wrap items-center gap-2 md:gap-4">{children}</div> : null}
    </section>
);

export default PageHeaderCard;
