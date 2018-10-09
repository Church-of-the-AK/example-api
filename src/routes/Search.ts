import { Application } from 'express'
import { getRepository, Like } from 'typeorm'
import { User } from 'machobot-database'

export async function SearchRoutes (app: Application) {
  const userRepository = getRepository(User)

  app.get('/api/search/users', async (req, res) => {
    const query: string = req.query.query

    if (!query) {
      return res.send({ success: false, error: 'no_query' })
    }

    const users = await userRepository.createQueryBuilder()
      .where('LOWER(name) LIKE LOWER(:query)', { query })
      .getMany()

    return res.send(users)
  })
}
