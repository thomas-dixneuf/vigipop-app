// Logo officiel Vigipop (public/logo.png, public/logo-slogan.png)
export default function Logo({ taille = 48, slogan = false }: { taille?: number; slogan?: boolean }) {
  return (
    <img
      src={slogan ? './logo-slogan.png' : './logo.png'}
      alt={slogan ? "Vigipop — Organiser l'imprévisible" : 'Vigipop'}
      width={taille}
      height={taille}
      style={{ borderRadius: taille / 4, display: 'block' }}
    />
  )
}
