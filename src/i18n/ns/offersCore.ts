import fr from '../locales/fr/offersCore.json'
import { defineNamespace } from '../core'

// The part of « offers » read by the first page's code (entry chunk): the
// rest stays with the lazy pages.
export default defineNamespace('offersCore', fr)
