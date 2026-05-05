import { createTokenizer } from './generic'
import {
  GDSCRIPT_KEYWORDS,
  GDSCRIPT_TYPES,
  GDSCRIPT_BUILTINS,
} from './langdata.generated'

export const tokenize = createTokenizer({
  keywords: GDSCRIPT_KEYWORDS,
  typeWords: GDSCRIPT_TYPES,
  builtins: GDSCRIPT_BUILTINS,
  commentLine: '#',
})
