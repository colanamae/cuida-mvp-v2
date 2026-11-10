export function ComingSoon() {
  return (
    <div
      style={{
        minHeight: "65vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "32px 20px",
        gap: "16px",
      }}
    >
      <img
        src="/florzinha.png"
        alt="Florzinha"
        style={{
          width: "110px",
          height: "110px",
          objectFit: "contain",
        }}
      />

      <h1
        style={{
          fontSize: "clamp(36px, 5vw, 56px)",
          margin: 0,
          color: "#3D102B",
        }}
      >
        Em breve!
      </h1>

      <p
        style={{
          fontSize: "17px",
          maxWidth: "420px",
          margin: 0,
          color: "#76536C",
        }}
      >
        Estamos preparando algo especial para você. Nosso cantinho está
        florescendo. ♡
      </p>
    </div>
  );
}
