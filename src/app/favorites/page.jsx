// src/app/favorites/page.jsx
import FavoritesClient from '../../components/favorites/FavoritesClient';

export const metadata = {
  title: 'Favorites Movies',
  robots: { index: false, follow: false },
};

export default function FavoritesPage() {
  return <FavoritesClient />;
}
