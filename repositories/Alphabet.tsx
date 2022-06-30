import { Alphabet } from '../types/Alphabet';

export default {
  load: function (): Alphabet {
    return require('../assets/alphabets/default.json');
  }
}