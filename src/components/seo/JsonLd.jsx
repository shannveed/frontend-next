// frontend-next/src/components/seo/JsonLd.jsx

const serializeJsonLd = (data) =>
  JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

export default function JsonLd({ data }) {
  if (!data) return null;

  let serialized = '';

  try {
    serialized = serializeJsonLd(data);
  } catch {
    return null;
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serialized }}
    />
  );
}
