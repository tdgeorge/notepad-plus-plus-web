import { createTokenizer } from './generic'
import {
  ADA_KEYWORDS,
  ADA_TYPES,
  ADA_BUILTINS,
} from './langdata.generated'

export const tokenize = createTokenizer({
  keywords: ADA_KEYWORDS,
  typeWords: ADA_TYPES,
  builtins: ADA_BUILTINS,
  commentLine: '--',
})
