import '../styles/mezzanine.scss';
import '../styles/global.scss';
import { ReactNode } from 'react';
import Providers from './providers';

export const metadata = { title: 'WMS App Router Example' };

export default function RootLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <html lang="zh-Hant">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
