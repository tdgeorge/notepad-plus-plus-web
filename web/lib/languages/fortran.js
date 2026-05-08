import { createTokenizer } from './generic'
import {
  FORTRAN_KEYWORDS,
  FORTRAN_TYPES,
  FORTRAN_BUILTINS,
} from './langdata.generated'

export const tokenize = createTokenizer({
  keywords: FORTRAN_KEYWORDS,
  typeWords: FORTRAN_TYPES,
  builtins: FORTRAN_BUILTINS,
  commentLine: '!',
  caseInsensitive: true,
})
