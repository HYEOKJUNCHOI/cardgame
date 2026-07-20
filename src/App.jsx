import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { COUNTRIES, REGIONS } from './data/countries'
import { REGION_PATHS } from './data/regionPaths'

const ALL_REGION_IDS = REGIONS.map((region) => region.id)

// 처음 실루엣을 익힐 때 알아보기 쉬운 주요 국가 위주 학습 풀.
const MAJOR_COUNTRY_IDS = new Set([
  'KOR', 'PRK', 'CHN', 'JPN', 'MNG', 'VNM', 'THA', 'MYS', 'SGP', 'IDN', 'PHL', 'MMR',
  'IND', 'PAK', 'BGD', 'NPL', 'LKA', 'AFG', 'KAZ',
  'TUR', 'IRN', 'IRQ', 'ISR', 'SAU', 'ARE', 'QAT', 'JOR',
  'GBR', 'FRA', 'DEU', 'NLD', 'BEL', 'CHE', 'AUT', 'IRL', 'NOR', 'SWE', 'FIN', 'DNK',
  'ITA', 'ESP', 'PRT', 'GRC', 'RUS', 'UKR', 'ROU', 'HUN', 'CZE', 'SRB',
  'EGY', 'MAR', 'DZA', 'TUN', 'LBY', 'NGA', 'GHA', 'CMR',
  'ZAF', 'KEN', 'ETH', 'TZA', 'UGA', 'MDG', 'MOZ', 'ZWE',
  'USA', 'CAN', 'MEX', 'CUB', 'JAM', 'PAN', 'CRI', 'DOM', 'HTI',
  'BRA', 'ARG', 'CHL', 'PER', 'COL', 'VEN', 'BOL', 'ECU', 'PRY', 'URY',
  'AUS', 'NZL', 'PNG', 'FJI',
])

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

const selectedCountryIds = (regionIds, majorOnly = false) => new Set(REGIONS
  .filter((region) => regionIds.includes(region.id))
  .flatMap((region) => region.countryIds)
  .filter((countryId) => !majorOnly || MAJOR_COUNTRY_IDS.has(countryId)))

const areaLabel = (regionIds) => {
  if (regionIds.length === ALL_REGION_IDS.length) return '세계 전체'
  const selected = REGIONS.filter((region) => regionIds.includes(region.id))
  if (selected.length === 1) return selected[0].label
  return `${selected[0]?.label ?? '지역'} 외 ${Math.max(0, selected.length - 1)}곳`
}

const createDeck = (regionIds = ALL_REGION_IDS, majorOnly = false) => {
  const normalizedRegionIds = regionIds.length ? regionIds : ALL_REGION_IDS
  const preferredIds = selectedCountryIds(normalizedRegionIds, majorOnly)
  const regionalIds = selectedCountryIds(normalizedRegionIds)
  const preferredCountries = COUNTRIES.filter((country) => preferredIds.has(country.id))
  const regionalCountries = COUNTRIES.filter((country) => regionalIds.has(country.id))
  const roundCountries = []
  const selectedRoundIds = new Set()

  for (const pool of [preferredCountries, regionalCountries, COUNTRIES]) {
    for (const country of shuffle(pool)) {
      if (roundCountries.length === ROUND_COUNTRY_COUNT) break
      if (selectedRoundIds.has(country.id)) continue
      roundCountries.push(country)
      selectedRoundIds.add(country.id)
    }
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
      data-country-id={card.id}
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
  const [deck, setDeck] = useState(() => createDeck(ALL_REGION_IDS, true))
  const [open, setOpen] = useState([])
  const [matchedIndexes, setMatchedIndexes] = useState([])
  const [seconds, setSeconds] = useState(0)
  const [started, setStarted] = useState(false)
  const [playerCount, setPlayerCount] = useState(1)
  const [pendingPlayerCount, setPendingPlayerCount] = useState(1)
  const [activeRegionIds, setActiveRegionIds] = useState(ALL_REGION_IDS)
  const [pendingRegionIds, setPendingRegionIds] = useState(ALL_REGION_IDS)
  const [activeMajorOnly, setActiveMajorOnly] = useState(true)
  const [pendingMajorOnly, setPendingMajorOnly] = useState(true)
  const [mismatchDelay, setMismatchDelay] = useState(800)
  const [currentPlayer, setCurrentPlayer] = useState(0)
  const [playerScores, setPlayerScores] = useState([0])
  const [matchedOwners, setMatchedOwners] = useState({})
  const [menuOpen, setMenuOpen] = useState(false)
  const lockRef = useRef(false)

  const complete = matchedIndexes.length === deck.length
  const soloScore = useMemo(() => Math.max(0, 10000 - seconds * 10), [seconds])
  const activeAreaLabel = `${areaLabel(activeRegionIds)}${activeMajorOnly ? ' · 주요 국가 우선' : ''}`
  const pendingCountryCount = selectedCountryIds(pendingRegionIds, pendingMajorOnly).size
  const pendingRegionalCountryCount = selectedCountryIds(pendingRegionIds).size
  const sameRegionSupplementCount = Math.min(
    Math.max(0, ROUND_COUNTRY_COUNT - pendingCountryCount),
    Math.max(0, pendingRegionalCountryCount - pendingCountryCount),
  )
  const globalSupplementCount = Math.max(
    0,
    ROUND_COUNTRY_COUNT - pendingCountryCount - sameRegionSupplementCount,
  )
  const pendingDeckDescription = (() => {
    if (pendingRegionalCountryCount === 0) return '선택 조건에 맞는 나라가 없어요'
    if (pendingCountryCount >= ROUND_COUNTRY_COUNT) {
      return `${pendingMajorOnly ? '주요 ' : '선택 나라 '}${pendingCountryCount}개국 중 무작위 15개국 · 30장`
    }

    const parts = []
    if (pendingMajorOnly) {
      if (pendingCountryCount) parts.push(`주요 ${pendingCountryCount}개국`)
      if (sameRegionSupplementCount) parts.push(`같은 지역 ${sameRegionSupplementCount}개국`)
    } else {
      parts.push(`선택 지역 ${pendingCountryCount}개국`)
    }
    if (globalSupplementCount) parts.push(`다른 지역 ${globalSupplementCount}개국`)
    return `${parts.join(' + ')} · 중복 없는 15개국 · 30장`
  })()
  const winnerText = useMemo(() => {
    const best = Math.max(...playerScores)
    const winners = playerScores
      .map((value, index) => (value === best ? `${index + 1}P` : null))
      .filter(Boolean)
    return winners.length > 1 ? `${winners.join(' · ')} 공동 승리!` : `${winners[0]} 승리!`
  }, [playerScores])

  useEffect(() => {
    const preventBrowserGesture = (event) => event.preventDefault()
    const blockedEvents = ['gesturestart', 'gesturechange', 'gestureend', 'dragstart', 'selectstart', 'contextmenu']

    document.addEventListener('touchmove', preventBrowserGesture, { passive: false })
    blockedEvents.forEach((eventName) => document.addEventListener(eventName, preventBrowserGesture))

    return () => {
      document.removeEventListener('touchmove', preventBrowserGesture)
      blockedEvents.forEach((eventName) => document.removeEventListener(eventName, preventBrowserGesture))
    }
  }, [])

  useEffect(() => {
    if (!started || complete) return undefined
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [started, complete])

  const resetGame = useCallback((
    nextPlayerCount = pendingPlayerCount,
    nextRegionIds = pendingRegionIds,
    nextMajorOnly = pendingMajorOnly,
  ) => {
    if (!nextRegionIds.length || selectedCountryIds(nextRegionIds).size === 0) return
    setDeck(createDeck(nextRegionIds, nextMajorOnly))
    setOpen([])
    setMatchedIndexes([])
    setSeconds(0)
    setStarted(false)
    setPlayerCount(nextPlayerCount)
    setPendingPlayerCount(nextPlayerCount)
    setActiveRegionIds(nextRegionIds)
    setPendingRegionIds(nextRegionIds)
    setActiveMajorOnly(nextMajorOnly)
    setPendingMajorOnly(nextMajorOnly)
    setCurrentPlayer(0)
    setPlayerScores(Array(nextPlayerCount).fill(0))
    setMatchedOwners({})
    setMenuOpen(false)
    lockRef.current = false
  }, [pendingMajorOnly, pendingPlayerCount, pendingRegionIds])

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

  const togglePendingRegion = (regionId) => {
    setPendingRegionIds((items) => (items.includes(regionId)
      ? items.filter((id) => id !== regionId)
      : [...items, regionId]))
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
              ? `${activeAreaLabel} · 완료 ${soloScore.toLocaleString()}점`
              : `${activeAreaLabel} · ${winnerText}`)
            : (playerCount === 1
              ? `${activeAreaLabel} · 기록 도전`
              : <>{activeAreaLabel} · <b style={{ color: PLAYER_COLORS[currentPlayer] }}>{currentPlayer + 1}P</b> 차례</>)}
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
              <legend>외울 지역 · 여러 지역 선택 가능</legend>
              <svg className="region-map" viewBox="0 0 600 300" role="img" aria-label="세계 지역 선택 지도">
                {REGIONS.map((region) => (
                  <path
                    className={pendingRegionIds.includes(region.id) ? 'is-selected' : ''}
                    key={region.id}
                    d={REGION_PATHS[region.id]}
                    role="button"
                    tabIndex="0"
                    aria-label={`${region.label} ${region.countryIds.length}개국 ${pendingRegionIds.includes(region.id) ? '선택 해제' : '선택'}`}
                    onClick={() => togglePendingRegion(region.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') togglePendingRegion(region.id)
                    }}
                  />
                ))}
              </svg>
              <div className="option-row region-options">
                <button
                  className={pendingRegionIds.length === ALL_REGION_IDS.length ? 'is-selected' : ''}
                  type="button"
                  aria-pressed={pendingRegionIds.length === ALL_REGION_IDS.length}
                  onClick={() => setPendingRegionIds(ALL_REGION_IDS)}
                >
                  <span>세계 전체</span>
                  <small>195개국</small>
                </button>
                {REGIONS.map((region) => (
                  <button
                    className={pendingRegionIds.includes(region.id) ? 'is-selected' : ''}
                    key={region.id}
                    type="button"
                    aria-pressed={pendingRegionIds.includes(region.id)}
                    onClick={() => togglePendingRegion(region.id)}
                  >
                    <span className={region.label.length > 9 ? 'is-long' : ''}>{region.label}</span>
                    <small>{region.countryIds.length}개국</small>
                  </button>
                ))}
              </div>
              <label className="major-country-toggle">
                <input
                  type="checkbox"
                  checked={pendingMajorOnly}
                  onChange={(event) => setPendingMajorOnly(event.target.checked)}
                />
                <span>
                  <strong>주요 국가 우선 출제</strong>
                  <small>15개국 미만이면 중복 없이 부족한 나라 보충</small>
                </span>
              </label>
              <p className={`region-count ${pendingRegionalCountryCount === 0 ? 'is-short' : ''}`}>
                {pendingDeckDescription}
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
              disabled={pendingRegionalCountryCount === 0}
              onClick={() => resetGame(pendingPlayerCount, pendingRegionIds, pendingMajorOnly)}
            >
              {pendingRegionalCountryCount === 0 ? '출제할 나라를 선택해 주세요' : '선택 조건으로 카드 섞고 새 게임'}
            </button>
          </section>
        </div>
      )}

    </main>
  )
}

export default App
