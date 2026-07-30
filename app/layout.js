import './globals.css';

export const metadata = {
  title: 'Administration LBDC',
  description: 'Application de gestion du site internet du Bistrot Du Coin',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
