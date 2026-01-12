import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  // Neljä eri salasanaa - voit muuttaa nämä haluamiksesi
  const validPasswords = [
    'terrassi2024',
    'markkinointi2024',
    'team2024',
    'tiimi2024'
  ];

  const handleSubmit = (e) => {
    e.preventDefault();

    if (validPasswords.includes(password)) {
      // Tallenna kirjautuminen
      sessionStorage.setItem('authenticated', 'true');
      // Ohjaa etusivulle
      router.push('/');
    } else {
      setError('Väärä salasana');
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Kirkkopuiston Terassi
          </h1>
          <p className="text-gray-600">Markkinoinnin hallinta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Salasana
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Syötä salasana"
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Kirjaudu sisään
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Tarvitsetko apua? Ota yhteyttä järjestelmänvalvojaan.</p>
        </div>
      </div>
    </div>
  );
}
