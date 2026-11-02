# WhatsApp Lite

Cliente de WhatsApp pessoal que roda no seu servidor e abre no navegador. O backend (Rust) fica
sempre conectado como um aparelho vinculado e guarda as conversas num SQLite próprio; a
interface lê desse banco, por isso abre na hora.

Para uma pessoa lendo e respondendo: sem bot, sem automação, sem envio em massa.

- Conversas, grupos, status e canais, com nomes da agenda e fotos de perfil.
- Imagens, vídeos, áudios e documentos baixados só quando você clica, e só na memória da aba.
- Responder, encaminhar, fixar, favoritar, apagar, arquivar, silenciar.
- Notificações no navegador, sem tirar as do celular.
- O QR de pareamento aparece na primeira tela.

Código, detalhes e tudo o que o app faz: [github.com/rillmind/wpp-raios-client](https://github.com/rillmind/wpp-raios-client).

> **Antes de usar:** clientes não oficiais violam os termos do WhatsApp e há risco de
> **suspensão do número**. O uso aqui (ler e responder à mão) é o de menor risco, mas não é zero.
> Pareie uma vez e guarde `data/whatsapp.db`; nunca rode duas instâncias com o mesmo `data/`.

## Rodar

`docker-compose.yaml`:

```yaml
services:
  wpp:
    image: docker.io/softfrost/wpp-lite:latest
    container_name: wpp-lite
    restart: unless-stopped
    user: "1000:1000"
    environment:
      RUST_LOG: info
    ports:
      # Só loopback: acesse por Tailscale, túnel SSH ou um proxy com TLS.
      - "127.0.0.1:8787:8787"
    volumes:
      # Sessão do WhatsApp, mensagens e config.toml. Nunca apague.
      - ./data:/data
    stop_grace_period: 30s
    read_only: true
    cap_drop: [ALL]
    security_opt:
      - no-new-privileges:true
```

```sh
mkdir -p data && sudo chown 1000:1000 data
docker compose up -d
```

1. Abra `http://127.0.0.1:8787` no servidor (ou pelo acesso remoto abaixo). O QR aparece na
   primeira tela: no celular, **WhatsApp → Aparelhos conectados → Conectar aparelho**.
2. A interface pede um token uma vez: `sudo cat data/config.toml`, campo `token`.

Atualizar: `docker compose pull && docker compose up -d`.

## Acesso de outros aparelhos

A porta só escuta em `127.0.0.1`. Com Tailscale no servidor:

```sh
sudo tailscale serve --bg 8787                              # https://<servidor>.<rede>.ts.net
sudo tailscale serve --bg --tcp=8787 tcp://127.0.0.1:8787   # http://<IP-tailscale>:8787
```

Prefira o endereço HTTPS: as notificações do navegador só funcionam nele. Não publique a porta
sem TLS: o token vai em toda requisição.

## Detalhes

- Imagem `linux/amd64`, roda sem root, com sistema de arquivos só de leitura; tudo fica em
  `/data`.
- Podman sem root: rode como root do container (que no rootless é o seu usuário), com
  `user: "0:0"`, e sem o `chown`.
- Variáveis: `RUST_LOG` (nível de log; em `info` não há conteúdo de mensagens) e `WPP_TOKEN`
  (sobrescreve o token do `config.toml`).
- Tags: `latest` (cada merge na `main`), `sha-<commit>` e, nas versões, `1.2.3` / `1.2`.
