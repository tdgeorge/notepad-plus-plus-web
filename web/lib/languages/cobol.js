import { createTokenizer } from './generic'
import {
  COBOL_KEYWORDS,
  COBOL_TYPES,
  COBOL_BUILTINS,
} from './langdata.generated'

export const tokenize = createTokenizer({
  keywords: COBOL_KEYWORDS,
  typeWords: COBOL_TYPES,
  builtins: COBOL_BUILTINS,
  caseInsensitive: true,
})
