# 📋 Regras do Projeto IAgenda

## Regra 1: Segurança Acima de Tudo

- **Nada pode ser modificado por um visitante** — todas as rotas de modificação exigem autenticação válida.
- **Nada pode vazar** — variáveis de ambiente para segredos, nunca hardcode de credenciais no código-fonte.
- Senhas devem ser armazenadas com hash seguro (bcrypt).
- Sessões devem usar cookies `httpOnly`, `secure` (em produção) e `sameSite: strict`.
- Proteção CSRF ativa em todos os formulários POST.
- Cabeçalhos de segurança HTTP configurados via `helmet`.
- Inputs sanitizados para prevenir XSS e SQL Injection.
- Banco de dados PostgreSQL com queries parametrizadas (nunca concatenação de strings SQL).
- Variáveis sensíveis somente via `.env` (nunca commitadas no repositório).
- Rate limiting nas rotas de login para prevenir brute force.

## Regra 2: Responder Sempre em Português

- Toda comunicação, comentários no código, mensagens de erro e documentação devem ser em português.

## Regra 3: Banco de Dados PostgreSQL

- Se banco de dados for necessário, utilizar PostgreSQL.
- Utilizar o pool de conexões do `pg` e queries parametrizadas.

## Regra 4: Hospedagem no Render

- O site será hospedado no Render.
- Configurar `render.yaml` para deploy automático.
- Variáveis de ambiente configuradas no painel do Render.
