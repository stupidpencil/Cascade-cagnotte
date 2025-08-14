import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Cascade Cagnotte
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Créez des cagnottes contributives adaptatives où le montant suggéré 
            s'ajuste automatiquement pour que tout le monde paie la même somme à la fin.
          </p>
          
          <div className="space-y-4">
            <Link 
              href="/create"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200"
            >
              Créer une cagnotte
            </Link>
            
            <div className="text-sm text-gray-500">
              <Link href="/c/demo123" className="text-blue-600 hover:underline">
                Voir la démo →
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-16 grid md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="text-blue-600 text-2xl mb-4">🎯</div>
            <h3 className="text-lg font-semibold mb-2 text-gray-900">Objectif fixe</h3>
            <p className="text-gray-700">
              Définissez un montant cible. Avant de l'atteindre, chaque participant 
              paie le montant initial fixe.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="text-blue-600 text-2xl mb-4">📊</div>
            <h3 className="text-lg font-semibold mb-2 text-gray-900">Adaptation automatique</h3>
            <p className="text-gray-700">
              Une fois l'objectif atteint, le montant suggéré diminue progressivement 
              pour que tous paient la même somme finale.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="text-blue-600 text-2xl mb-4">🔒</div>
            <h3 className="text-lg font-semibold mb-2 text-gray-900">Sécurisé</h3>
            <p className="text-gray-700">
              Paiements sécurisés via Stripe, liens privés pour les administrateurs, 
              et codes PIN optionnels.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
