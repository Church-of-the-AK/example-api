import { Application } from 'express'
import { getRepository } from 'typeorm'
import { User, MusicPlaylist } from 'machobot-database'

export async function SearchRoutes (app: Application) {
  const userRepository = getRepository(User)
  const playlistRepository = getRepository(MusicPlaylist)

  app.get('/api/search/users', async (req, res) => {
    const query: string = req.query.query

    if (!query) {
      return res.send({ success: false, error: 'no_query' })
    }

    const users = await userRepository.createQueryBuilder()
      .where('LOWER(name) LIKE LOWER(:query)', { query: `%${query}%` })
      .getMany()

    return res.send(users)
  })

  app.get('/api/search/playlists', async (req, res) => {
    const query: string = req.query.query

    if (!query) {
      return res.send({ success: false, error: 'no_query' })
    }

    const users = await playlistRepository.createQueryBuilder()
      .where('LOWER(name) LIKE LOWER(:query)', { query: `%${query}%` })
      .getMany()

    return res.send(users)
  })
}
