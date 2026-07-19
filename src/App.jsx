import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const COUNTRIES = [
  { id: 'KOR', name: '대한민국' },
  { id: 'JPN', name: '일본' },
  { id: 'USA', name: '미국' },
  { id: 'FRA', name: '프랑스' },
  { id: 'BRA', name: '브라질' },
  { id: 'AUS', name: '호주' },
  { id: 'EGY', name: '이집트' },
  { id: 'IND', name: '인도' },
  { id: 'CAN', name: '캐나다' },
  { id: 'DEU', name: '독일' },
  { id: 'ITA', name: '이탈리아' },
  { id: 'CHN', name: '중국' },
]

const shuffle = (items) => {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

const createDeck = () => shuffle(COUNTRIES.flatMap((country) => [
  { ...country, key: `${country.id}-shape-a`, type: 'shape' },
  { ...country, key: `${country.id}-shape-b`, type: 'shape' },
]))

function GameCard({ card, flipped, matched, disabled, onFlip }) {
  const label = flipped || matched
    ? `${card.name} 실루엣`
    : '뒤집기'

  return (
    <button
      className={`game-card ${flipped || matched ? 'is-flipped' : ''} ${matched ? 'is-matched' : ''}`}
      type="button"
      aria-label={label}
      aria-pressed={flipped || matched}
      disabled={disabled || matched}
      onClick={onFlip}
    >
      <span className="card-rotor">
        <span className="card-side card-back"><img src="/assets/ui/card-back-clean.png" alt="" draggable="false" /></span>
        <span className="card-side card-front">
          <img className="card-shell" src="/assets/ui/card-front-clean.png" alt="" draggable="false" />
          <span className="card-content">
            <span className="shape-content">
              <img className="country-shape" src={`/assets/countries/${card.id}.png`} alt={`${card.name} 실루엣`} draggable="false" />
            </span>
            <span className="country-name">{card.name}</span>
          </span>
        </span>
      </span>
    </button>
  )
}

function App() {
  const [deck, setDeck] = useState(createDeck)
  const [open, setOpen] = useState([])
  const [matched, setMatched] = useState([])
  const [moves, setMoves] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [started, setStarted] = useState(false)
  const lockRef = useRef(false)

  const complete = matched.length === COUNTRIES.length
  const score = useMemo(() => Math.max(0, 5000 - moves * 110 - seconds * 4), [moves, seconds])

  useEffect(() => {
    if (!started || complete) return undefined
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [started, complete])

  const resetGame = useCallback(() => {
    setDeck(createDeck())
    setOpen([])
    setMatched([])
    setMoves(0)
    setSeconds(0)
    setStarted(false)
    lockRef.current = false
  }, [])

  const flipCard = (index) => {
    if (lockRef.current || open.includes(index) || matched.includes(deck[index].id)) return
    setStarted(true)
    const nextOpen = [...open, index]
    setOpen(nextOpen)
    if (nextOpen.length < 2) return

    lockRef.current = true
    setMoves((value) => value + 1)
    const [first, second] = nextOpen.map((position) => deck[position])
    const isPair = first.id === second.id

    window.setTimeout(() => {
      if (isPair) setMatched((items) => [...items, first.id])
      setOpen([])
      lockRef.current = false
    }, isPair ? 520 : 920)
  }

  return (
    <main className="game-stage">
      <div className="background-layer" aria-hidden="true" />
      <header className="hud">
        <div className="brand-block">
          <p className="eyebrow">CARTOGRAPHER'S TRIAL</p>
          <h1>월드 플립 아레나</h1>
        </div>
        <div className="stats" aria-label="게임 현황">
          <div><span>이동</span><strong>{String(moves).padStart(2, '0')}</strong></div>
          <div><span>시간</span><strong>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</strong></div>
          <div><span>점수</span><strong>{score.toLocaleString()}</strong></div>
        </div>
        <button className="reset-button" type="button" onClick={resetGame}>새 게임</button>
      </header>

      <section className="board" aria-label="나라 카드 뒤집기 게임판">
        <div className="mission-plate">
          <span>같은 나라의 실루엣 두 장을 찾아보세요</span>
          <strong>{matched.length} / {COUNTRIES.length}</strong>
        </div>
        <div className="card-grid">
          {deck.map((card, index) => (
            <GameCard
              key={card.key}
              card={card}
              flipped={open.includes(index)}
              matched={matched.includes(card.id)}
              disabled={lockRef.current}
              onFlip={() => flipCard(index)}
            />
          ))}
        </div>
      </section>

      {complete && (
        <div className="result-layer" role="dialog" aria-modal="true" aria-labelledby="result-title">
          <div className="result-panel">
            <img src="/assets/ui/card-back-clean.png" alt="" />
            <p>ATLAS RESTORED</p>
            <h2 id="result-title">세계 지도를 완성했습니다!</h2>
            <div className="result-score"><span>최종 점수</span><strong>{score.toLocaleString()}</strong></div>
            <button type="button" onClick={resetGame}>다시 도전</button>
          </div>
        </div>
      )}
    </main>
  )
}

export default App
