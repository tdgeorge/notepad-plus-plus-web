import { createTokenizer } from './generic'
import {
  HASKELL_KEYWORDS,
  HASKELL_TYPES,
  HASKELL_BUILTINS,
} from './langdata.generated'

export const tokenize = createTokenizer({
  keywords: HASKELL_KEYWORDS,
  typeWords: HASKELL_TYPES,
  builtins: HASKELL_BUILTINS,
  commentLine: '--',
})
