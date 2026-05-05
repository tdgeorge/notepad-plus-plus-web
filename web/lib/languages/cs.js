import { createTokenizer } from './generic'
import {
  CS_KEYWORDS,
  CS_TYPES,
  CS_BUILTINS,
} from './langdata.generated'

export const tokenize = createTokenizer({
  keywords: CS_KEYWORDS,
  typeWords: CS_TYPES,
  builtins: CS_BUILTINS,
  commentLine: '//',
  commentStart: '/*',
  commentEnd: '*/',
})
