/** Asterisco da Cola — representação vetorial da personagem no card de IA. */
export function ColaAsterisk({ size = 60 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" role="img" aria-label="Cola, a assistente">
      <g stroke="#D3AFFE" strokeWidth="24" strokeLinecap="round">
        <path d="M60 18V102" />
        <path d="M23.6 39L96.4 81" />
        <path d="M23.6 81L96.4 39" />
      </g>
      <ellipse cx="48" cy="65" rx="3.3" ry="5" fill="#2A0716" />
      <ellipse cx="72" cy="65" rx="3.3" ry="5" fill="#2A0716" />
      <path d="M53 75Q60 82 67 75" stroke="#2A0716" strokeWidth="3.5" strokeLinecap="round" />
      <ellipse cx="38" cy="73" rx="4" ry="2.7" fill="#FEB7B7" />
      <ellipse cx="82" cy="73" rx="4" ry="2.7" fill="#FEB7B7" />
    </svg>
  );
}
