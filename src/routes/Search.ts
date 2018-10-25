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
    const userId: string = req.query.userId

    if (!query) {
      return res.send({ success: false, error: 'no_query' })
    }

    if (!userId) {
      return res.send({ success: false, error: 'no_userId' })
    }

    const playlists = (await userRepository.findOne(userId, { relations: [ 'playlists' ] })).playlists
    const playlist = playlists.find(playlist => playlist.name.toLowerCase().startsWith(query.toLowerCase()))

    return res.send(playlist)
  })
}
