/* 04-contact.js : année du pied de page, ouverture des mentions légales quand on arrive par #mentions. */
(function () {
    'use strict';

    function annee() {
        document.querySelectorAll('[data-annee]').forEach(function (el) {
            el.textContent = String(new Date().getFullYear());
        });
    }

    function ouvrirMentions() {
        if (location.hash !== '#mentions') { return; }
        var d = document.getElementById('mentions');
        if (d && d.tagName === 'DETAILS') { d.open = true; }
    }

    document.addEventListener('wp:ready', function () { annee(); ouvrirMentions(); });
    window.addEventListener('hashchange', ouvrirMentions);
})();
