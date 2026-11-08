# Auditoria técnica de lançamento

Data da revisão: 8 de novembro de 2026.

## Escopo executado

Esta revisão cobre as etapas 0, 1 e 2 do pedido recebido: diagnóstico do repositório, segurança do
armazenamento financeiro e confiabilidade das respostas IPC. O texto de origem terminou truncado no
último item da etapa 2; eventuais etapas posteriores não foram inferidas.

O nome público, o `appId`, o caminho de dados, as regras financeiras e a licença não foram alterados.
A modificação local preexistente em `package-lock.json` foi preservada.

## Diagnóstico e impacto

| Gravidade | Área | Causa | Impacto anterior | Correção e risco de regressão |
| --- | --- | --- | --- | --- |
| Crítica | Armazenamento | Fallback para SQLite em disco quando `safeStorage` não estava disponível | Dados financeiros podiam ser gravados abertos sem consentimento | Inicialização agora falha fechada. Risco esperado: ambientes sem cofre deixam de abrir, com mensagem explícita e sem alterar dados. |
| Crítica | Migração | O legado era substituído e os sidecars removidos sem uma rota atômica completa de validação | Interrupção podia comprometer recuperação e deixar comportamento ambíguo | A migração trabalha em cópia temporária, valida SQLite e AES-GCM, e só então troca o original. Em falha, o original permanece intacto; em sucesso, não sobra cópia aberta. |
| Alta | Chave | `.chave` era gravada diretamente e o Base64 não era validado estritamente | Interrupção podia produzir chave parcial; chave inválida podia falhar tarde | Escrita temporária + `flush` + troca, autoverificação pelo cofre e exigência de exatamente 32 bytes. Nunca é criada chave substituta quando já há artefato cifrado. |
| Alta | Recuperação | `.gravando` era ignorado na reinicialização | Uma gravação íntegra interrompida antes do `rename` era perdida | O temporário é autenticado, validado com `PRAGMA quick_check` e promovido somente se íntegro e mais novo. |
| Crítica | IPC | Erros de `persistir()` eram capturados no `finally` e descartados | A interface podia receber sucesso com falha de disco | A resposta de sucesso só é construída depois da confirmação da unidade de trabalho. Falhas de armazenamento retornam `Resposta<T>` de erro. |
| Alta | Consistência | Mutação em memória sobrevivia a falha de persistência; operações assíncronas podiam intercalar | Retry, leitura e disco podiam divergir | Operações são serializadas e o banco volta ao último snapshot persistido em qualquer falha. Encerramento e atualização aguardam a fila. |
| Média | Documentação | README afirmava ao mesmo tempo que o banco era cifrado e não cifrado | Expectativa de segurança incorreta | Texto unificado com o comportamento verificado. |
| Alta | Testabilidade | Não havia suíte automatizada | Regressões críticas dependiam de teste manual | Adicionados testes com o Node embutido do Electron, sem dependência nova. |
| Alta | Logs/recuperação | O adaptador pendente imprimia e-mail e código de recuperação em desenvolvimento e descartava silenciosamente em produção | Segredo temporário e dado pessoal apareciam no terminal; a UI podia indicar envio inexistente | O conteúdo não é mais registrado e a ausência do provedor agora é propagada como falha. Logs de IA e Open Finance também omitem payloads externos. |

## Validação automatizada

`npm test` cobre:

1. Primeiro uso sem banco.
2. Reabertura de banco cifrado válido.
3. Cofre indisponível.
4. Chave ausente e chave inválida.
5. Arquivo AES-GCM corrompido.
6. Migração legada bem-sucedida e falha durante a migração.
7. Falha de escrita com rollback em memória e no reinício.
8. Recuperação de gravação interrompida.
9. Serialização concorrente e encerramento durante operação.
10. Sucesso IPC persistido, erro de domínio, falha de disco, erro inesperado e sessão inválida.

Também foram executados `npm run typecheck`, `npm run build` e `npm audit --omit=dev` (zero
vulnerabilidades conhecidas nas dependências de produção no momento da auditoria).

## Limitações e próximos bloqueadores de lançamento

- O Electron 45 marcou a API síncrona do `safeStorage` como obsoleta e anunciou sua remoção no
  Electron 46. A migração para a API assíncrona deve ocorrer antes de atualizar a major; ela afeta
  armazenamento, sessão, IA e Open Finance e merece uma alteração isolada.
- No macOS, o comportamento consistente do Keychain exige assinatura estável. O empacotamento atual
  não configura assinatura/notarização; isso precisa ser resolvido antes de distribuir para macOS.
- A recuperação de senha continua sem provedor real de e-mail, conforme já documentado no README.
- A suíte valida o armazenamento com um cofre determinístico e o Node do Electron. DPAPI e Keychain
  ainda exigem testes manuais em instaladores assinados nas plataformas de destino.
