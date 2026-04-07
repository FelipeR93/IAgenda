/**
 * Script de configuração inicial.
 * Execute este script UMA VEZ para gerar o hash da senha e configurar o .env
 *
 * Uso: node scripts/gerar-hash.js [senha]
 * Exemplo: node scripts/gerar-hash.js admin
 */

const bcrypt = require('bcryptjs');

async function main() {
  const senha = process.argv[2] || 'admin';
  const hash = await bcrypt.hash(senha, 12);

  console.log('\n✅ Hash gerado com sucesso!\n');
  console.log(`APP_PASSWORD_HASH=${hash}\n`);
  console.log('Adicione essa linha ao seu arquivo .env ou nas variáveis de ambiente do Render.\n');
}

main().catch(console.error);
