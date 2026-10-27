import fr from '../locales/fr/searchCore.json'
import { defineNamespace } from '../core'

// The part of « search » read by the first page's code (entry chunk): the
// rest stays with the lazy pages.
export default defineNamespace('searchCore', fr)
