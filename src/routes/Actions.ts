import { Application } from 'express'
import { getRepository, Repository } from 'typeorm'
import { User, UserBalance } from 'machobot-database'
import * as jwt from 'jsonwebtoken'
import * as fs from 'fs'

export async function ActionRoutes (app: Application) {
  const userRepository = getRepository(User)
  const userBalanceRepository = getRepository(UserBalance)

  app.post('/api/actions/dailies', async (req, res) => {
    const apiToken: string = req.query.jwt
    const user = await verifyJwt(apiToken, userRepository)

    if (!user) {
      return res.send({ success: false, error: 'token' })
    }

    const diffHrs = user.balance.dateClaimedDailies ? Math.abs(new Date().getTime() - parseInt(user.balance.dateClaimedDailies)) / 36e5 : 24

    if (diffHrs < 24) {
      return res.send({ success: false, error: 'time', hoursLeft: 24 - diffHrs })
    }

    user.balance.balance += 200
    user.balance.netWorth += 200
    user.balance.dateClaimedDailies = new Date().getTime().toString()

    const response = await userBalanceRepository.save(user.balance).catch(error => {
      return { error }
    })

    if (!(response instanceof UserBalance)) {
      return res.send({ success: false, error: response.error })
    }

    return res.send({ success: true, balance: user.balance.balance })
  })
}

async function verifyJwt (token: string, userRepository: Repository<User>) {
  const publicRsa = fs.readFileSync('./src/config/id_rsa.pub.pem')
  let decodedApiToken

  try {
    decodedApiToken = jwt.verify(token, publicRsa)
  } catch (err) {
    return false
  }

  const user = await userRepository.findOne({ where: { accessToken: decodedApiToken.accessToken } })

  if (!user) {
    return false
  }

  return user
}
