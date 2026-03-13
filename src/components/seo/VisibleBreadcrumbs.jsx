// frontend-next/src/components/seo/VisibleBreadcrumbs.jsx
import Link from 'next/link';

export default function VisibleBreadcrumbs({ items = [], className = '' }) {
  const list = Array.isArray(items)
    ? items.filter((item) => item && item.label)
    : [];

  if (!list.length) return null;

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-2 bg-dry border border-border rounded-lg px-4 py-3 text-sm">
        {list.map((item, idx) => {
          const isLast = idx === list.length - 1;
          const key = `${item.href || item.label}-${idx}`;

          return (
            <li key={key} className="flex items-center gap-2 min-w-0">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="text-dryGray hover:text-customPurple transitions truncate"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={`truncate ${isLast ? 'text-white font-semibold' : 'text-dryGray'
                    }`}
                >
                  {item.label}
                </span>
              )}

              {!isLast ? <span className="text-border">/</span> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
