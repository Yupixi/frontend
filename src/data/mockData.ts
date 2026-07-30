export type CategoryField = {
  key: string
  label: string
  type: 'text' | 'number' | 'select'
  options?: string[]
  required?: boolean
}

export type Category = {
  id: string
  name: string
  icon: string
  count: number
  color: string
  subcategories: string[]
  fields?: CategoryField[]
}

export type Listing = {
  id: string
  title: string
  price: number
  category: string
  subcategory: string
  location: string
  city: string
  image: string
  images: string[]
  description: string
  seller: Seller
  date: string
  views: number
  favorites: number
  sponsored: boolean
  condition: string
  negotiable: boolean
  delivery: boolean
  tags: string[]
}

export type Seller = {
  id: string
  name: string
  avatar: string
  verified: boolean
  rating: number
  reviews: number
  memberSince: string
  phone: string
  location: string
  listings: number
  responseRate: number
  responseTime: string
  badge?: string
}

export type Message = {
  id: string
  text: string
  sender: 'me' | 'other'
  time: string
  read: boolean
}

export type Conversation = {
  id: string
  seller: Seller
  listing: Listing
  messages: Message[]
  lastMessage: string
  lastTime: string
  unread: number
}

export type Notification = {
  id: string
  type: 'message' | 'favorite' | 'offer' | 'system' | 'payment'
  title: string
  body: string
  time: string
  read: boolean
  icon: string
}

export const categories: Category[] = [
  {
    id: 'emploi',
    name: 'Emploi',
    icon: '💼',
    count: 4230,
    color: '#6366F1',
    subcategories: ['Offres d\'emploi', 'Formations professionnelles'],
    fields: [
      { key: 'contrat', label: 'Type de contrat', type: 'select', options: ['CDI', 'CDD', 'Stage', 'Freelance', 'Apprentissage', 'CDI - Cadre', 'CDD - Cadre', 'Indépendant'], required: true },
      { key: 'secteur', label: 'Secteur d\'activité', type: 'select', options: ['Informatique', 'Commerce', 'Finance', 'Santé', 'Éducation', 'Industrie', 'Agriculture', 'Tourisme', 'Transport', 'BTP', 'Services', 'Autre'] },
      { key: 'niveauEtude', label: 'Niveau d\'étude requis', type: 'select', options: ['Aucun', 'CEP', 'BEPC', 'BAC', 'BAC+2', 'BAC+3', 'BAC+5', 'BAC+8 et plus'] },
      { key: 'experience', label: 'Expérience requise', type: 'select', options: ['Débutant', '1-2 ans', '3-5 ans', '5-10 ans', 'Plus de 10 ans'] },
      { key: 'salaire', label: 'Salaire proposé (FCFA)', type: 'text' },
    ],
  },
  {
    id: 'vehicules',
    name: 'Véhicules',
    icon: '🚗',
    count: 8320,
    color: '#F59E0B',
    subcategories: ['Voitures', 'Motos', 'Caravaning', 'Utilitaires', 'Camions', 'Nautisme', 'Équipement auto', 'Équipement moto'],
    fields: [
      { key: 'marque', label: 'Marque', type: 'text', required: true },
      { key: 'modele', label: 'Modèle', type: 'text', required: true },
      { key: 'annee', label: 'Année', type: 'number', required: true },
      { key: 'kilometrage', label: 'Kilométrage', type: 'number' },
      { key: 'carburant', label: 'Carburant', type: 'select', options: ['Essence', 'Diesel', 'Électrique', 'Hybride', 'GPL', 'Autre'] },
      { key: 'boite', label: 'Boîte de vitesse', type: 'select', options: ['Manuelle', 'Automatique', 'Séquentielle'] },
      { key: 'couleur', label: 'Couleur extérieure', type: 'text' },
    ],
  },
  {
    id: 'immobilier',
    name: 'Immobilier',
    icon: '🏠',
    count: 12450,
    color: '#3B82F6',
    subcategories: ['Ventes immobilières', 'Locations', 'Colocations', 'Bureaux & Commerces', 'Locations saisonnières'],
    fields: [
      { key: 'surface', label: 'Surface (m²)', type: 'number', required: true },
      { key: 'pieces', label: 'Nombre de pièces', type: 'select', options: ['Studio', '1', '2', '3', '4', '5', '6+'] },
      { key: 'etage', label: 'Étage', type: 'text' },
      { key: 'meuble', label: 'Meublé', type: 'select', options: ['Non meublé', 'Meublé', 'Semi-meublé'] },
    ],
  },
  {
    id: 'mode',
    name: 'Mode',
    icon: '👗',
    count: 9870,
    color: '#EC4899',
    subcategories: ['Vêtements', 'Chaussures', 'Accessoires & Bagagerie', 'Montres & Bijoux'],
    fields: [
      { key: 'taille', label: 'Taille', type: 'select', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', 'Taille unique'] },
      { key: 'marque', label: 'Marque', type: 'text' },
      { key: 'etat', label: 'État', type: 'select', options: ['Neuf avec étiquette', 'Neuf sans étiquette', 'Très bon état', 'Bon état', 'Satisfaisant'], required: true },
    ],
  },
  {
    id: 'loisirs',
    name: 'Loisirs',
    icon: '⚽',
    count: 5120,
    color: '#F97316',
    subcategories: ['Sport & Plein air', 'Vélos', 'Livres', 'CD - Musique', 'DVD - Films', 'Jeux & Jouets', 'Instruments de musique', 'Collection', 'Antiquités', 'Vins & Gastronomie', 'Loisirs créatifs', 'Modélisme'],
    fields: [
      { key: 'marque', label: 'Marque', type: 'text' },
      { key: 'etat', label: 'État', type: 'select', options: ['Neuf', 'Très bon état', 'Bon état', 'Satisfaisant'], required: true },
    ],
  },
  {
    id: 'animaux',
    name: 'Animaux',
    icon: '🐕',
    count: 2890,
    color: '#84CC16',
    subcategories: ['Animaux', 'Accessoires animaux'],
    fields: [
      { key: 'type', label: 'Type d\'animal', type: 'select', options: ['Chien', 'Chat', 'Oiseau', 'Poisson', 'Rongeur', 'Reptile', 'Cheval', 'Autre'], required: true },
      { key: 'race', label: 'Race', type: 'text' },
      { key: 'age', label: 'Âge', type: 'select', options: ['Bébé (0-6 mois)', 'Jeune (6-24 mois)', 'Adulte (2-7 ans)', 'Senior (7+ ans)'] },
      { key: 'sexe', label: 'Sexe', type: 'select', options: ['Mâle', 'Femelle'] },
    ],
  },
  {
    id: 'electronique',
    name: 'Électronique',
    icon: '📱',
    count: 15680,
    color: '#8B5CF6',
    subcategories: ['Ordinateurs', 'Accessoires informatique', 'Tablettes & Liseuses', 'Photo, audio & vidéo', 'Téléphones & Objets connectés', 'Accessoires téléphone', 'Consoles', 'Jeux vidéo'],
    fields: [
      { key: 'marque', label: 'Marque', type: 'text', required: true },
      { key: 'modele', label: 'Modèle', type: 'text', required: true },
      { key: 'etat', label: 'État', type: 'select', options: ['Neuf scellé', 'Neuf', 'Très bon état', 'Bon état', 'Pour pièces'], required: true },
      { key: 'stockage', label: 'Capacité de stockage', type: 'text' },
    ],
  },
  {
    id: 'services',
    name: 'Services',
    icon: '🔧',
    count: 7650,
    color: '#EF4444',
    subcategories: ['Cours particuliers', 'Services à la personne', 'Services de réparations', 'Services évènementiels', 'Baby-Sitting', 'Covoiturage', 'Billetterie', 'Artistes & Musiciens', 'Services de déménagement', 'Services aux animaux', 'Autres services'],
    fields: [
      { key: 'disponibilite', label: 'Disponibilité', type: 'select', options: ['Immédiate', 'Sur rendez-vous', 'Week-ends', 'Soirées', 'À définir'] },
      { key: 'tarif', label: 'Type de tarif', type: 'select', options: ['Forfait', 'À l\'heure', 'Au projet', 'Gratuit', 'À discuter'] },
    ],
  },
  {
    id: 'famille',
    name: 'Famille',
    icon: '🧸',
    count: 4670,
    color: '#FB923C',
    subcategories: ['Équipement bébé', 'Mobilier enfant', 'Vêtements bébé'],
    fields: [
      { key: 'age', label: 'Âge recommandé', type: 'select', options: ['0-3 mois', '3-6 mois', '6-12 mois', '12-24 mois', '2-4 ans', '4-8 ans', '8-12 ans', '12+ ans'] },
      { key: 'marque', label: 'Marque', type: 'text' },
      { key: 'etat', label: 'État', type: 'select', options: ['Neuf', 'Très bon état', 'Bon état', 'Satisfaisant'], required: true },
    ],
  },
  {
    id: 'maison',
    name: 'Maison & Jardin',
    icon: '🛋️',
    count: 6540,
    color: '#10B981',
    subcategories: ['Ameublement', 'Électroménager', 'Décoration', 'Arts de la table', 'Linge de maison', 'Papeterie', 'Bricolage', 'Jardin & Plantes'],
    fields: [
      { key: 'marque', label: 'Marque', type: 'text' },
      { key: 'etat', label: 'État', type: 'select', options: ['Neuf', 'Très bon état', 'Bon état', 'Satisfaisant'], required: true },
      { key: 'dimensions', label: 'Dimensions', type: 'text' },
    ],
  },
  {
    id: 'materiel-pro',
    name: 'Matériel Professionnel',
    icon: '🏭',
    count: 2340,
    color: '#64748B',
    subcategories: ['Tracteurs', 'Matériel agricole', 'BTP - Chantier', 'Poids lourds', 'Manutention', 'Équipements industriels', 'Équipements restauration & hôtels', 'Équipements de bureau', 'Matériel médical'],
    fields: [
      { key: 'marque', label: 'Marque', type: 'text', required: true },
      { key: 'modele', label: 'Modèle', type: 'text', required: true },
      { key: 'annee', label: 'Année', type: 'number' },
      { key: 'etat', label: 'État', type: 'select', options: ['Neuf', 'Très bon état', 'Bon état', 'Pour pièces'], required: true },
    ],
  },
  {
    id: 'agriculture',
    name: 'Agriculture',
    icon: '🌿',
    count: 3450,
    color: '#22C55E',
    subcategories: ['Plants & Semences', 'Équipements agricoles', 'Engrais & Fertilisants', 'Animaux de ferme', 'Produits frais', 'Terrains agricoles'],
    fields: [
      { key: 'type', label: 'Type', type: 'select', options: ['Vente', 'Recherche', 'Service', 'Conseil'] },
    ],
  },
  {
    id: 'divers',
    name: 'Divers',
    icon: '📦',
    count: 1200,
    color: '#94A3B8',
    subcategories: ['Autres'],
    fields: [],
  },
]

export const sellers: Seller[] = [
  {
    id: 's1',
    name: 'Kouamé Jean-Baptiste',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&auto=format',
    verified: true,
    rating: 4.8,
    reviews: 127,
    memberSince: 'Janvier 2021',
    phone: '+225 07 12 34 56',
    location: 'Cocody, Abidjan',
    listings: 23,
    responseRate: 98,
    responseTime: '< 1h',
    badge: 'Top Vendeur',
  },
  {
    id: 's2',
    name: 'Aya Koné',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&auto=format',
    verified: true,
    rating: 4.6,
    reviews: 84,
    memberSince: 'Mars 2022',
    phone: '+225 05 98 76 54',
    location: 'Plateau, Abidjan',
    listings: 15,
    responseRate: 95,
    responseTime: '< 2h',
  },
  {
    id: 's3',
    name: 'Diallo Ibrahim',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&auto=format',
    verified: false,
    rating: 4.2,
    reviews: 31,
    memberSince: 'Juin 2023',
    phone: '+225 01 23 45 67',
    location: 'Yopougon, Abidjan',
    listings: 8,
    responseRate: 87,
    responseTime: '< 5h',
  },
  {
    id: 's4',
    name: 'Bamba Mariam',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&auto=format',
    verified: true,
    rating: 4.9,
    reviews: 203,
    memberSince: 'Août 2020',
    phone: '+225 07 45 67 89',
    location: 'Marcory, Abidjan',
    listings: 42,
    responseRate: 99,
    responseTime: '< 30min',
    badge: 'Pro Certifié',
  },
]

export const listings: Listing[] = [
  {
    id: 'l1',
    title: 'iPhone 15 Pro Max 256Go - Comme neuf',
    price: 450000,
    category: 'electronique',
    subcategory: 'Téléphones',
    location: 'Cocody',
    city: 'Abidjan',
    image: 'https://images.unsplash.com/photo-1591337676887-a217a6970a8a?w=400&h=280&fit=crop&auto=format',
    images: [
      'https://images.unsplash.com/photo-1591337676887-a217a6970a8a?w=600&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1616348436168-de43ad0a1790?w=600&h=400&fit=crop&auto=format',
    ],
    description: 'iPhone 15 Pro Max en excellent état, utilisé seulement 3 mois. Toutes les fonctionnalités marchent parfaitement. Vendu avec boîte d\'origine, câble et chargeur. Batterie à 98%. Couleur Titane naturel.',
    seller: sellers[0],
    date: 'Il y a 2 heures',
    views: 342,
    favorites: 28,
    sponsored: true,
    condition: 'Très bon état',
    negotiable: true,
    delivery: true,
    tags: ['iPhone', 'Apple', 'Smartphone', 'iOS'],
  },
  {
    id: 'l2',
    title: 'Villa F5 avec piscine - Riviera Palmeraie',
    price: 95000000,
    category: 'immobilier',
    subcategory: 'Villas',
    location: 'Riviera Palmeraie',
    city: 'Abidjan',
    image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400&h=280&fit=crop&auto=format',
    images: [
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=600&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&h=400&fit=crop&auto=format',
    ],
    description: 'Superbe villa de 350m² avec piscine, 5 chambres, salon spacieux, cuisine américaine équipée, 2 garages, gardiennage 24h/24. Quartier résidentiel sécurisé.',
    seller: sellers[3],
    date: 'Il y a 1 jour',
    views: 1205,
    favorites: 89,
    sponsored: true,
    condition: 'Neuf',
    negotiable: true,
    delivery: false,
    tags: ['Villa', 'Piscine', 'Résidence', 'Luxe'],
  },
  {
    id: 'l3',
    title: 'Toyota RAV4 2021 - Full options',
    price: 18500000,
    category: 'vehicules',
    subcategory: 'Voitures',
    location: 'Plateau',
    city: 'Abidjan',
    image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&h=280&fit=crop&auto=format',
    images: [
      'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600&h=400&fit=crop&auto=format',
    ],
    description: 'Toyota RAV4 2021, 45 000 km, automatique, climatisation, GPS intégré, caméra de recul, sièges cuir. Entretien à jour. Premier propriétaire.',
    seller: sellers[1],
    date: 'Il y a 3 heures',
    views: 567,
    favorites: 41,
    sponsored: false,
    condition: 'Bon état',
    negotiable: true,
    delivery: false,
    tags: ['Toyota', 'RAV4', 'SUV', 'Automatique'],
  },
  {
    id: 'l4',
    title: 'MacBook Pro M3 14" - 16Go RAM',
    price: 1250000,
    category: 'electronique',
    subcategory: 'Ordinateurs',
    location: 'Marcory',
    city: 'Abidjan',
    image: 'https://images.unsplash.com/photo-1537495329792-41ae41b1bf9e?w=400&h=280&fit=crop&auto=format',
    images: [
      'https://images.unsplash.com/photo-1537495329792-41ae41b1bf9e?w=600&h=400&fit=crop&auto=format',
    ],
    description: 'MacBook Pro M3 2024, 16Go RAM, 512Go SSD. Acheté en janvier 2024. Batterie en parfait état. Vendu avec housse de protection et adaptateur.',
    seller: sellers[2],
    date: 'Il y a 5 heures',
    views: 234,
    favorites: 19,
    sponsored: false,
    condition: 'Très bon état',
    negotiable: false,
    delivery: true,
    tags: ['MacBook', 'Apple', 'Ordinateur', 'M3'],
  },
  {
    id: 'l5',
    title: 'Appartement F3 meublé - Cocody 2 Plateaux',
    price: 350000,
    category: 'immobilier',
    subcategory: 'Appartements',
    location: '2 Plateaux',
    city: 'Abidjan',
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=280&fit=crop&auto=format',
    images: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&h=400&fit=crop&auto=format',
    ],
    description: 'Bel appartement F3 entièrement meublé, climatisé, sécurisé. Loyer mensuel 350 000 FCFA charges comprises. Disponible immédiatement.',
    seller: sellers[0],
    date: 'Il y a 12 heures',
    views: 892,
    favorites: 67,
    sponsored: false,
    condition: 'Bon état',
    negotiable: false,
    delivery: false,
    tags: ['Location', 'Meublé', 'Climatisé', 'Sécurisé'],
  },
  {
    id: 'l6',
    title: 'Samsung Galaxy S24 Ultra - 512Go',
    price: 380000,
    category: 'electronique',
    subcategory: 'Téléphones',
    location: 'Yopougon',
    city: 'Abidjan',
    image: 'https://images.unsplash.com/photo-1610945264803-c22b62d2a7b3?w=400&h=280&fit=crop&auto=format',
    images: [],
    description: 'Samsung Galaxy S24 Ultra, 512Go, couleur Titanium Black. Très peu utilisé, comme neuf. Vendu avec accessoires complets.',
    seller: sellers[2],
    date: 'Il y a 1 jour',
    views: 178,
    favorites: 12,
    sponsored: false,
    condition: 'Comme neuf',
    negotiable: true,
    delivery: false,
    tags: ['Samsung', 'Galaxy', 'Android', 'Smartphone'],
  },
  {
    id: 'l7',
    title: 'Canapé d\'angle en cuir - Salon luxe',
    price: 850000,
    category: 'maison',
    subcategory: 'Ameublement',
    location: 'Treichville',
    city: 'Abidjan',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=280&fit=crop&auto=format',
    images: [],
    description: 'Canapé d\'angle en cuir véritable, couleur cognac, 7 places, très confortable. Livraison possible dans Abidjan.',
    seller: sellers[3],
    date: 'Il y a 2 jours',
    views: 98,
    favorites: 7,
    sponsored: false,
    condition: 'Très bon état',
    negotiable: true,
    delivery: true,
    tags: ['Canapé', 'Cuir', 'Salon', 'Mobilier'],
  },
  {
    id: 'l8',
    title: 'Terrain 600m² viabilisé - Bingerville',
    price: 12000000,
    category: 'immobilier',
    subcategory: 'Terrains',
    location: 'Bingerville',
    city: 'Abidjan',
    image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&h=280&fit=crop&auto=format',
    images: [],
    description: 'Terrain de 600m² entièrement viabilisé (eau, électricité, voie bitumée). Titre foncier disponible. Idéal pour construction résidentielle.',
    seller: sellers[1],
    date: 'Il y a 3 jours',
    views: 445,
    favorites: 33,
    sponsored: true,
    condition: 'N/A',
    negotiable: true,
    delivery: false,
    tags: ['Terrain', 'Titre Foncier', 'Viabilisé', 'Construction'],
  },
]

export const conversations: Conversation[] = [
  {
    id: 'c1',
    seller: sellers[0],
    listing: listings[0],
    lastMessage: 'Est-ce que le téléphone est toujours disponible ?',
    lastTime: 'Il y a 5 min',
    unread: 2,
    messages: [
      { id: 'm1', text: 'Bonjour ! Je suis intéressé par votre iPhone.', sender: 'me', time: '10:00', read: true },
      { id: 'm2', text: 'Bonjour ! Oui il est toujours disponible. Vous pouvez venir le voir à Cocody.', sender: 'other', time: '10:05', read: true },
      { id: 'm3', text: 'Est-ce que le prix est négociable ?', sender: 'me', time: '10:10', read: true },
      { id: 'm4', text: 'On peut discuter. Je peux faire 430 000 FCFA si vous venez le chercher aujourd\'hui.', sender: 'other', time: '10:12', read: true },
      { id: 'm5', text: 'Est-ce que le téléphone est toujours disponible ?', sender: 'other', time: '14:30', read: false },
    ],
  },
  {
    id: 'c2',
    seller: sellers[1],
    listing: listings[2],
    lastMessage: 'Le véhicule a fait 45 000 km exactement.',
    lastTime: 'Hier',
    unread: 0,
    messages: [
      { id: 'm1', text: 'Bonjour, quel est le kilométrage exact ?', sender: 'me', time: '09:00', read: true },
      { id: 'm2', text: 'Le véhicule a fait 45 000 km exactement.', sender: 'other', time: '09:30', read: true },
    ],
  },
  {
    id: 'c3',
    seller: sellers[3],
    listing: listings[4],
    lastMessage: 'Quand est-ce que l\'appartement sera disponible ?',
    lastTime: 'Lundi',
    unread: 1,
    messages: [
      { id: 'm1', text: 'Quand est-ce que l\'appartement sera disponible ?', sender: 'other', time: '14:00', read: false },
    ],
  },
]

export const notifications: Notification[] = [
  { id: 'n1', type: 'message', title: 'Nouveau message', body: 'Kouamé Jean-Baptiste vous a envoyé un message à propos de votre iPhone', time: 'Il y a 5 min', read: false, icon: '💬' },
  { id: 'n2', type: 'favorite', title: 'Nouvelle mise en favoris', body: 'Votre annonce "MacBook Pro M3" a été ajoutée aux favoris', time: 'Il y a 1h', read: false, icon: '❤️' },
  { id: 'n3', type: 'offer', title: 'Offre reçue', body: 'Vous avez reçu une offre de 420 000 FCFA pour votre iPhone 15 Pro', time: 'Il y a 2h', read: false, icon: '🏷️' },
  { id: 'n4', type: 'payment', title: 'Paiement confirmé', body: 'Votre paiement Mobile Money de 5 000 FCFA (boost annonce) a été confirmé', time: 'Hier', read: true, icon: '✅' },
  { id: 'n5', type: 'system', title: 'Annonce expirée', body: 'Votre annonce "Canapé en cuir" a expiré. Renouvelez-la pour plus de visibilité.', time: 'Hier', read: true, icon: '⏰' },
  { id: 'n6', type: 'system', title: 'Bienvenue sur Yüpixi !', body: 'Votre compte a été créé avec succès. Commencez à vendre ou acheter maintenant.', time: 'Il y a 3 jours', read: true, icon: '🎉' },
]

export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('fr-CI').format(price) + ' FCFA'
}

export const cities = [
  'Abidjan',
  'Abengourou',
  'Abobo',
  'Adjamé',
  'Adzopé',
  'Agboville',
  'Anyama',
  'Attécoubé',
  'Bingerville',
  'Bondoukou',
  'Bouaké',
  'Cocody',
  'Dabou',
  'Daloa',
  'Daoukro',
  'Divo',
  'Ferkessédougou',
  'Gagnoa',
  'Grand-Bassam',
  'Issia',
  'Korhogo',
  'Koumassi',
  'Man',
  'Marcory',
  'Odienné',
  'Plateau',
  'Port-Bouët',
  'San-Pédro',
  'Sassandra',
  'Séguéla',
  'Soubré',
  'Tiassalé',
  'Toumodi',
  'Treichville',
  'Yamoussoukro',
  'Yopougon',
]

export const viewStats = [
  { date: 'Lun', views: 120, contacts: 8 },
  { date: 'Mar', views: 185, contacts: 12 },
  { date: 'Mer', views: 143, contacts: 9 },
  { date: 'Jeu', views: 230, contacts: 18 },
  { date: 'Ven', views: 310, contacts: 24 },
  { date: 'Sam', views: 280, contacts: 20 },
  { date: 'Dim', views: 195, contacts: 14 },
]
