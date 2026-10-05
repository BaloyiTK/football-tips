import './globals.css';

export const metadata = {
  title: 'FIH — Football Intelligence Hub',
  description: 'Football Intelligence Hub: daily football predictions powered by the FIH three-pillar model.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
