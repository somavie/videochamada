"use client";

import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "peerjs";

export default function VideoCall() {
  const [myId, setMyId] = useState<string | null>(null);
  const [remoteId, setRemoteId] = useState<string | null>(null);
  const myVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerInstance = useRef<Peer | null>(null);
  const socket = useRef<any>(null);
  const [hasMounted, setHasMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Garante que o código só execute no cliente
    setHasMounted(true);
    if (typeof window === "undefined") return;

    // Inicializa o socket apenas no cliente
    socket.current = io("http://localhost:5000", { autoConnect: false });

    const peer = new Peer();
    peerInstance.current = peer;

    peer.on("open", (id) => {
      setMyId(id);
      socket.current.connect();
      socket.current.emit("join-room", "room-1", id);
    });

    peer.on("error", (err) => console.error("Erro PeerJS:", err));

    // 🚀 Tenta acessar a câmera e microfone
    async function requestMedia() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("API de mídia não suportada neste navegador.");
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (myVideoRef.current) {
          myVideoRef.current.srcObject = stream;
        }

        peer.on("call", (call) => {
          call.answer(stream);
          call.on("stream", (remoteStream) => {
            if (remoteVideoRef.current && !remoteVideoRef.current.srcObject) {
              remoteVideoRef.current.srcObject = remoteStream;
            }
          });
        });

        socket.current.on("user-connected", (userId: string) => {
          setRemoteId(userId);
          const call = peer.call(userId, stream);
          call.on("stream", (remoteStream) => {
            if (remoteVideoRef.current && !remoteVideoRef.current.srcObject) {
              remoteVideoRef.current.srcObject = remoteStream;
            }
          });
        });
      } catch (err: any) {
        setError("Erro ao acessar câmera/microfone: " + err.message);
        console.error("Erro ao acessar câmera/microfone:", err);
      }
    }

    requestMedia();

    return () => {
      peer.disconnect();
      socket.current.disconnect();
    };
  }, []);

  // 🔴 Evita erro de Hydration Mismatch
  if (!hasMounted) return null;

  return (
    <div className="flex flex-col items-center space-y-4">
      <h1 className="text-2xl font-bold">Video Chamada</h1>

      {error && <p className="text-red-500">{error}</p>}

      <video
        ref={myVideoRef}
        autoPlay
        playsInline
        muted // 🔴 Necessário para autoplay sem permissão manual
        className="w-1/2 border"
      />
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="w-1/2 border"
      />

      <p>ID da Chamada: {myId || "Carregando..."}</p>
    </div>
  );
}
