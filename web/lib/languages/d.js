import { createTokenizer } from './generic'
import {
  D_KEYWORDS,
  D_TYPES,
  D_BUILTINS,
} from './langdata.generated'

export const tokenize = createTokenizer({
  keywords: D_KEYWORDS,
  typeWords: D_TYPES,
  builtins: D_BUILTINS,
  commentLine: '//',
  commentStart: '/*',
  commentEnd: '*/',
})
