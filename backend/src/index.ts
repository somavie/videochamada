import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const users: { [id: string]: string } = {};

io.on("connection", (socket) => {
  console.log("Novo usuário conectado:", socket.id);

  socket.on("join-room", ({ roomId, userId }) => {
    socket.join(roomId);
    users[socket.id] = userId;
    socket.broadcast
      .to(roomId)
      .emit("user-joined", { userId, socketId: socket.id });

    socket.on("send-message", ({ msg }) => {
      io.to(roomId).emit("receive-message", { userId, msg });
    });

    socket.on("send-signal", ({ signal, to }) => {
      io.to(to).emit("peer-signal", { signal, from: socket.id });
    });

    socket.on("disconnect", () => {
      delete users[socket.id];
      io.to(roomId).emit("user-left", { userId });
    });
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
