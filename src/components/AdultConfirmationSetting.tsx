import { useState } from 'react'
import { useMutation } from '@apollo/client/react'
import Icon from './Icon'
import { ADULT_ACCESS_QUERY, REVOKE_ADULT_MUTATION, useAdultAccess } from '../lib/adult'
import { useMarketCode } from '../lib/countries'
import { fmtDate, useT } from '../i18n'
import adultNs from '../i18n/ns/adult'

// « Paramètres › Sécurité »: the member's « J'ai 18 ans ou plus » for the
// section Adultes, and « Retirer ma confirmation ».
export default function AdultConfirmationSetting() {
  const t = useT(adultNs)
  const access = useAdultAccess()
  const countryCode = useMarketCode()
  const [msg, setMsg] = useState('')
  const [revoke, { loading }] = useMutation(REVOKE_ADULT_MUTATION, {
    refetchQueries: [{ query: ADULT_ACCESS_QUERY, variables: { countryCode: countryCode ?? null } }],
    awaitRefetchQueries: true,
  })
  if (!access || (!access.confirmedAt && !access.enabled)) return null
  const date = access.confirmedAt
    ? fmtDate(access.confirmedAt, { day: 'numeric', month: 'long', year: 'numeric' })
    : null
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-surface-container-low p-3" data-testid="adult-setting">
      <Icon name="lock" size={22} className="text-on-surface-variant" />
      <div className="min-w-[12rem] flex-1">
        <div className="text-label-md text-on-surface">{t('sectionLabel')}</div>
        <div className="text-body-sm text-on-surface-variant">
          {date ? t('setting.confirmed', { date }) : t('setting.notConfirmed')}
        </div>
        {msg && <p className="m-0 mt-1 text-body-sm text-tertiary">{msg}</p>}
      </div>
      {date && (
        <button type="button" disabled={loading} onClick={() => void revoke().then(() => setMsg(t('setting.revoked'))).catch(e => setMsg(e instanceof Error ? e.message : t('setting.error')))}
          className="shrink-0 cursor-pointer rounded-lg border border-outline-variant bg-surface-lowest px-3 py-1.5 text-label-md text-on-surface disabled:opacity-50">
          {t('setting.revoke')}
        </button>
      )}
    </div>
  )
}
