import { createTokenizer } from './generic'
import {
  ASM_KEYWORDS,
  ASM_TYPES,
  ASM_BUILTINS,
} from './langdata.generated'

export const tokenize = createTokenizer({
  keywords: ASM_KEYWORDS,
  typeWords: ASM_TYPES,
  builtins: ASM_BUILTINS,
  commentLine: ';',
})
