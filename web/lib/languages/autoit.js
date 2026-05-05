import { createTokenizer } from './generic'
import {
  AUTOIT_KEYWORDS,
  AUTOIT_TYPES,
  AUTOIT_BUILTINS,
} from './langdata.generated'

export const tokenize = createTokenizer({
  keywords: AUTOIT_KEYWORDS,
  typeWords: AUTOIT_TYPES,
  builtins: AUTOIT_BUILTINS,
  commentLine: ';',
  commentStart: '#CS',
  commentEnd: '#CE',
})
