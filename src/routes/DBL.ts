import { Application } from 'express'
import { getRepository } from 'typeorm'
import { code } from '../config/config'
import { User, UserBalance } from 'machobot-database'

export async function DBLRoutes (app: Application) {
  const userRepository = getRepository(User)
  const userBalanceRepository = getRepository(UserBalance)

  app.post('/api/dbl/webhook', async (req, res) => {
    const sentCode = req.get('Authorization')

    if (sentCode !== code) {
      res.statusCode = 401
      return res.send('Unauthorized.')
    }

    const data = req.body

    if (data.type !== 'upvote') {
      console.log('Successfully tested the webhook.')
      return res.send('Test complete')
    }

    const user = await userRepository.findOne(data.user)

    if (!user) {
      console.log('User voted but doesn\'t exist.')
      return res.send('User wasn\'t compensated.')
    }

    user.balance.balance += 100
    user.balance.netWorth += 100

    const response = await userBalanceRepository.save(user.balance)

    console.log(`${user.name} voted and now has ${user.balance.balance} credits.`)
    res.send(response)
  })
}
