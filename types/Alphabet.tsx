export type Character = {
  id: string,
  label: string
}

export type Word = {
  id: string,
  label: string
}

export type Alphabet = {
  chars: Word[],
  training: {
    words: Word[]
  }
}

export type Frame = {
  index: number,
  timestamp: number | null,
  delta: number,
  alphabetIndex: number,
  blink: {
    rightEyeClosed: boolean
  },
  train: {
    wordIndex: number,
    charIndex: number
  }
}
