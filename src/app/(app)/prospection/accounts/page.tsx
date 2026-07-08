import { ProspectionAccountsView } from "@/components/accounts-contacts/AccountsContactsViews"
import { getAccountsContactsData } from "@/lib/accounts-contacts/accounts-contacts-data"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"

export const dynamic = "force-dynamic"

export default async function ProspectionAccountsPage() {
  const [device, data] = await Promise.all([
    getDashboardDevice(),
    getAccountsContactsData(),
  ])

  return <ProspectionAccountsView data={data} device={device} />
}
