import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const COUNTRIES = [
  { id: 'KOR', name: '대한민국', flag: '🇰🇷' },
  { id: 'JPN', name: '일본', flag: '🇯🇵' },
  { id: 'USA', name: '미국', flag: '🇺🇸' },
  { id: 'FRA', name: '프랑스', flag: '🇫🇷' },
  { id: 'BRA', name: '브라질', flag: '🇧🇷' },
  { id: 'AUS', name: '호주', flag: '🇦🇺' },
  { id: 'EGY', name: '이집트', flag: '🇪🇬' },
  { id: 'IND', name: '인도', flag: '🇮🇳' },
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
  { ...country, key: `${country.id}-shape`, type: 'shape' },
  { ...country, key: `${country.id}-identity`, type: 'identity' },
]))

function GameCard({ card, flipped, matched, disabled, onFlip }) {
  const label = flipped || matched
    ? `${card.name} ${card.type === 'shape' ? '실루엣' : '국기 카드'}`
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
            {card.type === 'shape' ? (
              <>
                <img className="country-shape" src={`/assets/countries/${card.id}.png`} alt={`${card.name} 실루엣`} draggable="false" />
                <span className="shape-caption">어느 나라일까?</span>
              </>
            ) : (
              <span className="identity-content">
                <img className="flag" src={`/assets/flags/${card.id}.png`} alt={`${card.name} 국기`} draggable="false" />
                <span className="country-name">{card.name}</span>
                <span className="country-code">{card.id}</span>
              </span>
            )}
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
    const isPair = first.id === second.id && first.type !== second.type

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
          <span>실루엣과 국기를 찾아 짝을 맞추세요</span>
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
