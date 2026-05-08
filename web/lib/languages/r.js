import { createTokenizer } from './generic'
import {
  R_KEYWORDS,
  R_TYPES,
  R_BUILTINS,
} from './langdata.generated'

export const tokenize = createTokenizer({
  keywords: R_KEYWORDS,
  typeWords: R_TYPES,
  builtins: R_BUILTINS,
  commentLine: '#',
})
