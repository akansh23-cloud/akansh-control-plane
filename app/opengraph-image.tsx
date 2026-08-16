import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'AKANSH // CONTROL PLANE — DevOps, Platform & Cloud Engineer';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  const nodes = Array.from({ length: 26 }, (_, i) => ({ x: 60 + ((i * 137) % 1080), y: 80 + ((i * 251) % 470), r: 3 + (i % 3) }));
  return new ImageResponse((
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: '#08090c', padding: 72, position: 'relative', fontFamily: 'sans-serif' }}>
      {nodes.map((node, i) => <div key={i} style={{ position: 'absolute', left: node.x, top: node.y, width: node.r * 2, height: node.r * 2, borderRadius: node.r, background: i % 5 === 0 ? '#5fd4ff' : '#3a3f7a' }} />)}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 420, background: 'linear-gradient(to top, #08090c 45%, rgba(8,9,12,0))' }} />
      <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div style={{ display: 'flex', fontSize: 20, letterSpacing: 6, color: '#8a8f9a', marginBottom: 24 }}>AKANSH // CONTROL PLANE</div>
        <div style={{ display: 'flex', fontSize: 116, color: '#e8eaee', letterSpacing: -4, lineHeight: 1 }}>AKANSH MOWAR</div>
        <div style={{ display: 'flex', marginTop: 28, fontSize: 26, color: '#6c7bff', letterSpacing: 3 }}>DEVOPS · PLATFORM · CLOUD</div>
        <div style={{ display: 'flex', marginTop: 16, fontSize: 22, color: '#8a8f9a' }}>Kubernetes · OpenShift · AWS · Terraform · GitLab CI/CD</div>
      </div>
    </div>
  ), size);
}
