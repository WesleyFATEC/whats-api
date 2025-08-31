const HttpServer = require('./presentation/httpServer');

async function main() {
  const server = new HttpServer();
  await server.start();
}

main().catch((error) => {
  console.error(`Erro ao iniciar a aplicação: ${error.message}`, error.stack);
  process.exit(1);
});