import https from "https";
import fs from "fs";
import path from "path";

// Importação dinâmica para evitar erro de tipo
import next from "next";

const dev = process.env.NODE_ENV !== "production";
const hostname = "192.168.104.126";
const port = 3001;
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Caminho absoluto dos certificados SSL
const certsPath = path.join(__dirname, "certs");
const httpsOptions = {
  key: fs.readFileSync(path.join(certsPath, "192.168.104.126+3-key.pem")),
  cert: fs.readFileSync(path.join(certsPath, "192.168.104.126+3.pem")),
};

app.prepare().then(() => {
  https
    .createServer(httpsOptions, (req, res) => {
      handle(req, res);
    })
    .listen(port, () => {
      console.log(`🚀 Servidor rodando em: https://${hostname}:${port}`);
    });
});
