import { createTokenizer } from './generic'
import {
  SWIFT_KEYWORDS,
  SWIFT_TYPES,
  SWIFT_BUILTINS,
} from './langdata.generated'

export const tokenize = createTokenizer({
  keywords: SWIFT_KEYWORDS,
  typeWords: SWIFT_TYPES,
  builtins: SWIFT_BUILTINS,
  commentLine: '//',
  commentStart: '/*',
  commentEnd: '*/',
})
