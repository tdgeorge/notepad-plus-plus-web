import { createTokenizer } from './generic'
import {
  C_KEYWORDS,
  C_TYPES,
  C_BUILTINS,
} from './langdata.generated'

export const tokenize = createTokenizer({
  keywords: C_KEYWORDS,
  typeWords: C_TYPES,
  builtins: C_BUILTINS,
  commentLine: '//',
  commentStart: '/*',
  commentEnd: '*/',
})
