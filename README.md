# Mapa China

Mapa compartilhado para adicionar pontos de interesse durante viagem. Sem login — quem tem a URL adiciona pontos com foto + localização.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind 4
- Mapbox GL JS
- Neon Postgres + Drizzle ORM
- Cloudflare R2 (fotos)

## Setup

1. **Neon**: crie projeto em https://neon.tech, copie `DATABASE_URL`.
2. **R2**: em https://dash.cloudflare.com → R2 → crie bucket (ex: `map-china`).
   - Habilite **Public Development URL** no bucket → copie URL (ex: `https://pub-xxx.r2.dev`).
   - Crie **API Token** com permissão R2 Read+Write → copie `Account ID`, `Access Key ID`, `Secret Access Key`.
   - **CORS do bucket** — adicione:
     ```json
     [
       {
         "AllowedOrigins": ["*"],
         "AllowedMethods": ["PUT", "GET"],
         "AllowedHeaders": ["*"],
         "MaxAgeSeconds": 3000
       }
     ]
     ```
3. Copie `.env.example` para `.env.local` e preencha.
4. Instale + migre + rode:
   ```bash
   npm install
   npm run db:push
   npm run dev
   ```

## Deploy (Vercel)

- Conecte repo na Vercel
- Adicione as mesmas env vars
- Deploy

## Uso

- Abre URL no celular
- Botão `+` abre câmera → tira foto
- Sistema lê GPS da foto (EXIF) ou usa geolocation do aparelho
- Preenche título, descrição, nome → salva
- Pin aparece no mapa → clicar mostra foto

## Nota China

Carto tiles normalmente funcionam. OSM pode estar lento/bloqueado. Use VPN se precisar.
