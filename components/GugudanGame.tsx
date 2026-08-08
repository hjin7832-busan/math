'use client'

import { useState, useEffect, useRef } from 'react'
import {
  validateNumericName,
  isDuplicate,
  submitScore,
  getTodayLeaderboard,
  getHallOfFame,
  todayStr,
  LeaderboardEntry,
  HallOfFameEntry
} from '@/lib/leaderboardManager'

// ── 효과음 ──────────────────────────────────────────────────────────
function beep(type: 'ok' | 'ng' | 'end') {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AC()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    const now = ctx.currentTime
    if (type === 'ok') {
      osc.type = 'sine'; osc.frequency.value = 660
      gain.gain.setValueAtTime(0.18, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
      osc.start(now); osc.stop(now + 0.15)
    } else if (type === 'ng') {
      osc.type = 'sawtooth'; osc.frequency.value = 180
      gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
      osc.start(now); osc.stop(now + 0.25)
    } else {
      osc.type = 'triangle'; osc.frequency.value = 300
      gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
      osc.start(now); osc.stop(now + 0.5)
    }
  } catch { /* 자동재생 차단 무시 */ }
}

// ── 구구단 문제 생성 ──────────────────────────────────────────────
interface Q {
  text: string
  answer: number
  choices: number[]
}

function makeQuestion(): Q {
  const a = Math.floor(Math.random() * 8) + 2   // 2~9
  const b = Math.floor(Math.random() * 8) + 2   // 2~9
  const answer = a * b

  const wrong = new Set<number>()
  while (wrong.size < 3) {
    const delta = (Math.floor(Math.random() * 5) + 1) * (Math.random() > 0.5 ? 1 : -1)
    const w = answer + delta
    if (w > 0 && w !== answer) wrong.add(w)
  }

  const choices = [answer, ...Array.from(wrong)].sort(() => Math.random() - 0.5)
  return { text: `${a} × ${b} = ?`, answer, choices }
}

const GAME_SECS = 45

export default function GugudanGame({ onDone }: { onDone?: () => void }) {
  const [name, setName] = useState('')
  const [nameErr, setNameErr] = useState('')

  const [phase, setPhase] = useState<'idle' | 'playing' | 'done'>('idle')
  const [q, setQ] = useState<Q>(makeQuestion())
  const [timeLeft, setTimeLeft] = useState(GAME_SECS)
  const [score, setScore] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [flash, setFlash] = useState<'ok' | 'ng' | null>(null)
  const [resultMsg, setResultMsg] = useState('')

  // 리더보드 서브 탭 (게임 화면 내 바로 확인 가능)
  const [recordTab, setRecordTab] = useState<'today' | 'hof'>('today')
  const [todayList, setTodayList] = useState<LeaderboardEntry[]>([])
  const [hofList, setHofList] = useState<HallOfFameEntry[]>([])

  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const refreshRecords = () => {
    setTodayList(getTodayLeaderboard('gugudan'))
    setHofList(getHallOfFame('gugudan'))
  }

  useEffect(() => {
    refreshRecords()
  }, [])

  const clearTimer = () => { if (timerRef.current) clearInterval(timerRef.current) }

  const endGame = (finalScore: number, finalCorrect: number, finalMaxCombo: number) => {
    clearTimer()
    beep('end')
    setPhase('done')
    const res = submitScore({
      gameId: 'gugudan',
      numericName: name,
      score: finalScore,
      correctCount: finalCorrect,
      maxCombo: finalMaxCombo,
    })
    setResultMsg(res.ok ? '🎉 점수가 오늘 순위에 등록되었습니다!' : (res.msg ?? ''))
    refreshRecords()
    onDone?.()
  }

  const startGame = () => {
    const v = validateNumericName(name)
    if (!v.ok) { setNameErr(v.msg ?? ''); return }
    if (isDuplicate(name, 'gugudan')) { setNameErr(`[${name}]은 오늘 이미 등록된 학번/PIN입니다.`); return }

    setNameErr('')
    setScore(0); setCorrect(0); setCombo(0); setMaxCombo(0)
    setTimeLeft(GAME_SECS); setQ(makeQuestion()); setPhase('playing')

    let sc = 0, cor = 0, cmb = 0, maxC = 0
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(interval); endGame(sc, cor, maxC); return 0 }
        return t - 1
      })
    }, 1000)
    timerRef.current = interval
  }

  const handleChoice = (choice: number) => {
    if (phase !== 'playing') return
    const isOk = choice === q.answer
    beep(isOk ? 'ok' : 'ng')
    setFlash(isOk ? 'ok' : 'ng')
    setTimeout(() => setFlash(null), 200)

    if (isOk) {
      const newCombo = combo + 1
      const pts = 100 + newCombo * 20
      setScore(s => s + pts)
      setCorrect(c => c + 1)
      setCombo(newCombo)
      setMaxCombo(m => Math.max(m, newCombo))
    } else {
      setCombo(0)
    }
    setQ(makeQuestion())
  }

  const reset = () => {
    clearTimer(); setPhase('idle'); setName(''); setNameErr('')
    refreshRecords()
  }

  useEffect(() => () => clearTimer(), [])

  // ─────────────────────────────────────────────────────────────────
  // 1. 대기 화면 (게임 정보 + 기록 바로 확인)
  // ─────────────────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <div className="space-y-8 max-w-lg mx-auto">
        {/* 게임 카드 */}
        <div className="bg-white p-6 border border-gray-100 rounded-2xl shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              🎯 구구단 스피드 챌린지
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              45초 동안 신속하게 구구단 정답을 맞추고 최고의 기록에 도전하세요!
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500">학번 / PIN 번호</label>
            <input
              type="text"
              value={name}
              onChange={e => {
                const cleaned = e.target.value.replace(/\D/g, '')
                setName(cleaned)
                setNameErr(cleaned !== e.target.value ? '숫자만 입력할 수 있습니다.' : '')
              }}
              placeholder="예: 20301"
              maxLength={10}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base font-mono focus:outline-none focus:border-gray-900 transition-colors"
            />
            {nameErr && <p className="text-xs text-red-500">{nameErr}</p>}
          </div>

          <button
            onClick={startGame}
            className="w-full py-3.5 bg-gray-900 text-white text-base font-bold rounded-xl hover:bg-gray-800 active:scale-[0.99] transition-all shadow-sm"
          >
            게임 시작하기 ({GAME_SECS}초)
          </button>
        </div>

        {/* 🏆 구구단 게임 전용 기록 보드 */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
              📊 구구단 랭킹 기록
            </h3>

            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setRecordTab('today')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  recordTab === 'today' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                오늘의 순위
              </button>
              <button
                onClick={() => setRecordTab('hof')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  recordTab === 'hof' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                명예의 전당 (7일)
              </button>
            </div>
          </div>

          {/* 오늘의 순위 서브 뷰 */}
          {recordTab === 'today' && (
            <div className="space-y-3">
              <p className="text-[11px] text-gray-400">📅 {todayStr()} 기준 (매일 자정 리셋)</p>
              {todayList.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">아직 오늘의 기록이 없습니다. 첫 플레이어가 되어보세요!</p>
              ) : (
                <div className="divide-y divide-gray-50 max-h-56 overflow-y-auto">
                  {todayList.map((e, i) => (
                    <div key={e.id} className="flex items-center justify-between py-2.5 px-1">
                      <div className="flex items-center gap-3">
                        <span className={`w-5 text-center text-xs font-bold ${
                          i === 0 ? 'text-amber-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-400' : 'text-gray-300'
                        }`}>
                          {i + 1}
                        </span>
                        <span className="font-mono text-sm font-semibold text-gray-800">#{e.numericName}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-mono">
                        <span className="text-indigo-600 font-bold">{e.score}점</span>
                        <span className="text-gray-400">{e.correctCount}개 정답</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 명예의 전당 서브 뷰 */}
          {recordTab === 'hof' && (
            <div className="space-y-3">
              <p className="text-[11px] text-gray-400">👑 매일 자정 1위 기록 보존 (7일 유지)</p>
              {hofList.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">아직 명예의 전당 챔피언 기록이 없습니다.</p>
              ) : (
                <div className="divide-y divide-gray-50 max-h-56 overflow-y-auto">
                  {hofList.map(e => (
                    <div key={e.id} className="flex items-center justify-between py-2.5 px-1">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 font-mono">{e.date}</span>
                        <span className="font-mono text-sm font-semibold text-gray-800">#{e.numericName}</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-amber-600">{e.score}점</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────
  // 2. 플레이 화면
  // ─────────────────────────────────────────────────────────────────
  if (phase === 'playing') {
    return (
      <div className="space-y-6 max-w-sm mx-auto">
        <div className="flex items-center justify-between text-sm">
          <span className="font-mono text-gray-400">#{name}</span>
          <span className={`font-mono font-extrabold text-lg ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-gray-800'}`}>
            ⏱️ {timeLeft}s
          </span>
          <span className="font-mono text-indigo-600 font-bold text-base">{score}점</span>
        </div>

        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${timeLeft <= 10 ? 'bg-red-500' : 'bg-gray-900'}`}
            style={{ width: `${(timeLeft / GAME_SECS) * 100}%` }}
          />
        </div>

        <div className="h-6 flex items-center justify-center">
          {combo > 1 && (
            <span className="text-xs font-bold text-orange-500 tracking-wider">
              ⚡ {combo} COMBO! (+{100 + combo * 20}점)
            </span>
          )}
        </div>

        <div
          className={`text-center py-10 border rounded-2xl transition-colors ${
            flash === 'ok' ? 'border-green-300 bg-green-50' :
            flash === 'ng' ? 'border-red-300 bg-red-50' :
            'border-gray-100 bg-white shadow-sm'
          }`}
        >
          <p className="text-4xl font-extrabold font-mono text-gray-900">{q.text}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {q.choices.map((c, i) => (
            <button
              key={i}
              onClick={() => handleChoice(c)}
              className="py-4 border border-gray-200 bg-white rounded-2xl text-2xl font-mono font-bold text-gray-800 hover:border-gray-900 hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────
  // 3. 종료 화면
  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-sm mx-auto bg-white p-6 border border-gray-100 rounded-2xl shadow-sm">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-gray-900">🎉 게임 종료!</h2>
        <p className="text-sm font-mono text-gray-400">학번/PIN: #{name}</p>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="py-4 bg-gray-50 border border-gray-100 rounded-xl">
          <div className="text-xs text-gray-400">최종 점수</div>
          <div className="text-xl font-extrabold font-mono text-indigo-600 mt-1">{score}점</div>
        </div>
        <div className="py-4 bg-gray-50 border border-gray-100 rounded-xl">
          <div className="text-xs text-gray-400 font-medium">정답 개수</div>
          <div className="text-xl font-bold font-mono text-gray-900 mt-1">{correct}개</div>
        </div>
        <div className="py-4 bg-gray-50 border border-gray-100 rounded-xl">
          <div className="text-xs text-gray-400 font-medium">최대 콤보</div>
          <div className="text-xl font-bold font-mono text-orange-500 mt-1">{maxCombo}×</div>
        </div>
      </div>

      {resultMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs font-semibold text-emerald-700">
          {resultMsg}
        </div>
      )}

      <button
        onClick={reset}
        className="w-full py-3 bg-gray-900 text-white font-semibold text-sm rounded-xl hover:bg-gray-800 transition-colors"
      >
        다시 도전하기
      </button>
    </div>
  )
}
