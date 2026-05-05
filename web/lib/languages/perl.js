import { createTokenizer } from './generic'
import {
  PERL_KEYWORDS,
  PERL_TYPES,
  PERL_BUILTINS,
} from './langdata.generated'

export const tokenize = createTokenizer({
  keywords: PERL_KEYWORDS,
  typeWords: PERL_TYPES,
  builtins: PERL_BUILTINS,
  commentLine: '#',
})
