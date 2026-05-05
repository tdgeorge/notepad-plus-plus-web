import { createTokenizer } from './generic'
import {
  POWERSHELL_KEYWORDS,
  POWERSHELL_TYPES,
  POWERSHELL_BUILTINS,
} from './langdata.generated'

export const tokenize = createTokenizer({
  keywords: POWERSHELL_KEYWORDS,
  typeWords: POWERSHELL_TYPES,
  builtins: POWERSHELL_BUILTINS,
  commentLine: '#',
  commentStart: '<#',
  commentEnd: '#>',
})
