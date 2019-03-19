import { configure } from '@storybook/react'
import { configureActions } from '@storybook/addon-actions'

configureActions({ depth: 10, clearOnStoryChange: true, limit: 50 })

function loadStories() {
  require('../src/stories/index.stories')
}

configure(loadStories, module)
