//! Configuração: `<data_dir>/config.toml`, sobrescrita por variáveis de ambiente.
//!
//! Na primeira execução o arquivo é criado com um token de API aleatório.

use std::net::{IpAddr, Ipv4Addr, SocketAddr};
use std::path::{Path, PathBuf};

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};

const DEFAULT_PORT: u16 = 8787;
const DEFAULT_FRONT_ORIGIN: &str = "http://127.0.0.1:5173";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
  /// Porta da API.
  #[serde(default = "default_port")]
  pub port: u16,
  /// Endereço de escuta: 127.0.0.1, ou `WPP_BIND` (só para container, com a porta
  /// publicada em loopback no host).
  #[serde(skip, default = "default_bind")]
  pub bind: IpAddr,
  /// Token exigido em `Authorization: Bearer ...`.
  pub token: String,
  /// Origem permitida no CORS (o front local).
  #[serde(default = "default_front_origin")]
  pub front_origin: String,
  /// Máximo de envios por segundo (anti-automação).
  #[serde(default = "default_send_per_sec")]
  pub send_per_sec: u32,
  /// Build do front (`frontend/dist`) servido pelo backend; opcional.
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub front_dir: Option<PathBuf>,
  #[serde(skip)]
  pub data_dir: PathBuf,
}

fn default_port() -> u16 {
  DEFAULT_PORT
}

fn default_bind() -> IpAddr {
  IpAddr::V4(Ipv4Addr::LOCALHOST)
}

fn default_front_origin() -> String {
  DEFAULT_FRONT_ORIGIN.to_string()
}

fn default_send_per_sec() -> u32 {
  2
}

impl Config {
  /// Carrega a configuração, criando o arquivo (com token novo) se não existir.
  pub fn load() -> Result<Self> {
    let data_dir = std::env::var_os("WPP_DATA_DIR")
      .map(PathBuf::from)
      .unwrap_or_else(|| PathBuf::from("data"));
    std::fs::create_dir_all(&data_dir)
      .with_context(|| format!("criando diretório de dados {}", data_dir.display()))?;

    let path = data_dir.join("config.toml");
    let mut config = if path.exists() {
      let raw =
        std::fs::read_to_string(&path).with_context(|| format!("lendo {}", path.display()))?;
      toml::from_str::<Config>(&raw).with_context(|| format!("parse de {}", path.display()))?
    } else {
      let config = Config {
        port: DEFAULT_PORT,
        bind: default_bind(),
        token: generate_token()?,
        front_origin: DEFAULT_FRONT_ORIGIN.to_string(),
        send_per_sec: default_send_per_sec(),
        front_dir: None,
        data_dir: PathBuf::new(),
      };
      write_private(&path, &toml::to_string_pretty(&config)?)?;
      tracing::info!(path = %path.display(), "config criada com token novo");
      config
    };
    config.data_dir = data_dir;
    config.apply_env()?;
    Ok(config)
  }

  fn apply_env(&mut self) -> Result<()> {
    if let Ok(port) = std::env::var("WPP_PORT") {
      self.port = port.parse().context("WPP_PORT inválida")?;
    }
    if let Ok(bind) = std::env::var("WPP_BIND") {
      self.bind = bind.parse().context("WPP_BIND inválido")?;
    }
    if let Ok(origin) = std::env::var("WPP_FRONT_ORIGIN") {
      self.front_origin = origin;
    }
    if let Some(dir) = std::env::var_os("WPP_FRONT_DIR") {
      self.front_dir = Some(PathBuf::from(dir));
    }
    if let Ok(token) = std::env::var("WPP_TOKEN") {
      self.token = token;
    }
    Ok(())
  }

  pub fn bind_addr(&self) -> SocketAddr {
    SocketAddr::from((self.bind, self.port))
  }

  /// Banco de sessão da biblioteca do WhatsApp (nunca apagar).
  pub fn session_db(&self) -> PathBuf {
    self.data_dir.join("whatsapp.db")
  }

  /// Banco da aplicação (chats e mensagens).
  pub fn app_db(&self) -> PathBuf {
    self.data_dir.join("messages.db")
  }
}

fn generate_token() -> Result<String> {
  let mut bytes = [0u8; 32];
  getrandom::fill(&mut bytes).map_err(|e| anyhow::anyhow!("gerando token: {e}"))?;
  Ok(bytes.iter().map(|b| format!("{b:02x}")).collect())
}

/// Pasta de dados só para o dono (0700) e cada arquivo dela em 0600: os bancos guardam,
/// sem criptografia, as chaves da sessão do WhatsApp e as mensagens. O SQLite cria o
/// `-wal` e o `-shm` com a permissão do banco, então basta corrigir o que já existe,
/// depois de abrir os bancos. Falhar aqui (pasta de outro dono) só gera um aviso.
pub fn restrict_permissions(data_dir: &Path) {
  #[cfg(unix)]
  {
    use std::os::unix::fs::PermissionsExt;

    let fix = |path: &Path, mode: u32| {
      let result = std::fs::symlink_metadata(path).and_then(|meta| {
        if meta.permissions().mode() & 0o077 == 0 {
          return Ok(false);
        }
        std::fs::set_permissions(path, std::fs::Permissions::from_mode(mode)).map(|()| true)
      });
      match result {
        Ok(true) => {
          tracing::info!(path = %path.display(), mode = format!("{mode:o}"), "permissão restringida")
        }
        Ok(false) => {}
        Err(e) => {
          tracing::warn!(path = %path.display(), error = %e, "não deu para restringir a permissão")
        }
      }
    };

    fix(data_dir, 0o700);
    match std::fs::read_dir(data_dir) {
      Ok(entries) => {
        for entry in entries.flatten() {
          // Só arquivos comuns: link simbólico e subpasta ficam como estão.
          if entry.file_type().is_ok_and(|t| t.is_file()) {
            fix(&entry.path(), 0o600);
          }
        }
      }
      Err(e) => tracing::warn!(path = %data_dir.display(), error = %e, "listando a pasta de dados"),
    }
  }
  #[cfg(not(unix))]
  let _ = data_dir;
}

fn write_private(path: &Path, contents: &str) -> Result<()> {
  std::fs::write(path, contents).with_context(|| format!("escrevendo {}", path.display()))?;
  #[cfg(unix)]
  {
    use std::os::unix::fs::PermissionsExt;
    std::fs::set_permissions(path, std::fs::Permissions::from_mode(0o600))?;
  }
  Ok(())
}

#[cfg(all(test, unix))]
mod tests {
  use std::os::unix::fs::PermissionsExt;

  use super::*;

  fn mode(path: &Path) -> u32 {
    std::fs::metadata(path).unwrap().permissions().mode() & 0o777
  }

  #[test]
  fn restricts_data_dir_and_files_to_owner() {
    let dir = std::env::temp_dir().join(format!("wpp-perm-{}", std::process::id()));
    std::fs::create_dir_all(dir.join("sub")).unwrap();
    std::fs::set_permissions(&dir, std::fs::Permissions::from_mode(0o755)).unwrap();
    for name in ["messages.db", "messages.db-wal", "whatsapp.db"] {
      std::fs::write(dir.join(name), b"x").unwrap();
      std::fs::set_permissions(dir.join(name), std::fs::Permissions::from_mode(0o644)).unwrap();
    }
    std::fs::set_permissions(dir.join("sub"), std::fs::Permissions::from_mode(0o755)).unwrap();

    restrict_permissions(&dir);

    assert_eq!(mode(&dir), 0o700);
    for name in ["messages.db", "messages.db-wal", "whatsapp.db"] {
      assert_eq!(mode(&dir.join(name)), 0o600, "{name}");
    }
    assert_eq!(mode(&dir.join("sub")), 0o755, "subpasta fica como está");
    std::fs::remove_dir_all(&dir).unwrap();
  }
}
