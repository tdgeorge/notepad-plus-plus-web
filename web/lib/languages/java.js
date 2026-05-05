import { createTokenizer } from './generic'
import {
  JAVA_KEYWORDS,
  JAVA_TYPES,
  JAVA_BUILTINS,
} from './langdata.generated'

export const tokenize = createTokenizer({
  keywords: JAVA_KEYWORDS,
  typeWords: JAVA_TYPES,
  builtins: JAVA_BUILTINS,
  commentLine: '//',
  commentStart: '/*',
  commentEnd: '*/',
})
