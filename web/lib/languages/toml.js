import { createTokenizer } from './generic'
import {
  TOML_KEYWORDS,
  TOML_TYPES,
  TOML_BUILTINS,
} from './langdata.generated'

export const tokenize = createTokenizer({
  keywords: TOML_KEYWORDS,
  typeWords: TOML_TYPES,
  builtins: TOML_BUILTINS,
  commentLine: '#',
})
