const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

// ✅ MongoDB connection
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.log("❌ MongoDB error:", err));

// ✅ Schema + Model
const messageSchema = new mongoose.Schema({
  name: String,
  text: String,
  room: String,
  time: { type: Date, default: Date.now }
});
const Message = mongoose.model("Message", messageSchema);

// ✅ Socket events
io.on("connection", async (socket) => {
  console.log("A user connected");

  socket.on("joinRoom", async ({ name, room }) => {
    socket.join(room);
    console.log(`${name} joined room ${room}`);

    // send last 30 messages from this room
    const history = await Message.find({ room }).sort({ time: 1 }).limit(30);
    socket.emit("history", history);

    // broadcast join message
    socket.to(room).emit("chat", { name: "System", text: `${name} joined the room`, room });
  });

  socket.on("chat", async (msg) => {
    const message = new Message(msg);
    await message.save();
    io.to(msg.room).emit("chat", msg);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

// ✅ Start server
const PORT = process.env.PORT ||3000;
server.listen(PORT, () => {
  console.log("Server running at http://localhost:3000");
});