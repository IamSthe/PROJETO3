# Servidor Blackhearts

Requer Node.js 24. O banco SQLite deve ficar em um disco persistente; não use várias instâncias com bancos separados.

## Configuração

Defina no serviço de hospedagem (não no código nem no Git):

- `ADMIN_USERNAME`: nome do primeiro administrador.
- `ADMIN_PASSWORD`: senha inicial com pelo menos 12 caracteres.
- `DATABASE_PATH`: `/data/blackhearts.sqlite`, com volume persistente montado em `/data`.
- `FRONTEND_ORIGIN`: `https://iamsthe.github.io`, sem a pasta `/PROJETO3`.
- `PORT`: fornecido pela hospedagem ou `3000` localmente.

Execute `npm start`, ou use `server/Dockerfile` com o contexto na raiz do repositório. O primeiro administrador é criado apenas quando o banco está vazio. Senhas usam scrypt e sessões expiram após oito horas; desativar um usuário revoga seu acesso.

Depois de publicar o servidor via HTTPS, preencha `BLACKHEARTS_API_URL` em `backend-config.js` com a URL do backend e publique novamente a interface. Sem essa URL, a interface pública permanece no modo local anterior. Rodando em localhost, ela usa o servidor da mesma origem.

O banco inicia vazio. Os dados antigos do navegador não são importados automaticamente. Em Administração → Gerenciar usuários, um administrador pode usar “Importar casos deste navegador” apenas enquanto o banco estiver vazio. Não apague o armazenamento antigo antes de migrar os casos. Faça backup regular do volume SQLite. Fotos fazem parte dos registros JSON, com limite de 15 MB por atualização.

O arquivo `render.yaml` prepara um serviço com disco persistente e plano pago. Não foi criado nem contratado nenhum serviço. Confirme o custo na conta Render antes de implantar. Instale/conecte a integração Render para permitir a publicação assistida.

## Administração e permissões

Administradores podem criar/desativar contas e excluir casos. Investigadores ativos podem ler e editar casos compartilhados. Atualizações usam revisão otimista: se outro investigador salvou antes, a API rejeita a gravação com 409 em vez de sobrescrever seus dados.

As senhas opcionais de casos do modo local continuam sendo um bloqueio de interface, não uma autorização de leitura individual no servidor. Todos os investigadores ativos têm acesso aos casos via API. Para restringir casos específicos, será necessário implementar ACL por caso antes de armazenar conteúdo com essa exigência.

Notas rápidas e fotos de perfil ainda são locais. O backend desta etapa compartilha casos, elementos, vínculos, fotos dos casos e posições do quadro.

## Verificação

`npm test` testa login, permissões, leitura compartilhada, conflitos e logout em um banco temporário.
