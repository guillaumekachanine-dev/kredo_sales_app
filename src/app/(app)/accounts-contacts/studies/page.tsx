import { AccountsContactsView } from "@/components/accounts-contacts/AccountsContactsViews"
import { getAccountsContactsData } from "@/lib/accounts-contacts/accounts-contacts-data"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"

export const dynamic = "force-dynamic"

export default async function StudiesPage() {
  const device = await getDashboardDevice()
  const data = await getAccountsContactsData(device)

  return <AccountsContactsView data={data} device={device} activeTab="studies" />
}
