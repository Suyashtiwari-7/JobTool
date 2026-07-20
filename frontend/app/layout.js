import './globals.css';

export const metadata = {
  title: 'JobTool — AI-Powered Job Application Pipeline',
  description: 'Cloud-hosted job application pipeline that sources, scores, and tailors applications using AI.',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo.png" type="image/png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
