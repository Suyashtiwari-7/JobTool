import './globals.css';

export const metadata = {
  title: 'JobTool — AI-Powered Job Application Pipeline',
  description: 'Cloud-hosted job application pipeline that sources, scores, and tailors applications using AI.',
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
