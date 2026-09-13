import {
  AccountsListDesktopSkeleton,
  AccountsListMobileSkeleton,
} from "@/components/accounts-contacts/AccountsListSkeleton"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"

export default async function AccountsLoading() {
  const device = await getDashboardDevice()
  return device === "mobile" ? <AccountsListMobileSkeleton /> : <AccountsListDesktopSkeleton />
}
