document.currentScript.insertAdjacentHTML('afterend', `
<nav class="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
  <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
    <a href="landing.html" class="flex items-center gap-2">
      <span class="text-2xl">🗑</span>
      <span class="font-bold text-xl text-green-700">LaRonde</span>
    </a>
    <div class="hidden md:flex items-center gap-8">
      <a href="landing.html#fonctionnalites" class="text-sm text-gray-600 hover:text-green-700 font-medium transition-colors">Fonctionnalités</a>
      <a href="landing.html#comment" class="text-sm text-gray-600 hover:text-green-700 font-medium transition-colors">Comment ça marche</a>
      <a href="abonnement.html" class="text-sm text-gray-600 hover:text-green-700 font-medium transition-colors">Tarifs</a>
    </div>
    <div class="flex items-center gap-3">
      <a href="abonnement.html" class="hidden md:block text-sm font-medium text-green-700 hover:text-green-800 transition-colors">Voir les tarifs</a>
      <a href="login.html" class="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm">
        Se connecter →
      </a>
    </div>
  </div>
</nav>
`);
