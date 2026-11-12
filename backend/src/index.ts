import "dotenv/config";
import app from "./app";
import { env } from "./config/env";

const server = app.listen(env.PORT, () => {
   
  console.log(
    `🚀 MADHU SMRUTI API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`
  );
});

export default server;
