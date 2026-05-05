import { createTokenizer } from './generic'
import {
  GO_KEYWORDS,
  GO_TYPES,
  GO_BUILTINS,
} from './langdata.generated'

export const tokenize = createTokenizer({
  keywords: GO_KEYWORDS,
  typeWords: GO_TYPES,
  builtins: GO_BUILTINS,
  commentLine: '//',
  commentStart: '/*',
  commentEnd: '*/',
})
