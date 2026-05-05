import { createTokenizer } from './generic'
import {
  RUST_KEYWORDS,
  RUST_TYPES,
  RUST_BUILTINS,
} from './langdata.generated'

export const tokenize = createTokenizer({
  keywords: RUST_KEYWORDS,
  typeWords: RUST_TYPES,
  builtins: RUST_BUILTINS,
  commentLine: '//',
  commentStart: '/*',
  commentEnd: '*/',
})
