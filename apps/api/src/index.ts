import 'dotenv/config';
import { createServer } from "./server.js";

const port = Number(process.env.API_PORT ?? 3001);
const app = createServer();

app.listen(port, () => {
  console.log(`[api] listening on http://localhost:${port}`);
});
