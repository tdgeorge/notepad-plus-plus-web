import { createTokenizer } from './generic'

export const tokenize = createTokenizer({
  commentLine: '#',
  stringChars: ['"', "'"],
})
