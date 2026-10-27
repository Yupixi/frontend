import fr from '../locales/fr/myShopLabels.json'
import { defineNamespace } from '../core'

// Small labels of graphql/shops (reject reasons, promotion states): kept
// apart from the big myShop/shopPromos namespaces, as shops.ts also ships
// with the public shop pages.
export default defineNamespace('myShopLabels', fr)
