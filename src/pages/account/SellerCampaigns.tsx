import { useState } from 'react'
import { useQuery } from '@apollo/client/react'
import Icon from '../../components/Icon'
import { AccountLayout } from './AccountLayout'
import { CampaignJoin, CampaignsTab } from './ShopPromos'
import { MY_SHOP_LISTINGS_QUERY, MY_SHOP_QUERY, OPEN_CAMPAIGNS_QUERY, type MyShopData, type OpenCampaign, type PromoItem, type ShopListing } from '../../graphql/shops'
import type { AuthUser } from '../../graphql/auth'

type Props = { onNavigate: (p: any) => void; currentUser?: AuthUser | null; onLogout: () => void }

// Dilchap campaigns (Black Friday, fêtes…) for sellers with an active paid
// badge; official shops get the same tab in "Promotions & Soldes".
export default function SellerCampaigns({ onNavigate, currentUser, onLogout }: Props) {
  const shop = useQuery<MyShopData>(MY_SHOP_QUERY).data?.myShop.shop
  const official = !!shop?.isOfficial
  const eligible = !!currentUser?.badge || official
  const { data, refetch } = useQuery<{ openShopCampaigns: OpenCampaign[] }>(OPEN_CAMPAIGNS_QUERY, { skip: !eligible, fetchPolicy: 'cache-and-network' })
  const { data: listingsData } = useQuery<{ myListings: { items: ShopListing[] } }>(MY_SHOP_LISTINGS_QUERY, { skip: !eligible })
  const [joining, setJoining] = useState<{ campaign: OpenCampaign, retry?: PromoItem } | null>(null)
  const layout = (body: React.ReactNode) => (
    <AccountLayout active="seller-campaigns" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout} title="Campagnes Dilchap" onBack={joining ? () => setJoining(null) : undefined}>{body}</AccountLayout>
  )

  if (!eligible) return layout(
    <div className="mx-auto max-w-xl rounded-2xl bg-surface-lowest p-6 text-center shadow-sm">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-fixed text-primary"><Icon name="campaign" size={28} /></span>
      <h1 className="m-0 mt-3 text-headline-md text-on-surface">Campagnes Dilchap</h1>
      <p className="m-0 mt-2 text-body-md text-on-surface-variant">Black Friday, fêtes, rentrée… Inscrivez vos annonces aux campagnes organisées par Dilchap. Réservé aux Boutiques officielles et aux vendeurs avec un badge actif.</p>
      <button onClick={() => onNavigate('seller-badge')} className="mt-4 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary text-label-lg text-white"><Icon name="verified" size={19} fill /> Obtenir un badge</button>
    </div>,
  )

  const listings = listingsData?.myListings.items ?? []
  if (joining) return layout(
    <CampaignJoin key={joining.campaign.id + (joining.retry?.entryId ?? '')} campaign={joining.campaign} retry={joining.retry} listings={listings} aisles={[]} onDone={() => { setJoining(null); void refetch() }} onCancel={() => setJoining(null)} />,
  )
  return layout(<>
    <h1 className="m-0 text-headline-lg text-on-surface">Campagnes Dilchap</h1>
    <p className="m-0 mt-1 text-body-md text-on-surface-variant">Inscrivez vos annonces aux temps forts organisés par Dilchap. Chaque article est vérifié par l’équipe ; une campagne payante se règle seulement pour les articles acceptés.</p>
    <div className="mt-4">
      {data ? <CampaignsTab campaigns={data.openShopCampaigns} onJoin={(campaign, retry) => setJoining({ campaign, retry })} onChanged={() => void refetch()} /> : <div className="h-48 animate-pulse rounded-2xl bg-surface-container" />}
    </div>
  </>)
}
