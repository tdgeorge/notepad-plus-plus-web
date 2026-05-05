import { createTokenizer } from './generic'
import {
  KEYWORDS as JS_KEYWORDS,
  TYPE_WORDS as JS_TYPES,
  BROWSER_API_WORDS as JS_BUILTINS,
} from './javascript'
import {
  TYPESCRIPT_KEYWORDS,
  TYPESCRIPT_TYPES,
} from './langdata.generated'

const combinedKeywords = new Set([...JS_KEYWORDS, ...TYPESCRIPT_KEYWORDS])
const combinedTypes = new Set([...JS_TYPES, ...TYPESCRIPT_TYPES])

export const tokenize = createTokenizer({
  keywords: combinedKeywords,
  typeWords: combinedTypes,
  builtins: JS_BUILTINS,
  commentLine: '//',
  commentStart: '/*',
  commentEnd: '*/',
})
