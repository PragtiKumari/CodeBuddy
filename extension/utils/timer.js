let startTime;
let interval;

export function startTimer(callback) {
  startTime = Date.now();
  interval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    callback(elapsed);
  }, 1000);
}

export function stopTimer() {
  clearInterval(interval);
}

export function getElapsedTime() {
  return Math.floor((Date.now() - startTime) / 1000);
}
