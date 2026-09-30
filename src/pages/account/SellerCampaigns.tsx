import { useState } from 'react'
import { useQuery } from '@apollo/client/react'
import { AccountLayout } from './AccountLayout'
import HelpLink from '../../components/HelpLink'
import { CampaignJoin, CampaignsTab } from './ShopPromos'
import { MY_SHOP_LISTINGS_QUERY, OPEN_CAMPAIGNS_QUERY, type OpenCampaign, type PromoItem, type ShopListing } from '../../graphql/shops'
import type { AuthUser } from '../../graphql/auth'

type Props = { onNavigate: (p: any) => void; currentUser?: AuthUser | null; onLogout: () => void }

// « Campagnes Dilchap » (Black Friday, fêtes…) for every seller: each open
// campaign says whether this seller may register or exactly what they lack
// — who may take part is set by the Dilchap team campaign by campaign and
// checked by the server. Official shops get the same tab in « Promotions &
// Soldes ».
export default function SellerCampaigns({ onNavigate, currentUser, onLogout }: Props) {
  const { data, refetch } = useQuery<{ openShopCampaigns: OpenCampaign[] }>(OPEN_CAMPAIGNS_QUERY, { fetchPolicy: 'cache-and-network' })
  const { data: listingsData } = useQuery<{ myListings: { items: ShopListing[] } }>(MY_SHOP_LISTINGS_QUERY)
  const [joining, setJoining] = useState<{ campaign: OpenCampaign, retry?: PromoItem } | null>(null)
  const layout = (body: React.ReactNode) => (
    <AccountLayout active="seller-campaigns" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout} title="Campagnes Dilchap" onBack={joining ? () => setJoining(null) : undefined}>{body}</AccountLayout>
  )

  const listings = listingsData?.myListings.items ?? []
  if (joining) return layout(
    <CampaignJoin key={joining.campaign.id + (joining.retry?.entryId ?? '')} campaign={joining.campaign} retry={joining.retry} listings={listings} aisles={[]} onDone={() => { setJoining(null); void refetch() }} onCancel={() => setJoining(null)} />,
  )
  return layout(<>
    <h1 className="m-0 text-headline-lg text-on-surface">Campagnes Dilchap</h1>
    <p className="m-0 mt-1 text-body-md text-on-surface-variant">Black Friday, fêtes, rentrée… Inscrivez vos annonces aux temps forts organisés par Dilchap. Chaque campagne a ses propres conditions : vous voyez ci-dessous si vous pouvez vous inscrire, ou ce qu’il vous manque. <HelpLink article="promotions-et-campagnes" className="ml-1 align-middle" /></p>
    <div className="mt-4">
      {data ? <CampaignsTab campaigns={data.openShopCampaigns} onJoin={(campaign, retry) => setJoining({ campaign, retry })} onChanged={() => void refetch()} onNavigate={onNavigate} /> : <div className="h-48 animate-pulse rounded-2xl bg-surface-container" />}
    </div>
  </>)
}
