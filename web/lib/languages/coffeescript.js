import { createTokenizer } from './generic'
import {
  COFFEESCRIPT_KEYWORDS,
  COFFEESCRIPT_TYPES,
  COFFEESCRIPT_BUILTINS,
} from './langdata.generated'

export const tokenize = createTokenizer({
  keywords: COFFEESCRIPT_KEYWORDS,
  typeWords: COFFEESCRIPT_TYPES,
  builtins: COFFEESCRIPT_BUILTINS,
  commentLine: '#',
  tripleStrings: true,
})
