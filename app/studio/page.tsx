import StudioClient from './studio-client';

export default function StudioPage() {
  return (
    <>
      <StudioClient />
      <div className="boot-warning" role="alert">
        <strong>O estúdio não terminou de carregar.</strong> Se nada responde, rode <code>npm install</code> e <code>npm run dev</code> de novo e abra
        <code> http://localhost:3000/studio</code>. Veja também o console do navegador (F12).
      </div>
    </>
  );
}
