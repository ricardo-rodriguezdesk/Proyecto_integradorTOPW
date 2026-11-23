/**
 * Bandera que ondea: la imagen se corta en tiras verticales y cada tira
 * sube y baja con un pequeño retraso, más fuerte lejos del asta.
 * Encima va una capa de brillos y sombras que se desplaza como los pliegues.
 */
const SLICES = 32;

export default function FlagWave({ src, alt }) {
  if (!src) return null;
  return (
    <div className="flag-wave" role="img" aria-label={alt}>
      <span className="flag-pole" aria-hidden />
      <div className="flag-cloth" aria-hidden>
        {Array.from({ length: SLICES }, (_, i) => (
          <span
            key={i}
            className="flag-slice"
            style={{
              '--i': i,
              '--amp': `${(i / (SLICES - 1)) * 7 + 0.5}px`,
              backgroundImage: `url(${JSON.stringify(src)})`,
              backgroundSize: `${SLICES * 100}% 100%`,
              backgroundPosition: `${(i / (SLICES - 1)) * 100}% 0`,
            }}
          />
        ))}
        <span className="flag-shade" />
      </div>
    </div>
  );
}
