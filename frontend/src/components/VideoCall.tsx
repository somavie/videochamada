"use client";

import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import SimplePeer from "simple-peer";

const socket: Socket = io("http://localhost:5000");

export default function Chat() {
  const [roomId, setRoomId] = useState("");
  const [userId] = useState(() => Math.random().toString(36).substring(2, 7));
  const [messages, setMessages] = useState<{ userId: string; msg: string }[]>(
    []
  );
  const [msg, setMsg] = useState("");
  const [participants, setParticipants] = useState<
    { userId: string; socketId: string }[]
  >([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<{
    [socketId: string]: SimplePeer.Instance;
  }>({});
  const myVideo = useRef<HTMLVideoElement>(null);
  const userVideos = useRef<{ [key: string]: HTMLVideoElement | null }>({});

  useEffect(() => {
    socket.on("receive-message", ({ userId, msg }) => {
      setMessages((prev) => [...prev, { userId, msg }]);
    });

    socket.on("user-joined", ({ userId, socketId }) => {
      setParticipants((prev) => [...prev, { userId, socketId }]);
    });

    socket.on("peer-signal", ({ signal, from }) => {
      if (peers[from]) {
        peers[from].signal(signal);
      }
    });

    socket.on("user-left", ({ userId }) => {
      setParticipants((prev) => prev.filter((p) => p.userId !== userId));
    });

    return () => {
      socket.off("receive-message");
      socket.off("user-joined");
      socket.off("peer-signal");
      socket.off("user-left");
    };
  }, [peers]);

  const joinRoom = () => {
    if (roomId) {
      socket.emit("join-room", { roomId, userId });
    }
  };

  const sendMessage = () => {
    if (msg.trim()) {
      socket.emit("send-message", { msg });
      setMessages((prev) => [...prev, { userId: "Você", msg }]);
      setMsg("");
    }
  };

  const startCall = async () => {
    const userStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    setStream(userStream);
    if (myVideo.current) myVideo.current.srcObject = userStream;

    const newPeers: { [key: string]: SimplePeer.Instance } = {};

    participants.forEach(({ socketId }) => {
      const peer = new SimplePeer({
        initiator: true,
        trickle: false,
        stream: userStream,
      });

      peer.on("signal", (signal) => {
        socket.emit("send-signal", { signal, to: socketId });
      });

      peer.on("stream", (userStream) => {
        if (userVideos.current[socketId]) {
          userVideos.current[socketId]!.srcObject = userStream;
        }
      });

      newPeers[socketId] = peer;
    });

    setPeers(newPeers);
  };

  return (
    <div className="flex flex-col items-center p-6 bg-gray-900 text-white h-screen">
      <h1 className="text-2xl mb-4">Chat e Videochamada</h1>

      <input
        type="text"
        placeholder="Código da Sala"
        className="p-2 text-black rounded mb-2"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
      />
      <button className="p-2 bg-green-600 rounded mb-4" onClick={joinRoom}>
        Entrar na Sala
      </button>

      <div className="w-full max-w-md">
        <div className="h-60 overflow-y-auto border border-gray-400 rounded p-2 mb-2">
          {messages.map((m, index) => (
            <p key={index} className="mb-1">
              <strong>{m.userId}:</strong> {m.msg}
            </p>
          ))}
        </div>

        <input
          type="text"
          placeholder="Digite sua mensagem..."
          className="p-2 text-black w-full rounded mb-2"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
        />
        <button
          className="p-2 bg-blue-600 rounded w-full"
          onClick={sendMessage}
        >
          Enviar
        </button>
      </div>

      <div className="mt-4 flex gap-4">
        <video ref={myVideo} autoPlay muted className="w-32 h-32 border" />
        {participants.map(({ socketId }) => (
          <video
            key={socketId}
            ref={(el) => (userVideos.current[socketId] = el)}
            autoPlay
            className="w-32 h-32 border"
          />
        ))}
      </div>
      <button className="p-2 bg-red-600 rounded mt-4" onClick={startCall}>
        Iniciar Chamada
      </button>
    </div>
  );
}
