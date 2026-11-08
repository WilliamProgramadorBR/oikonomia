# Sincronização segura do Oikonomia

## Estado da implementação

Esta entrega implementa a fundação local e criptográfica. Ela ainda não transmite dados pela rede.
O aplicativo diferencia claramente:

- `local`: somente o banco SQLite cifrado deste dispositivo;
- `sincronizacao / cofre_preparado`: frase e chave da família preparadas, aguardando vínculo com a API;
- `sincronizacao / ativa`: reservado para quando autenticação, dispositivo e API central estiverem confirmados.

Não se deve mudar a fase para `ativa` apenas porque o usuário criou a frase.

## Chave criada pelo usuário

A frase secreta não é usada diretamente no AES e nunca é armazenada. O fluxo é:

1. O cliente gera uma chave de dados aleatória de 256 bits.
2. Normaliza a frase com NFKC e deriva uma chave com `scrypt` (`N=65536`, `r=8`, `p=1`, sal de 128 bits).
3. A chave derivada protege a chave de dados com AES-256-GCM.
4. Somente o envelope versionado (parâmetros, sal, IV, tag e chave cifrada) é persistido.
5. Ao bloquear, a chave de dados mantida em memória é sobrescrita.

Trocar a frase gera novo sal e novo envelope para a mesma chave de dados. Portanto, não recifra todo o
histórico. O envelope é versionado para permitir migração futura para Argon2id quando o runtime do
Electron oferecer suporte confiável.

Se a frase for esquecida, os dados remotos não poderão ser abertos. Recuperação de conta e recuperação
de dados são processos diferentes: redefinir a senha da conta não substitui a frase secreta.

## Persistência local preparada

A migração 014 cria:

- `sincronizacao_configuracao`: modo, fase, dispositivo, família, cursor e envelope da chave;
- `sincronizacao_outbox`: operações locais pendentes e idempotentes;
- `sincronizacao_inbox`: operações cifradas recebidas e ainda não aplicadas.

O `payload_local` da outbox fica dentro do SQLite já cifrado. Antes de sair do processo, será convertido
em envelope AES-GCM com contexto que inclui entidade, ID e versão, impedindo troca de ciphertext entre
registros.

## Banco central

O arquivo `servidor/postgres/001_inicial.sql` define a primeira versão do PostgreSQL central:

- usuários, credenciais e TOTP;
- famílias e papéis;
- dispositivos com chave pública e revogação individual;
- refresh tokens resumidos e rotacionáveis;
- envelope da chave da família por usuário;
- log append-only de operações cifradas;
- snapshots cifrados e auditoria sem payload financeiro;
- isolamento inicial por família com Row-Level Security.

Os clientes nunca devem receber credenciais do PostgreSQL. Toda comunicação será feita com uma API
HTTPS, e WebSocket servirá apenas como aviso de que há novas operações.

## Próximas etapas obrigatórias

1. API central de cadastro, login e refresh token rotativo.
2. Integrar o núcleo TOTP/códigos de recuperação já validado em `servidor/src/seguranca/Totp.ts`
   aos endpoints, limites de tentativa e cadastro/revogação de dispositivos.
3. Pareamento de dispositivo por QR Code e chaves assimétricas.
4. Captura transacional das mutações financeiras na outbox.
5. Push/pull por cursor, idempotência, tombstones e resolução explícita de conflitos.
6. Exclusão remota e período de segurança ao voltar ao modo local.
7. Cliente móvel usando os mesmos contratos e casos de uso.
