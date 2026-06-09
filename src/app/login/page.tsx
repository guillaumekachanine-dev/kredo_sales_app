import { LoginForm } from "./LoginForm"

interface LoginPageProps {
  searchParams: Promise<{ next?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        {/* Logo / marque */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold font-heading tracking-tight text-heading">
            KREDO
          </h1>
          <p className="mt-1 text-sm text-muted">
            Connectez-vous à votre espace
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <LoginForm next={next ?? "/cockpit"} />
        </div>
      </div>
    </div>
  )
}
