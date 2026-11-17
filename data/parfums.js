/* parfums.js : la liste des parfums du site WebParfum.
   C'est le fichier qu'Adel remplit. Chaque parfum est un bloc { ... } séparé du suivant par une virgule.

   COMMENT AJOUTER UN PARFUM
   Copier un bloc entier, le coller à la suite (sans oublier la virgule entre deux blocs), puis changer :

   id          un identifiant court, sans espace ni accent, différent pour chaque parfum (ex. 'nom-du-parfum').
               Ne plus le changer une fois le site en ligne : le panier des visiteurs et le lien direct
               vers la fiche (index.html#parfum-nom-du-parfum, à mettre en bio TikTok) s'en servent.
   nom         le nom du parfum, entre apostrophes (ex. 'Nom du parfum').
               Si le nom change d'une langue à l'autre, écrire { fr: '…', en: '…' }.
   maison      la maison ou la marque, entre apostrophes. Laisser '' si on ne veut rien afficher.
   famille     la famille olfactive : { fr: 'boisé ambré', en: 'amber woody' }.
   description 2 ou 3 phrases courtes qui disent ce qu'on sent : { fr: '…', en: '…' }. Elle s'affiche dans la fiche
               ouverte quand on clique sur le parfum. Rien de plus qu'un fait ou une impression concrète.
   notes       les notes principales, 3 au plus : { fr: ['cèdre', 'ambre'], en: ['cedar', 'amber'] }.
               Elles s'affichent sur la carte, et dans la fiche si la pyramide ci-dessous n'est pas renseignée.
   pyramide    facultatif : la pyramide olfactive, pour une fiche plus complète. Si elle est présente, la fiche
               ouverte affiche « Tête / Cœur / Fond » à la place des notes simples :
               pyramide: { tete: { fr: ['bergamote'], en: ['bergamot'] },
                           coeur: { fr: ['iris'], en: ['iris'] },
                           fond: { fr: ['cèdre', 'ambre'], en: ['cedar', 'amber'] } }
               Laisser cette ligne de côté si l'on ne connaît pas la pyramide : les notes simples suffisent.
   photo       le chemin de la photo, rangée dans le dossier media/ (ex. 'media/mon-parfum.webp').
               Laisser '' : un dessin de flacon s'affiche à la place.
               Pour que la collection ait l'air d'une seule maison, toutes les photos suivent la même consigne :
                 - format vertical 4 par 5 ;
                 - le même fond pour tous les flacons (papier clair, ou le bois de la cave) ;
                 - lumière du jour ;
                 - le flacon centré, et à la même hauteur dans le cadre ;
                 - jamais une capture d'écran de TikTok.
   video       la vidéo du parfum, ajoutée quand elle est prête. Où la déposer : dans le dossier media/videos/
               (ex. 'media/videos/mon-parfum.mp4'). Format : vertical 9:16 (comme une vidéo TikTok), fichier MP4,
               moins de 15 Mo, sans musique protégée par des droits. Elle se lance toute seule, sans le son,
               à l'ouverture de la fiche, et le visiteur peut mettre le son. Laisser '' : la fiche montre le
               parfum en grand à la place de la vidéo, sans rien annoncer.
   poster      facultatif : une image d'attente de la vidéo (ex. 'media/videos/mon-parfum.webp'), vue le temps que
               la vidéo se charge. Sans elle, la fiche montre un fond uni.
   formats     les formats proposés et leur prix en euros : { ml: 5, prix: 13 }.
               ml = la contenance en millilitres, prix = le prix de ce format (avec un point pour les centimes : 13.50).
               On peut proposer 1, 2 ou 3 formats ; le premier de la liste est choisi par défaut.
   exemple     true pour une fiche d'exemple (une mention « Exemple » s'affiche). Supprimer cette ligne pour un vrai parfum.

   Quand tous les exemples sont remplacés par de vrais parfums, passer modeExemple à false dans data/config.js :
   la phrase « fiches et prix donnés à titre d'exemple » disparaît.

   Les six fiches ci-dessous sont des exemples : ni marque ni parfum réels, des descriptions d'exemple et des prix de démonstration. */
window.WP = window.WP || {};

WP.parfums = [
    {
        id: 'exemple-1',
        nom: { fr: 'Exemple nº 1', en: 'Example no. 1' },
        maison: '',
        famille: { fr: 'boisé ambré', en: 'amber woody' },
        notes: { fr: ['cèdre', 'ambre', 'vanille'], en: ['cedar', 'amber', 'vanilla'] },
        description: {
            fr: 'Texte d’exemple. Un bois de cèdre sec, posé sur une résine d’ambre tiède. La vanille reste en fond, sans sucre, comme une boiserie chauffée par le soleil.',
            en: 'Sample text. Dry cedarwood resting on warm amber resin. Vanilla stays in the base, without sugar, like panelling warmed by the sun.'
        },
        pyramide: {
            tete: { fr: ['cardamome'], en: ['cardamom'] },
            coeur: { fr: ['cèdre'], en: ['cedar'] },
            fond: { fr: ['ambre', 'vanille'], en: ['amber', 'vanilla'] }
        },
        photo: '',
        video: '',
        formats: [{ ml: 2, prix: 6 }, { ml: 5, prix: 13 }, { ml: 10, prix: 24 }],
        exemple: true
    },
    {
        id: 'exemple-2',
        nom: { fr: 'Exemple nº 2', en: 'Example no. 2' },
        maison: '',
        famille: { fr: 'iris poudré', en: 'powdery iris' },
        notes: { fr: ['iris', 'musc', 'santal'], en: ['iris', 'musk', 'sandalwood'] },
        description: {
            fr: 'Texte d’exemple. Une racine d’iris à la texture de poudre, adoucie par un musc propre. Le santal prolonge la peau sans la couvrir, comme un linge repassé.',
            en: 'Sample text. Iris root with a powdery texture, softened by a clean musk. Sandalwood lingers on the skin without covering it, like freshly pressed linen.'
        },
        photo: '',
        video: '',
        formats: [{ ml: 2, prix: 5 }, { ml: 5, prix: 11 }, { ml: 10, prix: 20 }],
        exemple: true
    },
    {
        id: 'exemple-3',
        nom: { fr: 'Exemple nº 3', en: 'Example no. 3' },
        maison: '',
        famille: { fr: 'cuir fumé', en: 'smoky leather' },
        notes: { fr: ['cuir', 'encens', 'tabac'], en: ['leather', 'incense', 'tobacco'] },
        description: {
            fr: 'Texte d’exemple. Un cuir sec, presque noirci, traversé par la fumée d’un encens. Le tabac apporte la chaleur de feuilles séchées.',
            en: 'Sample text. A dry, almost blackened leather crossed by incense smoke. Tobacco adds the warmth of dried leaves.'
        },
        photo: '',
        video: '',
        formats: [{ ml: 2, prix: 7 }, { ml: 5, prix: 15 }, { ml: 10, prix: 28 }],
        exemple: true
    },
    {
        id: 'exemple-4',
        nom: { fr: 'Exemple nº 4', en: 'Example no. 4' },
        maison: '',
        famille: { fr: 'hespéridé', en: 'citrus' },
        notes: { fr: ['bergamote', 'cédrat', 'vétiver'], en: ['bergamot', 'citron', 'vetiver'] },
        description: {
            fr: 'Texte d’exemple. Des zestes de bergamote et de cédrat, vifs et amers à l’ouverture. Le vétiver sec les ramène au sol, avec une note de racine fraîchement coupée.',
            en: 'Sample text. Zest of bergamot and citron, sharp and bitter on opening. Dry vetiver brings them back to earth, with the note of a freshly cut root.'
        },
        pyramide: {
            tete: { fr: ['bergamote', 'cédrat'], en: ['bergamot', 'citron'] },
            coeur: { fr: ['géranium'], en: ['geranium'] },
            fond: { fr: ['vétiver'], en: ['vetiver'] }
        },
        photo: '',
        video: '',
        formats: [{ ml: 2, prix: 5 }, { ml: 5, prix: 11 }, { ml: 10, prix: 20 }],
        exemple: true
    },
    {
        id: 'exemple-5',
        nom: { fr: 'Exemple nº 5', en: 'Example no. 5' },
        maison: '',
        famille: { fr: 'floral blanc', en: 'white floral' },
        notes: { fr: ['jasmin', 'tubéreuse', 'fleur d’oranger'], en: ['jasmine', 'tuberose', 'orange blossom'] },
        description: {
            fr: 'Texte d’exemple. Un bouquet de fleurs blanches, dense et crémeux. Le jasmin et la tubéreuse portent la chaleur de la corolle, la fleur d’oranger l’éclaire.',
            en: 'Sample text. A dense, creamy bouquet of white flowers. Jasmine and tuberose carry the warmth of the corolla, orange blossom brightens it.'
        },
        photo: '',
        video: '',
        formats: [{ ml: 2, prix: 6 }, { ml: 5, prix: 14 }, { ml: 10, prix: 26 }],
        exemple: true
    },
    {
        id: 'exemple-6',
        nom: { fr: 'Exemple nº 6', en: 'Example no. 6' },
        maison: '',
        famille: { fr: 'oud épicé', en: 'spiced oud' },
        notes: { fr: ['oud', 'safran', 'poivre rose'], en: ['oud', 'saffron', 'pink pepper'] },
        description: {
            fr: 'Texte d’exemple. Un bois d’oud résineux et sombre, relevé de filaments de safran. Le poivre rose donne de l’air au départ, puis le bois reprend la main.',
            en: 'Sample text. A dark, resinous oud wood lifted with saffron threads. Pink pepper gives it air at the start, then the wood takes over again.'
        },
        photo: '',
        video: '',
        formats: [{ ml: 2, prix: 8 }, { ml: 5, prix: 18 }, { ml: 10, prix: 34 }],
        exemple: true
    }
];
