import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="min-h-dvh bg-[#101010] flex items-center justify-center px-4">
      {/* Subtle radial glow behind card */}
      <div
        className="pointer-events-none fixed inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(241,218,231,0.07) 0%, transparent 70%)",
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Logo / brand mark */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#F1DAE7]/10 border border-[#F1DAE7]/20 mb-5">
            <LeafIcon />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Nativa Hub
          </h1>
          <p className="mt-1.5 text-sm text-white/40">
            Sistema de gestión interno
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-[#1a1a1a] border border-white/8 p-8 shadow-2xl shadow-black/60">
          <div className="mb-6">
            <h2 className="text-lg font-medium text-white">Iniciar sesión</h2>
            <p className="mt-1 text-sm text-white/40">
              Ingresa tus credenciales para continuar
            </p>
          </div>

          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-white/20">
          © {new Date().getFullYear()} Nativa Juicery — Uso interno
        </p>
      </div>
    </main>
  );
}

function LeafIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M21 3C21 3 14 3 9 8C4 13 3 21 3 21C3 21 8 18 12 16C11 19 10 21 10 21C10 21 16 19 18 14C20 9 21 3 21 3Z"
        stroke="#F1DAE7"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 21L9 15"
        stroke="#F1DAE7"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
