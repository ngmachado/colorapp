import { ImageResponse } from 'next/og';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#171717',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ display: 'flex', width: 108, height: 84 }}>
        <div style={{ background: '#663399', width: 36 }} />
        <div style={{ background: '#f2dfc7', width: 48 }} />
        <div style={{ background: '#e39c55', width: 24 }} />
      </div>
    </div>,
    size,
  );
}
