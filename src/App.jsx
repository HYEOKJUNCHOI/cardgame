import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { COUNTRIES, REGIONS } from './data/countries'
import { REGION_PATHS } from './data/regionPaths'

const PLAY_AREAS = [
  { id: 'world', label: '세계 전체', countryIds: COUNTRIES.map((country) => country.id) },
  ...REGIONS,
]

const PLAYER_COLORS = ['#ffd46a', '#63c7ff', '#ff7f82']
const COUNTRY_COLOR_OVERRIDES = {
  KOR: '#0047a0', JPN: '#005bac', USA: '#1c2e5a', FRA: '#244aa5', BRA: '#d5ad00',
  AUS: '#164b35', EGY: '#8f1d36', IND: '#1688ba', CAN: '#d71920', DEU: '#2a2a2a',
  ITA: '#008bc7', CHN: '#e13b26', GBR: '#6d7fa3', ESP: '#a61b2b', PRT: '#7e1738',
  MEX: '#006341', ARG: '#62a8e5', CHL: '#174f9c', PER: '#c2185b', COL: '#d0a900',
  RUS: '#3158a5', TUR: '#b20d30', SAU: '#0b7a45', ZAF: '#006b5b', NGA: '#16a05d',
  KEN: '#a91f2c', THA: '#322d74', VNM: '#d82c20', IDN: '#c8102e', NZL: '#17191c',
}
const COUNTRY_PALETTE = ['#c53a3f', '#2166a5', '#16805c', '#c08214', '#70479b', '#b54878', '#287e8e', '#9b5128']
const countryColor = (id) => COUNTRY_COLOR_OVERRIDES[id] ?? COUNTRY_PALETTE[
  [...id].reduce((total, letter) => total + letter.charCodeAt(0), 0) % COUNTRY_PALETTE.length
]
const ROUND_COUNTRY_COUNT = 15

const shuffle = (items) => {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

const createDeck = (areaId = 'world') => {
  const area = PLAY_AREAS.find((item) => item.id === areaId) ?? PLAY_AREAS[0]
  const selectedIds = new Set(area.countryIds)
  const availableCountries = COUNTRIES.filter((country) => selectedIds.has(country.id))
  const roundCountries = shuffle(availableCountries).slice(0, ROUND_COUNTRY_COUNT)
  if (roundCountries.length < ROUND_COUNTRY_COUNT) {
    roundCountries.push(...shuffle(availableCountries).slice(0, ROUND_COUNTRY_COUNT - roundCountries.length))
  }
  return shuffle(roundCountries.flatMap((country, pairIndex) => [
    { ...country, key: `${country.id}-${pairIndex}-shape-a` },
    { ...country, key: `${country.id}-${pairIndex}-shape-b` },
  ]))
}

function GameCard({ card, flipped, matched, owner, disabled, onFlip }) {
  const label = matched ? `${card.name} 실루엣` : flipped ? '나라 실루엣' : '뒤집기'
  const ownerClass = owner === undefined ? '' : `is-owned owner-${owner + 1}`

  return (
    <button
      className={`game-card ${flipped || matched ? 'is-flipped' : ''} ${matched ? 'is-matched' : ''} ${ownerClass}`}
      style={{
        '--country-color': countryColor(card.id),
        '--country-mask': `url("/assets/countries/${card.id}.png")`,
      }}
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
                alt="나라 실루엣"
                draggable="false"
              />
              <span className="country-shape-solid" aria-hidden="true" />
            </span>
            <span className="country-name" title={matched ? card.name : undefined}>
              {matched ? (card.shortName ?? card.name) : ''}
            </span>
          </span>
        </span>
      </span>
    </button>
  )
}

function App() {
  const [deck, setDeck] = useState(createDeck)
  const [open, setOpen] = useState([])
  const [matchedIndexes, setMatchedIndexes] = useState([])
  const [seconds, setSeconds] = useState(0)
  const [started, setStarted] = useState(false)
  const [playerCount, setPlayerCount] = useState(2)
  const [pendingPlayerCount, setPendingPlayerCount] = useState(2)
  const [activeAreaId, setActiveAreaId] = useState('world')
  const [pendingAreaId, setPendingAreaId] = useState('world')
  const [mismatchDelay, setMismatchDelay] = useState(1000)
  const [currentPlayer, setCurrentPlayer] = useState(0)
  const [playerScores, setPlayerScores] = useState([0, 0])
  const [matchedOwners, setMatchedOwners] = useState({})
  const [menuOpen, setMenuOpen] = useState(false)
  const lockRef = useRef(false)

  const complete = matchedIndexes.length === deck.length
  const soloScore = useMemo(() => Math.max(0, 10000 - seconds * 10), [seconds])
  const activeArea = PLAY_AREAS.find((area) => area.id === activeAreaId) ?? PLAY_AREAS[0]
  const pendingArea = PLAY_AREAS.find((area) => area.id === pendingAreaId) ?? PLAY_AREAS[0]
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

  const resetGame = useCallback((
    nextPlayerCount = pendingPlayerCount,
    nextAreaId = pendingAreaId,
  ) => {
    setDeck(createDeck(nextAreaId))
    setOpen([])
    setMatchedIndexes([])
    setSeconds(0)
    setStarted(false)
    setPlayerCount(nextPlayerCount)
    setPendingPlayerCount(nextPlayerCount)
    setActiveAreaId(nextAreaId)
    setPendingAreaId(nextAreaId)
    setCurrentPlayer(0)
    setPlayerScores(Array(nextPlayerCount).fill(0))
    setMatchedOwners({})
    setMenuOpen(false)
    lockRef.current = false
  }, [pendingAreaId, pendingPlayerCount])

  const flipCard = (index) => {
    if (lockRef.current || open.includes(index) || matchedIndexes.includes(index)) return

    setStarted(true)
    const nextOpen = [...open, index]
    setOpen(nextOpen)
    if (nextOpen.length < 2) return

    lockRef.current = true
    const [first, second] = nextOpen.map((position) => deck[position])
    const isPair = first.id === second.id

    window.setTimeout(() => {
      if (isPair) {
        setMatchedIndexes((items) => [...items, ...nextOpen])
        setMatchedOwners((owners) => ({ ...owners, [nextOpen[0]]: currentPlayer, [nextOpen[1]]: currentPlayer }))
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
              matched={matchedIndexes.includes(index)}
              owner={matchedOwners[index]}
              disabled={lockRef.current}
              onFlip={() => flipCard(index)}
            />
          ))}
        </div>
      </section>

      <footer className="score-footer" aria-label={playerCount === 1 ? '싱글 플레이 기록' : '플레이어 획득 점수'}>
        <span className="turn-label">
          {complete
            ? (playerCount === 1
              ? `${activeArea.label} · 완료 ${soloScore.toLocaleString()}점`
              : `${activeArea.label} · ${winnerText}`)
            : (playerCount === 1
              ? `${activeArea.label} · 기록 도전`
              : <>{activeArea.label} · <b style={{ color: PLAYER_COLORS[currentPlayer] }}>{currentPlayer + 1}P</b> 차례</>)}
        </span>
        <div className="player-scores">
          {playerCount === 1 ? (
            <div
              className="player-score is-current is-record"
              style={{ '--player-color': PLAYER_COLORS[0] }}
              aria-label={`현재 기록 ${soloScore.toLocaleString()}점`}
            >
              <span>기록</span>
              <strong>{soloScore.toLocaleString()}</strong>
              <em>점</em>
            </div>
          ) : playerScores.map((pairs, index) => (
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
              <legend>외울 지역 · 지도나 이름을 선택</legend>
              <svg className="region-map" viewBox="0 0 600 300" role="img" aria-label="세계 지역 선택 지도">
                {REGIONS.map((region) => (
                  <path
                    className={pendingAreaId === 'world' || pendingAreaId === region.id ? 'is-selected' : ''}
                    key={region.id}
                    d={REGION_PATHS[region.id]}
                    role="button"
                    tabIndex="0"
                    aria-label={`${region.label} ${region.countryIds.length}개국 선택`}
                    onClick={() => setPendingAreaId(region.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') setPendingAreaId(region.id)
                    }}
                  />
                ))}
              </svg>
              <div className="option-row region-options">
                {PLAY_AREAS.map((area) => (
                  <button
                    className={pendingAreaId === area.id ? 'is-selected' : ''}
                    key={area.id}
                    type="button"
                    aria-pressed={pendingAreaId === area.id}
                    onClick={() => setPendingAreaId(area.id)}
                  >
                    <span>{area.label}</span>
                    <small>{area.countryIds.length}개국</small>
                  </button>
                ))}
              </div>
              <p className="region-count">
                {pendingArea.id === 'oceania'
                  ? '14개국 전부 + 무작위 1개국 복습 · 30장'
                  : `${pendingArea.countryIds.length}개국 중 무작위 15개국 · 30장`}
              </p>
            </fieldset>

            <fieldset>
              <legend>틀린 카드 공개 시간</legend>
              <div className="option-row time-options">
                {[800, 1000, 1500, 2000].map((delay) => (
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

            <button
              className="shuffle-button"
              type="button"
              onClick={() => resetGame(pendingPlayerCount, pendingAreaId)}
            >
              {pendingArea.label} 카드 섞고 새 게임
            </button>
          </section>
        </div>
      )}

    </main>
  )
}

export default App
