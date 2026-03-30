// frontend-next/src/components/blog/BlogToc.jsx
import { slugifySegment } from '../../lib/discoveryPages';

const buildSectionId = (heading, index) =>
  slugifySegment(heading) || `section-${index + 1}`;

export default function BlogToc({ sections = [] }) {
  const list = (Array.isArray(sections) ? sections : [])
    .map((section, index) => ({
      id: buildSectionId(section?.heading, index),
      heading: String(section?.heading || '').trim(),
    }))
    .filter((item) => item.heading);

  if (!list.length) return null;

  return (
    <div className="bg-main border border-border rounded-2xl p-4 sm:p-5 my-8">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-white font-semibold text-sm sm:text-base">
          Table of Contents
        </h2>
        <span className="text-xs text-dryGray">
          {list.length} sections
        </span>
      </div>

      <div className={`grid gap-2 ${list.length > 6 ? 'sm:grid-cols-2' : ''}`}>
        {list.map((item, index) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className="text-sm text-text hover:text-customPurple transitions rounded-lg px-3 py-2 bg-dry border border-border hover:border-customPurple"
          >
            <span className="text-customPurple font-semibold mr-2">
              {index + 1}.
            </span>
            {item.heading}
          </a>
        ))}
      </div>
    </div>
  );
}
