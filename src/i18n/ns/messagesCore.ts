import fr from '../locales/fr/messagesCore.json'
import { defineNamespace } from '../core'

// The part of « messages » read by the first page's code (entry chunk): the
// rest stays with the lazy pages.
export default defineNamespace('messagesCore', fr)
