// The UEMOA countries Dilchap serves, all in franc CFA (XOF). Static mirror
// of the backend facts (Backend src/common/countries.ts): forms and the
// country picker work with it until the `countries` query answers, and the
// query's values (edited in the Backoffice « Pays ») always win.

export type PaymentMethodCode = 'WAVE' | 'ORANGE_MONEY' | 'MTN_MOMO' | 'MOOV_MONEY' | 'FREE_MONEY' | 'T_MONEY' | 'AIRTEL_MONEY' | 'CASH'
export type ShopTaxId = 'NCC' | 'NINEA' | 'IFU' | 'NIF'

export type Country = {
  code: string
  name: string
  // « en Côte d’Ivoire », « au Sénégal »…
  inName: string
  flag: string
  dialCode: string
  // Digits of a national number (without the country code).
  localDigits: number
  phoneExample: string
  timeZone: string
  taxId: ShopTaxId
  taxIdLabel: string
  mainCity: string
  cities: string[]
  // Neighbourhoods of the main city.
  districts: string[]
  meetupSpots: { name: string, sub: string }[]
  // Payment methods between members, in the order shown.
  methods: PaymentMethodCode[]
  enabled: boolean
  // Buying credits by Mobile Money available in this country.
  payments: boolean
  seoTitle: string
  seoDescription: string
  supportPhone: string
  currency: string
  locale: string
}

type Facts = Omit<Country, 'meetupSpots' | 'enabled' | 'payments' | 'seoTitle' | 'seoDescription' | 'supportPhone' | 'currency' | 'locale'> & Partial<Country>

const country = (f: Facts): Country => ({
  meetupSpots: [], enabled: true, payments: false, seoTitle: '', seoDescription: '', supportPhone: '',
  currency: 'XOF', locale: `fr-${f.code}`, ...f,
})

export const COUNTRIES: Country[] = [
  country({
    code: 'CI', name: 'Côte d’Ivoire', inName: 'en Côte d’Ivoire', flag: '🇨🇮', dialCode: '225', localDigits: 10, phoneExample: '07 00 00 00 00',
    timeZone: 'Africa/Abidjan', taxId: 'NCC', taxIdLabel: 'Numéro de compte contribuable (NCC)', mainCity: 'Abidjan', payments: true,
    cities: ['Abidjan', 'Bouaké', 'Yamoussoukro', 'San-Pédro', 'Daloa', 'Korhogo', 'Man', 'Gagnoa'],
    districts: ['Cocody', 'Marcory', 'Plateau', 'Yopougon', 'Treichville', 'Koumassi', 'Adjamé', 'Abobo', 'Port-Bouët', 'Attécoubé', 'Bingerville', 'Songon', 'Anyama'],
    meetupSpots: [
      { name: 'Playce Marcory • Carrefour Duncan', sub: 'Zone commerciale ultra-fréquentée, parking gardé' },
      { name: 'Cap Sud Marcory • Entrée Principale', sub: 'Boulevard VGE, caméras & cafés à disposition' },
      { name: 'Playce Cocody Riviera • Espace Food', sub: 'Idéal pour les rendez-vous en journée' },
      { name: 'Sococé Deux-Plateaux • Galerie', sub: 'Galerie marchande, sécurité renforcée' },
      { name: 'Cosmos Yopougon • Hall principal', sub: 'Centre commercial éclairé et surveillé' },
    ],
    methods: ['WAVE', 'ORANGE_MONEY', 'MTN_MOMO', 'MOOV_MONEY', 'CASH'],
  }),
  country({
    code: 'SN', name: 'Sénégal', inName: 'au Sénégal', flag: '🇸🇳', dialCode: '221', localDigits: 9, phoneExample: '77 000 00 00',
    timeZone: 'Africa/Dakar', taxId: 'NINEA', taxIdLabel: 'NINEA', mainCity: 'Dakar',
    cities: ['Dakar', 'Thiès', 'Touba', 'Saint-Louis', 'Kaolack', 'Ziguinchor', 'Mbour', 'Rufisque'],
    districts: ['Plateau', 'Médina', 'Almadies', 'Ngor', 'Ouakam', 'Mermoz', 'Sacré-Cœur', 'Parcelles Assainies', 'Grand Yoff', 'Pikine', 'Guédiawaye'],
    methods: ['WAVE', 'ORANGE_MONEY', 'FREE_MONEY', 'CASH'],
  }),
  country({
    code: 'BJ', name: 'Bénin', inName: 'au Bénin', flag: '🇧🇯', dialCode: '229', localDigits: 10, phoneExample: '01 00 00 00 00',
    timeZone: 'Africa/Porto-Novo', taxId: 'IFU', taxIdLabel: 'Identifiant fiscal unique (IFU)', mainCity: 'Cotonou',
    cities: ['Cotonou', 'Porto-Novo', 'Abomey-Calavi', 'Parakou', 'Djougou', 'Bohicon', 'Natitingou', 'Lokossa'],
    districts: ['Akpakpa', 'Cadjèhoun', 'Fidjrossè', 'Gbégamey', 'Haie Vive', 'Zongo', 'Jonquet', 'Ganhi', 'Agla', 'Sainte-Rita'],
    methods: ['MTN_MOMO', 'MOOV_MONEY', 'CASH'],
  }),
  country({
    code: 'BF', name: 'Burkina Faso', inName: 'au Burkina Faso', flag: '🇧🇫', dialCode: '226', localDigits: 8, phoneExample: '70 00 00 00',
    timeZone: 'Africa/Ouagadougou', taxId: 'IFU', taxIdLabel: 'Identifiant financier unique (IFU)', mainCity: 'Ouagadougou',
    cities: ['Ouagadougou', 'Bobo-Dioulasso', 'Koudougou', 'Ouahigouya', 'Banfora', 'Kaya', 'Tenkodogo', 'Fada N’Gourma'],
    districts: ['Ouaga 2000', 'Koulouba', 'Gounghin', 'Dapoya', 'Zogona', 'Pissy', 'Tampouy', 'Patte d’Oie', 'Wemtenga', 'Kalgondin'],
    methods: ['ORANGE_MONEY', 'MOOV_MONEY', 'WAVE', 'CASH'],
  }),
  country({
    code: 'ML', name: 'Mali', inName: 'au Mali', flag: '🇲🇱', dialCode: '223', localDigits: 8, phoneExample: '70 00 00 00',
    timeZone: 'Africa/Bamako', taxId: 'NIF', taxIdLabel: 'Numéro d’identification fiscale (NIF)', mainCity: 'Bamako',
    cities: ['Bamako', 'Sikasso', 'Ségou', 'Kayes', 'Mopti', 'Koutiala', 'Kati', 'Gao'],
    districts: ['ACI 2000', 'Badalabougou', 'Hamdallaye', 'Hippodrome', 'Kalaban Coura', 'Magnambougou', 'Faladié', 'Lafiabougou', 'Djicoroni', 'Baco-Djicoroni'],
    methods: ['ORANGE_MONEY', 'MOOV_MONEY', 'WAVE', 'CASH'],
  }),
  country({
    code: 'TG', name: 'Togo', inName: 'au Togo', flag: '🇹🇬', dialCode: '228', localDigits: 8, phoneExample: '90 00 00 00',
    timeZone: 'Africa/Lome', taxId: 'NIF', taxIdLabel: 'Numéro d’identification fiscale (NIF)', mainCity: 'Lomé',
    cities: ['Lomé', 'Sokodé', 'Kara', 'Kpalimé', 'Atakpamé', 'Dapaong', 'Tsévié', 'Aného'],
    districts: ['Bè', 'Tokoin', 'Adidogomé', 'Agoè', 'Nyékonakpoè', 'Hédzranawoé', 'Baguida', 'Kodjoviakopé', 'Adakpamé', 'Djidjolé'],
    methods: ['T_MONEY', 'MOOV_MONEY', 'CASH'],
  }),
  country({
    code: 'NE', name: 'Niger', inName: 'au Niger', flag: '🇳🇪', dialCode: '227', localDigits: 8, phoneExample: '90 00 00 00',
    timeZone: 'Africa/Niamey', taxId: 'NIF', taxIdLabel: 'Numéro d’identification fiscale (NIF)', mainCity: 'Niamey',
    cities: ['Niamey', 'Zinder', 'Maradi', 'Agadez', 'Tahoua', 'Dosso', 'Tillabéri', 'Diffa'],
    districts: ['Plateau', 'Koira Kano', 'Yantala', 'Lazaret', 'Harobanda', 'Kouara Kano', 'Poudrière', 'Boukoki', 'Recasement', 'Talladjé'],
    methods: ['AIRTEL_MONEY', 'MOOV_MONEY', 'CASH'],
  }),
  country({
    code: 'GW', name: 'Guinée-Bissau', inName: 'en Guinée-Bissau', flag: '🇬🇼', dialCode: '245', localDigits: 9, phoneExample: '955 00 00 00',
    timeZone: 'Africa/Bissau', taxId: 'NIF', taxIdLabel: 'Numéro d’identification fiscale (NIF)', mainCity: 'Bissau',
    cities: ['Bissau', 'Bafatá', 'Gabú', 'Bissorã', 'Bolama', 'Cacheu', 'Canchungo', 'Farim'],
    districts: ['Bairro de Ajuda', 'Bandim', 'Belém', 'Chão de Papel', 'Cuntum', 'Missira', 'Plack', 'Reno', 'Santa Luzia', 'Bairro Militar'],
    methods: ['ORANGE_MONEY', 'MTN_MOMO', 'CASH'],
  }),
]

export const DEFAULT_COUNTRY = 'CI'
export const COUNTRY_CODES = COUNTRIES.map(c => c.code)
export const isCountryCode = (v: unknown): v is string => typeof v === 'string' && COUNTRY_CODES.includes(v)

export const CURRENCIES = ['XOF', 'EUR', 'USD'] as const

export function marketForCountry(countryCode: string | null | undefined) {
  return COUNTRIES.find(c => c.code === countryCode)
}

// XOF formats like Côte d'Ivoire (fr-CI), the first country of the list.
export function localeForCurrency(currency: string) {
  return COUNTRIES.find(c => c.currency === currency)?.locale ?? 'fr-FR'
}
