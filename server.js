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
const wss10 = new WebSocket.Server({ server, path: "/ws/timer_10min" });
// const wss5 = new WebSocket.Server({ server, path: "/ws/timer_5min" });

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
    this.broadcast(duration);
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
    wss10.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
    // wss5.clients.forEach((client) => {
    //   if (client.readyState === WebSocket.OPEN) {
    //     client.send(message);
    //   }
    // });
  }
}

const timer = new Timer();

wss10.on("connection", (ws) => {
  const clientID = uuidv4();
  console.log("Client connected", "wss10", clientID);
  ws.on("message", (message) => {
    // 유저로부터 message를 받음
    const messageStr = message.toString(); // Buffer를 문자열로 변환
    // 유저(관리자) 로부터 start 메시지를 받음
    if (messageStr === "start") {
      const duration = 600; // 10 minutes

      // 600초로 시작?
      timer.start(ws, duration);

      // wss에 연결된 모든 클라이언트에게 메시지 전체 발송
      timer.broadcast(messageStr);

      // 유저(관리자) 로부터 reset 메시지를 받음
    } else if (messageStr === "reset") {
      // responses(유저 동의 여부)를 초기화 (안하면 계속 누적)
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
      responses = {}; // 2명 응답이 다 차면 responses 객체 초기화
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
    if (timer.timerTask) {
      clearInterval(timer.timerTask);
    }
  });
});

// ----------------------5분 타이머----------------------------
// wss5.on("connection", (ws) => {
//   const clientID = uuidv4();
//   console.log("Client connected", "wss5", clientID);
//   ws.on("message", (message) => {
//     const messageStr = message.toString(); // Buffer를 문자열로 변환
//     if (messageStr === "start") {
//       const duration = 600; // 10 minutes
//       timer.start(ws, duration);
//       timer.broadcast(messageStr);
//     } else if (messageStr === "reset") {
//       reponses = {};
//       timer.reset(ws);
//       timer.broadcast(messageStr);
//     } else if (messageStr === "true") {
//       responses[clientID] = true;
//       console.log("True", messageStr, responses);
//     } else if (messageStr === "false") {
//       responses[clientID] = false;
//       console.log("False", messageStr, responses);
//     } else {
//       console.log("MESSAGE", messageStr);
//       timer.broadcast(messageStr);
//     }

//     if (Object.keys(responses).length === 2) {
//       const allTrue = Object.values(responses).every(
//         (response) => response === true
//       );
//       const broadcastMessage = allTrue ? "All true" : "Not True";

//       timer.broadcast(broadcastMessage);
//       console.log("일단 이 함수 실행", broadcastMessage);
//     }
//   });

//   ws.on("close", () => {
//     console.log("Client disconnected");
//     if (timer.timerTask) {
//       clearInterval(timer.timerTask);
//     }
//   });
// });

// ----------------------5분 타이머----------------------------

// *******************************************************
// *******************************************************
// fastapi 대용 서버
// *******************************************************
// *******************************************************

// function resetTimer() {
//   if (timerTimeout) {
//     clearTimeout(timerTimeout);
//   }
//   timer.is_running = false;
//   timer.start_time = null;
//   timer.end_time = null;
//   timer.duration = null;
//   timer.responses = {};
// }

// app.post("/timer/start", (req, res) => {
//   const duration = parseInt(req.query.duration);
//   timer.start(duration);
//   console.log("duration", duration);

//   if (isNaN(duration) || duration <= 0) {
//     return res.status(400).json({ error: "Invalid duration" });
//   }

//   if (timer.is_running) {
//     return res.status(400).json({ error: "Timer is already running" });
//   }

//   timer.is_running = true;
//   timer.start_time = Math.floor(Date.now() / 1000);
//   timer.duration = duration;
//   timer.time_left = duration;

//   timerTimeout = setTimeout(() => {
//     timer.is_running = false;
//     timer.start_time = null;
//     timer.end_time = null;
//     timer.duration = null;
//     timer.time_left = null;
//   }, duration * 1000);

//   res.json({ message: `Timer started for ${duration} seconds` });
// });

// app.get("/timer/status", (req, res) => {
//   if (timer.is_running) {
//     const currentTime = Math.floor(Date.now() / 1000);
//     timer.time_left = timer.start_time + timer.duration - currentTime;
//     if (timer.time_left <= 0) {
//       clearTimeout(timerTimeout);
//       timer.is_running = false;
//       timer.start_time = null;
//       timer.end_time = null;
//       timer.duration = null;
//       timer.time_left = null;
//     }
//   }
//   res.json({ timer });
// });

// app.post("/timer/reset", (req, res) => {
//   timer.reset();
//   console.log("post reset은 실행 됨");
//   res.json({ message: "Timer reset" });
// });
