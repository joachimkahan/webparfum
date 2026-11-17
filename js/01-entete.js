/* 01-entete.js : titre de l'onglet selon la langue, filet de l'en-tête après défilement, en-tête sombre au-dessus des garanties. */
(function () {
    'use strict';
    /* Titre de l'onglet et description : ils suivent la langue choisie. */
    function meta() {
        document.title = WP.i18n.t('meta.titre');
        var d = document.querySelector('meta[name="description"]');
        if (d) { d.setAttribute('content', WP.i18n.t('meta.desc')); }
    }
    document.addEventListener('wp:ready', meta);
    document.addEventListener('wp:lang', meta);

    var header = document.getElementById('entete');
    if (!header) { return; }
    var on = false;
    function maj() {
        var now = window.scrollY > 60;
        if (now !== on) { on = now; header.classList.toggle('is-scrolled', on); }
    }
    window.addEventListener('scroll', maj, { passive: true });
    maj();

    /* La ligne du haut de l'écran traverse la section sombre : l'en-tête passe en sombre. */
    var sombre = document.getElementById('garanties');
    if (sombre && 'IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
            entries.forEach(function (e) { header.classList.toggle('is-over-dark', e.isIntersecting); });
        }, { rootMargin: '0px 0px -100% 0px' }).observe(sombre);
    }
})();
