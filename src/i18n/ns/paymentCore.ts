import fr from '../locales/fr/paymentCore.json'
import { defineNamespace } from '../core'

// The part of « payment » read by the first page's code (entry chunk): the
// rest stays with the lazy pages.
export default defineNamespace('paymentCore', fr)
