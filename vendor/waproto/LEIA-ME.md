# waproto 0.7.0 com dois campos a mais

Cópia da `waproto` 0.7.0 (crates.io), usada pelo `[patch.crates-io]` do `Cargo.toml` da raiz.
A única mudança é no `build.rs`: dois campos em `LOCAL_FIELDS`, com os números que o WhatsApp
usa nas figurinhas com som.

- `Message.audioStickerMessage = 134` (`FutureProofMessage`): embrulha a figurinha.
- `Message.StickerMessage.audioMessage = 26` (`AudioMessage`): o som dela.

Sem eles a mensagem chega vazia, porque o decodificador descarta campos que não conhece. O
`LocalField` ganhou `type_name` para aceitar campos do tipo mensagem.

O schema da whatsapp-rust já tem esses campos desde depois da 0.7.0. Quando sair uma versão
nova, apague esta pasta e o `[patch.crates-io]` e atualize a `whatsapp-rust`.
