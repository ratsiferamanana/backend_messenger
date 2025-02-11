require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const sql = require("./db");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

// Active CORS pour le frontend
app.use(cors({
  origin: "*",  // Permet à tout le monde d'accéder
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"]
  },
});

let users = {};

io.on("connection", async (socket) => {
  console.log("Un utilisateur connecté");

  try {
    const messages = await sql`SELECT "user", text FROM messages ORDER BY created_at ASC`;
    socket.emit("chat history", messages);
  } catch (error) {
    console.error("Erreur lors de la récupération des messages :", error);
  }

  socket.on("set username", (username) => {
    users[socket.id] = username;
    console.log(`${username} s'est connecté.`);
  });

  socket.on("chat message", async (msg) => {
    const username = users[socket.id] || "Anonyme";
    try {
      const result = await sql`
        INSERT INTO messages ("user", text) VALUES (${username}, ${msg})
        RETURNING created_at
      `;

      const messageData = {
        user: username,
        text: msg,
        senderId: socket.id,
        created_at: result[0].created_at,
      };

      io.emit("chat message", messageData);
    } catch (error) {
      console.error("Erreur lors de l'insertion du message :", error);
    }
  });

  socket.on("disconnect", () => {
    console.log(`${users[socket.id] || "Un utilisateur"} s'est déconnecté`);
    delete users[socket.id];
  });
});

// Port dynamique (Render) ou 5000 en local
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Serveur en écoute sur le port ${PORT}`);
});
