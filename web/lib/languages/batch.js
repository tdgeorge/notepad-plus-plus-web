import { createTokenizer } from './generic'
import {
  BATCH_KEYWORDS,
  BATCH_TYPES,
  BATCH_BUILTINS,
} from './langdata.generated'

export const tokenize = createTokenizer({
  keywords: BATCH_KEYWORDS,
  typeWords: BATCH_TYPES,
  builtins: BATCH_BUILTINS,
  commentLine: 'REM',
  caseInsensitive: true,
  stringChars: ['"'],
})
