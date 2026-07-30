export type Category = {
  id: string
  name: string
  icon: string
  count: number
  color: string
  subcategories: string[]
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
  { id: 'immobilier', name: 'Immobilier', icon: '🏠', count: 12450, color: '#3B82F6', subcategories: ['Appartements', 'Maisons', 'Terrains', 'Bureaux', 'Magasins', 'Villas'] },
  { id: 'vehicules', name: 'Véhicules', icon: '🚗', count: 8320, color: '#F59E0B', subcategories: ['Voitures', 'Motos', 'Camions', 'Bateaux', 'Engins', 'Pièces détachées'] },
  { id: 'electronique', name: 'Électronique', icon: '📱', count: 15680, color: '#8B5CF6', subcategories: ['Téléphones', 'Ordinateurs', 'TV & Audio', 'Appareils photo', 'Accessoires', 'Jeux vidéo'] },
  { id: 'mode', name: 'Mode & Beauté', icon: '👗', count: 9870, color: '#EC4899', subcategories: ['Vêtements femme', 'Vêtements homme', 'Chaussures', 'Sacs', 'Bijoux', 'Cosmétiques'] },
  { id: 'maison', name: 'Maison & Jardin', icon: '🛋️', count: 6540, color: '#10B981', subcategories: ['Meubles', 'Électroménager', 'Décoration', 'Jardinage', 'Bricolage', 'Literie'] },
  { id: 'emploi', name: 'Emploi', icon: '💼', count: 4230, color: '#6366F1', subcategories: ['CDI', 'CDD', 'Stage', 'Freelance', 'Formation', 'Apprentissage'] },
  { id: 'services', name: 'Services', icon: '🔧', count: 7650, color: '#EF4444', subcategories: ['Plomberie', 'Électricité', 'Nettoyage', 'Coiffure', 'Cuisine', 'Informatique'] },
  { id: 'loisirs', name: 'Loisirs & Sports', icon: '⚽', count: 5120, color: '#F97316', subcategories: ['Sports', 'Musique', 'Livres', 'Jeux', 'Voyages', 'Collection'] },
  { id: 'animaux', name: 'Animaux', icon: '🐕', count: 2890, color: '#84CC16', subcategories: ['Chiens', 'Chats', 'Oiseaux', 'Poissons', 'Accessoires', 'Alimentation'] },
  { id: 'agriculture', name: 'Agriculture', icon: '🌿', count: 3450, color: '#22C55E', subcategories: ['Plants', 'Équipements', 'Semences', 'Engrais', 'Animaux de ferme', 'Produits frais'] },
  { id: 'enfants', name: 'Enfants & Bébés', icon: '🧸', count: 4670, color: '#FB923C', subcategories: ['Vêtements', 'Jouets', 'Puériculture', 'Scolaire', 'Lit & Chambre', 'Activités'] },
  { id: 'materiel-pro', name: 'Matériel Pro', icon: '🏭', count: 2340, color: '#64748B', subcategories: ['BTP', 'Industrie', 'Restauration', 'Agriculture', 'Médical', 'Commerce'] },
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
    image: 'https://images.unsplash.com/photo-1695048133142-1a20484bce71?w=400&h=280&fit=crop&auto=format',
    images: [
      'https://images.unsplash.com/photo-1695048133142-1a20484bce71?w=600&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1591337676887-a217a6970a8a?w=600&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600&h=400&fit=crop&auto=format',
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
    image: 'https://images.unsplash.com/photo-1625231338679-ac2a9c9fd2ef?w=400&h=280&fit=crop&auto=format',
    images: [
      'https://images.unsplash.com/photo-1625231338679-ac2a9c9fd2ef?w=600&h=400&fit=crop&auto=format',
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
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca4?w=400&h=280&fit=crop&auto=format',
    images: [
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca4?w=600&h=400&fit=crop&auto=format',
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
    subcategory: 'Meubles',
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
  'Abidjan', 'Bouaké', 'Daloa', 'Korhogo', 'Yamoussoukro', 'San-Pédro',
  'Man', 'Divo', 'Gagnoa', 'Abengourou', 'Anyama', 'Agboville',
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
