import { configure } from '@storybook/react'

function loadStories() {
  require('../src/stories/index.stories')
}

configure(loadStories, module)
