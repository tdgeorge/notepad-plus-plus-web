import { createTokenizer } from './generic'
import {
  BASH_KEYWORDS,
  BASH_TYPES,
  BASH_BUILTINS,
} from './langdata.generated'

export const tokenize = createTokenizer({
  keywords: BASH_KEYWORDS,
  typeWords: BASH_TYPES,
  builtins: BASH_BUILTINS,
  commentLine: '#',
  stringChars: ['"', "'"],
})
