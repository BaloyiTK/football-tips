import './globals.css';

export const metadata = {
  title: 'Football Tips',
  description: 'Daily football tips powered by a disciplined football-first model.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
