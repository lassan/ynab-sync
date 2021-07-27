import crypto from "crypto"

const IV_LENGTH = 16 // For AES, this is always 16
const ALGORITHM = "aes-256-cbc"

const getKey = () => {
  if (!process.env.ENCRYPTION_KEY) throw Error("Missing property 'ENCRYPTION_KEY'")
  return process.env.ENCRYPTION_KEY
}

const encrypt = (message: string) => {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(getKey()), iv)

  const encrypted = Buffer.concat([cipher.update(message), cipher.final()])

  return iv.toString("hex") + ":" + encrypted.toString("hex")
}

const decrypt = (text: string) => {
  const textParts = text.split(":")
  const iv = Buffer.from(textParts[0], "hex")
  const encryptedText = Buffer.from(textParts[1], "hex")
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(getKey()), iv)

  const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()])

  return decrypted.toString()
}

export { encrypt, decrypt }
