//! Eventos enviados ao front por SSE (`GET /api/events`).

use serde::Serialize;

use crate::model::{ConnState, Message, MsgStatus, Typing};
use crate::store::ChatSummary;

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", content = "data")]
pub enum ApiEvent {
  #[serde(rename = "message.new")]
  MessageNew(Message),
  #[serde(rename = "message.status")]
  MessageStatus {
    chat_jid: String,
    ids: Vec<String>,
    status: MsgStatus,
  },
  /// A mensagem mudou (estrela, fixação, apagada para todos).
  #[serde(rename = "message.updated")]
  MessageUpdated(Message),
  /// A mensagem foi apagada para nós.
  #[serde(rename = "message.deleted")]
  MessageDeleted { chat_jid: String, id: String },
  #[serde(rename = "chat.updated")]
  ChatUpdated(ChatSummary),
  /// A conversa foi apagada no celular e saiu da lista.
  #[serde(rename = "chat.deleted")]
  ChatDeleted { jid: String },
  /// Chegaram mensagens antigas pedidas ao celular ("carregar mensagens").
  #[serde(rename = "history.loaded")]
  HistoryLoaded { chat_jid: String, count: usize },
  #[serde(rename = "connection.state")]
  ConnectionState { state: ConnState },
  /// Alguém está digitando ou gravando (`typing`), ou parou (`null`).
  #[serde(rename = "chat.typing")]
  Typing {
    chat_jid: String,
    sender_jid: String,
    /// Em grupos: quem ("Carlos", "+55…").
    sender_name: Option<String>,
    typing: Option<Typing>,
  },
  /// A pessoa da conversa ficou online ou offline.
  #[serde(rename = "chat.presence")]
  Presence {
    chat_jid: String,
    online: bool,
    last_seen: Option<i64>,
  },
}

impl ApiEvent {
  pub fn name(&self) -> &'static str {
    match self {
      Self::MessageNew(_) => "message.new",
      Self::MessageStatus { .. } => "message.status",
      Self::MessageUpdated(_) => "message.updated",
      Self::MessageDeleted { .. } => "message.deleted",
      Self::ChatUpdated(_) => "chat.updated",
      Self::HistoryLoaded { .. } => "history.loaded",
      Self::ChatDeleted { .. } => "chat.deleted",
      Self::ConnectionState { .. } => "connection.state",
      Self::Typing { .. } => "chat.typing",
      Self::Presence { .. } => "chat.presence",
    }
  }
}
