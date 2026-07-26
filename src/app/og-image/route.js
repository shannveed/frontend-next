// frontend-next/src/app/og-image/route.js
import { ImageResponse } from 'next/og';

export const runtime = 'edge';

/**
 * Do not combine Edge Runtime with:
 *
 * export const dynamic = 'force-static';
 *
 * Next.js 14 considers those settings incompatible. The response is cached
 * through the Cache-Control header instead.
 */
export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          background:
            'linear-gradient(135deg, #080A1A 0%, #0B0F29 46%, #152867 100%)',
          color: '#ffffff',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: 520,
            height: 520,
            borderRadius: 520,
            top: -210,
            right: -90,
            background: 'rgba(27,130,255,0.22)',
          }}
        />

        <div
          style={{
            position: 'absolute',
            width: 360,
            height: 360,
            borderRadius: 360,
            bottom: -210,
            left: -80,
            background: 'rgba(27,130,255,0.16)',
          }}
        />

        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            padding: '72px 88px',
          }}
        >
          <div
            style={{
              width: 150,
              height: 150,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              borderRadius: 34,
              background: '#1B82FF',
              boxShadow: '0 24px 70px rgba(27,130,255,0.38)',
              fontSize: 92,
              fontWeight: 800,
            }}
          >
            F
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              marginLeft: 48,
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: 76,
                lineHeight: 1,
                fontWeight: 800,
                letterSpacing: '-3px',
              }}
            >
              FLIX
              <span style={{ color: '#1B82FF' }}>
                MOVO
              </span>
            </div>

            <div
              style={{
                marginTop: 24,
                fontSize: 34,
                lineHeight: 1.3,
                color: '#E0E7FF',
              }}
            >
              Movies, TV Series & Web Series
            </div>

            <div
              style={{
                marginTop: 18,
                fontSize: 24,
                color: '#AFC9FF',
              }}
            >
              www.flixmovo.online
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,

      headers: {
        'Cache-Control':
          'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
      },
    }
  );
}
