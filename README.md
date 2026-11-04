# WhatsApp Lite

Cliente de WhatsApp pessoal que roda na sua máquina ou no seu servidor e abre no navegador.

## O que faz

- Fica conectado ao WhatsApp como um aparelho vinculado (como o WhatsApp Web) e grava as
  conversas num banco SQLite próprio. A interface lê desse banco, por isso abre na hora.
- Lista as conversas por atividade, com as fixadas no celular no topo (com um alfinete) e um sino
  cortado nas silenciadas, o
  contador de não lidas e, quando a última mensagem é sua, os tiques
  dela (✓ enviada, ✓✓ entregue, ✓✓ azul lida). Em grupos a prévia diz quem mandou a última
  mensagem ("Carlos: …", "Você: …").
- Uma barra lateral separa **Conversas**, **Status**, **Canais** e **Arquivadas** (com o número de
  conversas não lidas, ou um ponto nas outras seções); no celular ela fica embaixo. No fim dela, um
  pontinho mostra a conexão: verde conectado, amarelo conectando ou servidor desconectado, vermelho
  sessão encerrada; passar o mouse (ou tocar, no celular) mostra o texto. Logo depois dele fica o
  botão de **configurações**, com as opções que valem para este navegador. O botão de Status abre direto a conversa do Status. Status e
  canais são só de leitura: daqui não dá para postar um status nem escrever num canal.
- Busca, no topo da lista, conversas pelo nome (ou número) e mensagens pelo texto, sem ligar para
  maiúsculas nem acentos, em tudo o que já está guardado no servidor (não pergunta ao celular).
  Clicar numa mensagem achada abre a conversa nela, piscando; Esc limpa a busca.
- Mostra o nome de cada contato como está na agenda do seu celular; sem nome salvo, o nome que a
  pessoa definiu no WhatsApp; sem nenhum dos dois, o número. Em grupos, mostra quem mandou cada
  mensagem, cada pessoa numa cor (as 14 cores de destaque do Catppuccin, sorteadas ao abrir a
  conversa; uma cor só se repete com mais de 14 pessoas) e com a foto de perfil dela ao lado da
  primeira mensagem de cada sequência. As marcações (`@`) aparecem com o nome
  da pessoa, destacadas, e com fundo quando quem foi marcado é você (inclusive o "@todos", que
  marca o grupo inteiro). Clicar no nome de quem
  mandou ou numa marcação abre a conversa com a pessoa; se ainda não houver, abre uma vazia, que
  entra na lista na primeira mensagem. Telefones escritos nas mensagens (com `+DDI`, ou brasileiros
  com DDD, como `(11) 99999-8888`) também são clicáveis: o app confere no WhatsApp se o número
  tem conta e abre a conversa com ele.
  Links (`https://…`, `www.…`) abrem numa aba nova do navegador.
- Mostra as fotos de perfil, que carregam sozinhas.
- No topo da conversa aberta mostra quando a pessoa está **digitando…** ou **gravando áudio…** (em
  grupos, quem), **online** ou o "visto por último", quando ela deixa mostrar; o "digitando…" aparece
  também na lista. Só o dos outros: o app nunca avisa que você está digitando.
- Imagens, figurinhas, vídeos, áudios e documentos aparecem como um botão com o tamanho do
  arquivo (e a duração, em vídeo e áudio); só são baixados do WhatsApp quando você clica. Imagem
  abre na conversa (clique para ampliar); vídeo e áudio começam a tocar no player do navegador;
  documento o navegador oferece para salvar. Ficam só na memória da aba: nada vai para o disco
  nem para o banco (o banco guarda só a referência para baixar). Fechou a aba, sumiram.
  Figurinhas animadas vetoriais aparecem como `[figurinha]`, e mídias recebidas antes desta versão
  como `[imagem]`, `[vídeo]` etc.
- Abre a conversa na primeira mensagem não lida, com um separador, e com a caixa de mensagem já
  selecionada (em telas de toque não, para não abrir o teclado). O Esc vai um passo por vez:
  fecha a imagem ampliada, desmarca a mensagem marcada para responder, tira o cursor da caixa de
  mensagem e, por fim, fecha a conversa e volta à tela inicial.
- Atalhos de teclado: **Ctrl+K** (⌘K no Mac) vai para a busca; **Alt+↑** e **Alt+↓** abrem a
  conversa de cima ou de baixo na lista da seção aberta.
- Notificações no navegador (o sino na barra lateral), com a aba aberta, mesmo em segundo
  plano. O celular continua tocando e vibrando normalmente: a notificação do app vem logo depois
  e não muda nada do que o WhatsApp manda para ele. Não notifica conversas silenciadas, arquivadas,
  status, canais nem a conversa que você está olhando; clicar abre a conversa. Só funciona pelo endereço
  HTTPS (por exemplo o do `tailscale serve`), não por `http://`.
- Instala no celular como app (PWA): pelo endereço HTTPS, no Chrome do Android **⋮ → Instalar
  app** (ou "Adicionar à tela inicial"), no iPhone **Compartilhar → Adicionar à Tela de Início**.
  Abre em tela cheia, sem barra de endereço, com ícone próprio.
- O número de conversas não lidas aparece no ícone do app instalado (onde o sistema mostra) e no
  título da aba, como "(3) WhatsApp Lite"; silenciadas e arquivadas não contam. Atualiza enquanto o
  app está aberto, mesmo em segundo plano.
- Envia imagens, vídeos e documentos: pelo clipe ao lado da caixa de mensagem ou colando
  (Ctrl+V) uma imagem ou arquivo copiado, como um print. Os arquivos aparecem antes de enviar (dá
  para tirar), o texto escrito vira a legenda do primeiro, e vão ao clicar em "Enviar". JPEG e PNG
  vão como foto, MP4 como vídeo e o resto (inclusive GIF) como documento, até 100 MB.
- Grava e manda mensagem de voz: com a caixa vazia, o botão de enviar vira um microfone. Segurar e
  soltar envia; um toque rápido começa a gravar e mostra o tempo, com a lixeira para descartar (ou Esc) e
  "Enviar". Chega como áudio gravado na hora (com a forma de onda), igual ao do celular; menos de
  1 segundo é descartado. Precisa do endereço HTTPS (o navegador só libera o microfone nele).
- Rascunho por conversa: o que você escreveu e não mandou continua lá quando volta para a conversa
  (e aparece na lista como "Rascunho: …"). Fica só nesta aba do navegador: sobrevive a recarregar a
  página e some ao fechar a aba; não vai para o servidor.
- Envia mensagens de texto. No computador, Enter envia e Shift+Enter quebra linha; no celular,
  Enter quebra linha, só o botão "Enviar" envia, e o teclado continua aberto depois do envio. Cada conversa tem o seu
  rascunho: trocar de conversa não leva o texto junto.
- Botão direito numa conversa da lista (toque longo no Android) abre um menu para arquivar ou
  desarquivar, fixar ou desafixar, silenciar (8 horas, 1 semana ou para sempre) ou reativar o som
  e marcar como lida ou não lida. Fixar, silenciar e lida/não lida valem também no celular.
  Arquivar fica só no app: o que você arquiva ou desarquiva aqui não muda o celular, e uma
  conversa arquivada aqui só sai das arquivadas quando você desarquiva aqui. O que você arquiva no
  celular também aparece arquivado aqui. Apagar ou limpar uma conversa no celular apaga ou limpa
  aqui também (só o que tinha chegado até ali; mensagens que chegarem depois ficam). Apagar ou limpar conversa não existe aqui, de propósito.
- Dois cliques numa mensagem, ou no espaço ao lado dela até a borda (toque duplo no celular),
  marcam a mensagem para responder.
- Botão direito numa mensagem (toque longo no Android) abre: responder (citando a mensagem),
  copiar, copiar código (quando a mensagem tem um código de verificação), encaminhar (para até 5
  conversas, sem baixar e reenviar o arquivo), fixar por 24 horas, 7 ou 30 dias, favoritar,
  excluir para mim, excluir para todos (suas mensagens, até cerca de 2 dias e meio) e denunciar ao
  WhatsApp (as recebidas). Excluir e denunciar pedem confirmação. Tudo vale também no celular. A
  mensagem fixada aparece no topo da conversa e as favoritadas ganham uma estrela. Mensagens que a
  pessoa apaga para todos viram "Mensagem apagada" aqui também.
- Reações: os emojis aparecem embaixo da mensagem, com quantas pessoas reagiram (passar o mouse
  mostra quem). No topo do menu da mensagem ficam as reações rápidas (👍 ❤️ 😂 😮 😢 🙏); clicar num
  emoji embaixo da mensagem reage com ele, e clicar de novo na sua reação a tira. Vale também no
  celular e para quem mandou.
- Editar: nas suas mensagens de texto, até 15 minutos depois de enviar, "Editar" no menu da
  mensagem põe o texto dela na caixa; "Salvar" troca para todos (Esc ou × cancela e devolve o que
  você estava escrevendo). Mensagens editadas, aqui ou por quem mandou, mostram "editada" ao lado
  da hora, já com o texto novo.
- Ao abrir uma conversa, marca as mensagens como lidas (o contato vê os tiques azuis e o contador
  zera no celular também). Com a opção **"Não visualizar ao abrir"** marcada, nas configurações,
  abrir não marca nada: só o botão "Marcar como lida" faz isso. O que você lê no celular também
  aparece como lido aqui.
- Só aparece como "online" para o WhatsApp enquanto você lê uma conversa no app (aba em foco,
  conversa aberta, mexendo nos últimos 2 minutos). Fora disso, as notificações tocam e vibram no
  celular normalmente, mesmo com o servidor ligado. Enquanto está online, o WhatsApp deixa de
  vibrar o celular para todas as conversas, não só a aberta.
- Guarda o que chega a partir do pareamento, e tudo o que já foi carregado fica guardado. Na
  primeira vez, cada conversa mostra só as mensagens não lidas; sem nenhuma, abre vazia com o
  botão "Carregar mensagens". O botão mostra as 20 anteriores, pedindo ao celular o que não
  estiver guardado (o celular precisa estar ligado e com internet; chegam em alguns segundos), e
  cada clique traz mais 20. O que foi carregado continua aparecendo nas próximas vezes.
- Mensagens de visualização única aparecem como um aviso para abrir no celular: o WhatsApp não
  entrega o conteúdo delas a aparelhos conectados (o mesmo acontece no WhatsApp Web).

## Por que existe

O WhatsApp Web demora para abrir e sincronizar. Aqui o backend fica sempre conectado e a
interface é leve, então abrir para ler e responder é instantâneo. É para uma pessoa lendo e
respondendo: sem bot, sem automação, sem envio em massa (há limite de envios por segundo).

## Antes de usar

- Clientes não oficiais violam os termos do WhatsApp; existe risco de **suspensão do número**.
  O uso aqui (ler e responder à mão) é o de menor risco, mas não é zero. Se puder, teste antes
  com um número secundário.
- **Pareie uma vez.** A sessão fica em `data/whatsapp.db`: faça backup e **nunca o apague**.
  Parear e desparear repetidamente chama atenção.
- **Nunca rode duas instâncias com o mesmo `data/`** (ex.: o serviço e o `cargo run`): o
  WhatsApp pode derrubar a sessão.

## Como rodar

Em todos os jeitos abaixo, no primeiro início o QR de pareamento aparece na primeira tela da
interface (e também no terminal ou nos logs). No celular: **WhatsApp → Aparelhos conectados →
Conectar aparelho**. Depois disso ele reconecta sozinho e o QR não aparece mais. A interface pede
um token uma vez: é o campo `token` de `data/config.toml`.

### Docker (servidor)

No servidor basta o [`docker-compose.yaml`](docker-compose.yaml); a imagem vem do Docker Hub
([`softfrost/wpp-lite`](https://hub.docker.com/r/softfrost/wpp-lite), amd64).

```sh
mkdir -p data && sudo chown 1000:1000 data
docker compose up -d
docker compose logs -f                       # QR do primeiro pareamento
docker compose pull && docker compose up -d  # atualizar
```

Abre em `http://127.0.0.1:8787` no servidor. A porta só escuta em loopback; para acessar de
outra máquina use um túnel SSH (`ssh -L 8787:127.0.0.1:8787 servidor` e abra
`http://127.0.0.1:8787`) ou um proxy com TLS / Tailscale. Não publique a porta sem TLS: o token
vai em toda requisição.

**Podman rootless:** o usuário 1000 do container não é o seu no host e ele falha com
`Permission denied`. Rode como root do container (que no rootless é o seu próprio usuário, sem
privilégio extra), sem `chown`:

```sh
printf 'WPP_UID=0\nWPP_GID=0\n' > .env
podman compose up -d
```

Variáveis do compose: `WPP_TAG` (`latest`), `WPP_HOST_PORT` (`8787`), `WPP_UID`/`WPP_GID`
(`1000`), `RUST_LOG` (`info`).

**Levar uma sessão já pareada** (sem novo QR): pare a instância antiga, copie o diretório
inteiro (`rsync -a data/ servidor:wpp-lite/data/`), ajuste o dono (`sudo chown -R 1000:1000
data`) e suba.

### Serviço do usuário (systemd)

Precisa de Rust estável (testado com 1.97) e Node 20+.

```sh
scripts/install-service.sh
journalctl --user -u wpp-lite -f      # QR do primeiro pareamento
```

Instala em `~/.local/share/wpp-lite/` (binário, interface e `data/`) e abre em
`http://127.0.0.1:8787`. Reinicia sozinho se cair.

### Desenvolvimento

```sh
RUST_LOG=info,wpp_backend=debug cargo run          # backend, cria data/config.toml
cd frontend && npm install && npm run dev          # interface em http://127.0.0.1:5173
scripts/check.sh                                   # fmt, clippy, testes, lint e build
```

### Configuração

`data/config.toml` é criado no primeiro início (permissão 600). Variáveis de ambiente
sobrescrevem:

| Campo | Env | Padrão | |
| --- | --- | --- | --- |
| — | `WPP_DATA_DIR` | `data` | diretório da config e dos bancos |
| `port` | `WPP_PORT` | `8787` | porta da API e da interface |
| — | `WPP_BIND` | `127.0.0.1` | endereço de escuta; `0.0.0.0` só dentro de container |
| `token` | `WPP_TOKEN` | aleatório | token de acesso |
| `front_origin` | `WPP_FRONT_ORIGIN` | `http://127.0.0.1:5173` | origem aceita no CORS (dev) |
| `front_dir` | `WPP_FRONT_DIR` | — | serve o build da interface na mesma porta |
| `send_per_sec` | — | `2` | limite de envios por segundo |

Backup, troca de número, API e CI: [`docs/OPERACAO.md`](docs/OPERACAO.md).
