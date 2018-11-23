import * as jwt from 'jsonwebtoken'
import * as fs from 'fs'
import { Repository } from 'typeorm'
import { User } from 'machobot-database'

export async function verifyJwt (token: string, userRepository: Repository<User>) {
  const publicRsa = fs.readFileSync('./src/config/id_rsa.pub.pem')
  let decodedApiToken

  try {
    decodedApiToken = jwt.verify(token, publicRsa)
  } catch (err) {
    return false
  }

  const user = await userRepository.findOne({ where: { accessToken: decodedApiToken.accessToken }, relations: [ 'balance', 'level', 'links', 'playlists' ] })

  if (!user) {
    return false
  }

  return user
}
