/* core.js : socle commun du site WebParfum (langue FR/EN, liens WhatsApp et e-mail, apparitions).
   Chargé avant les scripts des parties. Aucune dépendance. */
(function () {
    'use strict';
    var WP = window.WP = window.WP || {};
    var cfg = WP.config || {};

    /* ---------- Langue ---------- */
    var dict = { fr: {}, en: {} };
    var lang = 'fr';
    try {
        var q = new URLSearchParams(location.search).get('lang');
        var s = localStorage.getItem('wp-lang');
        if (q === 'en' || q === 'fr') { lang = q; }
        else if (s === 'en' || s === 'fr') { lang = s; }
    } catch (e) { /* stockage indisponible : français */ }

    function t(key, vars) {
        var v = (dict[lang] && dict[lang][key]);
        if (v == null) { v = dict.fr[key]; }
        if (v == null) { return key; }
        if (vars) {
            Object.keys(vars).forEach(function (k) {
                v = v.split('{' + k + '}').join(vars[k]);
            });
        }
        return v;
    }

    function applyLang(root) {
        root = root || document;
        root.querySelectorAll('[data-i18n]').forEach(function (el) {
            var k = el.getAttribute('data-i18n');
            if (dict.fr[k] != null) { el.textContent = t(k); }
        });
        root.querySelectorAll('[data-i18n-html]').forEach(function (el) {
            var k = el.getAttribute('data-i18n-html');
            if (dict.fr[k] != null) { el.innerHTML = t(k); }
        });
        /* data-i18n-attr="aria-label:cle;title:autre.cle" */
        root.querySelectorAll('[data-i18n-attr]').forEach(function (el) {
            el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
                var p = pair.split(':');
                if (p.length === 2 && dict.fr[p[1].trim()] != null) {
                    el.setAttribute(p[0].trim(), t(p[1].trim()));
                }
            });
        });
        root.querySelectorAll('[data-lang-set]').forEach(function (b) {
            b.setAttribute('aria-pressed', String(b.getAttribute('data-lang-set') === lang));
        });
    }

    function setLang(l) {
        if (l !== 'fr' && l !== 'en') { return; }
        lang = l;
        try { localStorage.setItem('wp-lang', l); } catch (e) { /* sans stockage */ }
        document.documentElement.lang = l;
        applyLang();
        refreshLinks();
        document.dispatchEvent(new CustomEvent('wp:lang', { detail: { lang: l } }));
    }

    WP.i18n = {
        add: function (d) {
            ['fr', 'en'].forEach(function (l) {
                Object.keys(d[l] || {}).forEach(function (k) { dict[l][k] = d[l][k]; });
            });
        },
        t: t,
        apply: applyLang,
        set: setLang,
        get lang() { return lang; }
    };

    /* ---------- Montants ---------- */
    /* WP.euro(6) -> « 6,00 € » ; WP.euro(6, true) -> « 6 € » (forme courte : sans centimes quand le montant est rond). */
    WP.euro = function (n, court) {
        var rond = court && Math.round(n * 100) % 100 === 0;
        return new Intl.NumberFormat(lang === 'en' ? 'en-GB' : 'fr-FR', {
            style: 'currency', currency: 'EUR',
            minimumFractionDigits: rond ? 0 : 2, maximumFractionDigits: rond ? 0 : 2
        }).format(n);
    };

    /* ---------- Liens WhatsApp, e-mail, téléphone, réseaux ---------- */
    WP.waUrl = function (text) {
        return 'https://wa.me/' + cfg.whatsapp + (text ? '?text=' + encodeURIComponent(text) : '');
    };
    WP.mailUrl = function (subject, body) {
        var p = [];
        if (subject) { p.push('subject=' + encodeURIComponent(subject)); }
        if (body) { p.push('body=' + encodeURIComponent(body)); }
        return 'mailto:' + cfg.email + (p.length ? '?' + p.join('&') : '');
    };

    function refreshLinks() {
        /* <a data-wa> ou <a data-wa="cle.i18n.du.message"> */
        document.querySelectorAll('a[data-wa]').forEach(function (a) {
            var k = a.getAttribute('data-wa');
            a.href = WP.waUrl(k ? t(k) : '');
            a.target = '_blank';
            a.rel = 'noopener';
        });
        document.querySelectorAll('a[data-mail]').forEach(function (a) {
            var k = a.getAttribute('data-mail');
            a.href = WP.mailUrl(k ? t(k) : '');
        });
        document.querySelectorAll('a[data-tel]').forEach(function (a) {
            a.href = 'tel:+' + cfg.whatsapp;
        });
        /* <a data-reseau="tiktok"> : masqué tant que le lien n'est pas renseigné dans config.js */
        document.querySelectorAll('[data-reseau]').forEach(function (a) {
            var url = (cfg.reseaux || {})[a.getAttribute('data-reseau')];
            if (url) { a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.hidden = false; }
            else { a.hidden = true; }
        });
        document.querySelectorAll('[data-reseaux-vides]').forEach(function (el) {
            var r = cfg.reseaux || {};
            el.hidden = !!(r.tiktok || r.instagram || r.facebook);
        });
        document.querySelectorAll('[data-config]').forEach(function (el) {
            var v = cfg[el.getAttribute('data-config')];
            if (v != null) { el.textContent = v; }
        });
    }

    /* ---------- Apparition douce au défilement : [data-reveal] ---------- */
    function initReveal() {
        var els = document.querySelectorAll('[data-reveal]');
        var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce || !('IntersectionObserver' in window)) {
            els.forEach(function (el) { el.classList.add('is-visible'); });
            return;
        }
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
            });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
        els.forEach(function (el) { io.observe(el); });
    }

    document.addEventListener('click', function (e) {
        var b = e.target.closest('[data-lang-set]');
        if (b) { setLang(b.getAttribute('data-lang-set')); }
    });

    document.addEventListener('DOMContentLoaded', function () {
        document.documentElement.lang = lang;
        document.documentElement.classList.add('js');
        applyLang();
        refreshLinks();
        initReveal();
        document.dispatchEvent(new CustomEvent('wp:ready', { detail: { lang: lang } }));
    });
})();
