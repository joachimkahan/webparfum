/* config.js : les réglages du site WebParfum, à un seul endroit.
   Restent à fournir avant la mise en ligne : les liens des réseaux et les vraies fiches de parfums. */
window.WP = window.WP || {};

WP.config = {
    marque: 'WebParfum',
    dirigeant: 'Adel el gaied',
    ville: 'Grenoble',

    /* Numéro WhatsApp au format international, sans + ni espace.
       Confirmé le 16/11/2026 : 07 75 78 61 38. */
    whatsapp: '33775786138',
    telephoneAffiche: '07 75 78 61 38',
    email: 'adel.elgaied.ccst@gmail.com',

    /* Réseaux : laisser '' tant que le lien exact n'est pas fourni ; le lien ne s'affiche alors pas. */
    reseaux: {
        tiktok: '',
        instagram: '',
        facebook: ''
    },

    /* Livraison : 4,90 € de frais de port, offerts dès 50 € (confirmé le 16/11/2026). */
    fraisDePort: 4.90,
    livraisonOfferteDes: 50,

    /* true tant que les fiches et les prix sont des exemples : un bandeau le dit au visiteur. */
    modeExemple: true
};
