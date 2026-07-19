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
  { id: 'GBR', name: '영국' },
  { id: 'ESP', name: '스페인' },
  { id: 'PRT', name: '포르투갈' },
  { id: 'MEX', name: '멕시코' },
  { id: 'ARG', name: '아르헨티나' },
  { id: 'CHL', name: '칠레' },
  { id: 'PER', name: '페루' },
  { id: 'COL', name: '콜롬비아' },
  { id: 'RUS', name: '러시아' },
  { id: 'TUR', name: '튀르키예' },
  { id: 'SAU', name: '사우디아라비아' },
  { id: 'ZAF', name: '남아프리카공화국', shortName: '남아공' },
  { id: 'NGA', name: '나이지리아' },
  { id: 'KEN', name: '케냐' },
  { id: 'THA', name: '태국' },
  { id: 'VNM', name: '베트남' },
  { id: 'IDN', name: '인도네시아' },
  { id: 'NZL', name: '뉴질랜드' },
]

const PLAYER_COLORS = ['#ffd46a', '#63c7ff', '#ff7f82']
const ROUND_COUNTRY_COUNT = 20

const shuffle = (items) => {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

const createDeck = () => {
  const roundCountries = shuffle(COUNTRIES).slice(0, ROUND_COUNTRY_COUNT)
  return shuffle(roundCountries.flatMap((country) => [
    { ...country, key: `${country.id}-shape-a` },
    { ...country, key: `${country.id}-shape-b` },
  ]))
}

function GameCard({ card, flipped, matched, owner, disabled, onFlip }) {
  const label = flipped || matched ? `${card.name} 실루엣` : '뒤집기'
  const ownerClass = owner === undefined ? '' : `is-owned owner-${owner + 1}`

  return (
    <button
      className={`game-card ${flipped || matched ? 'is-flipped' : ''} ${matched ? 'is-matched' : ''} ${ownerClass}`}
      type="button"
      aria-label={label}
      aria-pressed={flipped || matched}
      data-owner={owner === undefined ? undefined : `${owner + 1}P`}
      disabled={disabled || matched}
      onClick={onFlip}
    >
      <span className="card-rotor">
        <span className="card-side card-back">
          <img src="/assets/ui/card-back-clean.png" alt="" draggable="false" />
        </span>
        <span className="card-side card-front">
          <img className="card-shell" src="/assets/ui/card-front-clean.png" alt="" draggable="false" />
          <span className="card-content">
            <span className="shape-content">
              <img
                className="country-shape"
                src={`/assets/countries/${card.id}.png`}
                alt={`${card.name} 실루엣`}
                draggable="false"
              />
            </span>
            <span className="country-name" title={card.name}>{card.shortName ?? card.name}</span>
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
  const [playerCount, setPlayerCount] = useState(2)
  const [pendingPlayerCount, setPendingPlayerCount] = useState(2)
  const [mismatchDelay, setMismatchDelay] = useState(1000)
  const [currentPlayer, setCurrentPlayer] = useState(0)
  const [playerScores, setPlayerScores] = useState([0, 0])
  const [matchedOwners, setMatchedOwners] = useState({})
  const [menuOpen, setMenuOpen] = useState(false)
  const lockRef = useRef(false)

  const complete = matched.length === deck.length / 2
  const score = useMemo(() => Math.max(0, 9000 - moves * 80 - seconds * 3), [moves, seconds])
  const winnerText = useMemo(() => {
    const best = Math.max(...playerScores)
    const winners = playerScores
      .map((value, index) => (value === best ? `${index + 1}P` : null))
      .filter(Boolean)
    return winners.length > 1 ? `${winners.join(' · ')} 공동 승리!` : `${winners[0]} 승리!`
  }, [playerScores])

  useEffect(() => {
    if (!started || complete) return undefined
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [started, complete])

  const resetGame = useCallback((nextPlayerCount = pendingPlayerCount) => {
    setDeck(createDeck())
    setOpen([])
    setMatched([])
    setMoves(0)
    setSeconds(0)
    setStarted(false)
    setPlayerCount(nextPlayerCount)
    setPendingPlayerCount(nextPlayerCount)
    setCurrentPlayer(0)
    setPlayerScores(Array(nextPlayerCount).fill(0))
    setMatchedOwners({})
    setMenuOpen(false)
    lockRef.current = false
  }, [pendingPlayerCount])

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
      if (isPair) {
        setMatched((items) => [...items, first.id])
        setMatchedOwners((owners) => ({ ...owners, [first.id]: currentPlayer }))
        setPlayerScores((scores) => scores.map((value, index) => (
          index === currentPlayer ? value + 1 : value
        )))
      } else {
        setCurrentPlayer((player) => (player + 1) % playerCount)
      }
      setOpen([])
      lockRef.current = false
    }, isPair ? 430 : mismatchDelay)
  }

  return (
    <main className="game-stage">
      <div className="background-layer" aria-hidden="true" />

      <section className="board" aria-label="나라 카드 뒤집기 게임판">
        <div className="card-grid">
          {deck.map((card, index) => (
            <GameCard
              key={card.key}
              card={card}
              flipped={open.includes(index)}
              matched={matched.includes(card.id)}
              owner={matchedOwners[card.id]}
              disabled={lockRef.current}
              onFlip={() => flipCard(index)}
            />
          ))}
        </div>
      </section>

      <footer className="score-footer" aria-label="플레이어 획득 점수">
        <span className="turn-label"><b style={{ color: PLAYER_COLORS[currentPlayer] }}>{currentPlayer + 1}P</b> 차례</span>
        <div className="player-scores">
          {playerScores.map((pairs, index) => (
            <div
              className={`player-score ${currentPlayer === index && !complete ? 'is-current' : ''}`}
              key={index}
              style={{ '--player-color': PLAYER_COLORS[index] }}
            >
              <span>{index + 1}P</span>
              <strong>{pairs}</strong>
              <em>쌍</em>
            </div>
          ))}
        </div>
        <button
          className="footer-menu-button"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="game-menu"
          onClick={() => setMenuOpen(true)}
        >
          메뉴
        </button>
      </footer>

      {menuOpen && (
        <div className="menu-layer" role="presentation" onMouseDown={() => setMenuOpen(false)}>
          <section
            className="game-menu"
            id="game-menu"
            role="dialog"
            aria-modal="true"
            aria-labelledby="menu-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="menu-heading">
              <h2 id="menu-title">게임 메뉴</h2>
              <button type="button" aria-label="메뉴 닫기" onClick={() => setMenuOpen(false)}>×</button>
            </div>

            <fieldset>
              <legend>플레이 인원</legend>
              <div className="option-row player-options">
                {[1, 2, 3].map((count) => (
                  <button
                    className={pendingPlayerCount === count ? 'is-selected' : ''}
                    key={count}
                    type="button"
                    aria-pressed={pendingPlayerCount === count}
                    onClick={() => setPendingPlayerCount(count)}
                  >
                    <i style={{ '--option-color': PLAYER_COLORS[count - 1] }} />
                    {count}인
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend>틀린 카드 공개 시간</legend>
              <div className="option-row time-options">
                {[500, 1000, 1500, 2000].map((delay) => (
                  <button
                    className={mismatchDelay === delay ? 'is-selected' : ''}
                    key={delay}
                    type="button"
                    aria-pressed={mismatchDelay === delay}
                    onClick={() => setMismatchDelay(delay)}
                  >
                    {delay / 1000}초
                  </button>
                ))}
              </div>
            </fieldset>

            <button className="shuffle-button" type="button" onClick={() => resetGame(pendingPlayerCount)}>
              카드 섞고 새 게임
            </button>
          </section>
        </div>
      )}

      {complete && (
        <div className="result-layer" role="dialog" aria-modal="true" aria-labelledby="result-title">
          <div className="result-panel">
            <img src="/assets/ui/card-back-clean.png" alt="" />
            <p>ATLAS RESTORED</p>
            <h2 id="result-title">{winnerText}</h2>
            <div className="result-score"><span>최종 점수</span><strong>{score.toLocaleString()}</strong></div>
            <div className="result-players">
              {playerScores.map((pairs, index) => <span key={index}>{index + 1}P {pairs}쌍</span>)}
            </div>
            <button type="button" onClick={() => resetGame()}>다시 도전</button>
          </div>
        </div>
      )}
    </main>
  )
}

export default App
