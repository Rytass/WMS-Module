import Link from 'next/link';

export default function HomePage(): React.ReactNode {
  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>WMS App Router Example</h1>
      <p style={{ marginTop: '1rem', color: '#555' }}>
        This app validates that <code>@rytass/wms-module-react</code> works
        correctly under Next.js App Router via the{' '}
        <code>@rytass/wms-module-react/router/app</code> bridge.
      </p>
      <ul style={{ marginTop: '1.5rem', lineHeight: 2 }}>
        <li>
          <Link href="/receive-inventory-orders">
            /receive-inventory-orders — ReceiveInventoryOrders page
          </Link>
        </li>
      </ul>
    </main>
  );
}
