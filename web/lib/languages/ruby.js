import { createTokenizer } from './generic'
import {
  RUBY_KEYWORDS,
  RUBY_TYPES,
  RUBY_BUILTINS,
} from './langdata.generated'

export const tokenize = createTokenizer({
  keywords: RUBY_KEYWORDS,
  typeWords: RUBY_TYPES,
  builtins: RUBY_BUILTINS,
  commentLine: '#',
  tripleStrings: false,
})
