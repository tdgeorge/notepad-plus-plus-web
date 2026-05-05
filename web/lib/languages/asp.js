import { createTokenizer } from './generic'
import {
  ASP_KEYWORDS,
  ASP_TYPES,
  ASP_BUILTINS,
} from './langdata.generated'

export const tokenize = createTokenizer({
  keywords: ASP_KEYWORDS,
  typeWords: ASP_TYPES,
  builtins: ASP_BUILTINS,
  commentLine: "'",
  caseInsensitive: true,
})
