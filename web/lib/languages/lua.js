import { createTokenizer } from './generic'
import {
  LUA_KEYWORDS,
  LUA_TYPES,
  LUA_BUILTINS,
} from './langdata.generated'

export const tokenize = createTokenizer({
  keywords: LUA_KEYWORDS,
  typeWords: LUA_TYPES,
  builtins: LUA_BUILTINS,
  commentLine: '--',
  commentStart: '--[[',
  commentEnd: ']]',
})
