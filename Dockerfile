# syntax=docker/dockerfile:1

# Front: build estático servido pelo próprio backend (mesma origem, sem CORS).
FROM docker.io/library/node:24-slim AS front
WORKDIR /src
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# Backend. A lib usa rustls + ring, então basta o compilador C da imagem.
FROM docker.io/library/rust:1.97-slim-trixie AS back
WORKDIR /src
# Dependências em uma camada própria (é ela que o cache da CI guarda): só recompilam quando o
# Cargo.lock ou o Cargo.toml muda.
COPY Cargo.toml Cargo.lock ./
COPY backend/Cargo.toml backend/
# waproto com os campos da figurinha com som (ver vendor/waproto/LEIA-ME.md).
COPY vendor/ vendor/
# - clean: tira só o programa vazio, para o de verdade ser compilado.
# - touch: o build script do waproto grava este arquivo depois do carimbo do cargo, que por isso
#   recompilaria toda a whatsapp-rust no passo seguinte.
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    mkdir backend/src && echo 'fn main() {}' > backend/src/main.rs \
    && cargo build --release --locked -p wpp-backend \
    && cargo clean --release -p wpp-backend \
    && rm -r backend/src \
    && find target -name whatsapp.local.desc -exec touch -d 2000-01-01 {} +
COPY backend/src/ backend/src/
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    cargo build --release --locked -p wpp-backend \
    && cp target/release/wpp-backend /usr/local/bin/wpp-backend

FROM docker.io/library/debian:trixie-slim
ARG DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 1000 wpp \
    && useradd --uid 1000 --gid wpp --no-create-home --shell /usr/sbin/nologin wpp \
    && mkdir /data && chown wpp:wpp /data
COPY --from=back /usr/local/bin/wpp-backend /usr/local/bin/wpp-backend
COPY --from=front /src/dist /app/frontend

# 0.0.0.0 só dentro do container; no host a porta fica em 127.0.0.1 (ver compose).
ENV WPP_DATA_DIR=/data \
    WPP_FRONT_DIR=/app/frontend \
    WPP_BIND=0.0.0.0 \
    WPP_PORT=8787 \
    RUST_LOG=info
USER wpp
VOLUME /data
EXPOSE 8787
ENTRYPOINT ["/usr/local/bin/wpp-backend"]
