import { createTokenizer } from './generic'
import {
  VB_KEYWORDS,
  VB_TYPES,
  VB_BUILTINS,
} from './langdata.generated'

export const tokenize = createTokenizer({
  keywords: VB_KEYWORDS,
  typeWords: VB_TYPES,
  builtins: VB_BUILTINS,
  commentLine: "'",
  caseInsensitive: true,
})
