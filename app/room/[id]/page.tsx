"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getOrCreateSessionId } from "@/lib/utils/session"
import RoomLobby from "@/components/game/room-lobby"
import SubmissionPhase from "@/components/game/submission-phase"
import VotingPhase from "@/components/game/voting-phase"
import ResultsPhase from "@/components/game/results-phase"

export default function RoomPage() {
  const params = useParams()
  const roomId = params.id as string
  const supabase = createClient()
  const sessionId = getOrCreateSessionId()

  const [room, setRoom] = useState<any>(null)
  const [round, setRound] = useState<any>(null)
  const [players, setPlayers] = useState<any[]>([])
  const [isHost, setIsHost] = useState(false)
  const [gamePhase, setGamePhase] = useState("lobby") // lobby, submission, voting, results

  useEffect(() => {
    // Fetch room data
    const fetchRoom = async () => {
      const { data } = await supabase.from("rooms").select("*").eq("id", roomId).single()

      if (data) {
        setRoom(data)
        setIsHost(data.host_session_id === sessionId)
        setGamePhase(data.state)
      }
    }

    // Subscribe to room changes
    const subscription = supabase
      .channel(`room:${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
        (payload) => {
          setRoom(payload.new)
          setGamePhase(payload.new.state)
        },
      )
      .subscribe()

    fetchRoom()
    return () => {
      subscription.unsubscribe()
    }
  }, [roomId, sessionId, supabase])

  useEffect(() => {
    // Fetch players
    const fetchPlayers = async () => {
      const { data } = await supabase.from("room_players").select("*").eq("room_id", roomId)

      setPlayers(data || [])
    }

    // Subscribe to players
    const subscription = supabase
      .channel(`players:${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_players", filter: `room_id=eq.${roomId}` },
        (payload) => {
          fetchPlayers()
        },
      )
      .subscribe()

    fetchPlayers()
    return () => {
      subscription.unsubscribe()
    }
  }, [roomId, supabase])

  if (!room) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Room header */}
        <div className="mb-8 text-center">
          <div className="inline-block bg-white/10 backdrop-blur px-6 py-3 rounded-full mb-4">
            <p className="text-white text-lg font-mono font-bold">Room: {room.room_code}</p>
          </div>
        </div>

        {/* Game phase rendering */}
        {gamePhase === "lobby" && <RoomLobby roomId={roomId} players={players} isHost={isHost} />}
        {gamePhase === "submission" && <SubmissionPhase roomId={roomId} players={players} sessionId={sessionId} />}
        {gamePhase === "voting" && <VotingPhase roomId={roomId} players={players} />}
        {gamePhase === "results" && <ResultsPhase roomId={roomId} players={players} />}
      </div>
    </main>
  )
}
