const TITLES = [
  'Mr.',
  'Mrs.',
  'Lady',
  'Sir',
  'Captain',
  'Duke',
  'Duchess',
  'Professor',
  'Baron',
  'Agent',
]

const WORDS = [
  'Meowgi',
  'Clawdia',
  'Furocious',
  'Meowzart',
  'Pawsome',
  'Whiskerton',
  'Purrsloth',
  'Catastrophe',
  'Furdinand',
  'Clawdius',
  'Meowington',
  'Pawblo',
  'Purrlock',
  'Whiskerbeard',
  'Clawmander',
  'Fluffernutter',
  'Purrsimmon',
  'Meowses',
]

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]
}

export function generateCatName(): string {
  const title = pick(TITLES)
  const word = pick(WORDS)
  const number = Math.floor(1000 + Math.random() * 9000)
  return `${title} ${word}${number}`
}
