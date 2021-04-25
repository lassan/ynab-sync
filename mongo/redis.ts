import redis from "redis"

const client = redis.createClient({ port: 6379 })

client.on("error", (err) => console.error(err))

const set = (key: string, token: string, expireAt: number) =>
  client.multi().set(key, token).expire(key, expireAt).exec(redis.print)

const get = (key: string) =>
  new Promise<string>((resolve, reject) => {
    client.get(key, (err, response) => {
      if (err) reject(err)
      else resolve(response)
    })
  })

export { set, get }
