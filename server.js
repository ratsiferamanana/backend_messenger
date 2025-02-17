require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const pool = require("./db");
const cors = require("cors");

const app = express();
const server = http.createServer(app);


// Configuration CORS (Mets l'URL de ton frontend sur Render)
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

const io = new Server(server, {
  cors: {
    origin: "*",  // Autorise toutes les origines
    methods: ["GET", "POST"]
  },

});

let users = {};

io.on("connection", async (socket) => {
  

  try {
    const messages = await pool.query(`SELECT "user", text FROM messages ORDER BY created_at ASC`);
    socket.emit("chat history", messages.rows);
  } catch (error) {
    console.error("Erreur lors de la récupération des messages :", error);
  }

  socket.on("set username", (username) => {
    users[socket.id] = username;
    console.log(`${username} s'est connecté.`);
  });

  socket.on("chat message", async (msg) => {
    
    const username = users[socket.id] ;
    try {
      const result = await pool.query(
        `INSERT INTO messages ("user", text) VALUES ($1, $2) RETURNING created_at`,
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

// Port dynamique (Render) ou 5000 en local
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Serveur en écoute sur le port ${PORT}`);
});
