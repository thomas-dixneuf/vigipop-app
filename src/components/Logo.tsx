// Pastille provisoire : à remplacer par le logo officiel (public/logo.png)
export default function Logo({ taille = 48 }: { taille?: number }) {
  return (
    <img
      src="./favicon.svg"
      alt="Vigipop"
      width={taille}
      height={taille}
      style={{ borderRadius: taille / 4, display: 'block' }}
    />
  )
}
