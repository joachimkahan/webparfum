/* js/02-collection.js : la grille des parfums, la fiche ouverte (vidéo, notes, format) et le panier (WP.cart).
   Calculs en centimes entiers. Rien de ce que tape le visiteur ne passe par innerHTML. */
(function () {
    'use strict';
    var WP = window.WP = window.WP || {};

    var KEY = 'wp-panier';
    var MAX_QTY = 20;
    var lines = [];          /* [{id, ml, qty}] : le contenu du panier */
    var ui = null;           /* les éléments du tiroir, une fois la page prête */
    var chosen = {};         /* format choisi sur chaque fiche : id -> ml */
    var fo = null;           /* les éléments de la fiche ouverte, une fois la page prête */

    /* ---------- Petits outils ---------- */
    function t(k, v) { return WP.i18n.t(k, v); }
    function cfg() { return WP.config || {}; }
    function toC(n) { return Math.round(Number(n) * 100); }
    function eur(c) { return WP.euro(c / 100); }
    function eurCourt(c) { return WP.euro(c / 100, true); }

    /* Un texte qui peut être une simple chaîne ou { fr, en } */
    function loc(v) {
        if (v == null) { return ''; }
        if (typeof v === 'object' && !Array.isArray(v)) { return String(v[WP.i18n.lang] || v.fr || ''); }
        return String(v);
    }
    function locList(v) {
        var a = v && typeof v === 'object' && !Array.isArray(v) ? (v[WP.i18n.lang] || v.fr) : v;
        return Array.isArray(a) ? a.slice(0, 3) : [];
    }
    function parfum(id) {
        var a = WP.parfums || [];
        for (var i = 0; i < a.length; i++) { if (a[i].id === id) { return a[i]; } }
        return null;
    }
    function parfumIndex(id) {
        var a = WP.parfums || [];
        for (var i = 0; i < a.length; i++) { if (a[i].id === id) { return i; } }
        return -1;
    }
    function format(p, ml) {
        var f = (p && p.formats) || [];
        for (var i = 0; i < f.length; i++) { if (Number(f[i].ml) === Number(ml)) { return f[i]; } }
        return null;
    }
    function nomAffiche(p) {
        var m = loc(p.maison), n = loc(p.nom);
        return m ? m + ' ' + n : n;
    }
    function clampQty(q) {
        q = Math.floor(Number(q));
        if (!(q >= 1)) { return 0; }
        return Math.min(q, MAX_QTY);
    }
    function lineIndex(id, ml) {
        for (var i = 0; i < lines.length; i++) {
            if (lines[i].id === id && lines[i].ml === Number(ml)) { return i; }
        }
        return -1;
    }
    function resolvable(l) { var p = parfum(l.id); return !!(p && format(p, l.ml)); }

    /* ---------- Le panier : données ---------- */
    function save() {
        try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch (e) { /* sans stockage : le panier vit le temps de la visite */ }
    }
    function load() {
        try {
            var raw = JSON.parse(localStorage.getItem(KEY) || '[]');
            if (!Array.isArray(raw)) { return; }
            raw.forEach(function (l) {
                if (!l) { return; }
                var q = clampQty(l.qty);
                if (q && parfum(l.id) && format(parfum(l.id), l.ml) && lineIndex(l.id, l.ml) < 0) {
                    lines.push({ id: l.id, ml: Number(l.ml), qty: q });
                }
            });
        } catch (e) { lines = []; }
    }

    /* Lignes lisibles : celles dont le parfum ou le format a disparu des données sont écartées */
    function items() {
        var out = [];
        lines.forEach(function (l) {
            var p = parfum(l.id), f = format(p, l.ml);
            if (!p || !f) { return; }
            var u = toC(f.prix);
            out.push({ id: l.id, ml: l.ml, qty: l.qty, nom: nomAffiche(p), nomCourt: loc(p.nom), maison: loc(p.maison), idx: parfumIndex(l.id), photo: p.photo ? String(p.photo) : '', unitC: u, lineC: u * l.qty });
        });
        return out;
    }

    function totals() {
        var its = items(), subC = 0, n = 0;
        its.forEach(function (i) { subC += i.lineC; n += i.qty; });
        var c = cfg();
        var portC = toC(c.fraisDePort || 0);
        var seuilC = (c.livraisonOfferteDes == null) ? null : toC(c.livraisonOfferteDes);
        var vide = its.length === 0;
        var offerte = !vide && seuilC != null && subC >= seuilC;
        var shipC = (vide || offerte) ? 0 : portC;
        var restC = (!vide && seuilC != null && !offerte) ? seuilC - subC : 0;
        var ratio = seuilC > 0 ? Math.min(1, subC / seuilC) : (offerte ? 1 : 0);
        return {
            count: n, subC: subC, shipC: shipC, totalC: subC + shipC,
            restC: restC, seuilC: seuilC, offerte: offerte, ratio: ratio,
            sub: subC / 100, ship: shipC / 100, total: (subC + shipC) / 100
        };
    }

    /* Le message « WhatsApp s'ouvre… » ne vaut que pour la commande telle qu'elle a été envoyée */
    function masquerEnvoye() {
        if (ui && ui.envoyeBloc) { ui.envoyeBloc.hidden = true; }
    }

    function changed() {
        lines = lines.filter(resolvable);
        save();
        masquerEnvoye();
        updateCounts();
        render();
        try { document.dispatchEvent(new CustomEvent('wp:cart', { detail: { count: totals().count } })); } catch (e) { /* sans événement */ }
    }

    function add(id, ml, qty) {
        var p = parfum(id);
        ml = Number(ml);
        if (!p || !format(p, ml)) { return false; }
        qty = clampQty(qty == null ? 1 : qty);
        if (!qty) { return false; }
        var i = lineIndex(id, ml);
        if (i < 0) { lines.push({ id: id, ml: ml, qty: Math.min(qty, MAX_QTY) }); }
        else { lines[i].qty = Math.min(MAX_QTY, lines[i].qty + qty); }
        changed();
        return true;
    }
    function remove(id, ml) {
        var i = lineIndex(id, ml);
        if (i < 0) { return false; }
        lines.splice(i, 1);
        changed();
        return true;
    }
    function setQty(id, ml, qty) {
        var i = lineIndex(id, ml);
        if (i < 0) { return false; }
        qty = Math.floor(Number(qty));
        if (!(qty >= 1)) { return remove(id, ml); }
        lines[i].qty = Math.min(qty, MAX_QTY);
        changed();
        return true;
    }

    /* ---------- Coordonnées : validation et message ---------- */
    function validate(b) {
        var errs = {};
        var nom = String(b.nom || '').trim();
        var contact = String(b.contact || '').trim();
        var adresse = String(b.adresse || '').trim();
        if (nom.length < 2) { errs.nom = true; }
        var courriel = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact);
        var tel = /^[\d\s+().\-]+$/.test(contact) && (contact.match(/\d/g) || []).length >= 8;
        if (!courriel && !tel) { errs.contact = true; }
        if (adresse.length < 5) { errs.adresse = true; }
        return errs;
    }

    function message(b) {
        b = b || {};
        var its = items(), tot = totals();
        var prenom = String(cfg().dirigeant || 'Adel').split(' ')[0];
        var L = [t('panier.msg.hello', { prenom: prenom }), '', t('panier.msg.intro'), ''];
        its.forEach(function (i) {
            L.push(t('panier.msg.ligne', { nom: i.nom, ml: i.ml, qty: i.qty, prix: eur(i.lineC) }));
        });
        L.push('',
            t('panier.msg.soustotal', { v: eur(tot.subC) }),
            t('panier.msg.port', { v: tot.shipC === 0 ? t('panier.msg.offerts') : eur(tot.shipC) }),
            t('panier.msg.total', { v: eur(tot.totalC) }),
            '', t('panier.msg.coord'),
            t('panier.msg.nom', { v: String(b.nom || '').trim() }),
            t('panier.msg.contact', { v: String(b.contact || '').trim() }),
            t('panier.msg.adresse'),
            String(b.adresse || '').trim());
        var mot = String(b.mot || '').trim();
        if (mot) { L.push('', t('panier.msg.mot', { v: mot })); }
        L.push('', t('panier.msg.merci'));
        return {
            sujet: t('panier.msg.sujet'),
            corps: L.join('\n').replace(/[  ]/g, ' ')
        };
    }

    /* ---------- Compteur de l'en-tête ---------- */
    function updateCounts() {
        var n = totals().count;
        var els = document.querySelectorAll('[data-cart-count]');
        for (var i = 0; i < els.length; i++) {
            var el = els[i];
            var prev = el.textContent;
            el.textContent = String(n);
            el.setAttribute('data-empty', n === 0 ? 'true' : 'false');
            if (prev !== String(n) && n > 0) {
                el.classList.remove('is-bump');
                void el.offsetWidth;
                el.classList.add('is-bump');
                el.addEventListener('animationend', function (e) { e.currentTarget.classList.remove('is-bump'); }, { once: true });
            }
        }
    }

    /* ---------- Tiroir : dessin ---------- */
    function el(tag, cls, txt) {
        var e = document.createElement(tag);
        if (cls) { e.className = cls; }
        if (txt != null) { e.textContent = txt; }
        return e;
    }
    function say(msg) { if (ui) { ui.statut.textContent = ''; ui.statut.textContent = msg; } }

    function render() {
        if (!ui) { return; }
        var its = items(), tot = totals();
        var act = document.activeElement;
        var fk = act && act.getAttribute ? act.getAttribute('data-fk') : null;

        ui.liste.textContent = '';
        its.forEach(function (it) {
            var key = it.id + '|' + it.ml;
            var li = el('li', 'ligne');
            var vig = el('div', 'ligne__vignette');
            vig.setAttribute('aria-hidden', 'true');
            if (it.photo) {
                var im = document.createElement('img');
                im.src = it.photo; im.alt = '';
                im.width = 56; im.height = 70;
                im.loading = 'lazy'; im.decoding = 'async';
                im.addEventListener('error', function () { im.replaceWith(silhouette(it.idx, 'ligne__dessin', false)); });
                vig.appendChild(im);
            } else {
                vig.appendChild(silhouette(it.idx, 'ligne__dessin', false));
            }
            li.appendChild(vig);
            var tete = el('div', 'ligne__tete');
            tete.appendChild(el('p', 'ligne__nom', it.nomCourt));
            tete.appendChild(el('p', 'ligne__prix', eur(it.lineC)));
            li.appendChild(tete);
            var meta = el('p', 'ligne__meta');
            if (it.maison) { meta.appendChild(el('span', 'ligne__maison', it.maison)); }
            meta.appendChild(el('span', null, t('col.format.ml', { ml: it.ml })));
            meta.appendChild(el('span', null, t('panier.unite', { prix: eur(it.unitC) })));
            li.appendChild(meta);

            var ctl = el('div', 'ligne__ctl');
            var q = el('div', 'qte');
            q.setAttribute('role', 'group');
            q.setAttribute('aria-label', t('panier.qte', { nom: it.nom, ml: it.ml }));
            var moins = el('button', 'qte__btn', '−');
            moins.type = 'button';
            moins.setAttribute('data-act', 'moins');
            moins.setAttribute('data-fk', 'm:' + key);
            moins.setAttribute('aria-label', t('panier.moins', { nom: it.nom, ml: it.ml }));
            if (it.qty <= 1) { moins.setAttribute('aria-disabled', 'true'); }
            var val = el('span', 'qte__val', String(it.qty));
            var plus = el('button', 'qte__btn', '+');
            plus.type = 'button';
            plus.setAttribute('data-act', 'plus');
            plus.setAttribute('data-fk', 'p:' + key);
            plus.setAttribute('aria-label', t('panier.plus', { nom: it.nom, ml: it.ml }));
            if (it.qty >= MAX_QTY) { plus.setAttribute('aria-disabled', 'true'); }
            q.appendChild(moins); q.appendChild(val); q.appendChild(plus);

            var ret = el('button', 'link ligne__retirer', t('panier.retirer'));
            ret.type = 'button';
            ret.setAttribute('data-act', 'retirer');
            ret.setAttribute('data-fk', 'r:' + key);
            ret.setAttribute('aria-label', t('panier.retirer.label', { nom: it.nom, ml: it.ml }));
            ctl.appendChild(q); ctl.appendChild(ret);
            li.appendChild(ctl);

            [moins, plus, ret].forEach(function (b) { b.setAttribute('data-id', it.id); b.setAttribute('data-ml', String(it.ml)); });
            ui.liste.appendChild(li);
        });

        var vide = its.length === 0;
        ui.vide.hidden = !vide;
        ui.plein.hidden = vide;

        /* Livraison offerte : jauge, phrase, frais */
        var port = toC(cfg().fraisDePort || 0);
        var avecJauge = !vide && tot.seuilC != null && port > 0;
        ui.livraison.hidden = !avecJauge;
        ui.jauge.style.setProperty('--p', String(tot.ratio));
        ui.jaugeTexte.textContent = tot.offerte ? t('panier.jauge.ok') : t('panier.jauge.reste', { montant: eur(tot.restC) });
        ui.sousTotal.textContent = eur(tot.subC);
        ui.port.textContent = tot.shipC === 0 ? t('panier.offerts') : eur(tot.shipC);
        ui.total.textContent = eur(tot.totalC);

        /* Le focus reste sur le bouton qui vient d'être activé */
        if (fk && ui.ouvert) {
            var again = ui.liste.querySelector('[data-fk="' + fk + '"]');
            if (!again) { again = ui.liste.querySelector('[data-act="plus"]') || ui.fermer; }
            if (again && document.activeElement !== again) { again.focus({ preventScroll: true }); }
        }
    }

    /* ---------- Tiroir : ouverture, fermeture, focus ---------- */
    var lastFocus = null;
    var inerted = [];

    /* Page rendue inerte pendant qu'une couche (tiroir, fiche) est ouverte : tout le reste du <body> sauf elle */
    function setInert(on, keep, store) {
        if (on) {
            Array.prototype.forEach.call(document.body.children, function (n) {
                if (n === keep || n.tagName === 'SCRIPT' || n.inert) { return; }
                n.inert = true;
                store.push(n);
            });
        } else {
            store.forEach(function (n) { n.inert = false; });
            store.length = 0;
        }
    }
    function setBackgroundInert(on) { setInert(on, ui.racine, inerted); }

    function open() {
        if (!ui || ui.ouvert) { return; }
        lastFocus = document.activeElement;
        ui.ouvert = true;
        render();
        ui.racine.classList.add('is-open');
        document.documentElement.classList.add('wp-panier-ouvert');
        setBackgroundInert(true);
        ui.fermer.focus({ preventScroll: true });
    }
    function close() {
        if (!ui || !ui.ouvert) { return; }
        ui.ouvert = false;
        ui.racine.classList.remove('is-open');
        document.documentElement.classList.remove('wp-panier-ouvert');
        setBackgroundInert(false);
        var back = lastFocus && document.contains(lastFocus) ? lastFocus : document.querySelector('[data-cart-open]');
        if (back && back.focus) { back.focus({ preventScroll: true }); }
        lastFocus = null;
    }

    /* Piège à focus : Tab tourne dans la couche ouverte */
    function trapTab(e, box) {
        var f = Array.prototype.filter.call(
            box.querySelectorAll('button:not([disabled]), a[href], input, textarea, select, video[controls], [tabindex]:not([tabindex="-1"])'),
            function (n) { return n.offsetParent !== null; }
        );
        if (!f.length) { return; }
        var first = f[0], last = f[f.length - 1], a = document.activeElement;
        if (!box.contains(a)) { e.preventDefault(); first.focus(); }
        else if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
    }
    function onKey(e) {
        if (fo && fo.ouvert) { onKeyFiche(e); return; }
        if (!ui || !ui.ouvert) { return; }
        if (e.key === 'Escape') { e.preventDefault(); close(); return; }
        if (e.key === 'Tab') { trapTab(e, ui.tiroir); }
    }

    /* ---------- Tiroir : formulaire ---------- */
    var FIELDS = ['nom', 'contact', 'adresse'];

    function readBuyer() {
        return {
            nom: ui.champ.nom.value, contact: ui.champ.contact.value,
            adresse: ui.champ.adresse.value, mot: ui.champ.mot.value
        };
    }
    function showErrors(errs) {
        ui.errs = errs;
        FIELDS.forEach(function (k) {
            var inp = ui.champ[k], er = ui.err[k];
            if (errs[k]) {
                er.textContent = t('panier.err.' + k);
                er.hidden = false;
                inp.setAttribute('aria-invalid', 'true');
                inp.setAttribute('aria-describedby', er.id);
            } else {
                er.textContent = '';
                er.hidden = true;
                inp.removeAttribute('aria-invalid');
                inp.removeAttribute('aria-describedby');
            }
        });
    }
    function launch(url, externe) {
        var a = document.createElement('a');
        a.href = url;
        if (externe) { a.target = '_blank'; a.rel = 'noopener'; }
        a.hidden = true;
        document.body.appendChild(a);
        a.click();
        a.remove();
    }
    function submit(mode) {
        if (!items().length) { return; }
        var b = readBuyer();
        var errs = validate(b);
        showErrors(errs);
        var bad = FIELDS.filter(function (k) { return errs[k]; });
        if (bad.length) {
            masquerEnvoye();
            ui.champ[bad[0]].focus();
            return;
        }
        var m = message(b);
        if (mode === 'wa') { launch(WP.waUrl(m.corps), true); }
        else { launch(WP.mailUrl(m.sujet, m.corps), false); }
        ui.envoye.textContent = t(mode === 'wa' ? 'panier.envoye.wa' : 'panier.envoye.mail');
        ui.envoyeBloc.hidden = false;
    }

    function initDrawer() {
        var racine = document.getElementById('panier');
        if (!racine) { return; }
        var $ = function (id) { return document.getElementById(id); };
        ui = {
            racine: racine, tiroir: $('panier-tiroir'), fermer: $('panier-fermer'),
            vide: $('panier-vide'), plein: $('panier-plein'), liste: $('panier-lignes'),
            livraison: $('panier-livraison'), jauge: $('panier-jauge'), jaugeTexte: $('panier-jauge-texte'),
            sousTotal: $('panier-soustotal'), port: $('panier-port'), total: $('panier-total'),
            envoye: $('panier-envoye'), envoyeBloc: $('panier-envoye-bloc'), vider: $('panier-vider'), statut: $('panier-statut'),
            champ: { nom: $('panier-nom'), contact: $('panier-contact'), adresse: $('panier-adresse'), mot: $('panier-mot') },
            err: { nom: $('panier-err-nom'), contact: $('panier-err-contact'), adresse: $('panier-err-adresse') },
            ouvert: false, errs: {}
        };
        /* Le tiroir vit à la racine de la page : le reste peut être rendu inerte pendant qu'il est ouvert */
        document.body.appendChild(racine);

        document.addEventListener('click', function (e) {
            var o = e.target.closest && e.target.closest('[data-cart-open]');
            if (o) { e.preventDefault(); open(); return; }
            var c = e.target.closest && e.target.closest('[data-cart-close]');
            if (c && ui.racine.contains(c)) { close(); }
        });

        ui.liste.addEventListener('click', function (e) {
            var b = e.target.closest('[data-act]');
            if (!b || b.getAttribute('aria-disabled') === 'true') { return; }
            var id = b.getAttribute('data-id'), ml = Number(b.getAttribute('data-ml'));
            var i = lineIndex(id, ml);
            if (i < 0) { return; }
            var act = b.getAttribute('data-act');
            var it = items().filter(function (x) { return x.id === id && x.ml === ml; })[0];
            if (act === 'plus') { setQty(id, ml, lines[i].qty + 1); }
            else if (act === 'moins') { setQty(id, ml, lines[i].qty - 1); }
            else if (act === 'retirer') { remove(id, ml); }
            if (!it) { return; }
            var k = lineIndex(id, ml);
            say(k < 0 ? t('panier.retire.sr', { nom: it.nom, ml: ml })
                : t('panier.qte.sr', { nom: it.nom, ml: ml, qty: lines[k].qty }));
        });

        FIELDS.forEach(function (k) {
            ui.champ[k].addEventListener('input', function () {
                if (ui.errs[k] && !validate(readBuyer())[k]) {
                    var e = {}; FIELDS.forEach(function (x) { if (x !== k && ui.errs[x]) { e[x] = true; } });
                    showErrors(e);
                }
            });
        });
        $('panier-form').addEventListener('submit', function (e) { e.preventDefault(); });
        $('panier-wa').addEventListener('click', function () { submit('wa'); });
        $('panier-mail').addEventListener('click', function () { submit('mail'); });
        /* Toute modification d'un champ efface le message d'envoi ; « Vider le panier » repart à zéro */
        FIELDS.concat(['mot']).forEach(function (k) { ui.champ[k].addEventListener('input', masquerEnvoye); });
        ui.vider.addEventListener('click', function () {
            lines = [];
            changed();
            say(t('panier.vide'));
            ui.fermer.focus({ preventScroll: true });
        });
    }

    /* ---------- Fiche ouverte : un parfum en grand, sa vidéo, ses notes, son format ---------- */
    var foInerted = [];
    function reduit() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

    function validFormats(p) {
        return ((p && p.formats) || []).filter(function (f) { return f && Number(f.ml) > 0 && Number(f.prix) >= 0; });
    }
    /* Les parfums qui s'affichent dans la grille, donc ceux entre lesquels on peut passer */
    function listed() {
        var out = [];
        (WP.parfums || []).forEach(function (p, i) { if (validFormats(p).length) { out.push(i); } });
        return out;
    }
    /* Une vidéo du site (fichier) ; une adresse http(s) reste un lien externe sur la carte */
    function hasFilm(p) {
        var v = p && p.video ? String(p.video).trim() : '';
        return v !== '' && !/^https?:\/\//i.test(v);
    }
    function hashOf(id) { return '#parfum-' + encodeURIComponent(id); }
    function idFromHash() {
        var h = location.hash;
        if (h.indexOf('#parfum-') !== 0) { return ''; }
        try { return decodeURIComponent(h.slice(8)); } catch (e) { return ''; }
    }
    /* Le fragment suit la fiche sans jamais ajouter d'entrée à l'historique */
    function setHash(id) {
        try { history.replaceState(history.state, '', hashOf(id)); } catch (e) { /* adresse inchangée */ }
    }
    function clearHash() {
        if (!idFromHash()) { return; }
        try { history.replaceState(history.state, '', location.pathname + location.search); } catch (e) { /* adresse inchangée */ }
    }
    function lienNom(id) {
        var l = document.querySelectorAll('.fiche__lien');
        for (var i = 0; i < l.length; i++) { if (l[i].getAttribute('data-fiche') === id) { return l[i]; } }
        return null;
    }

    /* Le grand visuel : la photo, sinon la silhouette gravée */
    function grandVisuel(p, idx) {
        var nom = nomAffiche(p);
        if (p.photo) {
            var img = document.createElement('img');
            img.src = String(p.photo); img.alt = nom;
            img.width = 400; img.height = 500;
            img.decoding = 'async';
            img.addEventListener('error', function () { img.replaceWith(silhouette(idx, 'fo__dessin', true)); });
            return img;
        }
        return silhouette(idx, 'fo__dessin', true);
    }

    /* Pyramide « Tête / Cœur / Fond » si elle est renseignée, sinon les notes simples */
    function pyramideRows(p) {
        var py = p.pyramide, rows = [];
        if (py && typeof py === 'object') {
            [['tete', 'col.fiche.tete'], ['coeur', 'col.fiche.coeur'], ['fond', 'col.fiche.fond']].forEach(function (r) {
                var v = py[r[0]];
                var a = v && typeof v === 'object' && !Array.isArray(v) ? (v[WP.i18n.lang] || v.fr) : v;
                if (Array.isArray(a) && a.length) { rows.push([t(r[1]), a.join(', ')]); }
            });
        }
        if (rows.length) { return rows; }
        var n = locList(p.notes);
        return n.length ? [[t('col.fiche.notes'), n.join(', ')]] : [];
    }

    function refreshFiche() {
        var p = fo.p, f = currentFormat(p);
        if (!f) { return; }
        fo.prix.textContent = WP.euro(Number(f.prix), true);
        fo.ajout.setAttribute('aria-label', t('col.fiche.add.label', { nom: nomAffiche(p), ml: f.ml }));
    }
    /* Le format choisi dans la fiche se retrouve sur la carte */
    function syncCard(id, ml) {
        var r = document.getElementById('fmt-' + id + '-' + ml);
        if (r && !r.checked) { r.checked = true; r.dispatchEvent(new Event('change')); }
    }
    function resetAjout() {
        clearTimeout(fo.addTimer);
        fo.ajout.textContent = t('col.fiche.add');
        fo.ajout.classList.remove('is-added');
    }

    function setFilm(p) {
        var v = fo.film, r = reduit();
        clearTimeout(fo.stopTimer);
        if (p.poster) { v.setAttribute('poster', String(p.poster)); } else { v.removeAttribute('poster'); }
        v.muted = true;
        v.preload = r ? 'metadata' : 'auto';
        v.autoplay = !r;
        v.setAttribute('aria-label', t('col.video.titre', { nom: nomAffiche(p) }));
        v.setAttribute('src', String(p.video).trim());      /* le fichier ne se charge qu'ici, à l'ouverture */
        if (!r) {
            var pr = v.play();
            if (pr && pr.catch) { pr.catch(function () { /* lecture manuelle */ }); }
        }
    }
    function stopFilm() {
        var v = fo.film;
        v.pause();
        if (v.getAttribute('src')) {
            v.removeAttribute('src'); v.removeAttribute('poster');
            v.load();                                          /* remise à zéro */
        }
    }

    /* Remplit la fiche avec le parfum i ; soft : simple redessin (changement de langue), la vidéo n'est pas touchée */
    function fill(i, soft) {
        var p = (WP.parfums || [])[i];
        if (!p) { return; }
        fo.idx = i; fo.p = p;
        var nom = nomAffiche(p), film = hasFilm(p);
        var fs = validFormats(p);
        if (!currentFormat(p) || Number(currentFormat(p).ml) !== chosen[p.id]) { chosen[p.id] = Number(fs[0].ml); }

        fo.feuille.classList.toggle('a-film', film);
        var maison = loc(p.maison), exemple = !!(p.exemple && cfg().modeExemple);
        fo.maison.textContent = maison; fo.maison.hidden = !maison;
        fo.exemple.hidden = !exemple;
        fo.sur.hidden = !maison && !exemple;
        fo.nom.textContent = loc(p.nom);
        var fam = loc(p.famille);
        fo.famille.textContent = fam; fo.famille.hidden = !fam;
        var desc = loc(p.description);
        fo.desc.textContent = desc; fo.desc.hidden = !desc;

        fo.notes.textContent = '';
        pyramideRows(p).forEach(function (r) {
            var row = el('div', 'fo__rang');
            row.appendChild(el('dt', null, r[0]));
            row.appendChild(el('dd', null, r[1]));
            fo.notes.appendChild(row);
        });
        fo.notes.hidden = !fo.notes.children.length;

        fo.image.textContent = '';
        fo.image.appendChild(grandVisuel(p, i));
        fo.vignette.textContent = '';
        fo.vignette.hidden = !film;
        if (film) {
            if (p.photo) {
                var im = document.createElement('img');
                im.src = String(p.photo); im.alt = ''; im.width = 64; im.height = 80; im.decoding = 'async';
                im.addEventListener('error', function () { im.replaceWith(silhouette(i, 'ligne__dessin', false)); });
                fo.vignette.appendChild(im);
            } else {
                fo.vignette.appendChild(silhouette(i, 'ligne__dessin', false));
            }
        }

        /* Formats : même langage que la carte (mots soulignés) */
        Array.prototype.slice.call(fo.formats.querySelectorAll('.fmt')).forEach(function (n) { n.remove(); });
        fs.forEach(function (f) {
            var id = 'fo-fmt-' + f.ml;
            var w = el('span', 'fmt');
            var r = document.createElement('input');
            r.type = 'radio'; r.name = 'fo-fmt'; r.id = id; r.value = String(f.ml);
            r.checked = Number(f.ml) === chosen[p.id];
            r.addEventListener('change', function () { chosen[p.id] = Number(f.ml); refreshFiche(); syncCard(p.id, f.ml); });
            var lab = el('label', null, t('col.format.ml', { ml: f.ml }));
            lab.htmlFor = id;
            w.appendChild(r); w.appendChild(lab);
            fo.formats.appendChild(w);
        });
        resetAjout();
        refreshFiche();

        var n = listed();
        fo.compte.textContent = t('col.fiche.compte', { n: n.indexOf(i) + 1, total: n.length });
        fo.nav.hidden = n.length < 2;
        if (!soft) { fo.defile.scrollTop = 0; fo.infos.scrollTop = 0; }
        fo.feuille.setAttribute('aria-label', nom);

        if (!soft) {
            stopFilm();
            if (film) { setFilm(p); }
        }
    }

    /* Passage d'un parfum à l'autre : fondu bref du contenu */
    function showFiche(i) {
        clearTimeout(fo.swapTimer);
        fo.idx = i;
        fo.feuille.classList.add('is-swap');
        fo.swapTimer = setTimeout(function () {
            fill(i, false);
            fo.feuille.classList.remove('is-swap');
        }, 110);
    }

    function openFiche(id, origine) {
        if (!fo) { return; }
        var i = parfumIndex(id);
        if (i < 0 || !validFormats(WP.parfums[i]).length) { return; }
        if (fo.ouvert) { showFiche(i); setHash(id); return; }
        if (ui && ui.ouvert) { close(); }
        fo.origine = { id: id, el: origine || null };
        fo.ouvert = true;
        clearTimeout(fo.stopTimer);
        fill(i, false);
        void fo.feuille.offsetWidth;                            /* départ posé avant la transition */
        fo.racine.classList.add('is-open');
        document.documentElement.classList.add('wp-fiche-ouverte');
        setInert(true, fo.racine, foInerted);
        fo.fermer.focus({ preventScroll: true });
        setHash(id);
    }

    function closeFiche(garderAdresse) {
        if (!fo || !fo.ouvert) { return; }
        fo.ouvert = false;
        clearTimeout(fo.swapTimer); clearTimeout(fo.addTimer);
        fo.feuille.classList.remove('is-swap');
        fo.racine.classList.remove('is-open');
        document.documentElement.classList.remove('wp-fiche-ouverte');
        setInert(false, null, foInerted);
        fo.film.pause();                                        /* arrêtée tout de suite ; remise à zéro une fois la feuille partie */
        fo.stopTimer = setTimeout(function () { if (!fo.ouvert) { stopFilm(); } }, 320);
        var o = fo.origine || { id: fo.p ? fo.p.id : '', el: null };
        var back = o.el && document.contains(o.el) && o.el.getAttribute('tabindex') !== '-1' ? o.el : lienNom(o.id);
        if (back && back.focus) { back.focus({ preventScroll: true }); }
        fo.origine = null;
        if (!garderAdresse) { clearHash(); }
    }

    function go(dir) {
        var n = listed();
        if (n.length < 2) { return; }
        var k = n.indexOf(fo.idx);
        var i = n[(k + dir + n.length) % n.length];
        showFiche(i);
        setHash(WP.parfums[i].id);
    }

    function onKeyFiche(e) {
        if (e.key === 'Escape') { e.preventDefault(); closeFiche(); return; }
        if (e.key === 'Tab') { trapTab(e, fo.feuille); return; }
        if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
            var tg = e.target && e.target.tagName;
            if (tg === 'INPUT' || tg === 'VIDEO' || tg === 'TEXTAREA' || tg === 'SELECT') { return; }   /* flèches des formats et de la vidéo */
            e.preventDefault();
            go(e.key === 'ArrowLeft' ? -1 : 1);
        }
    }

    function onHash() {
        var id = idFromHash();
        if (id) { if (parfumIndex(id) >= 0) { openFiche(id); } }
        else if (fo && fo.ouvert) { closeFiche(true); }
    }

    function initFiche() {
        var racine = document.getElementById('fiche-ouverte');
        if (!racine) { return; }
        var $ = function (id) { return document.getElementById(id); };
        fo = {
            racine: racine, feuille: $('fo-feuille'), film: $('fo-film'), image: $('fo-image'),
            defile: racine.querySelector('.fo__defile'), infos: $('fo-infos'), vignette: $('fo-vignette'),
            sur: racine.querySelector('.fo__sur'), maison: $('fo-maison'), exemple: $('fo-exemple'),
            nom: $('fo-nom'), famille: $('fo-famille'), desc: $('fo-description'), notes: $('fo-notes'),
            formats: $('fo-formats'), prix: $('fo-prix'), ajout: $('fo-ajout'),
            nav: racine.querySelector('.fo__nav'), compte: $('fo-compte'), prec: $('fo-prec'), suiv: $('fo-suiv'),
            fermer: $('fo-fermer'), statut: $('fo-statut'),
            ouvert: false, idx: -1, p: null, origine: null,
            swapTimer: 0, addTimer: 0, stopTimer: 0
        };
        /* La fiche vit à la racine de la page : le reste peut être rendu inerte pendant qu'elle est ouverte */
        document.body.appendChild(racine);

        racine.addEventListener('click', function (e) {
            if (e.target.closest('[data-fiche-close]')) { closeFiche(); }
        });
        fo.prec.addEventListener('click', function () { go(-1); });
        fo.suiv.addEventListener('click', function () { go(1); });
        fo.ajout.addEventListener('click', function () {
            var p = fo.p, f = currentFormat(p);
            if (!f || !WP.cart.add(p.id, f.ml)) { return; }
            fo.ajout.textContent = t('col.added');
            fo.ajout.classList.add('is-added');
            fo.statut.textContent = '';
            fo.statut.textContent = t('col.added.sr', { nom: nomAffiche(p), ml: f.ml });
            clearTimeout(fo.addTimer);
            fo.addTimer = setTimeout(resetAjout, 1600);
        });
        /* Un fichier vidéo introuvable ou illisible : on montre le parfum en grand à la place */
        fo.film.addEventListener('error', function () {
            if (fo.film.getAttribute('src')) { fo.feuille.classList.remove('a-film'); fo.vignette.hidden = true; }
        });

        /* Ouverture depuis la grille : clic ou Entrée sur le visuel, le nom ou « Voir la vidéo » */
        var grille = document.getElementById('collection-grille');
        if (grille) {
            grille.addEventListener('click', function (e) {
                var a = e.target.closest && e.target.closest('[data-fiche]');
                if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) { return; }
                e.preventDefault();
                openFiche(a.getAttribute('data-fiche'), a);
            });
        }
        window.addEventListener('hashchange', onHash);
    }

    /* ---------- Grille des fiches ---------- */
    /* Quatre silhouettes de flacon au trait (viewBox 100 × 125), posées sur leur ligne de sol (y = 108).
       out : contour du verre, bague et bouchon ; inn : second contour de verre, décalé de 3 (il sert aussi à découper le jus) ;
       top / bot : niveau du jus et fond du flacon. Le jus est dessiné en traits horizontaux tous les 3, générés ci-dessous. */
    var SIL = [
        {   /* carré épaulé */
            out: '<path d="M23 108V60L38 46H62L77 60V108Z"/><rect x="36" y="40" width="28" height="6"/><rect x="34" y="18" width="32" height="22"/><path d="M34 25h32"/>',
            inn: '<path d="M26 105V61.3L39.2 49H60.8L74 61.3V105Z"/>', top: 70, bot: 105
        },
        {   /* boule sur pied bas */
            out: '<circle cx="50" cy="76" r="29"/><rect x="38" y="105" width="24" height="3"/><rect x="44" y="41" width="12" height="7"/><rect x="41" y="37" width="18" height="4"/><path d="M43 37V29Q43 19 50 19T57 29V37Z"/>',
            inn: '<circle cx="50" cy="76" r="26"/>', top: 64, bot: 102
        },
        {   /* colonne haute, fond de verre épais */
            out: '<path d="M25 108V42Q25 36 31 36H69Q75 36 75 42V108Z"/><rect x="41" y="30" width="18" height="6"/><rect x="38" y="8" width="24" height="22"/><path d="M38 14h24M38 24h24"/>',
            inn: '<path d="M28 100V43Q28 39 32 39H68Q72 39 72 43V100Z"/>', top: 62, bot: 100
        },
        {   /* flacon plat à épaules rondes */
            out: '<path d="M20 108V78C20 64 28 58 40 56H60C72 58 80 64 80 78V108Z"/><rect x="43" y="49" width="14" height="7"/><rect x="40" y="43" width="20" height="6"/><path d="M38 43V31Q38 23 50 23T62 31V43Z"/>',
            inn: '<path d="M23 105V78.5C23 67 30 61.5 41 59.5H59C70 61.5 77 67 77 78.5V105Z"/>', top: 74, bot: 105
        }
    ];
    var silId = 0;
    function jusPath(top, bot) {
        var d = '';
        for (var y = top; y < bot; y += 3) { d += 'M0 ' + y + 'H100'; }
        return d;
    }
    /* cls : classe du cadre ; avecJus : traits du jus (omis sur les petites vignettes) */
    function silhouette(i, cls, avecJus) {
        var s = SIL[(i < 0 ? 0 : i) % SIL.length];
        var d = el('div', cls || 'fiche__dessin');
        d.setAttribute('aria-hidden', 'true');
        var svg = '<svg viewBox="0 0 100 125" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round" stroke-linecap="round">';
        if (avecJus !== false) {
            var id = 'wp-jus-' + (++silId);
            svg += '<clipPath id="' + id + '">' + s.inn + '</clipPath><path class="jus" d="' + jusPath(s.top, s.bot) + '" clip-path="url(#' + id + ')"/>';
        }
        /* Dessin fixe écrit dans ce fichier : aucune donnée du visiteur */
        d.innerHTML = svg + '<g class="int">' + s.inn + '</g>' + s.out + '<path class="sol" d="M18 108h64"/></svg>';
        return d;
    }

    var PLAY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M10 8.5l5.5 3.5-5.5 3.5z"/></svg>';

    function currentFormat(p) {
        var fs = p.formats || [];
        for (var i = 0; i < fs.length; i++) { if (Number(fs[i].ml) === chosen[p.id]) { return fs[i]; } }
        return fs[0] || null;
    }

    function buildFiche(p, idx) {
        var li = el('li', 'collection__item');
        var art = el('article', 'fiche');
        var nom = nomAffiche(p);
        var formats = validFormats(p);
        if (!formats.length) { return null; }
        if (!currentFormat(p) || Number(currentFormat(p).ml) !== chosen[p.id]) { chosen[p.id] = Number(formats[0].ml); }

        /* Visuel vertical 4 / 5 : ouvre la fiche (le nom, juste dessous, porte le même lien pour le clavier et les lecteurs d'écran) */
        var visuel = el('a', 'fiche__visuel');
        visuel.href = hashOf(p.id);
        visuel.setAttribute('data-fiche', p.id);
        visuel.tabIndex = -1;
        visuel.setAttribute('aria-hidden', 'true');
        if (p.photo) {
            var img = document.createElement('img');
            img.src = String(p.photo);
            img.alt = '';
            img.width = 400; img.height = 500;
            img.loading = 'lazy'; img.decoding = 'async';
            img.addEventListener('error', function () { img.replaceWith(silhouette(idx, 'fiche__dessin', true)); });
            visuel.appendChild(img);
        } else {
            visuel.appendChild(silhouette(idx, 'fiche__dessin', true));
        }
        if (p.exemple && cfg().modeExemple) { visuel.appendChild(el('span', 'tag', t('col.tag'))); }
        visuel.appendChild(el('span', 'fiche__voir', t('col.fiche.voir')));
        var video = p.video ? String(p.video).trim() : '';
        art.appendChild(visuel);

        var maison = loc(p.maison);
        if (maison) { art.appendChild(el('p', 'fiche__maison', maison)); }
        var h = el('h3', 'fiche__nom');
        var lien = el('a', 'fiche__lien', loc(p.nom));
        lien.href = hashOf(p.id);
        lien.setAttribute('data-fiche', p.id);
        h.appendChild(lien);
        art.appendChild(h);
        var fam = loc(p.famille);
        if (fam) { art.appendChild(el('p', 'fiche__famille', fam)); }
        var notes = locList(p.notes);
        if (notes.length) { art.appendChild(el('p', 'fiche__notes', notes.join(', '))); }

        /* Achat : format, prix, bouton */
        var achat = el('div', 'fiche__achat');
        var fs = el('fieldset', 'fiche__formats');
        fs.appendChild(el('legend', 'sr-only', t('col.format.legende')));
        var prix = el('p', 'fiche__prix');
        prix.setAttribute('aria-live', 'polite');
        var btn = el('button', 'btn btn--block fiche__ajout', t('col.add'));
        btn.type = 'button';

        function refresh() {
            var f = currentFormat(p);
            prix.textContent = WP.euro(Number(f.prix), true);
            btn.setAttribute('aria-label', t('col.add.label', { nom: nom, ml: f.ml }));
        }
        formats.forEach(function (f) {
            var id = 'fmt-' + p.id + '-' + f.ml;
            var w = el('span', 'fmt');
            var r = document.createElement('input');
            r.type = 'radio'; r.name = 'fmt-' + p.id; r.id = id; r.value = String(f.ml);
            r.checked = Number(f.ml) === chosen[p.id];
            r.addEventListener('change', function () { chosen[p.id] = Number(f.ml); refresh(); });
            var lab = el('label', null, t('col.format.ml', { ml: f.ml }));
            lab.htmlFor = id;
            w.appendChild(r); w.appendChild(lab);
            fs.appendChild(w);
        });
        achat.appendChild(fs);
        achat.appendChild(prix);

        var timer = 0;
        btn.addEventListener('click', function () {
            var f = currentFormat(p);
            if (!WP.cart.add(p.id, f.ml)) { return; }
            btn.textContent = t('col.added');
            btn.classList.add('is-added');
            var st = document.getElementById('collection-statut');
            if (st) { st.textContent = ''; st.textContent = t('col.added.sr', { nom: nom, ml: f.ml }); }
            clearTimeout(timer);
            timer = setTimeout(function () { btn.textContent = t('col.add'); btn.classList.remove('is-added'); }, 1600);
        });
        achat.appendChild(btn);
        refresh();

        /* Vidéo : adresse http(s) = lien externe ; fichier du site = ouvre la fiche, où elle se lit */
        if (video) {
            var v;
            if (/^https?:\/\//i.test(video)) {
                v = document.createElement('a');
                v.href = video; v.target = '_blank'; v.rel = 'noopener';
                v.setAttribute('aria-label', t('col.video.externe', { nom: nom }));
            } else {
                v = document.createElement('button');
                v.type = 'button';
                v.setAttribute('aria-label', t('col.video.label', { nom: nom }));
                v.setAttribute('data-fiche', p.id);
            }
            v.className = 'link fiche__video';
            v.insertAdjacentHTML('afterbegin', PLAY);   /* icône fixe */
            v.appendChild(el('span', null, t('col.video')));
            achat.appendChild(v);
        }
        art.appendChild(achat);
        li.appendChild(art);
        return li;
    }

    function renderGrid() {
        var grille = document.getElementById('collection-grille');
        if (!grille) { return; }
        grille.textContent = '';
        (WP.parfums || []).forEach(function (p, i) {
            var li = buildFiche(p, i);
            if (li) { grille.appendChild(li); }
        });
        var vide = document.getElementById('collection-vide');
        if (vide) { vide.hidden = grille.children.length > 0; }
        var ex = document.getElementById('collection-exemple');
        if (ex) { ex.hidden = !cfg().modeExemple; }
    }

    /* ---------- API publique ---------- */
    WP.cart = {
        open: open, close: close, add: add, remove: remove, setQty: setQty,
        items: items, totals: totals, message: message, validate: validate
    };

    load();
    initDrawer();
    initFiche();
    renderGrid();
    updateCounts();
    render();

    document.addEventListener('wp:ready', updateCounts);
    document.addEventListener('wp:lang', function () {
        renderGrid();
        render();
        if (ui) { showErrors(ui.errs); }
        if (fo && fo.ouvert) { fill(fo.idx, true); }
    });
    document.addEventListener('wp:ready', onHash);                 /* lien direct : index.html#parfum-… */
    document.addEventListener('keydown', onKey);
})();
