import { Hono } from "hono";
import { Client } from "pg"
import HashRing from "hashring"

const hr = new HashRing(['5432', '5433', '5434'])
const clients = {
  5432: new Client({
    host: "localhost",
    port: 5432,
    user: "postgres",
    password: "root",
    database: "postgres"
  }),

  5433: new Client({
    host: "localhost",
    port: 5433,
    user: "postgres",
    password: "root",
    database: "postgres"
  }),

  5434: new Client({
    host: "localhost",
    port: 5434,
    user: "postgres",
    password: "root",
    database: "postgres"
  })
}

async function connect() {
  await clients["5432"].connect()
  await clients["5433"].connect()
  await clients["5434"].connect()
}

await connect()

const app = new Hono()

  .get("/:id", async (c) => {
    const urlId = c.req.param("id")
    const server = hr.get(urlId) as '5432' | '5433' | '5434'

    const result = await clients[server].query("SELECT * FROM URL_TABLE WHERE URL_ID = $1", [urlId])

    if (result.rowCount && result.rowCount > 0) {
      return c.json({
        urlId,
        url: result.rows[0],
        server
      })
    }

    return c.json({ error: "error" })

  })

  .post("/", async (c) => {
    const url = c.req.query("url")
    const hash = new Bun.CryptoHasher("sha256").update(url!).digest("base64")
    const urlId = hash.substr(0, 5)
    const server = hr.get(urlId) as '5432' | '5433' | '5434'

    await clients[server].query("INSERT INTO URL_TABLE (URL, URL_ID) VALUES ($1, $2)", [url, urlId])

    return c.json({
      urlId,
      url: url,
      server
    })
  })

// Tests
const res = await app.request("/?url=https://example.com", { method: "post" })
const json = await res.json()
console.log(json);
const res2 = await app.request(`/${json.urlId}`)
console.log(await res2.json());

export default app
