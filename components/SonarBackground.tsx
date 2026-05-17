export function SonarBackground() {
  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
      {/* Sonar rings */}
      <div className="absolute w-64 h-64 rounded-full border border-[#00d4ff]/30 animate-sonar-1" />
      <div className="absolute w-64 h-64 rounded-full border border-[#00d4ff]/20 animate-sonar-2" />
      <div className="absolute w-64 h-64 rounded-full border border-[#00d4ff]/10 animate-sonar-3" />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,212,255,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,212,255,0.3) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Radial gradient vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, transparent 30%, #040d1a 80%)",
        }}
      />
    </div>
  );
}
