import { useState } from 'react'
import { useMutation } from '@apollo/client/react'
import Icon from './Icon'
import { UPDATE_PREFERENCES_JSON_MUTATION } from '../graphql/sellerTools'
import { clearInterests } from '../lib/interests'

// « Personnaliser mon accueil » (on by default): Dilchap adapts « Pépites à
// la Une », « Pour vous » and the « Pertinence » sort to the listings the
// member opens, saves, makes offers on or searches. Off: the profile kept
// for it is deleted on the server and nothing more is recorded.
export default function PersonalizeHomeSetting({ prefs, onSaved, onHelp, className = '' }: {
  prefs: Record<string, unknown> | null | undefined
  onSaved: (prefs: Record<string, unknown>) => void
  onHelp?: () => void
  className?: string
}) {
  const on = prefs?.personalizeHome !== false
  const [save, { loading }] = useMutation<{ updateNotificationPreferences: { notificationPreferences: Record<string, unknown> } }>(UPDATE_PREFERENCES_JSON_MUTATION)
  const [error, setError] = useState<string | null>(null)
  const toggle = () => {
    setError(null)
    void save({ variables: { preferences: { personalizeHome: !on } } })
      .then(({ data }) => {
        clearInterests(on)
        if (data) onSaved(data.updateNotificationPreferences.notificationPreferences)
      })
      .catch((e: Error) => setError(e.message))
  }
  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-xl bg-surface-container-low p-3 ${className}`}>
      <Icon name="auto_awesome" size={22} className="text-on-surface-variant" />
      <div className="min-w-[12rem] flex-1">
        <div className="text-label-md text-on-surface">Personnaliser mon accueil</div>
        <div className="text-body-sm text-on-surface-variant">
          {on
            ? 'L’accueil (« Pépites à la Une », « Pour vous ») et le tri « Pertinence » s’adaptent aux annonces que vous consultez, mettez en favori ou recherchez. Effacer votre historique remet ce profil à zéro.'
            : 'Désactivé : tout le monde voit le même accueil pour votre ville, et rien n’est retenu de vos consultations pour le classement.'}
          {onHelp && <> <button type="button" onClick={onHelp} className="cursor-pointer border-none bg-transparent p-0 text-label-md text-primary underline">En savoir plus</button></>}
        </div>
        {error && <div className="mt-1 text-body-sm text-primary">{error}</div>}
      </div>
      <button role="switch" aria-checked={on} aria-label="Personnaliser mon accueil" disabled={loading} onClick={toggle} className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full border-none p-0 transition-colors disabled:opacity-60 ${on ? 'bg-tertiary' : 'bg-surface-container-high'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  )
}
