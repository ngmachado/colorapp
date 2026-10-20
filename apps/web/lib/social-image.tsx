import { ImageResponse } from 'next/og';
export const alt = 'Super Colour — Explore colour. Build palettes. Follow the sources.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#faf9f6',
        color: '#171717',
        display: 'flex',
        flexDirection: 'column',
        padding: 64,
      }}
    >
      <div style={{ fontSize: 32, fontWeight: 700 }}>Super Colour</div>
      <div style={{ fontSize: 68, fontWeight: 700, marginTop: 36 }}>Explore colour.</div>
      <div style={{ fontSize: 36, marginTop: 12 }}>Build palettes. Follow the sources.</div>
      <div
        style={{
          display: 'flex',
          height: 160,
          marginTop: 48,
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        {['#663399', '#b49bc9', '#f2dfc7', '#e39c55', '#303f3c'].map((color, i) => (
          <div key={color} style={{ background: color, width: [36, 16, 24, 12, 12][i] + '%' }} />
        ))}
      </div>
    </div>,
    size,
  );
}
