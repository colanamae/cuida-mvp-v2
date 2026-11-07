import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Check, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type RegistrationState = { email?: string; needsConfirmation?: boolean };

/** Etapa final do cadastro: só é exibida depois de uma resposta sem erro do Supabase Auth. */
export function SignupSuccess() {
  const { state } = useLocation();
  const registration = (state ?? {}) as RegistrationState;
  const { user } = useAuth();
  const hasRegistrationResult = typeof registration.needsConfirmation === 'boolean';
  const ready = registration.needsConfirmation === false || (!!user && registration.needsConfirmation !== true);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => { titleRef.current?.focus(); }, []);

  return (
    <main className="signup-complete-shell">
      <section className="signup-complete-card" aria-labelledby="signup-complete-title">
        <div className="signup-complete-brand" aria-label="Cola">
          <div className="cola-mark" aria-hidden="true">
            <dotlottie-player src="/cola-animation.lottie" background="transparent" speed="1" autoplay loop></dotlottie-player>
          </div>
          <span>Cola</span>
        </div>
        <div className="signup-complete-symbol" aria-hidden="true">
          {ready ? <Check size={34} strokeWidth={2.2} /> : <Mail size={32} strokeWidth={1.9} />}
        </div>
        <span className="eyebrow">{ready ? 'JÁ ESTAMOS JUNTAS' : 'SÓ FALTA UM PASSINHO'}</span>
        <h1 id="signup-complete-title" ref={titleRef} tabIndex={-1}>
          {ready ? 'Você chegou. Que bom ter você aqui!' : hasRegistrationResult ? 'Colou! Agora é só conferir seu e-mail.' : 'Vamos confirmar seu e-mail?'}
        </h1>
        <p className="signup-complete-lead">
          {ready
            ? 'Sua conta está pronta. Bora começar a dividir o cuidado com quem faz parte da sua rede?'
            : hasRegistrationResult
              ? 'Recebemos seu pedido de cadastro. Para proteger sua conta, confira a confirmação no e-mail informado.'
              : 'Se você acabou de criar sua conta, confira seu e-mail para saber como continuar.'}
        </p>
        {!ready && registration.email && (
          <div className="signup-complete-email">
            <Mail size={18} aria-hidden="true" />
            <span>Confira a caixa de entrada de <strong>{registration.email}</strong>.</span>
          </div>
        )}
        {!ready && (
          <div className="signup-complete-next">
            <h2>Como a gente continua?</h2>
            <ol>
              <li>Abra o e-mail que você informou no cadastro.</li>
              <li>Procure a mensagem de confirmação da Cola.</li>
              <li>Toque no link e depois entre na sua conta.</li>
            </ol>
            <p>Não apareceu? Olhe também em Spam ou Lixo eletrônico. A mensagem pode levar alguns instantes.</p>
          </div>
        )}
        <Link to={ready ? '/' : '/entrar'} className="button primary signup-complete-action">
          {ready ? 'Ir para minha casa' : 'Ir para o login'}
        </Link>
        <div className="signup-complete-trust">
          <ShieldCheck size={18} aria-hidden="true" />
          <span>Cuidado compartilhado começa com confiança. Seus dados merecem respeito.</span>
        </div>
      </section>
    </main>
  );
}
