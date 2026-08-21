import { env } from "./config/env.js";
import { app } from "./app.js";

app.listen(env.API_PORT, () => {
  console.log(`Global Creative Services API listening on ${env.API_PORT}`);
});
