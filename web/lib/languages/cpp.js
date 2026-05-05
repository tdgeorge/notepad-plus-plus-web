import { createTokenizer } from './generic'
import {
  CPP_KEYWORDS,
  CPP_TYPES,
  CPP_BUILTINS,
} from './langdata.generated'

export const tokenize = createTokenizer({
  keywords: CPP_KEYWORDS,
  typeWords: CPP_TYPES,
  builtins: CPP_BUILTINS,
  commentLine: '//',
  commentStart: '/*',
  commentEnd: '*/',
})
