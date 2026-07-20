import './globals.css';

export const metadata = {
  title: 'JobTool — AI-Powered Job Application Pipeline',
  description: 'Cloud-hosted job application pipeline that sources, scores, and tailors applications using AI.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
