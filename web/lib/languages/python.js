import { createTokenizer } from './generic'
import {
  PYTHON_KEYWORDS,
  PYTHON_TYPES,
  PYTHON_BUILTINS,
} from './langdata.generated'

export const tokenize = createTokenizer({
  keywords: PYTHON_KEYWORDS,
  typeWords: PYTHON_TYPES,
  builtins: PYTHON_BUILTINS,
  commentLine: '#',
  tripleStrings: true,
})
