import { Application } from 'express'
import { code } from '../config/config'

export async function DBLRoutes (app: Application) {
  app.post('/api/dbl/webhook', (req, res) => {
    const sentCode = req.get('Authorization')

    if (sentCode !== code) {
      res.statusCode = 401
      return res.send('Unauthorized.')
    }

    console.log(req.body)
  })
}
