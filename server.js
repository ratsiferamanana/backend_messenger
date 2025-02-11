const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const pool = require("./db");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

// Active CORS pour que le frontend puisse se connecter
app.use(cors());

const io = new Server(server, {
  cors: {
    origin: "https://chat-frontend-2tx6.onrender.com",  // Remplace par l'URL de ton frontend
    methods: ["GET", "POST"]
  },
});

let users = {};

io.on("connection", async (socket) => {
  console.log("Un utilisateur connecté");

  try {
    const result = await pool.query('SELECT "user", text FROM messages ORDER BY created_at ASC');
    const messages = result.rows;
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
      const result = await pool.query(
        'INSERT INTO messages ("user", text) VALUES ($1, $2) RETURNING created_at',
        [username, msg]
      );

      const messageData = {
        user: username,
        text: msg,
        senderId: socket.id,
        created_at: result.rows[0].created_at,
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

// Utilise le port fourni par Render ou 5000 en local
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Serveur en écoute sur le port ${PORT}`);
});
