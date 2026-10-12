import {requireAccount} from '@/lib/account';import {AppShell} from '@/components/app-shell';
export default async function PrivateLayout({children}:{children:React.ReactNode}){const {user}=await requireAccount();return <AppShell email={user.email??'Signed-in user'}>{children}</AppShell>}
