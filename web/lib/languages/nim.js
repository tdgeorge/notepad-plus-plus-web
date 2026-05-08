import { createTokenizer } from './generic'
import {
  NIM_KEYWORDS,
  NIM_TYPES,
  NIM_BUILTINS,
} from './langdata.generated'

export const tokenize = createTokenizer({
  keywords: NIM_KEYWORDS,
  typeWords: NIM_TYPES,
  builtins: NIM_BUILTINS,
  commentLine: '#',
})
