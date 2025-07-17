export class WebSocketConnHandle {
  private ws: WebSocket;
  private setIntervalId: ReturnType<typeof setInterval>;
  private interval: number;

  constructor(ws: WebSocket, interval: number) {
    this.ws = ws;
    this.interval = interval;
    this.setIntervalId = undefined!;
  }

  async waitForConnection(callback: () => void) {
    if (this.ws.readyState == 1) {
      if (this.setIntervalId) {
        clearInterval(this.setIntervalId);
      }
      callback();
    } else {
      this.setIntervalId = setInterval(() => {
        this.waitForConnection(callback);
      }, this.interval);
    }
  }
}
