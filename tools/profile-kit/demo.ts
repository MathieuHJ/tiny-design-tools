/**
 * Photographs for the built-in demo, from Unsplash and used under the Unsplash License. The photographer of each
 * is credited in CREDITS.md at the root of the repository. None of them show identifiable people.
 */
import avatarUrl from './fixtures/avatar.jpg?url'
import bannerUrl from './fixtures/banner.jpg?url'
import post01 from './fixtures/post-01.jpg?url'
import post02 from './fixtures/post-02.jpg?url'
import post03 from './fixtures/post-03.jpg?url'
import post04 from './fixtures/post-04.jpg?url'
import post05 from './fixtures/post-05.jpg?url'
import post06 from './fixtures/post-06.jpg?url'
import post07 from './fixtures/post-07.jpg?url'
import post08 from './fixtures/post-08.jpg?url'
import post09 from './fixtures/post-09.jpg?url'

/** Nine posts of different shapes and moods, so the grid shows how any picture is cut to a 3:4 tile. */
export const DEMO_FEED = [
  { name: 'Cliffs at sunset', url: post01 },
  { name: 'Still life with dried grass', url: post02 },
  { name: 'Golden dunes', url: post03 },
  { name: 'Turquoise water and rocks', url: post04 },
  { name: 'Window light', url: post05 },
  { name: 'Curved facade', url: post06 },
  { name: 'Peak reflected in a lake', url: post07 },
  { name: 'Waves on a beach', url: post08 },
  { name: 'Tower in black and white', url: post09 },
] as const

export const DEMO = {
  avatarUrl,
  bannerUrl,
  avatarName: 'Blue vase',
  bannerName: 'Dune ripples',
  displayName: 'Atlas Studio',
  handle: 'atlas.studio',
  bio: 'Design studio making small tools and careful interfaces. Brooklyn to everywhere.',
  link: 'atlas.example/work',
}
