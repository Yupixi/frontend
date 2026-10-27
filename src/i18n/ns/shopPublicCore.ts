import fr from '../locales/fr/shopPublicCore.json'
import { defineNamespace } from '../core'

// The part of « shopPublic » read by the first page's code (entry chunk): the
// rest stays with the lazy pages.
export default defineNamespace('shopPublicCore', fr)
