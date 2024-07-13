const express = require("express");
const WebSocket = require("ws");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
const port = 8000;

app.use(cors());
// HTTP 서버 생성
const server = app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// WebSocket 서버 생성
const wss = new WebSocket.Server({ server, path: "/ws/timer_10min" });

let responses = {};

class Timer {
  constructor() {
    this.timerTask = null;
  }

  countdown(ws, duration) {
    this.timerTask = setInterval(() => {
      if (duration <= 0) {
        ws.send("Timer finished");
        clearInterval(this.timerTask);
        this.timerTask = null;
      } else {
        ws.send(`Time remaining: ${duration} seconds`);
        duration -= 1;
      }
    }, 1000);
  }

  start(ws, duration) {
    if (this.timerTask) {
      clearInterval(this.timerTask);
    }
    this.countdown(ws, duration);
    // this.broadcast(duration);
    console.log("start 메시지 전달 완료");
  }

  reset(ws) {
    if (this.timerTask) {
      clearInterval(this.timerTask);
      this.timerTask = null;
    }
    // ws.send("reset");
    responses = {}; // reset 시 responses 객체 초기화
    this.broadcast("reset");
    console.log("reset 메시지 전달 완료");
  }

  broadcast(message) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
}

const timer = new Timer();

wss.on("connection", (ws) => {
  const clientID = uuidv4();
  console.log("Client connected", clientID);
  ws.on("message", (message) => {
    const messageStr = message.toString(); // Buffer를 문자열로 변환
    if (messageStr === "start") {
      const duration = 600; // 10 minutes
      timer.start(ws, duration);
      timer.broadcast(messageStr);
    } else if (messageStr === "reset") {
      reponses = {};
      timer.reset(ws);
      timer.broadcast(messageStr);
    } else if (messageStr === "true") {
      responses[clientID] = true;
      console.log("True", messageStr, responses);
    } else if (messageStr === "false") {
      responses[clientID] = false;
      console.log("False", messageStr, responses);
    } else {
      console.log("MESSAGE", messageStr);
      timer.broadcast(messageStr);
    }

    if (Object.keys(responses).length === 2) {
      const allTrue = Object.values(responses).every(
        (response) => response === true
      );
      const broadcastMessage = allTrue ? "All true" : "Not True";

      timer.broadcast(broadcastMessage);
      console.log("일단 이 함수 실행", broadcastMessage);
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
    if (timer.timerTask) {
      clearInterval(timer.timerTask);
    }
  });
});
