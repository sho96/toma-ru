import websocket
import time
from chalinavi_servo import brake

start = 0
# Replace with the actual WebSocket server URL
server_url = "wss://toma-ru.onrender.com"

def on_message(ws, message):
    global start
    if message == b"hello":
        print(f"latency: {round((time.perf_counter() - start) * 1000, 3)}ms")
    elif message == b"brake":
        print("braking")
        brake()
    else:
        print(f"Received: {message}")

def on_error(ws, error):
    print(f"Error: {error}")

def on_close(ws, close_status_code, close_msg):
    print("Closed")

def on_open(ws):
    global start
    print('hello')
    ws.send("hello")
    start = time.perf_counter()
    

if __name__ == "__main__":
    ws = websocket.WebSocketApp(server_url, on_message=on_message, on_error=on_error, on_close=on_close)
    ws.on_open = on_open
    ws.run_forever()