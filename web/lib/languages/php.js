import { createTokenizer } from './generic'
import {
  PHP_KEYWORDS,
  PHP_TYPES,
  PHP_BUILTINS,
} from './langdata.generated'

export const tokenize = createTokenizer({
  keywords: PHP_KEYWORDS,
  typeWords: PHP_TYPES,
  builtins: PHP_BUILTINS,
  commentLine: '//',
  commentStart: '/*',
  commentEnd: '*/',
  stringChars: ['"', "'"],
})
