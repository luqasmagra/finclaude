import { useState, FormEvent, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../context/ToastContext';
import { Wallet, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

export function LoginPage() {
  const { signIn, signUp } = useAuth();
  const { addToast } = useToast();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = isSignup
        ? await signUp(email, password)
        : await signIn(email, password);

      if (error) {
        setError(error.message);
        addToast({
          type: 'error',
          title: 'Error de autenticación',
          message: error.message,
        });
      } else if (isSignup) {
        addToast({
          type: 'success',
          title: 'Cuenta creada',
          message: 'Revisa tu email para confirmar tu cuenta.',
        });
      }
    } catch {
      setError('Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignup(!isSignup);
    setError('');
    setEmail('');
    setPassword('');
    setShowPassword(false);
  };

  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Ambient orbs */}
      <div className="orb orb-1" aria-hidden="true" />
      <div className="orb orb-2" aria-hidden="true" />
      <div className="noise-overlay" aria-hidden="true" />

      <div className="w-full max-w-md px-4 relative z-10">
        {/* Logo y título */}
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 shadow-lg animate-fade-in-up"
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)', boxShadow: '0 20px 60px rgba(245, 158, 11, 0.35)' }}
            aria-hidden="true"
          >
            <Wallet size={30} className="text-black" />
          </div>
          <h1 className="text-4xl font-bold text-[#fafafa] mb-3 animate-fade-in-up stagger-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Finanzas
          </h1>
          <p className="text-[#71717a] text-sm animate-fade-in-up stagger-2">
            {isSignup
              ? 'Creá tu cuenta y empezá a gestionar tus finanzas'
              : 'Tu asistente financiero inteligente'}
          </p>
        </div>

        {/* Formulario */}
        <div
          className="glass rounded-3xl p-8 shadow-2xl animate-fade-in-up stagger-3"
          style={{ boxShadow: '0 25px 80px rgba(0, 0, 0, 0.6)' }}
        >
          <form onSubmit={handleSubmit} noValidate aria-label={isSignup ? 'Formulario de registro' : 'Formulario de ingreso'}>
            {/* Email */}
            <div className="mb-5">
              <label
                htmlFor="email"
                className="block text-xs font-medium text-[#a1a1aa] mb-2"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#71717a]" aria-hidden="true" />
                <input
                  id="email"
                  ref={emailRef}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="input w-full pl-11 pr-4 py-3.5 text-sm"
                  required
                  autoComplete="email"
                  aria-describedby={error ? 'form-error' : undefined}
                />
              </div>
            </div>

            {/* Password */}
            <div className="mb-6">
              <label
                htmlFor="password"
                className="block text-xs font-medium text-[#a1a1aa] mb-2"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Contraseña
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#71717a]" aria-hidden="true" />
                <input
                  id="password"
                  ref={passwordRef}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input w-full pl-11 pr-12 py-3.5 text-sm"
                  required
                  minLength={6}
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  aria-describedby={error ? 'form-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-[#71717a] hover:text-[#a1a1aa] transition-colors rounded-lg"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {isSignup && (
                <p className="text-[#71717a] text-xs mt-2">
                  Mínimo 6 caracteres
                </p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div
                id="form-error"
                className="text-sm text-[#ef4444] bg-[rgba(239,68,68,0.1)] px-4 py-3 rounded-xl mb-4 animate-fade-in-up"
                role="alert"
                aria-live="polite"
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-accent w-full py-3.5 text-sm flex items-center justify-center gap-2"
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  <span>Cargando...</span>
                </>
              ) : (
                <>
                  <span>{isSignup ? 'Crear cuenta' : 'Ingresar'}</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          {/* Toggle mode */}
          <div className="mt-6 pt-6 border-t border-[#27272a] text-center">
            <p className="text-sm text-[#71717a]">
              {isSignup ? '¿Ya tenés cuenta?' : '¿No tenés cuenta?'}
              {' '}
              <button
                type="button"
                onClick={toggleMode}
                className="text-[#f59e0b] hover:text-[#fbbf24] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f59e0b] focus-visible:ring-offset-2 focus-visible:ring-offset-[#141418] rounded"
              >
                {isSignup ? 'Ingresar' : 'Crear cuenta'}
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[#52525b] text-xs mt-8 animate-fade-in-up stagger-5">
          Tu información está segura y cifrada
        </p>
      </div>
    </main>
  );
}