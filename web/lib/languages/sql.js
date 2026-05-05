import { createTokenizer } from './generic'
import {
  SQL_KEYWORDS,
  SQL_TYPES,
  SQL_BUILTINS,
} from './langdata.generated'

export const tokenize = createTokenizer({
  keywords: SQL_KEYWORDS,
  typeWords: SQL_TYPES,
  builtins: SQL_BUILTINS,
  commentLine: '--',
  commentStart: '/*',
  commentEnd: '*/',
  caseInsensitive: true,
  stringChars: ["'", '"'],
})
